# TypeScript Errors in Axios Codebase

This document provides explanations and contextual code snippets for TypeScript errors found in the Axios codebase. The examples shown are actual errors from the codebase.

## Table of Contents
- [Type Assignment Errors](#type-assignment-errors)
- [Property Access Errors](#property-access-errors)
- [Parameter Type Errors](#parameter-type-errors)
- [Variable Usage Errors](#variable-usage-errors)
- [Object Literal Errors](#object-literal-errors)
- [Missing Type Definitions](#missing-type-definitions)
- [Function Call Errors](#function-call-errors)
- [Type Comparison Errors](#type-comparison-errors)

## Type Assignment Errors

### TS2322: Type is not assignable

**Error:** Type 'string' is not assignable to type 'ResponseType | undefined'.

**File:** `lib/adapters/fetch.ts:131`

```typescript
responseType = responseType ? (responseType + '').toLowerCase() : 'text';
```

**Explanation:** The `responseType` variable is expected to be of type `ResponseType | undefined`, but it's being assigned a string value. The `ResponseType` type likely has specific string literal values, and a generic string doesn't match this type.

**Fix:** Validate that the result is one of the allowed `ResponseType` values, or use type assertion.

```typescript
responseType = (responseType ? (responseType + '').toLowerCase() : 'text') as ResponseType;
```

### TS2322: Type is not assignable to type 'undefined'

**File:** `lib/adapters/fetch.ts:195`

```typescript
options[prop as keyof ResponseInit] = response[prop as keyof Response];
```

**Explanation:** This error occurs when assigning a property from the Response object to the ResponseInit object. The types don't match, with the Response property potentially being null, which isn't assignable to undefined.

## Property Access Errors

### TS2339: Property does not exist on type

**Error:** Property 'toAbortSignal' does not exist on type 'CancelToken'.

**File:** `lib/adapters/fetch.ts:133`

```typescript
let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
```

**Explanation:** The code is trying to access a `toAbortSignal` method on the `cancelToken` object, but this method doesn't exist in the `CancelToken` type definition.

**Fix:** Ensure the method exists or add it to the type definition, or use a different approach to convert the CancelToken to an AbortSignal.

## Parameter Type Errors

### TS2345: Argument is not assignable to parameter

**Error:** Argument of type '{ body: ReadableStream<any>; method: string; readonly duplex: string; }' is not assignable to parameter of type 'RequestInit'.

**File:** `lib/adapters/fetch.ts:39`

```typescript
get duplex() {
  duplexAccessed = true;
  return 'half';
},
```

**Explanation:** The `duplex` property is being used in a Request object, but it's not defined in the `RequestInit` interface. This is likely because the code is using a newer Fetch API feature that isn't reflected in the TypeScript definitions.

**Fix:** Add a custom type that extends RequestInit to include the duplex property, or use a type assertion.

```typescript
interface ExtendedRequestInit extends RequestInit {
  duplex?: string;
}

// Then use it:
new Request(url!, {
  // other properties
  duplex: "half"
} as ExtendedRequestInit);
```

### TS2345: Argument of type 'AxiosRequestHeaders' is not assignable to parameter of type 'AxiosHeaders'

**File:** `lib/adapters/fetch.ts:146`

```typescript
(requestContentLength = await resolveBodyLength(headers, data)) !== 0
```

**Explanation:** The `resolveBodyLength` function expects an `AxiosHeaders` parameter, but an `AxiosRequestHeaders` object is being passed. `AxiosRequestHeaders` is missing the required `[Symbol.toStringTag]` property.

## Variable Usage Errors

### TS2454: Variable is used before being assigned

**Error:** Variable 'id' is used before being assigned.

**File:** `lib/adapters/adapters.ts:67`

```typescript
rejectedReasons[id || '#' + i] = adapter;
```

**Explanation:** The variable `id` is being used in an expression, but it may not have been assigned a value yet.

**Fix:** Initialize the variable or add a check to ensure it has a value before using it.

```typescript
rejectedReasons[(id !== undefined ? id : '#' + i)] = adapter;
```

### TS2454: Variable 'request' is used before being assigned

**File:** `lib/adapters/fetch.ts:239`

```typescript
new AxiosError('Network Error', 'ERR_NETWORK', _config, request),
```

**Explanation:** The `request` variable is being used in the error constructor, but it may not have been assigned a value yet, especially in an error path.

**Fix:** Initialize the variable or use an optional chaining operator.

```typescript
new AxiosError('Network Error', 'ERR_NETWORK', _config, request || undefined),
```

## Object Literal Errors

### Specifying unknown properties in object literals

**Error:** Object literal may only specify known properties, and 'duplex' does not exist in type 'RequestInit'.

**File:** `lib/adapters/fetch.ts:39`

```typescript
get duplex() {
  duplexAccessed = true;
  return 'half';
},
```

**Explanation:** The object literal includes a property (`duplex`) that's not defined in the expected type (`RequestInit`).

**Fix:** Use a type assertion or create a type that extends the base type.

## Missing Type Definitions

### TS7016: Could not find a declaration file for module

**Error:** Could not find a declaration file for module 'proxy-from-env'.

**File:** `lib/adapters/http.ts:5`

```typescript
import proxyFromEnv from 'proxy-from-env';
```

**Explanation:** The code is importing a module that doesn't have TypeScript type definitions, resulting in an implicit `any` type.

**Fix:** Install type definitions for the package if available, or create a declaration file:

```typescript
// Create this in a .d.ts file
declare module 'proxy-from-env';
```

## Function Call Errors

### TS2349: This expression is not callable

**Error:** Not all constituents of type 'false | ((res: Response, config: AxiosRequestConfig<any>) => any)' are callable.

**File:** `lib/adapters/fetch.ts:220`

```typescript
let responseData = await resolvers[resolverKey](response, config);
```

**Explanation:** The resolvers object contains values that can be either a function or `false`. The code is trying to call the value without checking if it's actually a function.

**Fix:** Add a type guard to check if the resolver is a function.

```typescript
const resolver = resolvers[resolverKey];
let responseData = typeof resolver === 'function' ? await resolver(response, config) : undefined;
```

### TS2554: Expected 1-2 arguments, but got 0

**Error:** Expected 1-2 arguments, but got 0.

**File:** `test/unit/utils/utils.ts:20`

```typescript
[1, 'str', {}, new RegExp()].forEach(function (thing) {
```

**Explanation:** Creating a new RegExp instance without arguments is invalid according to the TypeScript definitions.

**Fix:** Provide a valid pattern argument:

```typescript
[1, 'str', {}, new RegExp('.*')].forEach(function (thing) {
```

## Type Comparison Errors

### TS2367: This comparison appears to be unintentional

**Error:** This comparison appears to be unintentional because the types have no overlap.

**File:** `lib/adapters/fetch.ts:189`

```typescript
const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');
```

**Explanation:** The `responseType` variable is being compared with 'response', but the types don't overlap. The `responseType` can only be certain string literals, and 'response' isn't one of them.

**Fix:** Update the comparison or add 'response' to the valid response type values:

```typescript
// If 'response' should be a valid value:
type CustomResponseType = ResponseType | 'response';
```
