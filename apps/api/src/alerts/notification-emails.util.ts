import { BadRequestException } from "@nestjs/common";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_SITE_NOTIFICATION_EMAILS = 20;

export function normalizeNotificationEmails(raw: readonly string[] | null | undefined): string[] {
  if (raw == null) {
    return [];
  }
  const emails = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") {
      throw new BadRequestException("Notification emails must be strings");
    }
    const email = item.toLowerCase().trim();
    if (!email) {
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException(`Invalid notification email: ${item}`);
    }
    emails.add(email);
  }
  if (emails.size > MAX_SITE_NOTIFICATION_EMAILS) {
    throw new BadRequestException(`At most ${MAX_SITE_NOTIFICATION_EMAILS} notification emails per site`);
  }
  return [...emails].sort();
}
