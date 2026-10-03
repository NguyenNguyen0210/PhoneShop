import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// M16: minimal HTML escaper for staff/partner-entered values interpolated
// into email templates.
export function escapeHtml(value: string): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private from: string;
  private isMock: boolean;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('EMAIL_HOST');
    const user = this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('EMAIL_PASS');

    this.from = this.config.get<string>('EMAIL_FROM', 'no-reply@mobilecommerce.vn');
    this.isMock = !host || !user || !pass;

    if (this.isMock) {
      this.logger.warn(
        'EMAIL credentials not set (EMAIL_HOST / EMAIL_USER / EMAIL_PASS). ' +
          'Running without SMTP — emails will only be logged to console, nothing is sent.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('EMAIL_PORT', 587),
      secure: this.config.get<string>('EMAIL_SECURE') === 'true',
      auth: { user, pass },
    });

    this.logger.log(`Email transporter initialized (host=${host})`);
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (this.isMock) {
      this.logger.log(
        `[EMAIL MOCK] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | Subject: ${options.subject}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, (err as Error).message);
      throw err;
    }
  }

  async sendOrderConfirmation(to: string, orderNumber: string, totalAmount: number): Promise<void> {
    await this.send({
      to,
      subject: `[MobileCommerce] Xác nhận đơn hàng #${orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🎉 Cảm ơn bạn đã đặt hàng!</h2>
          <p>Đơn hàng <strong>#${orderNumber}</strong> của bạn đã được xác nhận.</p>
          <p>Tổng tiền: <strong style="color:#e94560">${totalAmount.toLocaleString('vi-VN')} đ</strong></p>
          <p>Chúng tôi sẽ thông báo ngay khi đơn hàng được giao đi.</p>
          <hr/>
          <small style="color:#888">MobileCommerce — Chuyên thiết bị di động</small>
        </div>
      `,
    });
  }

  // NOTE: password-reset / email-verification senders were removed (dead
  // code — no auth flow ever called them). When those flows are built, they
  // need hashed single-use tokens with 15–30 min expiry (see audit notes).

  async sendShippingNotification(
    to: string,
    orderNumber: string,
    trackingNumber: string,
    providerName: string,
  ): Promise<void> {
    // M16: provider/tracking values are staff/partner-entered free text —
    // escape before interpolating into HTML (stored XSS via email client).
    const safeProvider = escapeHtml(providerName);
    const safeTracking = escapeHtml(trackingNumber);
    const safeOrder = escapeHtml(orderNumber);
    await this.send({
      to,
      subject: `[MobileCommerce] Đơn hàng #${safeOrder} đang được giao`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🚚 Đơn hàng đang trên đường!</h2>
          <p>Đơn hàng <strong>#${safeOrder}</strong> đã được bàn giao cho <strong>${safeProvider}</strong>.</p>
          <p>Mã vận đơn: <strong style="color:#e94560">${safeTracking}</strong></p>
          <p>Bạn có thể tra cứu trạng thái giao hàng trên website của đơn vị vận chuyển.</p>
        </div>
      `,
    });
  }

  async sendReturnApproved(to: string, returnNumber: string): Promise<void> {
    await this.send({
      to,
      subject: `[MobileCommerce] Yêu cầu hoàn hàng #${returnNumber} đã được duyệt`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">✅ Yêu cầu hoàn hàng được chấp thuận</h2>
          <p>Yêu cầu hoàn hàng <strong>#${returnNumber}</strong> của bạn đã được xét duyệt.</p>
          <p>Vui lòng gửi hàng về địa chỉ của chúng tôi trong vòng <strong>3 ngày làm việc</strong>.</p>
        </div>
      `,
    });
  }
}
