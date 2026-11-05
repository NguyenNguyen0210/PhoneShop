import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from '../src/infrastructure/email/email.service';
import { MASKED_SECRET, SystemSettingsService } from '../src/modules/settings/settings.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('Resend SMTP delivery', () => {
  const createTransport = nodemailer.createTransport as jest.Mock;
  let sendMail: jest.Mock;
  const config = (values: Record<string, unknown> = {}) => {
    const settings: Record<string, unknown> = {
      NODE_ENV: 'production',
      EMAIL_PASS: 're_unit_test_only',
      EMAIL_FROM: 'PhoneShop <no-reply@tutorhub.id.vn>',
      ...values,
    };
    return { get: (key: string, fallback?: unknown) => settings[key] ?? fallback } as ConfigService;
  };
  const message = {
    to: 'buyer@example.com', subject: 'Order confirmation', html: '<p>Order received</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-test' });
    createTransport.mockReturnValue({ sendMail });
  });

  it('sends business email through Resend SMTP even with a stale Brevo setting', async () => {
    const service = new EmailService(config({ EMAIL_PROVIDER: 'brevo' }));
    await service.send(message);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.resend.com', port: 2465, secure: true,
      auth: { user: 'resend', pass: 're_unit_test_only' },
    }));
    expect(sendMail).toHaveBeenCalledWith({
      ...message, text: undefined, from: 'PhoneShop <no-reply@tutorhub.id.vn>',
    });
    expect(service.isMock).toBe(false);
  });

  it('preserves recipients and a message-specific sender', async () => {
    await new EmailService(config()).send({
      ...message, to: ['first@example.com', 'second@example.com'],
      from: 'Support <support@tutorhub.id.vn>',
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['first@example.com', 'second@example.com'],
      from: 'Support <support@tutorhub.id.vn>',
    }));
  });

  it('requires STARTTLS when an explicit STARTTLS port is configured', async () => {
    await new EmailService(config({ EMAIL_PORT: '2587', EMAIL_SECURE: 'false' })).send(message);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 2587, secure: false, requireTLS: true,
    }));
  });

  it('propagates SMTP failures rather than reporting delivery success', async () => {
    sendMail.mockRejectedValue(new Error('SMTP authentication failed'));
    await expect(new EmailService(config()).send(message)).rejects.toThrow('SMTP authentication failed');
  });

  it('rejects production delivery with missing credentials instead of mocking it', async () => {
    await expect(new EmailService(config({ EMAIL_PASS: '' })).send(message))
      .rejects.toThrow('SMTP is not configured');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('keeps development usable without sending when credentials are missing', async () => {
    const service = new EmailService(config({ NODE_ENV: 'development', EMAIL_PASS: '' }));
    await service.send(message);
    expect(service.isMock).toBe(true);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('uses the same server, TLS and password for admin test delivery', async () => {
    const settings = new SystemSettingsService({} as any, config());
    const result = await settings.testEmail({
      toEmail: 'admin@example.com', pass: MASKED_SECRET,
    });
    expect(result.success).toBe(true);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.resend.com', port: 2465, secure: true,
      auth: { user: 'resend', pass: 're_unit_test_only' },
      connectionTimeout: 10000,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@example.com', from: 'PhoneShop <no-reply@tutorhub.id.vn>',
    }));
  });

  it('does not treat the SMTP username resend as a recipient address', async () => {
    const settings = new SystemSettingsService({} as any, config());
    await expect(settings.testEmail({})).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('does not report configured SMTP based on a leftover Brevo key', async () => {
    const settings = new SystemSettingsService({
      systemSetting: { findMany: jest.fn().mockResolvedValue([]) },
    } as any, config({ EMAIL_PASS: '', BREVO_API_KEY: 'old-test-key' }));
    const groups = await settings.getAllGrouped();
    expect(groups.email.EMAIL_PROVIDER).toBe('smtp');
    expect(groups.email.EMAIL_HOST).toBe('smtp.resend.com');
    expect(groups.email.EMAIL_SECURE).toBe('true');
    expect(groups.email.EMAIL_STATUS).toContain('Chưa');
  });
});
