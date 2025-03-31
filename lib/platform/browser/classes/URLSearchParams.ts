import AxiosURLSearchParams from '../../../helpers/AxiosURLSearchParams';

/**
 * Uses the browser's native URLSearchParams or falls back to the custom implementation
 */
export default typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;
