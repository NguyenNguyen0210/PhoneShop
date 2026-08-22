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
          'Running in mock mode — emails will only be logged to console.',
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

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    await this.send({
      to,
      subject: `[MobileCommerce] Đặt lại mật khẩu`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🔒 Đặt lại mật khẩu</h2>
          <p>Sử dụng token dưới đây để đặt lại mật khẩu (có hiệu lực <strong>30 phút</strong>):</p>
          <div style="background:#f4f4f4;padding:16px;border-radius:8px;font-size:20px;letter-spacing:4px;text-align:center">
            <strong>${resetToken}</strong>
          </div>
          <p style="color:#888;font-size:12px;margin-top:16px">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
        </div>
      `,
    });
  }

  async sendVerificationEmail(to: string, verificationCode: string): Promise<void> {
    await this.send({
      to,
      subject: `[MobileCommerce] Xác thực email của bạn`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">✉️ Xác thực tài khoản</h2>
          <p>Mã xác thực của bạn là:</p>
          <div style="background:#1a1a2e;color:#fff;padding:24px;border-radius:8px;font-size:32px;letter-spacing:8px;text-align:center">
            <strong>${verificationCode}</strong>
          </div>
          <p style="color:#888;font-size:12px;margin-top:16px">Mã có hiệu lực trong <strong>15 phút</strong>.</p>
        </div>
      `,
    });
  }

  async sendShippingNotification(
    to: string,
    orderNumber: string,
    trackingNumber: string,
    providerName: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `[MobileCommerce] Đơn hàng #${orderNumber} đang được giao`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🚚 Đơn hàng đang trên đường!</h2>
          <p>Đơn hàng <strong>#${orderNumber}</strong> đã được bàn giao cho <strong>${providerName}</strong>.</p>
          <p>Mã vận đơn: <strong style="color:#e94560">${trackingNumber}</strong></p>
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
