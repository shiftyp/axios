import utils from '../utils';
import AxiosHeaders from "./AxiosHeaders";
import type { 
  AxiosRequestConfig,
  RawAxiosHeaders
} from '../../index.d';

interface CaselessContext {
  caseless: boolean;
}

const headersToObject = (thing: any): RawAxiosHeaders | any => 
  thing instanceof AxiosHeaders ? { ...thing } : thing;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
export default function mergeConfig(
  config1: AxiosRequestConfig = {}, 
  config2: AxiosRequestConfig = {}
): AxiosRequestConfig {
  const config: AxiosRequestConfig = {};

  function getMergedValue(target: any, source: any, prop?: string, caseless?: boolean): any {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge.call({caseless}, target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(a: any, b: any, prop?: string, caseless?: boolean): any {
    if (!utils.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils.isUndefined(a)) {
      return getMergedValue(undefined, a, prop, caseless);
    }
    return undefined;
  }

  function valueFromConfig2(a: any, b: any): any {
    if (!utils.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
    return undefined;
  }

  function defaultToConfig2(a: any, b: any): any {
    if (!utils.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
    return undefined;
  }

  function mergeDirectKeys(a: any, b: any, prop: string): any {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
    return undefined;
  }

  const mergeMap: Record<string, (a: any, b: any, prop?: string) => any> = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a: any, b: any, prop?: string) => 
      mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };

  utils.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge(config1[prop], config2[prop], prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
}
