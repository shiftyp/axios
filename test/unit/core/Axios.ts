import Axios from "../../../lib/core/Axios";
import assert from "assert";
import type { AxiosRequestConfig } from "../../../index.d";

describe('Axios', function () {
  describe("handle un-writable error stack", function () {
    async function testUnwritableErrorStack(stackAttributes: PropertyDescriptor): Promise<void> {
      const axios = new Axios({});
      // mock axios._request to return an Error with an un-writable stack property
      axios._request = (): never => {
        const mockError = new Error("test-error");
        Object.defineProperty(mockError, "stack", stackAttributes);
        throw mockError;
      }
      try {
        await axios.request("test-url", {} as AxiosRequestConfig)
      } catch (e) {
        assert.strictEqual((e as Error).message, "test-error")
      }
    }

    it('should support errors with a defined but un-writable stack', async function () {
      await testUnwritableErrorStack({value: {}, writable: false})
    });

    it('should support errors with an undefined and un-writable stack', async function () {
      await testUnwritableErrorStack({value: undefined, writable: false})
    });

    it('should support errors with a custom getter/setter for the stack property', async function () {
      await testUnwritableErrorStack({
        get: () => ({}),
        set: () => {
          throw new Error('read-only');
        }
      })
    });

    it('should support errors with a custom getter/setter for the stack property (null case)', async function () {
      await testUnwritableErrorStack({
        get: () => null,
        set: () => {
          throw new Error('read-only');
        }
      })
    });
  })
});
