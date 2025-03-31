import stream from 'stream';
import utils from '../utils';

const kInternals = Symbol('internals');

interface AxiosTransformStreamOptions {
  maxRate?: number;
  chunkSize?: number;
  minChunkSize?: number | false;
  timeWindow?: number;
  ticksRate?: number;
  samplesCount?: number;
}

interface Internals {
  timeWindow: number;
  chunkSize: number;
  maxRate: number;
  minChunkSize: number | false;
  bytesSeen: number;
  isCaptured: boolean;
  notifiedBytesLoaded: number;
  ts: number;
  bytes: number;
  onReadCallback: (() => void) | null;
}

class AxiosTransformStream extends stream.Transform {
  private [kInternals]: Internals;

  constructor(options?: AxiosTransformStreamOptions) {
    options = utils.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils.isUndefined(source[prop]);
    });

    super({
      readableHighWaterMark: options.chunkSize
    });

    const internals = this[kInternals] = {
      timeWindow: options.timeWindow as number,
      chunkSize: options.chunkSize as number,
      maxRate: options.maxRate as number,
      minChunkSize: options.minChunkSize as (number | false),
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };

    this.on('newListener', (event: string) => {
      if (event === 'progress') {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }

  _read(size: number): void {
    const internals = this[kInternals];

    if (internals.onReadCallback) {
      internals.onReadCallback();
    }

    return super._read(size);
  }

  _transform(
    chunk: Buffer, 
    encoding: BufferEncoding, 
    callback: (error?: Error | null, data?: any) => void
  ): void {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;

    const readableHighWaterMark = this.readableHighWaterMark;

    const timeWindow = internals.timeWindow;

    const divider = 1000 / timeWindow;
    const bytesThreshold = (maxRate / divider);
    const minChunkSize = internals.minChunkSize !== false ? 
      Math.max(internals.minChunkSize as number, bytesThreshold * 0.01) : 0;

    const pushChunk = (_chunk: Buffer, _callback: (error?: Error | null) => void): void => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;

      internals.isCaptured && this.emit('progress', internals.bytesSeen);

      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    }

    const transformChunk = (_chunk: Buffer, _callback: (err: Error | null, chunk?: Buffer) => void): void => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder: Buffer | null = null;
      let maxChunkSize = readableHighWaterMark as number;
      let bytesLeft: number;
      let passed = 0;

      if (maxRate) {
        const now = Date.now();

        if (!internals.ts || (passed = (now - internals.ts)) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }

        bytesLeft = bytesThreshold - internals.bytes;
      }

      if (maxRate) {
        if (bytesLeft <= 0) {
          // next time window
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }

        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }

      if (maxChunkSize && chunkSize > maxChunkSize && (chunkSize - maxChunkSize) > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }

      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : () => _callback(null));
    };

    transformChunk(chunk, function transformNextChunk(err: Error | null, _chunk?: Buffer) {
      if (err) {
        return callback(err);
      }

      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }
}

export default AxiosTransformStream;
