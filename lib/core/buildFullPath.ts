import isAbsoluteURL from '../helpers/isAbsoluteURL';
import combineURLs from '../helpers/combineURLs';

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @param {boolean} allowAbsoluteUrls Whether to allow absolute URLs to be combined with baseURL
 *
 * @returns {string} The combined full path
 */
export default function buildFullPath(
  baseURL?: string, 
  requestedURL?: string, 
  allowAbsoluteUrls?: boolean
): string {
  if (!requestedURL) {
    return baseURL || '';
  }
  
  const isRelativeUrl = !isAbsoluteURL(requestedURL);
  
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    return combineURLs(baseURL, requestedURL);
  }
  
  return requestedURL;
}
