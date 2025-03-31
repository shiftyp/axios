/**
 * Blob implementation for browsers
 * Uses the native Blob when available, otherwise returns null
 */
export default typeof Blob !== 'undefined' ? Blob : null;
