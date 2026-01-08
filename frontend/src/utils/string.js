export function capitalize(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function camelCaseToWords(s) {
  const result = s.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
