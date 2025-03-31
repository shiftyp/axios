import utils from '../utils.js';
import parseHeaders from '../helpers/parseHeaders.js';
import type { AxiosHeaderValue } from '../../index.d.js';
import type { RawAxiosHeaders } from '../../index.d.js';
import type { AxiosHeaderMatcher } from '../../index.d.js';
import type { AxiosHeaderParser } from '../../index.d.js';

const $internals = Symbol('internals');

function normalizeHeader(header: any): string | undefined {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value: any): any {
  if (value === false || value == null) {
    return value;
  }

  return utils.isArray(value) ? value.map(normalizeValue) : String(value);
}

function parseTokens(str: string): Record<string, string> {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;

  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }

  return tokens;
}

const isValidHeaderName = (str: string): boolean => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

function matchHeaderValue(
  context: any, 
  value: any, 
  header: string, 
  filter: string | RegExp | ((value: any, header: string) => boolean), 
  isHeaderNameFilter?: boolean
): boolean | undefined {
  if (utils.isFunction(filter)) {
    return (filter as Function).call(context, value, header);
  }

  if (isHeaderNameFilter) {
    value = header;
  }

  if (!utils.isString(value)) return;

  if (utils.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }

  if (utils.isRegExp(filter)) {
    return (filter as RegExp).test(value);
  }
}

function formatHeader(header: string): string {
  return header.trim()
    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
}

function buildAccessors(obj: any, header: string): void {
  const accessorName = utils.toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach(methodName => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(this: any, arg1: any, arg2: any, arg3: any) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

class AxiosHeaders {
  [key: string]: any;
  
  constructor(headers?: RawAxiosHeaders | AxiosHeaders | string) {
    headers && this.set(headers);
  }

  set(header: string | RawAxiosHeaders | AxiosHeaders | null | undefined, valueOrRewrite?: AxiosHeaderValue | boolean, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders {
    const self = this;

    function setHeader(_value: any, _header: string, _rewrite?: boolean): void {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = utils.findKey(self, lHeader);

      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers: any, _rewrite?: boolean): void =>
      utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (utils.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite as boolean);
    } else if(utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite as boolean);
    } else if (utils.isFunction(header?.entries)) {
      for (const [key, value] of header.entries()) {
        setHeader(value, key, rewrite);
      }
    } else {
      header != null && setHeader(valueOrRewrite, header as string, rewrite);
    }

    return this;
  }

  get(header: string, parser?: boolean | RegExp | AxiosHeaderParser): any {
    header = normalizeHeader(header)!;

    if (header) {
      const key = utils.findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils.isFunction(parser)) {
          return (parser as Function).call(this, value, key);
        }

        if (utils.isRegExp(parser)) {
          return (parser as RegExp).exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header: string, matcher?: AxiosHeaderMatcher): boolean {
    header = normalizeHeader(header)!;

    if (header) {
      const key = utils.findKey(this, header);

      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header: string | string[], matcher?: AxiosHeaderMatcher): boolean {
    const self = this;
    let deleted = false;

    function deleteHeader(_header: string): void {
      _header = normalizeHeader(_header)!;

      if (_header) {
        const key = utils.findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];

          deleted = true;
        }
      }
    }

    if (utils.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header as string);
    }

    return deleted;
  }

  clear(matcher?: AxiosHeaderMatcher): boolean {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format: boolean): AxiosHeaders {
    const self = this;
    const headers: Record<string, boolean> = {};

    utils.forEach(this, (value, header) => {
      const key = utils.findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : String(header).trim();

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets: Array<AxiosHeaders | RawAxiosHeaders | string | undefined | null>): AxiosHeaders {
    return (this.constructor as typeof AxiosHeaders).concat(this, ...targets);
  }

  toJSON(asStrings?: boolean): RawAxiosHeaders {
    const obj = Object.create(null) as RawAxiosHeaders;

    utils.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator](): IterableIterator<[string, any]> {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString(): string {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }

  getSetCookie(): string[] {
    return this["set-cookie"] || [];
  }

  get [Symbol.toStringTag](): string {
    return 'AxiosHeaders';
  }

  static from(thing?: AxiosHeaders | RawAxiosHeaders | string): AxiosHeaders {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first: AxiosHeaders | RawAxiosHeaders | string, ...targets: Array<AxiosHeaders | RawAxiosHeaders | string | undefined | null>): AxiosHeaders {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header: string | string[]): typeof AxiosHeaders {
    const internals = (this as any)[$internals] = ((this as any)[$internals] = {
      accessors: {}
    });

    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header: string): void {
      const lHeader = normalizeHeader(_header);

      if (lHeader && !accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header as string);

    return this;
  }

  // Content-Type header helpers
  setContentType(value: string, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders {
    return this.set('Content-Type', value, rewrite);
  }

  getContentType(parser?: RegExp): RegExpExecArray | null;
  getContentType(matcher?: AxiosHeaderMatcher): AxiosHeaderValue;
  getContentType(matcher?: any): any {
    return this.get('Content-Type', matcher);
  }

  hasContentType(matcher?: AxiosHeaderMatcher): boolean {
    return this.has('Content-Type', matcher);
  }
}

AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

// reserved names hotfix
utils.reduceDescriptors(AxiosHeaders.prototype, ({value}, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
  return {
    get: () => value,
    set(headerValue: any) {
      this[mapped] = headerValue;
    }
  }
});

utils.freezeMethods(AxiosHeaders);

export default AxiosHeaders;
