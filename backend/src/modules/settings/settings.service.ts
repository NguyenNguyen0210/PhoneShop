import { BadRequestException, Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SettingItemDto, TestEmailDto, TestStorageDto, TestVietQrDto } from './dto/settings.dto';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';
import { buildTestDiagnosticEmail } from '../../infrastructure/email/email-template.builder';

export const MASKED_SECRET = '••••••••••••';

export const DEFAULT_DEFINITIONS: Record<
  string,
  { group: string; isSecret: boolean; defaultVal?: string }
> = {
  PAYMENT_VNPAY_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  VNPAY_TMN_CODE: { group: 'payment', isSecret: false, defaultVal: 'SANDBOX1' },
  VNPAY_HASH_SECRET: { group: 'payment', isSecret: true },
  VNPAY_URL: { group: 'payment', isSecret: false, defaultVal: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' },
  VNPAY_RETURN_URL: { group: 'payment', isSecret: false, defaultVal: 'http://localhost:5173/order/vnpay-return' },
  PAYMENT_VIETQR_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  VIETQR_BANK_ID: { group: 'payment', isSecret: false, defaultVal: '970422' },
  VIETQR_ACCOUNT_NO: { group: 'payment', isSecret: false, defaultVal: '0987654321' },
  VIETQR_ACCOUNT_NAME: { group: 'payment', isSecret: false, defaultVal: 'CONG TY PHONE SHOP' },
  VIETQR_TEMPLATE: { group: 'payment', isSecret: false, defaultVal: 'compact2' },

  CLOUDFLARE_R2_ACCOUNT_ID: { group: 'storage', isSecret: false },
  CLOUDFLARE_R2_BUCKET: { group: 'storage', isSecret: false },
  CLOUDFLARE_R2_ACCESS_KEY_ID: { group: 'storage', isSecret: false },
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: { group: 'storage', isSecret: true },
  CLOUDFLARE_R2_PUBLIC_URL: { group: 'storage', isSecret: false },

  EMAIL_HOST: { group: 'email', isSecret: false, defaultVal: 'smtp.gmail.com' },
  EMAIL_PORT: { group: 'email', isSecret: false, defaultVal: '587' },
  EMAIL_SECURE: { group: 'email', isSecret: false, defaultVal: 'false' },
  EMAIL_USER: { group: 'email', isSecret: false },
  EMAIL_PASS: { group: 'email', isSecret: true },
  EMAIL_FROM: { group: 'email', isSecret: false, defaultVal: 'Phone Shop <no-reply@phoneshop.vn>' },

  STORE_NAME: { group: 'general', isSecret: false, defaultVal: 'Phone Shop' },
  STORE_HOTLINE: { group: 'general', isSecret: false, defaultVal: '1900 6868' },
  STORE_EMAIL: { group: 'general', isSecret: false, defaultVal: 'support@phoneshop.vn' },
  STORE_ADDRESS: { group: 'general', isSecret: false, defaultVal: 'Hồ Chí Minh, Việt Nam' },
  MAINTENANCE_MODE: { group: 'general', isSecret: false, defaultVal: 'false' },
};

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async get<T = string>(key: string, defaultValue?: T): Promise<T> {
    const cacheKey = `settings:key:${key}`;
    try {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== undefined && cached !== null) return cached;
    } catch (e) {
      this.logger.warn(`Cache read error for ${key}: ${e}`);
    }

    const record = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (record && record.value !== null && record.value !== '') {
      const val = record.value as unknown as T;
      try {
        await this.cache.set(cacheKey, val, 3600);
      } catch (e) {}
      return val;
    }

    const defaultFromDef = DEFAULT_DEFINITIONS[key]?.defaultVal as unknown as T;
    return this.config.get<T>(key, defaultValue !== undefined ? defaultValue : defaultFromDef);
  }

  async getAllGrouped(maskSecrets = true): Promise<Record<string, Record<string, string>>> {
    const dbRecords = await this.prisma.systemSetting.findMany();
    const dbMap = new Map<string, { value: string; isSecret: boolean }>();
    for (const rec of dbRecords) {
      dbMap.set(rec.key, { value: rec.value, isSecret: rec.isSecret });
    }

    const groups: Record<string, Record<string, string>> = {
      payment: {},
      storage: {},
      email: {},
      general: {},
    };

    for (const [key, def] of Object.entries(DEFAULT_DEFINITIONS)) {
      const g = def.group.toLowerCase();
      let val = '';
      const dbEntry = dbMap.get(key);
      const isSec = dbEntry ? dbEntry.isSecret : def.isSecret;

      if (dbEntry && dbEntry.value !== '') {
        val = isSec && maskSecrets ? MASKED_SECRET : dbEntry.value;
      } else {
        const envVal = this.config.get<string>(key, def.defaultVal || '');
        if (isSec) {
          val = envVal ? (maskSecrets ? MASKED_SECRET : envVal) : '';
        } else {
          val = envVal;
        }
      }

      if (!groups[g]) groups[g] = {};
      groups[g][key] = val;
    }

    for (const rec of dbRecords) {
      if (!DEFAULT_DEFINITIONS[rec.key]) {
        const g = (rec.group || 'general').toLowerCase();
        if (!groups[g]) groups[g] = {};
        groups[g][rec.key] = rec.isSecret && maskSecrets ? MASKED_SECRET : rec.value;
      }
    }

    return groups;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    return {
      STORE_NAME: await this.get('STORE_NAME', 'Phone Shop'),
      STORE_HOTLINE: await this.get('STORE_HOTLINE', '1900 6868'),
      STORE_EMAIL: await this.get('STORE_EMAIL', 'support@phoneshop.vn'),
      STORE_ADDRESS: await this.get('STORE_ADDRESS', 'Hồ Chí Minh, Việt Nam'),
      MAINTENANCE_MODE: await this.get('MAINTENANCE_MODE', 'false'),
      PAYMENT_VNPAY_ENABLED: await this.get('PAYMENT_VNPAY_ENABLED', 'true'),
      PAYMENT_VIETQR_ENABLED: await this.get('PAYMENT_VIETQR_ENABLED', 'true'),
    };
  }

  async updateBatch(items: SettingItemDto[], adminUserId?: string): Promise<void> {
    // AUDIT: strict key whitelist — arbitrary keys would let a caller plant
    // unvalidated config (or collide with future env-backed keys). Only
    // known keys plus the CUSTOM_ escape hatch are accepted.
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

    // AUDIT: snapshot pre-update values so the audit row carries an old/new
    // diff instead of just the list of touched keys.
    const existing = await this.prisma.systemSetting.findMany({
      where: { key: { in: items.map((i) => i.key) } },
    });
    const oldByKey = new Map(existing.map((r) => [r.key, r.value]));

    for (const item of items) {
      const def = DEFAULT_DEFINITIONS[item.key];
      const isSecret = item.isSecret ?? def?.isSecret ?? false;
      const group = (item.group || def?.group || 'general').toUpperCase();

      if (isSecret && (item.value === MASKED_SECRET || item.value === '')) {
        continue;
      }

      await this.prisma.systemSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          group,
          isSecret,
          description: item.description,
          updatedBy: adminUserId,
        },
        update: {
          value: item.value,
          group,
          isSecret,
          description: item.description,
          updatedBy: adminUserId,
        },
      });

      try {
        await this.cache.del(`settings:key:${item.key}`);
      } catch (e) {}

      // AUDIT: never persist plaintext secrets into the audit trail — a
      // redacted marker preserves the fact of change without widening
      // credential exposure to every audit-log reader.
      const oldVal = oldByKey.get(item.key) ?? null;
      diff[item.key] = isSecret
        ? { oldValue: oldVal ? '[REDACTED]' : null, newValue: '[REDACTED]' }
        : { oldValue: oldVal, newValue: item.value };
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
    const accountId = dto.accountId || (await this.get('CLOUDFLARE_R2_ACCOUNT_ID'));
    const bucket = dto.bucket || (await this.get('CLOUDFLARE_R2_BUCKET'));
    const accessKeyId = dto.accessKeyId || (await this.get('CLOUDFLARE_R2_ACCESS_KEY_ID'));
    const secretAccessKey =
      dto.secretAccessKey && dto.secretAccessKey !== MASKED_SECRET
        ? dto.secretAccessKey
        : await this.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('Chưa điền đủ thông số Cloudflare R2 (Account ID, Bucket, Keys)');
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
    const rawHost = dto.host || (await this.get('EMAIL_HOST'));
    const rawPort = dto.port !== undefined ? String(dto.port) : await this.get('EMAIL_PORT', '587');
    const port = Number(rawPort?.replace(/^["']|["']$/g, '')) || 587;
    const rawSecure = dto.secure !== undefined ? String(dto.secure) : await this.get('EMAIL_SECURE', 'false');
    const secure = rawSecure === 'true' || port === 465;
    const rawUser = dto.user || (await this.get('EMAIL_USER'));
    const passCandidate = dto.pass && dto.pass !== MASKED_SECRET ? dto.pass : await this.get('EMAIL_PASS');
    const rawFrom = dto.from || (await this.get('EMAIL_FROM', 'Phone Shop <no-reply@phoneshop.vn>'));

    const host = rawHost?.replace(/^["']|["']$/g, '').trim();
    const user = rawUser?.replace(/^["']|["']$/g, '').trim();
    const pass = passCandidate?.replace(/^["']|["']$/g, '').trim();
    const from = rawFrom?.replace(/^["']|["']$/g, '').trim() || 'Phone Shop <no-reply@phoneshop.vn>';

    const targetEmail = dto.toEmail || adminEmail || user;
    if (!targetEmail) {
      throw new Error('Không có email nhận kiểm thử');
    }
    if (!host || !user || !pass) {
      throw new Error('Thông số SMTP (HOST, USER, PASS) chưa được cấu hình đầy đủ');
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
