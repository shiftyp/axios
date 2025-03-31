import {VERSION} from '../env/data';
import AxiosError from '../core/AxiosError';

interface ValidatorResult {
  (value: any, opt?: string, opts?: any): boolean | string;
}

interface ValidatorMap {
  [key: string]: (thing: any) => boolean | string;
  transitional: (validator: boolean | Function, version?: string, message?: string) => ValidatorResult;
  spelling: (correctSpelling: string) => ValidatorResult;
}

const validators: ValidatorMap = {
  transitional: function transitional(validator: boolean | Function, version?: string, message?: string): ValidatorResult {
    function formatMessage(opt: string, desc: string): string {
      return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
    }

    return (value: any, opt: string, opts: any): boolean => {
      if (validator === false) {
        throw new AxiosError(
          formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
          AxiosError.ERR_DEPRECATED
        );
      }

      if (version && !deprecatedWarnings[opt]) {
        deprecatedWarnings[opt] = true;
        // eslint-disable-next-line no-console
        console.warn(
          formatMessage(
            opt,
            ' has been deprecated since v' + version + ' and will be removed in the near future'
          )
        );
      }

      return validator ? (validator as Function)(value, opt, opts) : true;
    };
  },
  spelling: function spelling(correctSpelling: string): ValidatorResult {
    return (value: any, opt: string): boolean => {
      // eslint-disable-next-line no-console
      console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
      return true;
    }
  }
} as ValidatorMap;

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators[type] = function validator(thing: any): boolean | string {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

const deprecatedWarnings: Record<string, boolean> = {};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */
function assertOptions(
  options: Record<string, any>, 
  schema: Record<string, (value: any, opt?: string, opts?: any) => boolean | string>, 
  allowUnknown?: boolean
): void {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  
  const keys = Object.keys(options);
  let i = keys.length;
  
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      
      continue;
    }
    
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

export default {
  assertOptions,
  validators
};
