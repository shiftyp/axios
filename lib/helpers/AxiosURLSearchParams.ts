import toFormData from './toFormData';
import type { 
  ParamEncoder,
  FormDataVisitorOptions 
} from '../../index.d';

/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode(str: string): string {
  const charMap: Record<string, string> = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00'
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * Class to create a URL search parameters object from a regular object
 */
class AxiosURLSearchParams {
  private _pairs: Array<[string, string]> = [];

  /**
   * It takes a params object and converts it to URL search parameters
   *
   * @param {Object<string, any>} params - The parameters to be converted
   * @param {Object<string, any>} options - The options object passed to the Axios constructor
   */
  constructor(params?: Record<string, any>, options?: FormDataVisitorOptions) {
    params && toFormData(params, this, options);
  }

  /**
   * Append a name-value pair to the search parameters
   *
   * @param {string} name - The name of the parameter
   * @param {string} value - The value of the parameter
   *
   * @returns {void}
   */
  append(name: string, value: string): void {
    this._pairs.push([name, value]);
  }

  /**
   * Convert the search parameters to a string
   *
   * @param {Function} encoder - A function to encode the parameters
   *
   * @returns {string} The encoded parameters
   */
  toString(encoder?: ParamEncoder): string {
    const _encode = encoder ? function(value: string) {
      return encoder.call(this, value, encode);
    } : encode;

    return this._pairs.map(function each(pair) {
      return _encode(pair[0]) + '=' + _encode(pair[1]);
    }, '').join('&');
  }
}

export default AxiosURLSearchParams;
