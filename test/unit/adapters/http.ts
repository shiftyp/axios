import axios from '../../../index';
import http from 'http';
import https from 'https';
import net from 'net';
import url from 'url';
import zlib from 'zlib';
import stream from 'stream';
import util from 'util';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {lookup} from 'dns';
import AxiosError from '../../../lib/core/AxiosError';
import FormDataLegacy from 'form-data';
import formidable from 'formidable';
import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import {Throttle} from 'stream-throttle';
import devNull from 'dev-null';
import {AbortController} from 'abortcontroller-polyfill/dist/cjs-ponyfill';
import {__setProxy} from "../../../lib/adapters/http";
import {FormData as FormDataPolyfill, Blob as BlobPolyfill, File as FilePolyfill} from 'formdata-node';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosProgressEvent } from '../../../index.d';

let server: http.Server;
let proxy: http.Server;

const isBlobSupported = typeof Blob !== 'undefined';

const FormDataSpecCompliant = typeof FormData !== 'undefined' ? FormData : FormDataPolyfill;
const BlobSpecCompliant = typeof Blob !== 'undefined' ? Blob : BlobPolyfill;
const FileSpecCompliant = typeof File !== 'undefined' ? File : FilePolyfill;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import getStream from 'get-stream';

function setTimeoutAsync(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const pipelineAsync = util.promisify(stream.pipeline);
const finishedAsync = util.promisify(stream.finished);
const gzip = util.promisify(zlib.gzip);
const deflate = util.promisify(zlib.deflate);
const deflateRaw = util.promisify(zlib.deflateRaw);
const brotliCompress = util.promisify(zlib.brotliCompress);

function toleranceRange(positive: number, negative: number) {
  const p = (1 + 1 / positive);
  const n = (1 / negative);

  return (actualValue: number, value: number) => {
    return actualValue - value > 0 ? actualValue < value * p : actualValue > value * n;
  }
}

const nodeVersion = process.versions.node.split('.').map(v => parseInt(v, 10));
const nodeMajorVersion = nodeVersion[0];

const noop = () => {};

const LOCAL_SERVER_URL = 'http://localhost:4444';

const SERVER_HANDLER_STREAM_ECHO = (req: http.IncomingMessage, res: http.ServerResponse) => req.pipe(res);

interface HTTPServerOptions {
  handler?: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>;
  useBuffering?: boolean;
  rate?: number;
  port?: number;
  keepAlive?: number;
}

function startHTTPServer(handlerOrOptions?: ((req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>) | HTTPServerOptions, options?: HTTPServerOptions): Promise<http.Server> {
  const defaultOptions: HTTPServerOptions = {
    useBuffering: false,
    port: 4444,
    keepAlive: 1000
  };

  const resolvedOptions: HTTPServerOptions = Object.assign(
    {},
    defaultOptions,
    typeof handlerOrOptions === 'function' ? { handler: handlerOrOptions } : (handlerOrOptions || {}),
    options || {}
  );

  const { handler, useBuffering, rate, port, keepAlive } = resolvedOptions;

  return new Promise((resolve, reject) => {
    const server = http.createServer(handler || async function (req, res) {
      try {
        req.headers['content-length'] && res.setHeader('content-length', req.headers['content-length']);

        let dataStream: stream.Readable = req;

        if (useBuffering) {
          dataStream = stream.Readable.from(await getStream(req));
        }

        const streams: (stream.Readable | stream.Writable | stream.Transform)[] = [dataStream];

        if (rate) {
          streams.push(new Throttle({rate}));
        }

        streams.push(res);

        stream.pipeline(streams, (err) => {
          err && console.log('Server warning: ' + err.message);
        });
      } catch (err) {
        console.warn('HTTP server error:', err);
      }
    }).listen(port, function (this: http.Server, err?: Error) {
      err ? reject(err) : resolve(this);
    });

    if (server && typeof keepAlive === 'number') {
      server.keepAliveTimeout = keepAlive;
    }
  });
}

const stopHTTPServer = async (server?: http.Server, timeout = 10000): Promise<void> => {
  if (server) {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }

    await Promise.race([new Promise<void>(resolve => server.close(() => resolve())), setTimeoutAsync(timeout)]);
  }
}

const handleFormData = (req: http.IncomingMessage) => {
  return new Promise<{fields: formidable.Fields, files: formidable.Files}>((resolve, reject) => {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }

      resolve({fields, files});
    });
  });
}

function generateReadableStream(length = 1024 * 1024, chunkSize = 10 * 1024, sleep = 50): stream.Readable {
  return stream.Readable.from(async function* () {
    let dataLength = 0;

    while(dataLength < length) {
      const leftBytes = length - dataLength;

      const chunk = Buffer.alloc(leftBytes > chunkSize ? chunkSize : leftBytes);

      dataLength += chunk.length;

      yield chunk;

      if (sleep) {
        await setTimeoutAsync(sleep);
      }
    }
  }());
}

describe('supports http with nodejs', function () {
  afterEach(async function () {
    await Promise.all([stopHTTPServer(server), stopHTTPServer(proxy)]);

    server = null;
    proxy = null;

    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.no_proxy;
  });

  it('should support IPv4 literal strings', function (done) {
    const data = {
      firstName: 'Fred',
      lastName: 'Flintstone',
      emailAddr: 'fred@example.com'
    };

    server = http.createServer(function (req, res) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    }).listen(4444, function () {
      axios.get('http://127.0.0.1:4444/').then(function (res) {
        assert.deepEqual(res.data, data);
        done();
      }).catch(done);
    });
  });

  it('should support IPv6 literal strings', function (done) {
    const data = {
      firstName: 'Fred',
      lastName: 'Flintstone',
      emailAddr: 'fred@example.com'
    };

    server = http.createServer(function (req, res) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    }).listen(4444, function () {
      axios.get('http://[::1]:4444/').then(function (res) {
        assert.deepEqual(res.data, data);
        done();
      }).catch(done);
    });
  });

  it('should throw an error if the timeout property is not parsable as a number', function (done) {
    server = http.createServer(function (req, res) {
      res.end();
    }).listen(4444, function () {
      axios.get('http://localhost:4444/', {
        timeout: 'foo'
      } as any).catch(function (error) {
        assert.strictEqual(error.message, 'timeout is not a number');
        done();
      });
    });
  });

  // ... (rest of the test cases with appropriate TypeScript annotations)
});
