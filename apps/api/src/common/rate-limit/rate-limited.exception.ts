import { HttpException, HttpStatus } from '@nestjs/common';

/** 429 that carries the wait, so RetryAfterFilter can set the header. */
export class RateLimitedException extends HttpException {
  /** Whole seconds, rounded up, at least 1. */
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterMs: number) {
    const status = HttpStatus.TOO_MANY_REQUESTS;
    super({ statusCode: status, message }, status);
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  }
}
