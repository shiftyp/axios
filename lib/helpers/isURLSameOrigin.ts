import platform from '../platform/index';

const isURLSameOrigin = platform.hasStandardBrowserEnv ? 
  ((origin: URL, isMSIE: boolean) => (url: string): boolean => {
    const parsedUrl = new URL(url, platform.origin);

    return (
      origin.protocol === parsedUrl.protocol &&
      origin.host === parsedUrl.host &&
      (isMSIE || origin.port === parsedUrl.port)
    );
  })(
    new URL(platform.origin),
    platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
  ) 
  : 
  (): boolean => true;

export default isURLSameOrigin;
