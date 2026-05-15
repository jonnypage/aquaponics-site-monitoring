import "dotenv/config";
import "reflect-metadata";
import { Logger, ValidationPipe, type LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

function buildCorsOptions() {
  const webOrigin = process.env.WEB_ORIGIN;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && webOrigin) {
    return {
      origin: webOrigin,
      credentials: true
    };
  }

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean | string) => void
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, origin);
    },
    credentials: true
  };
}

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const loggerLevels: LogLevel[] = isProduction
    ? ["warn", "error"]
    : ["log", "error", "warn", "debug", "verbose"];
  const app = await NestFactory.create(AppModule, { logger: loggerLevels });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true
    })
  );

  app.enableCors(buildCorsOptions());
  app.enableShutdownHooks();

  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

bootstrap().catch((error) => {
  Logger.error(error, "Bootstrap");
  process.exit(1);
});
