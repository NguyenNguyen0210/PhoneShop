import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let config: any;
  let prisma: any;

  beforeEach(() => {
    config = {
      get: jest.fn(),
    };
    prisma = {
      systemSetting: {
        findMany: jest.fn(),
      },
    };
    service = new EmailService(config as any, prisma as any);
  });

  it('should resolve config from database system_settings when present', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([
      { key: 'EMAIL_HOST', value: 'smtp.custom.com' },
      { key: 'EMAIL_USER', value: 'admin@custom.com' },
      { key: 'EMAIL_PASS', value: 'secretpass' },
      { key: 'EMAIL_PORT', value: '465' },
      { key: 'EMAIL_SECURE', value: 'true' },
      { key: 'EMAIL_FROM', value: 'Custom <info@custom.com>' },
    ]);

    const resolved = await service.getResolvedConfig();
    expect(resolved.host).toBe('smtp.custom.com');
    expect(resolved.user).toBe('admin@custom.com');
    expect(resolved.pass).toBe('secretpass');
    expect(resolved.port).toBe(465);
    expect(resolved.secure).toBe(true);
    expect(resolved.from).toBe('Custom <info@custom.com>');
  });

  it('should fallback to ConfigService (.env) when DB has no email settings', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockImplementation((key: string, defaultVal: any) => {
      const map: Record<string, any> = {
        EMAIL_HOST: 'smtp.gmail.com',
        EMAIL_USER: 'test@gmail.com',
        EMAIL_PASS: 'apppassword',
        EMAIL_PORT: 587,
        EMAIL_SECURE: 'false',
        EMAIL_FROM: 'PhoneShop <test@gmail.com>',
      };
      return map[key] ?? defaultVal;
    });

    const resolved = await service.getResolvedConfig();
    expect(resolved.host).toBe('smtp.gmail.com');
    expect(resolved.user).toBe('test@gmail.com');
    expect(resolved.pass).toBe('apppassword');
    expect(resolved.port).toBe(587);
    expect(resolved.secure).toBe(false);
  });

  it('should strip quotes from env strings', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockImplementation((key: string, defaultVal: any) => {
      const map: Record<string, any> = {
        EMAIL_HOST: '"smtp.gmail.com"',
        EMAIL_USER: '"test@gmail.com"',
        EMAIL_PASS: '"apppassword"',
      };
      return map[key] ?? defaultVal;
    });

    const resolved = await service.getResolvedConfig();
    expect(resolved.host).toBe('smtp.gmail.com');
    expect(resolved.user).toBe('test@gmail.com');
    expect(resolved.pass).toBe('apppassword');
  });

  it('should remain in mock mode when credentials are not configured', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockReturnValue(undefined);

    const init = await service.initTransporter();
    expect(init.isMock).toBe(true);
    expect(init.transporter).toBeNull();
  });

  it('sendWelcomeEmail should format template and invoke send', async () => {
    const sendSpy = jest.spyOn(service, 'send').mockResolvedValue(undefined);
    await service.sendWelcomeEmail('customer@example.com', 'Nguyen Van A');
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: expect.stringContaining('PhoneShop'),
        html: expect.stringContaining('Nguyen Van A'),
      }),
    );
  });

  it('sendOrderConfirmation should format responsive branded HTML with items and total', async () => {
    const sendSpy = jest.spyOn(service, 'send').mockResolvedValue(undefined);
    await service.sendOrderConfirmation('buyer@example.com', 'ORD-12345', 34990000, {
      recipientName: 'Tran Thi B',
      paymentMethod: 'Chuyển khoản VietQR',
      shippingAddress: '123 Đường Lê Lợi, Quận 1, TP. HCM',
      items: [{ name: 'iPhone 16 Pro Max 256GB', quantity: 1, price: 34990000, color: 'Titan Sa Mạc' }],
    });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: expect.stringContaining('ORD-12345'),
        html: expect.stringContaining('iPhone 16 Pro Max'),
      }),
    );
  });

  it('sendShippingNotification should render tracking number and provider', async () => {
    const sendSpy = jest.spyOn(service, 'send').mockResolvedValue(undefined);
    await service.sendShippingNotification(
      'buyer@example.com',
      'ORD-12345',
      'VNPOST-999888',
      'VNPost Nhanh',
    );

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: expect.stringContaining('ORD-12345'),
        html: expect.stringContaining('VNPOST-999888'),
      }),
    );
  });

  it('sendReturnApproved should render return number and instructions', async () => {
    const sendSpy = jest.spyOn(service, 'send').mockResolvedValue(undefined);
    await service.sendReturnApproved('buyer@example.com', 'RET-888999');

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: expect.stringContaining('RET-888999'),
        html: expect.stringContaining('RET-888999'),
      }),
    );
  });

  it('routes send through Brevo when EMAIL_PROVIDER=brevo', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockImplementation((key: string, defaultVal: any) => {
      if (key === 'EMAIL_PROVIDER') return 'brevo';
      return defaultVal;
    });
    const brevo = {
      send: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ mocked: false }),
    };
    const svc = new EmailService(config as any, prisma as any, brevo as any);

    await svc.send({ to: 'buyer@example.com', subject: 'Hi', html: '<p>Hi</p>' });

    expect(brevo.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', subject: 'Hi' }),
    );
  });
});
