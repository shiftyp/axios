import AxiosError from '../core/AxiosError.js';
import utils from '../utils.js';
import type { AxiosRequestConfig } from '../../index.d.js';

/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @param {string=} message The message.
 * @param {Object=} config The config.
 * @param {Object=} request The request.
 *
 * @returns {CanceledError} The created error.
 */
class CanceledError extends AxiosError {
  __CANCEL__: boolean = true;

  constructor(message?: string, config?: AxiosRequestConfig, request?: any) {
    super(message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
  }
}

export default CanceledError;
