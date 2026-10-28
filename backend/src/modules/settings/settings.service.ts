import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SettingItemDto, TestEmailDto, TestStorageDto, TestVietQrDto } from './dto/settings.dto';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';
import { buildTestDiagnosticEmail } from '../../infrastructure/email/email-template.builder';

export const MASKED_SECRET = '••••••••••••';

export const DEFAULT_DEFINITIONS: Record<
  string,
  { group: string; isSecret: boolean; defaultVal?: string }
> = {
  PAYMENT_COD_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  PAYMENT_VNPAY_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  PAYMENT_VIETQR_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  VIETQR_BANK_ID: { group: 'payment', isSecret: false, defaultVal: '970422' },
  VIETQR_ACCOUNT_NO: { group: 'payment', isSecret: false, defaultVal: '0987654321' },
  VIETQR_ACCOUNT_NAME: { group: 'payment', isSecret: false, defaultVal: 'CONG TY PHONE SHOP' },
  VIETQR_TEMPLATE: { group: 'payment', isSecret: false, defaultVal: 'compact2' },

  STORE_NAME: { group: 'general', isSecret: false, defaultVal: 'Phone Shop' },
  STORE_HOTLINE: { group: 'general', isSecret: false, defaultVal: '1900 6868' },
  STORE_EMAIL: { group: 'general', isSecret: false, defaultVal: 'support@phoneshop.vn' },
  STORE_ADDRESS: { group: 'general', isSecret: false, defaultVal: 'Hồ Chí Minh, Việt Nam' },
  MAINTENANCE_MODE: { group: 'general', isSecret: false, defaultVal: 'false' },
  FEATURED_BRANDS: {
    group: 'general',
    isSecret: false,
    defaultVal: 'apple,samsung,xiaomi,oppo,vivo,realme,honor,oneplus',
  },
};

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);
  private readonly memoryCache = new Map<string, { val: any; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get<T = string>(key: string, defaultValue?: T): Promise<T> {
    const cacheKey = `settings:key:${key}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.val as T;
    }

    const record = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (record && record.value !== null && record.value !== '') {
      const val = record.value as unknown as T;
      this.memoryCache.set(cacheKey, { val, expiresAt: Date.now() + 3600_000 });
      return val;
    }

    const defaultFromDef = DEFAULT_DEFINITIONS[key]?.defaultVal as unknown as T;
    return this.config.get<T>(key, defaultValue !== undefined ? defaultValue : defaultFromDef);
  }

  async getAllGrouped(maskSecrets = true): Promise<Record<string, Record<string, string>>> {
    const dbRecords = await this.prisma.systemSetting.findMany();
    const dbMap = new Map<string, string>();
    for (const rec of dbRecords) {
      dbMap.set(rec.key, rec.value);
    }

    const groups: Record<string, Record<string, string>> = {
      payment: {},
      storage: {},
      email: {},
      general: {},
    };

    for (const [key, def] of Object.entries(DEFAULT_DEFINITIONS)) {
      const g = def.group.toLowerCase();
      const val = dbMap.has(key)
        ? (dbMap.get(key) ?? '')
        : (this.config.get<string>(key, def.defaultVal || '') ?? '');
      if (!groups[g]) groups[g] = {};
      groups[g][key] = val;
    }

    for (const rec of dbRecords) {
      if (!DEFAULT_DEFINITIONS[rec.key]) {
        const g = (rec.group || 'general').toLowerCase();
        if (!groups[g]) groups[g] = {};
        groups[g][rec.key] = rec.value;
      }
    }

    // Read-only environment-based configurations & status for display
    groups.payment['VNPAY_TMN_CODE'] = this.config.get<string>('VNPAY_TMN_CODE', 'SANDBOX1') || '';
    groups.payment['VNPAY_URL'] = this.config.get<string>('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html') || '';
    groups.payment['VNPAY_RETURN_URL'] = this.config.get<string>('VNPAY_RETURN_URL', 'https://app.tutorhub.id.vn/order/vnpay-return') || '';

    groups.storage['CLOUDFLARE_R2_ACCOUNT_ID'] = this.config.get<string>('CLOUDFLARE_R2_ACCOUNT_ID', '') || '';
    groups.storage['CLOUDFLARE_R2_BUCKET'] = this.config.get<string>('CLOUDFLARE_R2_BUCKET', '') || '';
    groups.storage['CLOUDFLARE_R2_ACCESS_KEY_ID'] = this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID', '') || '';
    groups.storage['CLOUDFLARE_R2_PUBLIC_URL'] = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL', '') || '';
    groups.storage['CLOUDFLARE_R2_STATUS'] = this.config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
      ? 'Đã cấu hình qua .env'
      : 'Chưa cấu hình .env';

    groups.email['EMAIL_HOST'] = this.config.get<string>('EMAIL_HOST', 'smtp.gmail.com') || '';
    groups.email['EMAIL_PORT'] = String(this.config.get<string>('EMAIL_PORT', '587')) || '587';
    groups.email['EMAIL_SECURE'] = String(this.config.get<string>('EMAIL_SECURE', 'false')) || 'false';
    groups.email['EMAIL_USER'] = this.config.get<string>('EMAIL_USER', '') || '';
    groups.email['EMAIL_FROM'] = this.config.get<string>('EMAIL_FROM', 'Phone Shop <no-reply@phoneshop.vn>') || '';
    groups.email['EMAIL_PROVIDER'] = this.config.get<string>('EMAIL_PROVIDER', 'brevo') || '';
    groups.email['EMAIL_STATUS'] = (this.config.get<string>('BREVO_API_KEY') || this.config.get<string>('EMAIL_PASS'))
      ? 'Đã cấu hình qua .env'
      : 'Chưa cấu hình .env';

    return groups;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    return {
      STORE_NAME: await this.get('STORE_NAME', 'Phone Shop'),
      STORE_HOTLINE: await this.get('STORE_HOTLINE', '1900 6868'),
      STORE_EMAIL: await this.get('STORE_EMAIL', 'support@phoneshop.vn'),
      STORE_ADDRESS: await this.get('STORE_ADDRESS', 'Hồ Chí Minh, Việt Nam'),
      MAINTENANCE_MODE: await this.get('MAINTENANCE_MODE', 'false'),
      PAYMENT_COD_ENABLED: await this.get('PAYMENT_COD_ENABLED', 'true'),
      PAYMENT_VNPAY_ENABLED: await this.get('PAYMENT_VNPAY_ENABLED', 'true'),
      PAYMENT_VIETQR_ENABLED: await this.get('PAYMENT_VIETQR_ENABLED', 'true'),
      FEATURED_BRANDS: await this.get('FEATURED_BRANDS', 'apple,samsung,xiaomi,oppo,vivo,realme,honor,oneplus'),
    };
  }

  async updateBatch(items: SettingItemDto[], adminUserId?: string): Promise<void> {
    const FORBIDDEN_SECRET_KEYS = new Set([
      'VNPAY_HASH_SECRET',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'EMAIL_PASS',
      'BREVO_API_KEY',
    ]);

    const secretKeysAttempted = items
      .filter((item) => FORBIDDEN_SECRET_KEYS.has(item.key) || item.isSecret)
      .map((item) => item.key);

    if (secretKeysAttempted.length > 0) {
      throw new BadRequestException(
        `Không cho phép lưu trữ hoặc ghi đè thông tin bảo mật (${secretKeysAttempted.join(', ')}) vào cơ sở dữ liệu. Vui lòng cấu hình qua file môi trường .env.`,
      );
    }

    const unknownKeys = items
      .map((i) => i.key)
      .filter((k) => !(k in DEFAULT_DEFINITIONS) && !k.startsWith('CUSTOM_'));
    if (unknownKeys.length > 0) {
      throw new BadRequestException(
        `Unknown setting key(s): ${unknownKeys.join(', ')}. Valid keys: ${Object.keys(DEFAULT_DEFINITIONS).join(', ')} (or CUSTOM_-prefixed keys)`,
      );
    }

    const changedKeys: string[] = [];
    const diff: Record<string, { oldValue: string | null; newValue: string }> = {};

    const existing = await this.prisma.systemSetting.findMany({
      where: { key: { in: items.map((i) => i.key) } },
    });
    const oldByKey = new Map((existing || []).map((r) => [r.key, r.value]));

    for (const item of items) {
      const def = DEFAULT_DEFINITIONS[item.key];
      const group = (item.group || def?.group || 'general').toUpperCase();

      await this.prisma.systemSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          group,
          isSecret: false,
          description: item.description,
          updatedBy: adminUserId,
        },
        update: {
          value: item.value,
          group,
          isSecret: false,
          description: item.description,
          updatedBy: adminUserId,
        },
      });

      this.memoryCache.delete(`settings:key:${item.key}`);

      const oldVal = oldByKey.get(item.key) ?? null;
      diff[item.key] = { oldValue: oldVal, newValue: item.value };
      changedKeys.push(item.key);
    }

    if (adminUserId && changedKeys.length > 0) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'UPDATE',
            entity: 'SystemSetting',
            entityId: 'BATCH_UPDATE',
            newData: { updatedKeys: changedKeys, diff },
          },
        });
      } catch (e) {
        this.logger.warn(`Audit log failed: ${e}`);
      }
    }
  }

  async testVietQr(dto: TestVietQrDto): Promise<{ success: boolean; qrUrl: string }> {
    const bankId = dto.bankId || (await this.get('VIETQR_BANK_ID', '970422'));
    const accountNo = dto.accountNo || (await this.get('VIETQR_ACCOUNT_NO', '0987654321'));
    const accountName = dto.accountName || (await this.get('VIETQR_ACCOUNT_NAME', 'CONG TY PHONE SHOP'));
    const template = await this.get('VIETQR_TEMPLATE', 'compact2');

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=10000&addInfo=TEST%20VIETQR&accountName=${encodeURIComponent(accountName)}`;
    return { success: true, qrUrl };
  }

  async testStorage(dto: TestStorageDto): Promise<{ success: boolean; message: string }> {
    const accountId = dto.accountId || this.config.get<string>('CLOUDFLARE_R2_ACCOUNT_ID');
    const bucket = dto.bucket || this.config.get<string>('CLOUDFLARE_R2_BUCKET');
    const accessKeyId = dto.accessKeyId || this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey =
      dto.secretAccessKey && dto.secretAccessKey !== MASKED_SECRET
        ? dto.secretAccessKey
        : this.config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('Chưa cấu hình đầy đủ thông số Cloudflare R2 trong .env (ACCOUNT_ID, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY)');
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return { success: true, message: `Kết nối thành công tới bucket: ${bucket}` };
  }

  async testEmail(dto: TestEmailDto, adminEmail?: string): Promise<{ success: boolean; message: string }> {
    const rawHost = dto.host || this.config.get<string>('EMAIL_HOST');
    const rawPort = dto.port !== undefined ? String(dto.port) : this.config.get<string>('EMAIL_PORT', '587');
    const port = Number(rawPort?.replace(/^["']|["']$/g, '')) || 587;
    const rawSecure = dto.secure !== undefined ? String(dto.secure) : this.config.get<string>('EMAIL_SECURE', 'false');
    const secure = rawSecure === 'true' || port === 465;
    const rawUser = dto.user || this.config.get<string>('EMAIL_USER');
    const passCandidate = dto.pass && dto.pass !== MASKED_SECRET ? dto.pass : this.config.get<string>('EMAIL_PASS');
    const rawFrom = dto.from || this.config.get<string>('EMAIL_FROM', 'Phone Shop <no-reply@phoneshop.vn>');

    const host = rawHost?.replace(/^["']|["']$/g, '').trim();
    const user = rawUser?.replace(/^["']|["']$/g, '').trim();
    const pass = passCandidate?.replace(/^["']|["']$/g, '').trim();
    const from = rawFrom?.replace(/^["']|["']$/g, '').trim() || 'Phone Shop <no-reply@phoneshop.vn>';

    const targetEmail = dto.toEmail || adminEmail || user;
    if (!targetEmail) {
      throw new Error('Không có email nhận kiểm thử');
    }
    if (!host || !user || !pass) {
      throw new Error('Thông số SMTP (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) chưa được cấu hình trong .env');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const startTime = Date.now();
    await transporter.sendMail({
      from,
      to: targetEmail,
      subject: '[Hệ thống] Kiểm tra kết nối SMTP thành công',
      html: buildTestDiagnosticEmail({
        host,
        port,
        user,
        from,
        latencyMs: Math.max(1, Date.now() - startTime),
        secure,
        environment: process.env.NODE_ENV || 'development',
      }),
    });

    return { success: true, message: `Email kiểm tra đã được gửi thành công đến ${targetEmail}` };
  }
}
