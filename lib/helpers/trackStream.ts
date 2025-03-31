/**
 * Generator function that yields chunks of a given size from a larger chunk
 */
export const streamChunk = function* (
  chunk: ArrayBuffer, 
  chunkSize?: number
): Generator<ArrayBuffer> {
  let len = chunk.byteLength;

  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }

  let pos = 0;
  let end: number;

  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
}

/**
 * Async generator that reads bytes from an iterable in chunks of a given size
 */
export const readBytes = async function* (
  iterable: ReadableStream | AsyncIterable<any>, 
  chunkSize?: number
): AsyncGenerator<ArrayBuffer> {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
}

/**
 * Async generator that reads from a stream
 */
const readStream = async function* (
  stream: ReadableStream | AsyncIterable<any>
): AsyncGenerator<ArrayBuffer> {
  if ((stream as AsyncIterable<any>)[Symbol.asyncIterator]) {
    yield* stream as AsyncIterable<ArrayBuffer>;
    return;
  }

  const reader = (stream as ReadableStream).getReader();
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
}

/**
 * Creates a ReadableStream that tracks progress of reading from another stream
 */
export const trackStream = (
  stream: ReadableStream | AsyncIterable<any>, 
  chunkSize?: number, 
  onProgress?: (bytes: number) => void, 
  onFinish?: (error?: any) => void
): ReadableStream<Uint8Array> => {
  const iterator = readBytes(stream, chunkSize);

  let bytes = 0;
  let done: boolean;
  let _onFinish = (e?: any) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  }

  return new ReadableStream({
    async pull(controller) {
      try {
        const {done, value} = await iterator.next();

        if (done) {
         _onFinish();
          controller.close();
          return;
        }

        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  });
}
