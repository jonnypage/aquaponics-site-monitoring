import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

export interface SendCriticalAlertEmailInput {
  to: string[];
  subject: string;
  html: string;
}

@Injectable()
export class ResendMailerService {
  private readonly logger = new Logger(ResendMailerService.name);

  async sendCriticalAlertEmail(input: SendCriticalAlertEmailInput): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ALERT_FROM_EMAIL;
    if (!apiKey || !from) {
      this.logger.warn("RESEND_API_KEY or ALERT_FROM_EMAIL unset; skipping alert email");
      return false;
    }
    if (input.to.length === 0) {
      return false;
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html
    });

    if (error) {
      this.logger.warn(`Resend error: ${error.message}`);
      return false;
    }
    return true;
  }
}
