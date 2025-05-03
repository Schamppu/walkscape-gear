export default function getHost() {
  return window.location.host === 'localhost:5173'
    ? 'http://localhost:3001/'
    : '/';
}
