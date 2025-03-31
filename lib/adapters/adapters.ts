import utils from '../utils.js';
import httpAdapter from './http.js';
import xhrAdapter from './xhr.js';
import fetchAdapter from './fetch.js';
import AxiosError from "../core/AxiosError.js";
import type { AxiosAdapter } from '../../index.d.js';
import type { AxiosPromise } from '../../index.d.js';
import type { AxiosRequestConfig } from '../../index.d.js';

interface KnownAdapters {
  http: AxiosAdapter | false;
  xhr: AxiosAdapter | false;
  fetch: AxiosAdapter | false;
  [key: string]: AxiosAdapter | false;
}

const knownAdapters: KnownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: fetchAdapter
}

utils.forEach(knownAdapters, (fn: AxiosAdapter, value: string) => {
  if (fn) {
    try {
      Object.defineProperty(fn, 'name', { value });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', { value });
  }
});

const renderReason = (reason: string): string => `- ${reason}`;

const isResolvedHandle = (adapter: any): boolean => 
  utils.isFunction(adapter) || adapter === null || adapter === false;

export default {
  getAdapter: (adapters: string | string[] | AxiosAdapter | AxiosAdapter[]): AxiosAdapter => {
    const adaptersArr = utils.isArray(adapters) ? adapters : [adapters];

    const {length} = adaptersArr as Array<string | AxiosAdapter>;
    let nameOrAdapter: string | AxiosAdapter;
    let adapter: AxiosAdapter | undefined | false;

    const rejectedReasons: Record<string, any> = {};

    for (let i = 0; i < length; i++) {
      nameOrAdapter = (adaptersArr as Array<string | AxiosAdapter>)[i];
      let id: string;

      adapter = nameOrAdapter as AxiosAdapter;

      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

        if (adapter === undefined) {
          throw new AxiosError(`Unknown adapter '${id}'`);
        }
      }

      if (adapter) {
        break;
      }

      rejectedReasons[id || '#' + i] = adapter;
    }

    if (!adapter) {
      const reasons = Object.entries(rejectedReasons)
        .map(([id, state]) => `adapter ${id} ` +
          (state === false ? 'is not supported by the environment' : 'is not available in the build')
        );

      let s = length ?
        (reasons.length > 1 ? 'since :\n' + reasons.map(renderReason).join('\n') : ' ' + renderReason(reasons[0])) :
        'as no adapter specified';

      throw new AxiosError(
        `There is no suitable adapter to dispatch the request ` + s,
        'ERR_NOT_SUPPORT'
      );
    }

    return adapter;
  },
  adapters: knownAdapters
}
