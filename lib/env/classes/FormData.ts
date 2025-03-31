import _FormData from 'form-data';

/**
 * Uses the browser's native FormData or falls back to the form-data package in Node.js
 */
export default typeof FormData !== 'undefined' ? FormData : _FormData;
