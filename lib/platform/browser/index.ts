import URLSearchParams from './classes/URLSearchParams';
import FormData from './classes/FormData';
import Blob from './classes/Blob';

/**
 * Browser platform-specific config
 */
export default {
  isBrowser: true,
  classes: {
    URLSearchParams,
    FormData,
    Blob
  },
  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
};
