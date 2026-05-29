import { Body, Controller, Headers, Post, UseFilters } from "@nestjs/common";
import { IngestRateLimitFilter } from "./ingest-rate-limit.filter.js";
import { CheckinService } from "./checkin.service.js";

@Controller("checkin")
@UseFilters(IngestRateLimitFilter)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  checkin(@Headers("x-api-key") apiKey: string | undefined, @Body() body: unknown) {
    return this.checkinService.handleCheckin(apiKey, body);
  }
}
