/**
 * Determines if a value is a Cancel
 *
 * @param {*} value The value to test
 *
 * @returns {boolean} True if value is a Cancel, otherwise false
 */
export default function isCancel(value: any): boolean {
  return !!(value && value.__CANCEL__);
}
