import CanceledError from "../cancel/CanceledError";
import AxiosError from "../core/AxiosError";
import utils from '../utils';

interface ExtendedAbortSignal extends AbortSignal {
  unsubscribe?: () => void;
}

interface SignalLike {
  addEventListener: (type: string, listener: (event: any) => void) => void;
  removeEventListener: (type: string, listener: (event: any) => void) => void;
  reason?: any;
  unsubscribe?: (listener: (reason: any) => void) => void;
}

const composeSignals = (signals?: (SignalLike | null | undefined)[], timeout?: number): ExtendedAbortSignal | undefined => {
  const {length} = (signals = signals ? signals.filter(Boolean) as SignalLike[] : []);

  if (timeout || length) {
    let controller = new AbortController();

    let aborted: boolean;

    const onabort = function(this: SignalLike, reason: any) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError ? err : new CanceledError(err instanceof Error ? err.message : err));
      }
    }

    let timer: ReturnType<typeof setTimeout> | null = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT))
    }, timeout)

    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach(signal => {
          signal.unsubscribe ? signal.unsubscribe(onabort) : signal.removeEventListener('abort', onabort);
        });
        signals = null as any;
      }
    }

    signals.forEach((signal) => signal.addEventListener('abort', onabort));

    const {signal} = controller;
    const extendedSignal = signal as ExtendedAbortSignal;

    extendedSignal.unsubscribe = () => utils.asap(unsubscribe);

    return extendedSignal;
  }
  
  return undefined;
}

export default composeSignals;
