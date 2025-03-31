import speedometer from "./speedometer";
import throttle from "./throttle";
import utils from "../utils";
import type { AxiosProgressEvent, FormDataVisitor } from '../../index.d';

export const progressEventReducer = (
  listener: (progress: AxiosProgressEvent) => void, 
  isDownloadStream?: boolean, 
  freq: number = 3
): [FormDataVisitor, () => void] => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return throttle(e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= (total || 0);

    bytesNotified = loaded;

    const data: AxiosProgressEvent = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? 'download' : 'upload']: true
    };

    listener(data);
  }, freq);
}

export const progressEventDecorator = (total: number | undefined, throttled: [FormDataVisitor, () => void]): [FormDataVisitor, () => void] => {
  const lengthComputable = total != null;

  return [(loaded: number) => throttled[0]({
    lengthComputable,
    total,
    loaded
  } as ProgressEvent), throttled[1]];
}

export const asyncDecorator = <T extends (...args: any[]) => any>(fn: T) => 
  (...args: Parameters<T>): void => utils.asap(() => fn(...args));
