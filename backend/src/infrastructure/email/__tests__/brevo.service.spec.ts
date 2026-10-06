import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BrevoService } from '../brevo.service';

describe('BrevoService', () => {
  let config: any;
  let prisma: any;

  beforeEach(() => {
    config = { get: jest.fn() };
    prisma = { systemSetting: { findMany: jest.fn() } };
  });

  it('stays in mock mode when API key is missing', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockReturnValue(undefined);

    const service = new BrevoService(config as any, prisma as any);
    expect(await service.isConfigured()).toBe(false);

    const result = await service.send({
      to: 'customer@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });
    expect(result.mocked).toBe(true);
  });

  it('sends via Brevo smtp/email API with api-key header and parsed sender', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockImplementation((key: string, defaultVal: any) => {
      const map: Record<string, any> = {
        BREVO_API_KEY: 'xkeysib-test-key',
        EMAIL_FROM: 'Phone Shop <no-reply@shop.vn>',
      };
      return map[key] ?? defaultVal;
    });

    const fetchMock: any = jest.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ messageId: 'msg-123' }),
    });
    const service = new BrevoService(
      config as any,
      prisma as any,
      fetchMock as any,
    );

    expect(await service.isConfigured()).toBe(true);

    await service.send({
      to: ['customer@example.com', 'other@example.com'],
      subject: 'Xac nhan don hang',
      html: '<p>OK</p>',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as any[];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('xkeysib-test-key');
    const body = JSON.parse(init.body);
    expect(body.sender).toEqual({ name: 'Phone Shop', email: 'no-reply@shop.vn' });
    expect(body.to).toEqual([
      { email: 'customer@example.com' },
      { email: 'other@example.com' },
    ]);
    expect(body.subject).toBe('Xac nhan don hang');
    expect(body.htmlContent).toBe('<p>OK</p>');
  });

  it('throws a readable error when Brevo API rejects the request', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (config.get as any).mockImplementation((key: string) => {
      if (key === 'BREVO_API_KEY') return 'bad-key';
      if (key === 'EMAIL_FROM') return 'shop@shop.vn';
      return undefined;
    });

    const fetchMock: any = jest.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Key not found',
    });
    const service = new BrevoService(
      config as any,
      prisma as any,
      fetchMock as any,
    );

    await expect(
      service.send({ to: 'a@b.vn', subject: 'x', html: '<p>x</p>' }),
    ).rejects.toThrow(/Brevo/i);
  });
});
