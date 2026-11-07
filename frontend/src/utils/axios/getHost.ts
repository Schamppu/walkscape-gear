export default function getHost(): string {
  return window.location.host.includes('localhost')
    ? 'http://localhost:3001'
    : '';
}
