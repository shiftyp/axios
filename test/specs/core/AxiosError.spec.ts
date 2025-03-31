import AxiosError from '../../../lib/core/AxiosError.js';
import type { AxiosRequestConfig, AxiosResponse } from '../../../index.d.js';

describe('core::AxiosError', function() {
  it('should create an Error with message, config, code, request, response, stack and isAxiosError', function() {
    const request = { path: '/foo' };
    const response = { status: 200, data: { foo: 'bar' } } as AxiosResponse;
    const error = new AxiosError('Boom!', 'ESOMETHING', { foo: 'bar' } as AxiosRequestConfig, request, response);
    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Boom!');
    expect(error.config).toEqual({ foo: 'bar' });
    expect(error.code).toBe('ESOMETHING');
    expect(error.request).toBe(request);
    expect(error.response).toBe(response);
    expect(error.isAxiosError).toBe(true);
    expect(error.stack).toBeDefined();
  });
  
  it('should create an Error that can be serialized to JSON', function() {
    // Attempting to serialize request and response results in
    //    TypeError: Converting circular structure to JSON
    const request = { path: '/foo' };
    const response = { status: 200, data: { foo: 'bar' } } as AxiosResponse;
    const error = new AxiosError('Boom!', 'ESOMETHING', { foo: 'bar' } as AxiosRequestConfig, request, response);
    const json = error.toJSON();
    expect(json.message).toBe('Boom!');
    expect(json.config).toEqual({ foo: 'bar' });
    expect(json.code).toBe('ESOMETHING');
    expect(json.status).toBe(200);
    expect(json.request).toBe(undefined);
    expect(json.response).toBe(undefined);
  });

  describe('core::createError.from', function() {
    it('should add config, config, request and response to error', function() {
      const error = new Error('Boom!');
      const request = { path: '/foo' };
      const response = { status: 200, data: { foo: 'bar' } } as AxiosResponse;

      const axiosError = AxiosError.from(error, 'ESOMETHING', { foo: 'bar' } as AxiosRequestConfig, request, response);
      expect(axiosError.config).toEqual({ foo: 'bar' });
      expect(axiosError.code).toBe('ESOMETHING');
      expect(axiosError.request).toBe(request);
      expect(axiosError.response).toBe(response);
      expect(axiosError.isAxiosError).toBe(true);
    });

    it('should return error', function() {
      const error = new Error('Boom!');
      expect(AxiosError.from(error, 'ESOMETHING', { foo: 'bar' } as AxiosRequestConfig) instanceof AxiosError).toBeTruthy();
    });
  });

  it('should have status property when response was passed to the constructor', () => {
      const err = new AxiosError('test', 'foo', {}, {}, {status: 400} as AxiosResponse);
      expect(err.status).toBe(400);
  });
});
