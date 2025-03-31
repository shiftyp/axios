/**
 * Function to bind a function to a specified this-context
 *
 * @param {Function} fn The function to bind
 * @param {Object} thisArg The this context to bind fn to
 * @returns {Function} A function that has its this-context bound
 */
export default function bind<T extends (...args: any[]) => any>(
  fn: T, 
  thisArg: any
): (...args: Parameters<T>) => ReturnType<T> {
  return function wrap(this: any, ...args: Parameters<T>): ReturnType<T> {
    return fn.apply(thisArg, args);
  };
}
