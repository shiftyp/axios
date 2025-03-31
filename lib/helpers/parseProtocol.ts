/**
 * Extracts the protocol from a URL
 *
 * @param {string} url The URL to extract from
 * @returns {string} The URL protocol
 */
export default function parseProtocol(url: string): string {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}
