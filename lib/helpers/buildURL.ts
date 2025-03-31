import utils from '../utils.js';
import AxiosURLSearchParams from '../helpers/AxiosURLSearchParams.js';
import type { ParamsSerializerOptions } from '../../index.d.js';
import type { ParamEncoder } from '../../index.d.js';

/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?(object|Function)} options
 *
 * @returns {string} The formatted url
 */
export default function buildURL(
  url: string, 
  params?: Record<string, any> | URLSearchParams, 
  options?: ParamsSerializerOptions | ((params: Record<string, any>) => string)
): string {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }
  
  let _options: ParamsSerializerOptions;
  
  if (typeof options === 'function') {
    _options = {
      serialize: options
    };
  } else {
    _options = options || {};
  }

  const _encode = _options.encode || encode;
  const serializeFn = _options.serialize;

  let serializedParams: string;

  if (serializeFn) {
    serializedParams = serializeFn(params as Record<string, any>, _options);
  } else {
    serializedParams = utils.isURLSearchParams(params) 
      ? (params as URLSearchParams).toString() 
      : new AxiosURLSearchParams(params as Record<string, any>, _options).toString(_encode as ParamEncoder);
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}
