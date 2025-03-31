import adapters from '../../../lib/adapters/adapters';
import assert from 'assert';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from '../../../index.d';


describe('adapters', function () {
  const store = {...adapters.adapters};

  beforeEach(() => {
    Object.keys(adapters.adapters).forEach((name) => {
      delete adapters.adapters[name];
    });

    Object.assign(adapters.adapters, store);
  });

  it('should support loading by fn handle', function () {
    const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
      return Promise.resolve<AxiosResponse>({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config
      });
    };
    assert.strictEqual(adapters.getAdapter(adapter), adapter);
  });

  it('should support loading by name', function () {
    const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
      return Promise.resolve<AxiosResponse>({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config
      });
    };
    // Using type assertion to handle test case
    adapters.adapters['testadapter'] = adapter;
    assert.strictEqual(adapters.getAdapter('testAdapter'), adapter);
  });

  it('should detect adapter unavailable status', function () {
    // Using type assertion to allow null for test case
    (adapters.adapters as Record<string, any>)['testadapter'] = null;
    assert.throws(()=> adapters.getAdapter('testAdapter'), /is not available in the build/)
  });

  it('should detect adapter unsupported status', function () {
    // Using type assertion to allow boolean for test case
    (adapters.adapters as Record<string, any>)['testadapter'] = false;
    assert.throws(()=> adapters.getAdapter('testAdapter'), /is not supported by the environment/)
  });

  it('should pick suitable adapter from the list', function () {
    const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
      return Promise.resolve<AxiosResponse>({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config
      });
    };

    // Using type assertion to allow mixed types for test case
    Object.assign(adapters.adapters as Record<string, any>, {
      foo: false,
      bar: null,
      baz: adapter
    });

    assert.strictEqual(adapters.getAdapter(['foo', 'bar', 'baz']), adapter);
  });
});
