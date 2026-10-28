import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { BrevoService } from './brevo.service';
import {
  OrderItemSummary,
  OrderCancelledOptions,
  OrderDeliveredOptions,
  WarrantyItemSummary,
  buildWelcomeEmail,
  buildPasswordResetEmail,
  buildOrderConfirmationEmail,
  buildShippingNotificationEmail,
  buildReturnApprovedEmail,
  buildOrderCancelledEmail,
  buildOrderDeliveredEmail,
} from './email-template.builder';

export {
  OrderItemSummary,
  OrderCancelledOptions,
  OrderDeliveredOptions,
  WarrantyItemSummary,
};

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// M16: minimal HTML escaper for staff/partner-entered values interpolated
// into email templates.
export function escapeHtml(value?: string | null): string {
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
  private transporter: Transporter | null = null;
  public isMock = true;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly brevo?: BrevoService,
  ) {}

  private clean(val?: string | null): string {
    return (val ?? '').trim().replace(/^["']|["']$/g, '');
  }

  getResolvedConfig() {
    const host = this.clean(this.config.get<string>('EMAIL_HOST'));
    const user = this.clean(this.config.get<string>('EMAIL_USER'));
    const pass = this.clean(this.config.get<string>('EMAIL_PASS'));
    const rawPort = this.clean(String(this.config.get('EMAIL_PORT', 587)));
    const port = Number(rawPort) || 587;
    const rawSecure = this.clean(String(this.config.get('EMAIL_SECURE', 'false')));
    const secure = rawSecure === 'true' || port === 465;
    const from =
      this.clean(this.config.get<string>('EMAIL_FROM')) ||
      'Phone Shop <no-reply@phoneshop.vn>';

    return { host, user, pass, port, secure, from };
  }

  async onModuleInit() {
    try {
      await this.initTransporter();
    } catch (err) {
      this.logger.warn(
        `Failed to initialize email transporter on module init: ${(err as Error).message}`,
      );
    }
  }

  async initTransporter(): Promise<{
    transporter: Transporter | null;
    from: string;
    isMock: boolean;
  }> {
    const cfg = this.getResolvedConfig();
    const isMock = !cfg.host || !cfg.user || !cfg.pass;
    this.isMock = isMock;

    if (isMock) {
      this.logger.warn(
        'EMAIL credentials not set (EMAIL_HOST / EMAIL_USER / EMAIL_PASS). ' +
          'Running without SMTP — emails will only be logged to console, nothing is sent.',
      );
      this.transporter = null;
      return { transporter: null, from: cfg.from, isMock: true };
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        // Fail fast instead of hanging register/forgot-password for 30s+ on bad network.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      this.logger.log(
        `Email transporter initialized (host=${cfg.host}, port=${cfg.port}, user=${cfg.user})`,
      );
    }

    return { transporter: this.transporter, from: cfg.from, isMock: false };
  }

  async send(options: SendEmailOptions): Promise<void> {
    // Brevo API path (default). Raw SMTP remains available via opt-out.
    const provider = this.clean(this.config.get<string>('EMAIL_PROVIDER', 'brevo')).toLowerCase();
    if (provider === 'brevo') {
      if (!this.brevo) {
        throw new Error('EMAIL_PROVIDER=brevo but BrevoService is not available');
      }
      await this.brevo.send(options);
      return;
    }

    const { transporter, from, isMock } = await this.initTransporter();

    if (isMock || !transporter) {
      this.logger.log(
        `[EMAIL MOCK] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | Subject: ${options.subject}`,
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: options.from || from,
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

  async sendWelcomeEmail(to: string, recipientName: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    await this.send({
      to,
      subject: 'Chào mừng bạn đến với PhoneShop',
      html: buildWelcomeEmail(recipientName, frontendUrl),
    });
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    totalAmount: number,
    options?: {
      recipientName?: string;
      items?: OrderItemSummary[];
      paymentMethod?: string;
      shippingAddress?: string;
      orderUrl?: string;
    },
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const orderUrl = options?.orderUrl || `${frontendUrl}/account/orders`;
    await this.send({
      to,
      subject: `Xác nhận đơn hàng #${orderNumber}`,
      html: buildOrderConfirmationEmail({
        orderNumber,
        totalAmount,
        recipientName: options?.recipientName,
        items: options?.items,
        paymentMethod: options?.paymentMethod,
        shippingAddress: options?.shippingAddress,
        orderUrl,
      }),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    recipientName?: string,
  ): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[EMAIL MOCK] Password reset link for ${to}: ${resetLink}`);
    }
    await this.send({
      to,
      subject: 'Đặt lại mật khẩu tài khoản PhoneShop',
      html: buildPasswordResetEmail(resetLink, recipientName, 15),
    });
  }

  async sendShippingNotification(
    to: string,
    orderNumber: string,
    trackingNumber: string,
    providerName: string,
    trackingUrl?: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Đơn hàng #${orderNumber} đang được giao`,
      html: buildShippingNotificationEmail(orderNumber, trackingNumber, providerName, trackingUrl),
    });
  }

  async sendReturnApproved(
    to: string,
    returnNumber: string,
    returnAddress?: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Cập nhật yêu cầu đổi trả #${returnNumber}`,
      html: buildReturnApprovedEmail(returnNumber, returnAddress),
    });
  }

  async sendOrderCancelled(
    to: string,
    options: OrderCancelledOptions,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Thông báo hủy đơn hàng #${options.orderNumber}`,
      html: buildOrderCancelledEmail(options),
    });
  }

  async sendOrderDelivered(
    to: string,
    options: OrderDeliveredOptions,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Đơn hàng #${options.orderNumber} đã giao thành công`,
      html: buildOrderDeliveredEmail(options),
    });
  }
}
