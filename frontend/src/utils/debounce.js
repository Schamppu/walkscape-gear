export default function debounce(func, delay, context = null) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context ?? this, args);
    }, delay);
  };
}
