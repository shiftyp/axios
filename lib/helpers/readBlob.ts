const {asyncIterator} = Symbol;

interface BlobLike {
  stream?: () => ReadableStream;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  [Symbol.asyncIterator]?: () => AsyncIterableIterator<Uint8Array>;
}

/**
 * Reads a Blob or Blob-like object and yields its content as chunks
 * 
 * @param {Object} blob - The blob to read
 * @returns {AsyncGenerator<Uint8Array|ArrayBuffer>} - A generator yielding the blob's content
 */
const readBlob = async function* (blob: BlobLike): AsyncGenerator<Uint8Array | ArrayBuffer> {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob as unknown as ArrayBuffer;
  }
}

export default readBlob;
