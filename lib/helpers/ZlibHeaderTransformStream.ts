import stream from "stream";

/**
 * A Transform stream that ensures proper zlib headers are present
 */
class ZlibHeaderTransformStream extends stream.Transform {
  /**
   * Internal transform method used after header checks
   */
  private __transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.push(chunk);
    callback();
  }

  /**
   * Transform implementation that checks and adds zlib headers if needed
   */
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (chunk.length !== 0) {
      // Replace the _transform method with __transform after first chunk
      this._transform = this.__transform;

      // Add Default Compression headers if no zlib headers are present
      if (chunk[0] !== 120) { // Hex: 78
        const header = Buffer.alloc(2);
        header[0] = 120; // Hex: 78
        header[1] = 156; // Hex: 9C 
        this.push(header, encoding);
      }
    }

    this.__transform(chunk, encoding, callback);
  }
}

export default ZlibHeaderTransformStream;
