import { Body, Controller, Headers, Post, UseFilters, UsePipes, ValidationPipe } from "@nestjs/common";
import { IngestRateLimitFilter } from "./ingest-rate-limit.filter.js";
import { IngestService } from "./ingest.service.js";

@Controller("ingest")
@UseFilters(IngestRateLimitFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: false,
    transform: false,
    forbidNonWhitelisted: false
  })
)
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  telemetry(@Headers("x-api-key") apiKey: string | undefined, @Body() body: unknown) {
    return this.ingestService.handleIngest(apiKey, body);
  }
}
