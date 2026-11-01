// An error whose message is written for the user. The global error handler shows
// err.message only for errors marked `expose` (by default, any 4xx); everything else
// gets a generic message so internal details never reach the client.
class AppError extends Error {
  constructor(statusCode, message, { expose = statusCode < 500 } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

module.exports = AppError;
