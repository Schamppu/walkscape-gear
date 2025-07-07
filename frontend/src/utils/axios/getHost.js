export default function getHost() {
  return window.location.host.includes('localhost')
    ? 'http://localhost:3001'
    : '';
}
