/**
 * Utility functions for handling raw data and objects in Vue.js.
 *
 * Functions:
 * - `isObject(value)`: Checks if the provided value is a non-null object (excluding arrays).
 * - `getRawData(data)`: Returns the raw data if the input is reactive, otherwise returns the input as is.
 * - `toDeepRaw(data)`: Returns a deep, non-reactive copy of the input, unwrapping nested reactive proxies without modifying the source.
 *
 */

import { isReactive, toRaw } from "vue";

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function getRawData<T>(data: T): T {
  return isReactive(data) ? toRaw(data) : data;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepCopyRaw(value: unknown): unknown {
  const raw = toRaw(value);
  if (Array.isArray(raw)) return raw.map(deepCopyRaw);
  if (isPlainObject(raw)) {
    const copy: Record<string, unknown> = {};
    for (const key in raw) copy[key] = deepCopyRaw(raw[key]);
    return copy;
  }
  // Maps, Sets, Dates etc. hold no nested proxies in practice.
  return isObject(raw) ? structuredClone(raw) : raw;
}

/**
 * Returns a deep, non-reactive copy of `data`. Reactive proxies at any depth
 * are unwrapped; the source object is never modified.
 */
export function toDeepRaw<T>(data: T): T {
  return deepCopyRaw(data) as T;
}
