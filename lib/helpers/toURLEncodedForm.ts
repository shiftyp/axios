import utils from '../utils';
import toFormData from './toFormData';
import platform from '../platform/index';
import type { FormDataVisitorOptions } from '../../index.d';

/**
 * Converts data to URL encoded form
 * 
 * @param {Record<string, any>} data - The data to convert
 * @param {FormDataVisitorOptions} [options] - The options for conversion
 * 
 * @returns {URLSearchParams} The URL encoded form
 */
export default function toURLEncodedForm(
  data: Record<string, any>, 
  options?: FormDataVisitorOptions
): URLSearchParams {
  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
    visitor: function(
      this: URLSearchParams,
      value: any, 
      key: string, 
      path: Array<string | number> | undefined, 
      helpers: any
    ): boolean {
      if (platform.isNode && utils.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }

      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}
