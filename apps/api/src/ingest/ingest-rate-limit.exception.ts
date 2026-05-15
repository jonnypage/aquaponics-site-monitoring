import { HttpException, HttpStatus } from "@nestjs/common";

export class IngestRateLimitException extends HttpException {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too Many Requests", HttpStatus.TOO_MANY_REQUESTS);
  }
}
