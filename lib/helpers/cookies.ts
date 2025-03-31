import utils from '../utils';
import platform from '../platform/index';

interface CookieHandler {
  write(name: string, value: string, expires?: number, path?: string, domain?: string, secure?: boolean): void;
  read(name: string): string | null;
  remove(name: string): void;
}

const standardBrowserCookieHandler: CookieHandler = {
  write(name: string, value: string, expires?: number, path?: string, domain?: string, secure?: boolean): void {
    const cookie = [name + '=' + encodeURIComponent(value)];

    utils.isNumber(expires) && cookie.push('expires=' + new Date(expires).toGMTString());

    utils.isString(path) && cookie.push('path=' + path);

    utils.isString(domain) && cookie.push('domain=' + domain);

    secure === true && cookie.push('secure');

    document.cookie = cookie.join('; ');
  },

  read(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return (match ? decodeURIComponent(match[3]) : null);
  },

  remove(name: string): void {
    this.write(name, '', Date.now() - 86400000);
  }
};

const nonStandardBrowserCookieHandler: CookieHandler = {
  write(): void {},
  read(): null {
    return null;
  },
  remove(): void {}
};

export default platform.hasStandardBrowserEnv ? standardBrowserCookieHandler : nonStandardBrowserCookieHandler;
