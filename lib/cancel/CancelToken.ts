import CanceledError from './CanceledError.js';
import type { AxiosRequestConfig } from '../../index.d.js';

type Cancel = CanceledError;
type Executor = (cancel: (message?: string, config?: AxiosRequestConfig, request?: any) => void) => void;
type Listener = (reason: CanceledError) => void;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  promise: Promise<Cancel>;
  reason?: CanceledError;
  private _listeners?: Listener[];

  constructor(executor: Executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise!: (value: CanceledError) => void;

    this.promise = new Promise<Cancel>(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(cancel => {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null as any;
    });

    // eslint-disable-next-line func-names
    this.promise.then = <TResult1 = CanceledError, TResult2 = never>(
      onfulfilled?: ((value: CanceledError) => TResult1 | PromiseLike<TResult1>) | undefined | null
    ): Promise<TResult1 | TResult2> => {
      let _resolve!: (value: CanceledError) => void;
      
      // eslint-disable-next-line func-names
      const promise = new Promise<CanceledError>(resolve => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      (promise as any).cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise as Promise<TResult1 | TResult2>;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested(): void {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener: Listener): void {
    if (this.reason) {
      listener(this.reason);
      return;
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener: Listener): void {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Converts this cancel token to an AbortSignal
   */
  toAbortSignal(): AbortSignal {
    const controller = new AbortController();

    const abort = (err: CanceledError) => {
      controller.abort(err);
    };

    this.subscribe(abort);

    (controller.signal as any).unsubscribe = () => this.unsubscribe(abort);

    return controller.signal;
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source(): { 
    token: CancelToken; 
    cancel: (message?: string, config?: AxiosRequestConfig, request?: any) => void; 
  } {
    let cancel!: (message?: string, config?: AxiosRequestConfig, request?: any) => void;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}

export default CancelToken;
