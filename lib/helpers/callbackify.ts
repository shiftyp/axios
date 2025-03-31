import utils from "../utils";

type Callback = (err: any, ...args: any[]) => void;
type AsyncFunction = (...args: any[]) => Promise<any>;
type SyncFunction = (...args: any[]) => any;
type Reducer = (value: any) => any[];

/**
 * Converts an async function to a callback-based function
 * 
 * @param {Function} fn - The async function to convert
 * @param {Function} [reducer] - A function to convert the promise result to callback arguments
 * @returns {Function} - A callback-based function
 */
const callbackify = <T extends AsyncFunction | SyncFunction>(
  fn: T, 
  reducer?: Reducer
): ((...args: [...Parameters<T>, Callback]) => void) => {
  return utils.isAsyncFn(fn) ? 
    function(this: any, ...args: any[]): void {
      const cb = args.pop() as Callback;
      (fn as AsyncFunction).apply(this, args).then(
        (value) => {
          try {
            reducer ? cb(null, ...reducer(value)) : cb(null, value);
          } catch (err) {
            cb(err);
          }
        }, 
        cb
      );
    } : 
    fn as any;
}

export default callbackify;
