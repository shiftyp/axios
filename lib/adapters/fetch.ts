import platform from "../platform/index.js";
import utils from "../utils.js";
import AxiosError from "../core/AxiosError.js";
import composeSignals from "../helpers/composeSignals.js";
import {trackStream} from "../helpers/trackStream.js";
import AxiosHeaders from "../core/AxiosHeaders.js";
import {progressEventReducer, progressEventDecorator, asyncDecorator} from "../helpers/progressEventReducer.js";
import resolveConfig from "../helpers/resolveConfig.js";
import settle from "../core/settle.js";
// Use proper TypeScript type imports
import type { AxiosPromise } from '../../index.d.js';
import type { AxiosRequestConfig } from '../../index.d.js';
import type { AxiosResponse } from '../../index.d.js';
import type { InternalAxiosRequestConfig } from '../../index.d.js';

const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function';
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === 'function';

// used only inside the fetch adapter
const encodeText = isFetchSupported && (typeof TextEncoder === 'function' ?
    ((encoder: TextEncoder) => (str: string) => encoder.encode(str))(new TextEncoder()) :
    async (str: string) => new Uint8Array(await new Response(str).arrayBuffer())
);

const test = <T extends (...args: any[]) => any>(fn: T, ...args: Parameters<T>): boolean => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false
  }
}

const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;

  const hasContentType = new Request(platform.origin, {
    body: new ReadableStream(),
    method: 'POST',
    get duplex() {
      duplexAccessed = true;
      return 'half';
    },
  }).headers.has('Content-Type');

  return duplexAccessed && !hasContentType;
});

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const supportsResponseStream = isReadableStreamSupported &&
  test(() => typeof Response !== 'undefined' && new Response('').body !== null && 'getReader' in Response.prototype);

interface Resolvers {
  [key: string]: false | ((res: Response, config: AxiosRequestConfig) => Promise<any> | any);
}

const resolvers: Resolvers = {
  stream: supportsResponseStream && ((res: Response) => res.body)
};

isFetchSupported && (((res: Response) => {
  ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach(type => {
    !resolvers[type] && (resolvers[type] = utils.isFunction((res as any)[type]) ? 
      (res: Response) => (res as any)[type]() :
      (_: Response, config: AxiosRequestConfig) => {
        throw new AxiosError(`Response type '${type}' is not supported`, 'ERR_NOT_SUPPORT', config);
      })
  });
})(new Response('')));

const getBodyLength = async (body: any): Promise<number> => {
  if (body == null) {
    return 0;
  }

  if(utils.isBlob(body)) {
    return body.size;
  }

  if(utils.isSpecCompliantForm(body)) {
    const _request = new Request(platform.origin, {
      method: 'POST',
      body,
    });
    return (await _request.arrayBuffer()).byteLength;
  }

  if(utils.isArrayBufferView(body) || utils.isArrayBuffer(body)) {
    return body.byteLength;
  }

  if(utils.isURLSearchParams(body)) {
    body = body + '';
  }

  if(utils.isString(body)) {
    return (await (encodeText as (str: string) => Promise<Uint8Array>)(body)).byteLength;
  }

  return 0;
}

const resolveBodyLength = async (headers: AxiosHeaders, body: any): Promise<number> => {
  const length = utils.toFiniteNumber(headers.getContentLength()) || null;

  return length == null ? getBodyLength(body) : length;
}

interface FetchOptions extends RequestInit {
  duplex?: string;
}

const fetchAdapter = isFetchSupported && (async (config: AxiosRequestConfig): AxiosPromise => {
  const _config = resolveConfig(config) as InternalAxiosRequestConfig;

  let {
    url,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = 'same-origin',
    fetchOptions
  } = _config;

  responseType = responseType ? (responseType + '').toLowerCase() : 'text';

  let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);

  let request: Request;

  const unsubscribe = composedSignal && (composedSignal as any).unsubscribe && (() => {
      (composedSignal as any).unsubscribe();
  });

  let requestContentLength: number;

  try {
    if (
      onUploadProgress && supportsRequestStream && method !== 'get' && method !== 'head' &&
      (requestContentLength = await resolveBodyLength(headers, data)) !== 0
    ) {
      let _request = new Request(url!, {
        method: 'POST',
        body: data,
        duplex: "half"
      } as RequestInit);

      let contentTypeHeader: string | null;

      if (utils.isFormData(data) && (contentTypeHeader = _request.headers.get('content-type'))) {
        headers.setContentType(contentTypeHeader)
      }

      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(onUploadProgress))
        );

        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }

    if (!utils.isString(withCredentials)) {
      withCredentials = withCredentials ? 'include' : 'omit';
    }

    // Cloudflare Workers throws when credentials are defined
    // see https://github.com/cloudflare/workerd/issues/902
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url!, {
      ...(fetchOptions as RequestInit || {}),
      signal: composedSignal,
      method: method!.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? (withCredentials as RequestCredentials) : undefined
    } as RequestInit);

    let response = await fetch(request);

    const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');

    if (supportsResponseStream && (onDownloadProgress || (isStreamResponse && unsubscribe))) {
      const options: ResponseInit = {};

      ['status', 'statusText', 'headers'].forEach(prop => {
        options[prop as keyof ResponseInit] = response[prop as keyof Response];
      });

      const responseContentLength = utils.toFiniteNumber(response.headers.get('content-length')) || null;

      const progressResult = onDownloadProgress && progressEventDecorator(
        responseContentLength || undefined,
        progressEventReducer(asyncDecorator(onDownloadProgress), true)
      );
      
      const onProgress = progressResult ? progressResult[0] : undefined;
      const flush = progressResult ? progressResult[1] : undefined;

      response = new Response(
        trackStream(response.body!, DEFAULT_CHUNK_SIZE, onProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }),
        options
      );
    }

    responseType = responseType || 'text';

    const resolverKey = utils.findKey(resolvers, responseType) || 'text';
    let responseData = await resolvers[resolverKey](response, config);

    !isStreamResponse && unsubscribe && unsubscribe();

    return await new Promise<AxiosResponse>((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config: _config,
        request
      })
    })
  } catch (err: any) {
    unsubscribe && unsubscribe();

    if (err && err.name === 'TypeError' && /fetch/i.test(err.message)) {
      throw Object.assign(
        new AxiosError('Network Error', 'ERR_NETWORK', _config, request),
        {
          cause: err.cause || err
        }
      )
    }

    throw AxiosError.from(err, err && err.code, _config, request);
  }
});

export default fetchAdapter;
