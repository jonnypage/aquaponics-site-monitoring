import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import { AlertsService } from "../alerts/alerts.service.js";
import { ResendMailerService } from "../alerts/resend-mailer.service.js";
import { IngestAlertService } from "../ingest/ingest-alert.service.js";

function parseCooldownMinutes(): number {
  const raw = process.env.COOLDOWN_MINUTES;
  if (raw == null || raw.trim() === "") {
    return 45;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly ingestAlerts: IngestAlertService,
    private readonly alertsService: AlertsService,
    private readonly mailer: ResendMailerService
  ) {}

  /** ~60s: device offline reconciliation + critical alert emails (cooldown-gated). */
  @Interval(60_000)
  async runPeriodicJobs(): Promise<void> {
    try {
      await this.ingestAlerts.syncAllDeviceOfflineStates();
    } catch (e) {
      this.logger.warn(`Device offline sync failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      await this.notifyCriticalAlertsDue();
    } catch (e) {
      this.logger.warn(`Critical alert notify failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async notifyCriticalAlertsDue(): Promise<void> {
    const cooldownMs = parseCooldownMinutes() * 60 * 1000;
    const threshold = new Date(Date.now() - cooldownMs);

    const candidates = await this.alertsService.listCriticalAlertsNeedingNotify(threshold);

    for (const row of candidates) {
      const claimed = await this.alertsService.claimCriticalNotifySlot(row.id, threshold);
      if (!claimed) {
        continue;
      }

      const recipients = await this.alertsService.resolveRecipientEmailsForSite(row.site_id);
      if (recipients.length === 0) {
        continue;
      }

      const subject = `[Aquaponics] Critical alert: ${row.type} (${row.site_name})`;
      const html = `
        <p><strong>Site:</strong> ${escapeHtml(row.site_name)}</p>
        <p><strong>Alert type:</strong> ${escapeHtml(row.type)}</p>
        <p><strong>Message:</strong> ${escapeHtml(row.message)}</p>
      `;

      await this.mailer.sendCriticalAlertEmail({
        to: recipients,
        subject,
        html
      });
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
