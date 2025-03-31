/**
 * FormData implementation for browsers
 * Uses the native FormData when available, otherwise returns null
 */
export default typeof FormData !== 'undefined' ? FormData : null;
