export function argbToRgba(argb) {
  if (argb.length === 8) {
    const a = parseInt(argb.slice(0, 2), 16) / 255;
    const r = parseInt(argb.slice(2, 4), 16);
    const g = parseInt(argb.slice(4, 6), 16);
    const b = parseInt(argb.slice(6, 8), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  // fallback for 6-digit hex
  if (argb.length === 6) {
    return `#${argb}`;
  }
  return argb;
}
