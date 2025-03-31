import type { FormDataVisitor } from '../../index.d';

/**
 * Throttle decorator
 * @param {Function} fn - The function to throttle
 * @param {Number} freq - The frequency in Hz for throttle
 * @return {Array} - Array containing the throttled function and flush function
 */
function throttle<T extends any[]>(
  fn: (...args: T) => void, 
  freq: number
): [FormDataVisitor, () => void] {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const invoke = (args: T, now: number = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn.apply(null, args);
  }

  const throttled = (...args: T) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          if (lastArgs) invoke(lastArgs);
        }, threshold - passed);
      }
    }
  }

  const flush = () => lastArgs && invoke(lastArgs);

  return [throttled as unknown as FormDataVisitor, flush];
}

export default throttle;
