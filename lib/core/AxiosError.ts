import utils from '../utils.js';
import type { AxiosRequestConfig } from '../../index.d.js';
import type { AxiosResponse } from '../../index.d.js';

/**
 * Error codes for Axios
 */
export enum AxiosErrorCode {
  ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE',
  ERR_BAD_OPTION = 'ERR_BAD_OPTION',
  ECONNABORTED = 'ECONNABORTED',
  ETIMEDOUT = 'ETIMEDOUT',
  ERR_NETWORK = 'ERR_NETWORK',
  ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS',
  ERR_DEPRECATED = 'ERR_DEPRECATED',
  ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE',
  ERR_BAD_REQUEST = 'ERR_BAD_REQUEST',
  ERR_CANCELED = 'ERR_CANCELED',
  ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT',
  ERR_INVALID_URL = 'ERR_INVALID_URL'
}

export interface AxiosErrorInterface extends Error {
  config?: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse;
  status?: number;
  isAxiosError: boolean;
  toJSON: () => object;
  cause?: Error;
}

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 *
 * @returns {AxiosError} The created error.
 */
class AxiosError extends Error implements AxiosErrorInterface {
  config?: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse;
  status?: number;
  isAxiosError: boolean = true;
  cause?: Error;
  
  constructor(
    message: string,
    code?: string,
    config?: AxiosRequestConfig,
    request?: any,
    response?: AxiosResponse
  ) {
    super(message);
    
    this.name = 'AxiosError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
    
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    
    if (response) {
      this.response = response;
      this.status = response.status ? response.status : null;
    }
  }

  toJSON(): object {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: (this as any).description,
      number: (this as any).number,
      // Mozilla
      fileName: (this as any).fileName,
      lineNumber: (this as any).lineNumber,
      columnNumber: (this as any).columnNumber,
      stack: this.stack,
      // Axios
      config: utils.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }

  static from(
    error: Error,
    code?: string,
    config?: AxiosRequestConfig,
    request?: any,
    response?: AxiosResponse,
    customProps?: Record<string, any>
  ): AxiosError {
    const axiosError = Object.create(AxiosError.prototype);

    utils.toFlatObject(error, axiosError, function filter(obj) {
      return obj !== Error.prototype;
    }, prop => {
      return prop !== 'isAxiosError';
    });

    AxiosError.call(axiosError, error.message, code, config, request, response);

    axiosError.cause = error;
    axiosError.name = error.name;

    customProps && Object.assign(axiosError, customProps);

    return axiosError;
  }
}

// Define static error codes
const descriptors: PropertyDescriptorMap = {};

Object.values(AxiosErrorCode).forEach(code => {
  descriptors[code] = { value: code };
});

Object.defineProperties(AxiosError, descriptors);

export default AxiosError;
