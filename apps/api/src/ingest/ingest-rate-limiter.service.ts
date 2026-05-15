import { Injectable } from "@nestjs/common";
import { IngestRateLimitException } from "./ingest-rate-limit.exception.js";

@Injectable()
export class IngestRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  /**
   * Enforce per-device cap: roughly one successful ingest per `intervalSeconds`,
   * plus `INGEST_RATE_LIMIT_BURST` extra accepts in the same rolling window (MVP, in-memory).
   */
  assertAllowed(deviceId: string, intervalSeconds: number): void {
    const burst = Math.max(0, parseInt(process.env.INGEST_RATE_LIMIT_BURST ?? "2", 10));
    const maxInWindow = 1 + burst;
    const windowMs = Math.max(1, intervalSeconds) * 1000;
    const now = Date.now();
    let stamps = this.buckets.get(deviceId) ?? [];
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= maxInWindow) {
      const oldest = stamps[0]!;
      const waitMs = windowMs - (now - oldest);
      throw new IngestRateLimitException(Math.max(1, Math.ceil(waitMs / 1000)));
    }
    stamps.push(now);
    this.buckets.set(deviceId, stamps);
  }

  rollbackLast(deviceId: string): void {
    const stamps = this.buckets.get(deviceId);
    if (!stamps || stamps.length === 0) {
      return;
    }
    stamps.pop();
    this.buckets.set(deviceId, stamps);
  }
}
