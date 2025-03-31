import utils from '../utils';
import defaults from '../defaults/index';
import AxiosHeaders from '../core/AxiosHeaders';
import type { 
  AxiosRequestConfig,
  AxiosResponse,
  AxiosTransformer
} from '../../index.d';

/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 * @param {*} data The data to be transformed
 *
 * @returns {*} The resulting transformed data
 */
export default function transformData(
  this: AxiosRequestConfig, 
  fns?: AxiosTransformer | AxiosTransformer[], 
  response?: AxiosResponse,
  data?: any
): any {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders.from(context.headers);
  data = data || context.data;

  if (fns) {
    const fnsList = Array.isArray(fns) ? fns : [fns];
    
    utils.forEach(fnsList, function transform(fn) {
      data = fn.call(
        config, 
        data, 
        headers.normalize(), 
        response ? response.status : undefined
      );
    });
  }

  headers.normalize();

  return data;
}
