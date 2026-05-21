import {
  Body,
  Controller,
  Headers,
  Post,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { IngestRateLimitFilter } from "./ingest-rate-limit.filter.js";
import { IngestSnapshotService } from "./ingest-snapshot.service.js";
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
  constructor(
    private readonly ingestService: IngestService,
    private readonly ingestSnapshotService: IngestSnapshotService
  ) {}

  @Post()
  telemetry(@Headers("x-api-key") apiKey: string | undefined, @Body() body: unknown) {
    return this.ingestService.handleIngest(apiKey, body);
  }

  @Post("snapshot")
  @UseInterceptors(FileFieldsInterceptor([{ name: "image", maxCount: 1 }]))
  snapshot(
    @Headers("x-api-key") apiKey: string | undefined,
    @Body("metadata") metadata: string | undefined,
    @UploadedFiles()
    files: { image?: Array<{ buffer: Buffer; mimetype: string }> }
  ) {
    const imageFile = files.image?.[0];
    return this.ingestSnapshotService.handleSnapshotIngest(
      apiKey,
      metadata,
      imageFile?.buffer,
      imageFile?.mimetype
    );
  }
}
