import transformData from '../../../lib/core/transformData.js';
import type { AxiosTransformer, AxiosResponseHeaders } from '../../../index.d.js';

describe('core::transformData', function () {
  it('should support a single transformer', function () {
    let data: string;

    data = transformData.call({

    }, function (data: any): string {
      data = 'foo';
      return data;
    });

    expect(data).toEqual('foo');
  });

  it('should support an array of transformers', function () {
    let data = '';
    data = transformData.call({data}, [
      function (data: string): string {
        data += 'f';
        return data;
      },
      function (data: string): string {
        data += 'o';
        return data;
      },
      function (data: string): string {
        data += 'o';
        return data;
      }
    ] as AxiosTransformer[]);

    expect(data).toEqual('foo');
  });

  it('should support reference headers in transformData', function () {
    const headers: AxiosResponseHeaders = {
      'content-type': 'foo/bar'
    };
    let data = '';
    data = transformData.call({data, headers}, [
      function (data: string, headers: AxiosResponseHeaders): string {
        data += headers['content-type'];
        return data;
      }
    ] as AxiosTransformer[]);

    expect(data).toEqual('foo/bar');
  });

  it('should support reference status code in transformData', function () {
    let data = '';
    data = transformData.call({}, [
      function (data: string, headers: AxiosResponseHeaders, status: number): string {
        data += status;
        return data;
      }
    ] as AxiosTransformer[], {data, status: 200});

    expect(data).toEqual('200');
  });
});
