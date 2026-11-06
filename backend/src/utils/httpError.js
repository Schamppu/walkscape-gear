// An error whose message is safe to show the client, sent with `status`.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
