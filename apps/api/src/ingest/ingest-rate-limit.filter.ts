import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { IngestRateLimitException } from "./ingest-rate-limit.exception.js";

@Catch(IngestRateLimitException)
export class IngestRateLimitFilter implements ExceptionFilter {
  catch(exception: IngestRateLimitException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    res.setHeader("Retry-After", String(exception.retryAfterSeconds));
    res.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message
    });
  }
}
