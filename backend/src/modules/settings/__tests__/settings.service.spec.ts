import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SystemSettingsService } from '../settings.service';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let prisma: any;
  let config: any;
  let cache: any;

  beforeEach(() => {
    prisma = {
      systemSetting: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    config = {
      get: jest.fn(),
    };

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    service = new SystemSettingsService(prisma as any, config as any, cache as any);
  });

  it('should return from cache when cache hit', async () => {
    (cache.get as any).mockResolvedValue('CACHED_VALUE');
    const result = await service.get('TEST_KEY');
    expect(result).toBe('CACHED_VALUE');
    expect(prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });

  it('should query DB and cache when cache miss', async () => {
    (cache.get as any).mockResolvedValue(null);
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      key: 'TEST_KEY',
      value: 'DB_VALUE',
    });

    const result = await service.get('TEST_KEY');
    expect(result).toBe('DB_VALUE');
    expect(cache.set).toHaveBeenCalledWith('settings:key:TEST_KEY', 'DB_VALUE', 3600);
  });

  it('should fallback to ConfigService when not found in DB', async () => {
    (cache.get as any).mockResolvedValue(null);
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
    (config.get as any).mockReturnValue('ENV_FALLBACK_VALUE');

    const result = await service.get('TEST_KEY', 'DEFAULT');
    expect(result).toBe('ENV_FALLBACK_VALUE');
    expect(config.get).toHaveBeenCalledWith('TEST_KEY', 'DEFAULT');
  });

  it('should mask secret keys when retrieving grouped settings', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([
      { key: 'PAYMENT_VNPAY_ENABLED', value: 'true', group: 'payment', isSecret: false },
      { key: 'VNPAY_HASH_SECRET', value: 'SUPER_SECRET', group: 'payment', isSecret: true },
    ]);
    (config.get as any).mockImplementation((k: string, def: string) => def);

    const result = await service.getAllGrouped(true);
    expect(result.payment.PAYMENT_VNPAY_ENABLED).toBe('true');
    expect(result.payment.VNPAY_HASH_SECRET).toBe('••••••••••••');
  });

  it('should not overwrite secret if value is masked in updateBatch', async () => {
    prisma.systemSetting.findUnique.mockResolvedValue({
      key: 'VNPAY_HASH_SECRET',
      value: 'EXISTING_SECRET',
      isSecret: true,
      group: 'payment',
    });

    await service.updateBatch(
      [{ key: 'VNPAY_HASH_SECRET', value: '••••••••••••', group: 'payment' }],
      'admin-id',
    );

    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it('should not overwrite secret if value is empty in updateBatch', async () => {
    await service.updateBatch(
      [{ key: 'VNPAY_HASH_SECRET', value: '', group: 'payment' }],
      'admin-id',
    );

    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it('should update non-secret or new secret in updateBatch and invalidate cache', async () => {
    (prisma.systemSetting.upsert as any).mockResolvedValue({});
    await service.updateBatch(
      [{ key: 'STORE_NAME', value: 'New Store Name', group: 'general' }],
      'admin-id',
    );

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'STORE_NAME' },
      create: {
        key: 'STORE_NAME',
        value: 'New Store Name',
        group: 'GENERAL',
        isSecret: false,
        description: undefined,
        updatedBy: 'admin-id',
      },
      update: {
        value: 'New Store Name',
        group: 'GENERAL',
        isSecret: false,
        description: undefined,
        updatedBy: 'admin-id',
      },
    });
    expect(cache.del).toHaveBeenCalledWith('settings:key:STORE_NAME');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('testEmail should throw error if no target email', async () => {
    await expect(service.testEmail({})).rejects.toThrow('Không có email nhận kiểm thử');
  });

  it('testEmail should throw error if credentials missing', async () => {
    (cache.get as any).mockResolvedValue(null);
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
    (config.get as any).mockReturnValue(undefined);

    await expect(service.testEmail({ toEmail: 'test@example.com' })).rejects.toThrow(
      'Thông số SMTP (HOST, USER, PASS) chưa được cấu hình đầy đủ',
    );
  });
});
