import isCancel from '../../../lib/cancel/isCancel.js';
import CanceledError from '../../../lib/cancel/CanceledError.js';

describe('isCancel', function() {
  it('returns true if value is a CanceledError', function() {
    expect(isCancel(new CanceledError())).toBe(true);
  });

  it('returns false if value is not a CanceledError', function() {
    expect(isCancel({ foo: 'bar' })).toBe(false);
  });
});
