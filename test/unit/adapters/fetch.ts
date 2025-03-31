import assert from 'assert';
import {
  startHTTPServer,
  stopHTTPServer,
  LOCAL_SERVER_URL,
  setTimeoutAsync,
  makeReadableStream,
  generateReadable,
  makeEchoStream
} from '../../helpers/server';
import axios from '../../../index';
import stream from "stream";
import {AbortController} from "abortcontroller-polyfill/dist/cjs-ponyfill";
import util from "util";
import type { AxiosInstance, AxiosProgressEvent } from '../../../index.d';

const pipelineAsync = util.promisify(stream.pipeline);

const fetchAxios: AxiosInstance = axios.create({
  baseURL: LOCAL_SERVER_URL,
  adapter: 'fetch'
});

let server: any;

describe('supports fetch with nodejs', function () {
  before(function () {
    if (typeof fetch !== 'function') {
      this.skip();
    }
  })

  afterEach(async function () {
    await stopHTTPServer(server);

    server = null;
  });

  describe('responses', async () => {
    it(`should support text response type`, async () => {
      const originalData = 'my data';

      server = await startHTTPServer((req: any, res: any) => res.end(originalData));

      const {data} = await fetchAxios.get('/', {
        responseType: 'text'
      });

      assert.deepStrictEqual(data, originalData);
    });

    it(`should support arraybuffer response type`, async () => {
      const originalData = 'my data';

      server = await startHTTPServer((req: any, res: any) => res.end(originalData));

      const {data} = await fetchAxios.get('/', {
        responseType: 'arraybuffer'
      });

      assert.deepStrictEqual(data, Uint8Array.from(await new TextEncoder().encode(originalData)).buffer);
    });

    it(`should support blob response type`, async () => {
      const originalData = 'my data';

      server = await startHTTPServer((req: any, res: any) => res.end(originalData));

      const {data} = await fetchAxios.get('/', {
        responseType: 'blob'
      });

      assert.deepStrictEqual(data, new Blob([originalData]));
    });

    it(`should support stream response type`, async () => {
      const originalData = 'my data';

      server = await startHTTPServer((req: any, res: any) => res.end(originalData));

      const {data} = await fetchAxios.get('/', {
        responseType: 'stream'
      });

      assert.ok(data instanceof ReadableStream, 'data is not instanceof ReadableStream');

      let response = new Response(data);

      assert.deepStrictEqual(await response.text(), originalData);
    });

    it(`should support formData response type`, async function () {
      this.timeout(5000);

      const originalData = new FormData();

      originalData.append('x', '123');

      server = await startHTTPServer(async (req: any, res: any) => {

        const response = await new Response(originalData);

        res.setHeader('Content-Type', response.headers.get('Content-Type'));

        res.end(await response.text());
      });

      const {data} = await fetchAxios.get('/', {
        responseType: 'formdata'
      });

      assert.ok(data instanceof FormData, 'data is not instanceof FormData');

      assert.deepStrictEqual(Object.fromEntries(data.entries()), Object.fromEntries(originalData.entries()));
    });

    it(`should support json response type`, async () => {
      const originalData = {x: 'my data'};

      server = await startHTTPServer((req: any, res: any) => res.end(JSON.stringify(originalData)));

      const {data} = await fetchAxios.get('/', {
        responseType: 'json'
      });

      assert.deepStrictEqual(data, originalData);
    });
  });

  describe("progress", () => {
    describe('upload', function () {
      it('should support upload progress capturing', async function () {
        this.timeout(15000);

        server = await startHTTPServer({
          rate: 100 * 1024
        });

        let content = '';
        const count = 10;
        const chunk = "test";
        const chunkLength = Buffer.byteLength(chunk);
        const contentLength = count * chunkLength;

        const readable = stream.Readable.from(async function* () {
          let i = count;

          while (i-- > 0) {
            await setTimeoutAsync(1100);
            content += chunk;
            yield chunk;
          }
        }());

        const samples: AxiosProgressEvent[] = [];

        const {data} = await fetchAxios.post('/', readable, {
          onUploadProgress: ({loaded, total, progress, bytes, upload}: AxiosProgressEvent) => {
            console.log(`Upload Progress ${loaded} from ${total} bytes (${(progress * 100).toFixed(1)}%)`);

            samples.push({
              loaded,
              total,
              progress,
              bytes,
              upload
            });
          },
          headers: {
            'Content-Length': contentLength
          },
          responseType: 'text'
        });

        await setTimeoutAsync(500);

        assert.strictEqual(data, content);

        assert.deepStrictEqual(samples, Array.from(function* () {
          for (let i = 1; i <= 10; i++) {
            yield ({
              loaded: chunkLength * i,
              total: contentLength,
              progress: (chunkLength * i) / contentLength,
              bytes: 4,
              upload: true
            });
          }
        }()));
      });

      it('should not fail with get method', async() => {
        server = await startHTTPServer((req: any, res: any) => res.end('OK'));

        const {data} = await fetchAxios.get('/', {
          onUploadProgress() {
            // Empty function
          }
        });

        assert.strictEqual(data, 'OK');
      });
    });

    describe("download", () => {
      it('should support download progress capturing', async function () {
        this.timeout(15000);

        const count = 10;
        const chunk = "test";
        const chunkLength = Buffer.byteLength(chunk);
        const contentLength = count * chunkLength;

        let i = count;

        server = await startHTTPServer({
          rate: 100 * 1024,
          async handler(req: any, res: any) {
            res.writeHead(200, {
              'Content-Type': 'text/plain',
              'Content-Length': contentLength
            });

            i = count;

            while (i-- > 0) {
              await setTimeoutAsync(1000);
              res.write(chunk);
            }

            res.end();
          }
        });

        const samples: AxiosProgressEvent[] = [];

        const {data} = await fetchAxios.get('/', {
          onDownloadProgress({loaded, total, progress, bytes, download}: AxiosProgressEvent) {
            console.log(`Download Progress ${loaded} from ${total} bytes (${(progress * 100).toFixed(1)}%)`);

            samples.push({
              loaded,
              total,
              progress,
              bytes,
              download
            });
          },
          headers: {
            'Content-Length': contentLength
          },
          responseType: 'text',
          maxRedirects: 0
        });

        assert.strictEqual(data, "testtesttesttesttesttesttesttesttesttest");

        assert.deepStrictEqual(samples, Array.from(function* () {
          for (let i = 1; i <= 10; i++) {
            yield ({
              loaded: chunkLength * i,
              total: contentLength,
              progress: (chunkLength * i) / contentLength,
              bytes: 4,
              download: true
            })
          }
        }()));
      });
    });
  });

  describe('AbortController signal', function () {
    it('should cancel request with AbortController signal', async function () {
      this.timeout(10000);

      server = await startHTTPServer(async () => {
        await setTimeoutAsync(5000);
      });

      const controller = new AbortController();

      let response;
      let error;

      const responsePromise = fetchAxios.get('/', {
        signal: controller.signal as AbortSignal
      }).then(r => {
        response = r
      }).catch(e => {
        error = e;
      });

      await setTimeoutAsync(100);

      controller.abort();

      await responsePromise;

      assert.strictEqual(response, undefined);
      assert.strictEqual(error.message, 'canceled');
    });
  });

  describe('FormData', () => {
    it('should send data and headers', async function () {
      const formData = new FormData();

      formData.append('foo', 'bar');

      server = await startHTTPServer(async (req: any, res: any) => {
        let data = '';

        req.on('data', (d: Buffer) => data += d.toString());

        req.on('end', () => {
          res.end(JSON.stringify({
            contentType: req.headers['content-type'],
            data
          }));
        });
      });

      const {data} = await fetchAxios.post('/', formData);

      assert.ok(data.contentType, 'content-type header was not set');
      assert.ok(data.data.includes('name="foo"'), 'incorrect form data: ' + data.data);
      assert.ok(data.data.includes('bar'), 'incorrect form data: ' + data.data);
    });
  });
});
