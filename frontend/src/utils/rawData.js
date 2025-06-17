import { isReactive, toRaw } from "vue";

export function isObject(value) {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function getRawData(data) {
  return isReactive(data) ? toRaw(data) : data;
}

export function toDeepRaw(data) {
  const rawData = getRawData(data);

  for (const key in rawData) {
    const value = rawData[key];

    if (!isObject(value) && !Array.isArray(value)) {
      continue;
    }

    rawData[key] = toDeepRaw(value);
  }

  return structuredClone(rawData)
}
