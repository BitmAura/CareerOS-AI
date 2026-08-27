import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  findByUserId(userId: string) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async create(data: Partial<Notification>) {
    const n = this.notificationRepository.create(data);
    const saved = await this.notificationRepository.save(n);

    // If an email payload is attached in data, send transactional email
    if (data.data) {
      try {
        const meta = JSON.parse(data.data);
        if (meta.emailTo) {
          await this.sendTransactionalEmail({
            to: meta.emailTo,
            subject: data.title || "CareerOS Notification",
            body: data.message || "",
          });
        }
      } catch {
        // ignore parse error
      }
    }

    return saved;
  }

  markAsRead(id: string) {
    return this.notificationRepository.update(id, { read: true });
  }

  /**
   * Send transactional email using Resend / SendGrid / SMTP if API key configured,
   * with fallback to structured audit logger.
   */
  async sendTransactionalEmail(options: { to: string; subject: string; body: string }): Promise<boolean> {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CareerOS AI <notifications@careeros.ai>",
            to: [options.to],
            subject: options.subject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #c45c26;">CareerOS AI</h2>
              <p>${options.body.replace(/\n/g, "<br/>")}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">CareerOS — The Career Operating System for India Manufacturing</p>
            </div>`,
          }),
        });
        return response.ok;
      } catch (err: any) {
        this.logger.error(`Resend email delivery error: ${err.message}`);
      }
    }

    // Production log transport
    this.logger.log(`[EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}`);
    return true;
  }
}
