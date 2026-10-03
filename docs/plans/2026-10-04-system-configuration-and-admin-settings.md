# Dynamic System Configuration & Admin Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống cấu hình động (Dynamic System Configuration) từ Prisma DB, tầng Service toàn cục (Redis cache + fallback .env), công cụ test kết nối, đến giao diện quản trị Admin Settings UI (`/admin/settings`).

**Architecture:** Sử dụng mô hình Key-Value phân nhóm (`group`) với cờ bảo mật `isSecret` trong bảng `system_settings`. Cung cấp `SystemSettingsService` toàn cục ưu tiên đọc từ cache Redis, fallback sang DB PostgreSQL và tự động fallback về `.env` khi chưa cấu hình để đảm bảo zero-downtime. Trang Admin Portal xây dựng trên Ant Design Tabs chia 4 nhóm cấu hình kèm bộ công cụ test trực tiếp và Audit Log.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Redis (CacheManager), React 19, TypeScript, Ant Design v6, Tailwind CSS v4, Vitest, Jest.

---

## File Structure Map

### Backend:
- Modify: `backend/prisma/schema.prisma` — Thêm model `SystemSetting`.
- Create: `backend/src/modules/settings/dto/settings.dto.ts` — DTOs cho update batch và test connections.
- Create: `backend/src/modules/settings/settings.service.ts` — Central settings logic (Redis cache, DB, fallback .env, secret masking, connection tests, audit logging).
- Create: `backend/src/modules/settings/settings.controller.ts` — Endpoints `/admin/settings` và `/settings/public`.
- Create: `backend/src/modules/settings/settings.module.ts` — Global NestJS module.
- Modify: `backend/src/app.module.ts` — Đăng ký `SettingsModule`.
- Modify: `backend/src/modules/payments/payments.service.ts` — Refactor lấy config VNPay động từ `SystemSettingsService`.
- Modify: `backend/src/modules/payments/vietqr.service.ts` — Refactor lấy config VietQR động từ `SystemSettingsService`.
- Create: `backend/src/modules/settings/__tests__/settings.service.spec.ts` — Unit tests cho `SystemSettingsService`.

### Frontend:
- Create: `frontend/src/services/settingsService.ts` — API client & types cho settings.
- Create: `frontend/src/pages/Admin/Settings/components/PaymentSettingsTab.tsx` — Tab cấu hình VNPay & VietQR.
- Create: `frontend/src/pages/Admin/Settings/components/StorageSettingsTab.tsx` — Tab cấu hình Cloudflare R2.
- Create: `frontend/src/pages/Admin/Settings/components/EmailSettingsTab.tsx` — Tab cấu hình SMTP Email.
- Create: `frontend/src/pages/Admin/Settings/components/GeneralSettingsTab.tsx` — Tab cấu hình thông tin cửa hàng & bảo trì.
- Create: `frontend/src/pages/Admin/Settings/components/VietQRTestModal.tsx` — Modal hiển thị mã QR test 10,000đ.
- Create: `frontend/src/pages/Admin/Settings/AdminSettingsPage.tsx` — Trang chủ `/admin/settings`.
- Modify: `frontend/src/components/admin/AdminSidebar.tsx` — Thêm menu Cấu hình Hệ thống.
- Modify: `frontend/src/layouts/AdminLayout.tsx` — Thêm tiêu đề breadcrumb.
- Modify: `frontend/src/routes/AppRoutes.tsx` — Đăng ký route `/admin/settings` bảo vệ bởi `Role.ADMIN`.
- Create: `frontend/src/pages/Admin/Settings/__tests__/AdminSettingsPage.spec.tsx` — Frontend component tests.

---

## Task Decomposition

## Task Decomposition

### Task 1: Prisma Schema & Database Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [x] **Step 1: Add `SystemSetting` model to `schema.prisma`**

Edit `backend/prisma/schema.prisma` at the bottom of the file:
```prisma
// ============================================================
// SYSTEM SETTINGS
// ============================================================

model SystemSetting {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  group       String   @db.VarChar(50)
  isSecret    Boolean  @default(false) @map("is_secret")
  description String?  @db.Text
  updatedBy   String?  @map("updated_by") @db.Uuid
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([group])
  @@map("system_settings")
}
```

- [x] **Step 2: Generate Prisma Client & Push DB Schema**

Run commands in `backend`:
```bash
cd backend
npx prisma generate
npx prisma db push
```
Expected output: `The database is already in sync with the Prisma schema` or `Your database is now in sync with your Prisma schema.`

- [x] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(backend): add SystemSetting model to prisma schema"
```

---

### Task 2: Backend SystemSettingsService & Unit Tests

**Files:**
- Create: `backend/src/modules/settings/dto/settings.dto.ts`
- Create: `backend/src/modules/settings/settings.service.ts`
- Test: `backend/src/modules/settings/__tests__/settings.service.spec.ts`

- [x] **Step 1: Create Settings DTOs**

Create `backend/src/modules/settings/dto/settings.dto.ts`:
```typescript
import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsOptional()
  isSecret?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSettingsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}

export class TestStorageDto {
  @IsString()
  @IsOptional()
  bucket?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  accessKeyId?: string;

  @IsString()
  @IsOptional()
  secretAccessKey?: string;
}

export class TestEmailDto {
  @IsString()
  @IsOptional()
  toEmail?: string;
}

export class TestVietQrDto {
  @IsString()
  @IsOptional()
  bankId?: string;

  @IsString()
  @IsOptional()
  accountNo?: string;

  @IsString()
  @IsOptional()
  accountName?: string;
}
```

- [x] **Step 2: Write failing unit tests for `SystemSettingsService`**

Create `backend/src/modules/settings/__tests__/settings.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SystemSettingsService } from '../settings.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let prisma: any;
  let config: any;
  let cache: any;

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get<SystemSettingsService>(SystemSettingsService);
  });

  it('should return from cache when cache hit', async () => {
    cache.get.mockResolvedValue('CACHED_VALUE');
    const result = await service.get('TEST_KEY');
    expect(result).toBe('CACHED_VALUE');
    expect(prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });

  it('should query DB and cache when cache miss', async () => {
    cache.get.mockResolvedValue(null);
    prisma.systemSetting.findUnique.mockResolvedValue({
      key: 'TEST_KEY',
      value: 'DB_VALUE',
    });

    const result = await service.get('TEST_KEY');
    expect(result).toBe('DB_VALUE');
    expect(cache.set).toHaveBeenCalledWith('settings:key:TEST_KEY', 'DB_VALUE', 3600);
  });

  it('should fallback to ConfigService when not found in DB', async () => {
    cache.get.mockResolvedValue(null);
    prisma.systemSetting.findUnique.mockResolvedValue(null);
    config.get.mockReturnValue('ENV_FALLBACK_VALUE');

    const result = await service.get('TEST_KEY', 'DEFAULT');
    expect(result).toBe('ENV_FALLBACK_VALUE');
    expect(config.get).toHaveBeenCalledWith('TEST_KEY', 'DEFAULT');
  });

  it('should mask secret keys when retrieving grouped settings', async () => {
    prisma.systemSetting.findMany.mockResolvedValue([
      { key: 'PUBLIC_KEY', value: '12345', group: 'PAYMENT', isSecret: false },
      { key: 'SECRET_KEY', value: 'SUPER_SECRET', group: 'PAYMENT', isSecret: true },
    ]);

    const result = await service.getAllGrouped(true);
    expect(result.payment.PUBLIC_KEY).toBe('12345');
    expect(result.payment.SECRET_KEY).toBe('••••••••••••');
  });

  it('should not overwrite secret if value is masked in updateBatch', async () => {
    prisma.systemSetting.findUnique.mockResolvedValue({
      key: 'SECRET_KEY',
      value: 'EXISTING_SECRET',
      isSecret: true,
      group: 'PAYMENT',
    });

    await service.updateBatch(
      [{ key: 'SECRET_KEY', value: '••••••••••••', group: 'PAYMENT' }],
      'admin-id',
    );

    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 3: Run unit tests to verify failure**

Run:
```bash
cd backend && npm test -- src/modules/settings/__tests__/settings.service.spec.ts
```
Expected: FAIL (Cannot find module `../settings.service`)

- [x] **Step 4: Implement `SystemSettingsService`**

Create `backend/src/modules/settings/settings.service.ts`:
```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SettingItemDto, TestEmailDto, TestStorageDto, TestVietQrDto } from './dto/settings.dto';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';

export const MASKED_SECRET = '••••••••••••';

const DEFAULT_DEFINITIONS: Record<string, { group: string; isSecret: boolean; defaultVal?: string }> = {
  PAYMENT_VNPAY_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  VNPAY_TMN_CODE: { group: 'payment', isSecret: false, defaultVal: 'SANDBOX1' },
  VNPAY_HASH_SECRET: { group: 'payment', isSecret: true },
  VNPAY_URL: { group: 'payment', isSecret: false, defaultVal: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' },
  VNPAY_RETURN_URL: { group: 'payment', isSecret: false, defaultVal: 'http://localhost:5173/order/vnpay-return' },
  PAYMENT_VIETQR_ENABLED: { group: 'payment', isSecret: false, defaultVal: 'true' },
  VIETQR_BANK_ID: { group: 'payment', isSecret: false, defaultVal: '970422' },
  VIETQR_ACCOUNT_NO: { group: 'payment', isSecret: false, defaultVal: '0987654321' },
  VIETQR_ACCOUNT_NAME: { group: 'payment', isSecret: false, defaultVal: 'CONG TY MOBILECOMMERCE' },
  VIETQR_TEMPLATE: { group: 'payment', isSecret: false, defaultVal: 'compact' },

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
  EMAIL_FROM: { group: 'email', isSecret: false, defaultVal: 'MobileCommerce <no-reply@mobilecommerce.vn>' },

  STORE_NAME: { group: 'general', isSecret: false, defaultVal: 'MobileCommerce Store' },
  STORE_HOTLINE: { group: 'general', isSecret: false, defaultVal: '1900 6868' },
  STORE_EMAIL: { group: 'general', isSecret: false, defaultVal: 'support@mobilecommerce.vn' },
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
      const g = def.group;
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

    return groups;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    return {
      STORE_NAME: await this.get('STORE_NAME', 'MobileCommerce Store'),
      STORE_HOTLINE: await this.get('STORE_HOTLINE', '1900 6868'),
      STORE_EMAIL: await this.get('STORE_EMAIL', 'support@mobilecommerce.vn'),
      STORE_ADDRESS: await this.get('STORE_ADDRESS', 'Hồ Chí Minh, Việt Nam'),
      MAINTENANCE_MODE: await this.get('MAINTENANCE_MODE', 'false'),
      PAYMENT_VNPAY_ENABLED: await this.get('PAYMENT_VNPAY_ENABLED', 'true'),
      PAYMENT_VIETQR_ENABLED: await this.get('PAYMENT_VIETQR_ENABLED', 'true'),
    };
  }

  async updateBatch(items: SettingItemDto[], adminUserId?: string): Promise<void> {
    const changedKeys: string[] = [];

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
            newData: { updatedKeys: changedKeys },
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
    const accountName = dto.accountName || (await this.get('VIETQR_ACCOUNT_NAME', 'CONG TY MOBILECOMMERCE'));
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
    const host = await this.get('EMAIL_HOST');
    const port = Number(await this.get('EMAIL_PORT', '587'));
    const secure = (await this.get('EMAIL_SECURE', 'false')) === 'true';
    const user = await this.get('EMAIL_USER');
    const pass = await this.get('EMAIL_PASS');
    const from = await this.get('EMAIL_FROM', 'no-reply@mobilecommerce.vn');

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

    await transporter.sendMail({
      from,
      to: targetEmail,
      subject: '[MobileCommerce] Kiểm tra cấu hình máy chủ Email SMTP',
      text: 'Xin chào, đây là email kiểm tra kết nối từ trang Quản trị Hệ thống MobileCommerce. Kết nối SMTP hoạt động tốt!',
    });

    return { success: true, message: `Email kiểm tra đã được gửi thành công đến ${targetEmail}` };
  }
}
```

- [x] **Step 5: Run unit tests to verify they pass**

Run:
```bash
cd backend && npm test -- src/modules/settings/__tests__/settings.service.spec.ts
```
Expected: PASS (all 5 test suites pass)

- [x] **Step 6: Commit**

```bash
git add backend/src/modules/settings/
git commit -m "feat(backend): implement SystemSettingsService with caching, fallback and tests"
```

---

### Task 3: Backend Settings Controller, Module & Test Endpoints

**Files:**
- Create: `backend/src/modules/settings/settings.controller.ts`
- Create: `backend/src/modules/settings/settings.module.ts`
- Modify: `backend/src/app.module.ts`

- [x] **Step 1: Create `SettingsController`**

Create `backend/src/modules/settings/settings.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { SystemSettingsService } from './settings.service';
import {
  UpdateSettingsBatchDto,
  TestStorageDto,
  TestEmailDto,
  TestVietQrDto,
} from './dto/settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get('settings/public')
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminSettings() {
    return this.settingsService.getAllGrouped(true);
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateAdminSettings(@Body() dto: UpdateSettingsBatchDto, @Req() req: any) {
    if (!dto.settings || !Array.isArray(dto.settings)) {
      throw new BadRequestException('settings array is required');
    }
    await this.settingsService.updateBatch(dto.settings, req.user?.id);
    return { success: true, message: 'Cập nhật cấu hình thành công' };
  }

  @Post('admin/settings/test/vietqr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testVietQr(@Body() dto: TestVietQrDto) {
    try {
      return await this.settingsService.testVietQr(dto);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi khi kiểm tra VietQR');
    }
  }

  @Post('admin/settings/test/storage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testStorage(@Body() dto: TestStorageDto) {
    try {
      return await this.settingsService.testStorage(dto);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi kết nối Cloudflare R2');
    }
  }

  @Post('admin/settings/test/email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testEmail(@Body() dto: TestEmailDto, @Req() req: any) {
    try {
      return await this.settingsService.testEmail(dto, req.user?.email);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi gửi email kiểm tra');
    }
  }
}
```

- [x] **Step 2: Create `SettingsModule`**

Create `backend/src/modules/settings/settings.module.ts`:
```typescript
import { Module, Global } from '@nestjs/common';
import { SystemSettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
```

- [x] **Step 3: Register `SettingsModule` in `backend/src/app.module.ts`**

Edit `backend/src/app.module.ts`:
Import `SettingsModule` from `'./modules/settings/settings.module'` and add `SettingsModule` to imports list.

- [x] **Step 4: Verify backend compilation**

Run:
```bash
cd backend && npm run build
```
Expected output: Nest build completes without errors.

- [x] **Step 5: Commit**

```bash
git add backend/src/modules/settings/ backend/src/app.module.ts
git commit -m "feat(backend): add SettingsController and register SettingsModule in AppModule"
```

---

### Task 4: Refactor Payments Services (VNPay & VietQR)

**Files:**
- Modify: `backend/src/modules/payments/payments.service.ts`
- Modify: `backend/src/modules/payments/vietqr.service.ts`

- [x] **Step 1: Refactor `VietqrService` to use dynamic settings**

Edit `backend/src/modules/payments/vietqr.service.ts`:
Inject `SystemSettingsService`:
```typescript
constructor(
  private readonly configService: ConfigService,
  private readonly settingsService: SystemSettingsService,
) {}

async generateQrAsync(
  amount: number,
  orderNumber: string,
  options?: { bankId?: string; accountNo?: string; accountName?: string },
): Promise<VietQrResponse> {
  const isEnabled = (await this.settingsService.get('PAYMENT_VIETQR_ENABLED', 'true')) === 'true';
  if (!isEnabled) {
    throw new BadRequestException('Phương thức thanh toán VietQR đang tạm ngưng');
  }

  const bankId = options?.bankId || (await this.settingsService.get('VIETQR_BANK_ID', '970422'));
  const accountNo = options?.accountNo || (await this.settingsService.get('VIETQR_ACCOUNT_NO', '0987654321'));
  const accountName = options?.accountName || (await this.settingsService.get('VIETQR_ACCOUNT_NAME', 'CONG TY MOBILECOMMERCE'));
  const template = await this.settingsService.get('VIETQR_TEMPLATE', 'compact2');

  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(orderNumber)}&accountName=${encodeURIComponent(accountName)}`;

  return { qrUrl, bankId, accountNo, accountName, amount, orderNumber };
}
```

- [x] **Step 2: Refactor `PaymentsService` VNPay creation**

Edit `backend/src/modules/payments/payments.service.ts`:
Inject `SystemSettingsService`:
In `createVnpayPaymentUrl`:
1. Check `const vnpayEnabled = (await this.settingsService.get('PAYMENT_VNPAY_ENABLED', 'true')) === 'true';`
   If `false`, throw `new BadRequestException('Cổng thanh toán VNPay đang tạm thời đóng để bảo trì');`
2. Replace static `configService.get` for `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL` with `await this.settingsService.get(...)`.
In verify return url:
Fetch `hashSecret` with `await this.settingsService.get('VNPAY_HASH_SECRET')`.

- [x] **Step 3: Run backend tests**

Run:
```bash
cd backend && npm test
```
Expected output: All tests pass.

- [x] **Step 4: Commit**

```bash
git add backend/src/modules/payments/
git commit -m "refactor(backend): use dynamic SystemSettingsService in VNPay and VietQR services"
```

---

### Task 5: Frontend API Client & Service

**Files:**
- Create: `frontend/src/services/settingsService.ts`

- [x] **Step 1: Create `settingsService.ts`**

Create `frontend/src/services/settingsService.ts`:
```typescript
import apiClient from './apiClient';

export interface GroupedSettings {
  payment: Record<string, string>;
  storage: Record<string, string>;
  email: Record<string, string>;
  general: Record<string, string>;
}

export interface SettingItem {
  key: string;
  value: string;
  group?: string;
  isSecret?: boolean;
}

export interface PublicSettings {
  STORE_NAME: string;
  STORE_HOTLINE: string;
  STORE_EMAIL: string;
  STORE_ADDRESS: string;
  MAINTENANCE_MODE: string;
  PAYMENT_VNPAY_ENABLED: string;
  PAYMENT_VIETQR_ENABLED: string;
}

export const settingsService = {
  async getAdminSettings(): Promise<GroupedSettings> {
    const res = await apiClient.get<GroupedSettings>('/admin/settings');
    return res.data;
  },

  async updateAdminSettings(settings: SettingItem[]): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.patch('/admin/settings', { settings });
    return res.data;
  },

  async testVietQr(payload: { bankId?: string; accountNo?: string; accountName?: string }): Promise<{ success: boolean; qrUrl: string }> {
    const res = await apiClient.post('/admin/settings/test/vietqr', payload);
    return res.data;
  },

  async testStorage(payload: { bucket?: string; accountId?: string; accessKeyId?: string; secretAccessKey?: string }): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post('/admin/settings/test/storage', payload);
    return res.data;
  },

  async testEmail(payload: { toEmail?: string }): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post('/admin/settings/test/email', payload);
    return res.data;
  },

  async getPublicSettings(): Promise<PublicSettings> {
    const res = await apiClient.get<PublicSettings>('/settings/public');
    return res.data;
  },
};
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/services/settingsService.ts
git commit -m "feat(frontend): add settingsService API client"
```

---

### Task 6: Frontend Admin Settings Tabs & Test Modals

**Files:**
- Create: `frontend/src/pages/Admin/Settings/components/VietQRTestModal.tsx`
- Create: `frontend/src/pages/Admin/Settings/components/PaymentSettingsTab.tsx`
- Create: `frontend/src/pages/Admin/Settings/components/StorageSettingsTab.tsx`
- Create: `frontend/src/pages/Admin/Settings/components/EmailSettingsTab.tsx`
- Create: `frontend/src/pages/Admin/Settings/components/GeneralSettingsTab.tsx`

- [x] **Step 1: Create `VietQRTestModal.tsx`**

Create `frontend/src/pages/Admin/Settings/components/VietQRTestModal.tsx`:
```tsx
import React from 'react';
import { Modal, Image, Typography, Space, Button } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface VietQRTestModalProps {
  visible: boolean;
  qrUrl: string | null;
  onClose: () => void;
}

export const VietQRTestModal: React.FC<VietQRTestModalProps> = ({ visible, qrUrl, onClose }) => {
  return (
    <Modal
      open={visible}
      title={
        <Space>
          <QrcodeOutlined style={{ color: '#2563eb' }} />
          <span>Kiểm tra Mã VietQR Thử nghiệm</span>
        </Space>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      centered
      width={420}
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Mã QR mẫu với số tiền <strong>10.000 VNĐ</strong> và nội dung chuyển khoản thử nghiệm. Quét thử bằng ứng dụng Mobile Banking để kiểm tra tên chủ tài khoản và số tài khoản nhận tiền.
        </Paragraph>
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt="VietQR Test"
            style={{ maxWidth: 280, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          />
        ) : (
          <Text type="danger">Không tạo được ảnh mã QR</Text>
        )}
      </div>
    </Modal>
  );
};
```

- [x] **Step 2: Create `PaymentSettingsTab.tsx`**

Create `frontend/src/pages/Admin/Settings/components/PaymentSettingsTab.tsx`:
Form cards for VNPay & VietQR, including:
- Switch `PAYMENT_VNPAY_ENABLED`, Input `VNPAY_TMN_CODE`, Password Input `VNPAY_HASH_SECRET`, Input `VNPAY_URL`, Input `VNPAY_RETURN_URL`.
- Switch `PAYMENT_VIETQR_ENABLED`, Select Bank (VCB, Vietinbank, MB, Techcombank, etc.), Input `VIETQR_ACCOUNT_NO`, Input `VIETQR_ACCOUNT_NAME`, Select Template.
- "Tạo QR Test" button calling `settingsService.testVietQr` and opening `VietQRTestModal`.

- [x] **Step 3: Create `StorageSettingsTab.tsx`**

Create `frontend/src/pages/Admin/Settings/components/StorageSettingsTab.tsx`:
Card for Cloudflare R2:
- Inputs: `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, Password Input `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, Input `CLOUDFLARE_R2_PUBLIC_URL`.
- Button "Kiểm tra kết nối R2" with loading state calling `settingsService.testStorage`.

- [x] **Step 4: Create `EmailSettingsTab.tsx`**

Create `frontend/src/pages/Admin/Settings/components/EmailSettingsTab.tsx`:
Card for SMTP:
- Inputs: `EMAIL_HOST`, `EMAIL_PORT`, Switch `EMAIL_SECURE`, Input `EMAIL_USER`, Password Input `EMAIL_PASS`, Input `EMAIL_FROM`.
- Button "Gửi email kiểm tra" with modal prompting for target email (defaults to admin email) calling `settingsService.testEmail`.

- [x] **Step 5: Create `GeneralSettingsTab.tsx`**

Create `frontend/src/pages/Admin/Settings/components/GeneralSettingsTab.tsx`:
Card for Store info and maintenance:
- Inputs: `STORE_NAME`, `STORE_HOTLINE`, `STORE_EMAIL`, `STORE_ADDRESS`.
- Switch `MAINTENANCE_MODE` (with warning alert when turned on).

- [x] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin/Settings/components/
git commit -m "feat(frontend): create tab components and VietQR test modal for Admin Settings"
```

---

### Task 7: Frontend AdminSettingsPage, Navigation & Route Registration

**Files:**
- Create: `frontend/src/pages/Admin/Settings/AdminSettingsPage.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [x] **Step 1: Create `AdminSettingsPage.tsx`**

Create `frontend/src/pages/Admin/Settings/AdminSettingsPage.tsx`:
- State for `settings` loaded from `settingsService.getAdminSettings()`.
- State for `isDirty` (tracking unsaved changes).
- Form instance with `onValuesChange` to set dirty flag.
- Top action bar with "Lưu cài đặt" button, dirty badge, and refresh button.
- Tabs component with 4 tabs: `PaymentSettingsTab`, `StorageSettingsTab`, `EmailSettingsTab`, `GeneralSettingsTab`.
- Save handler: transforms form values into `SettingItem[]` array and calls `settingsService.updateAdminSettings`.
- Skeleton loader on initial load.

- [x] **Step 2: Update `AdminSidebar.tsx` & `AdminLayout.tsx`**

Edit `frontend/src/components/admin/AdminSidebar.tsx`:
Add `{ key: '/admin/settings', icon: <SettingOutlined style={{ fontSize: 16 }} />, label: 'Cấu hình Hệ thống' }` to menu list.
Edit `frontend/src/layouts/AdminLayout.tsx`:
Add menu item and breadcrumb mapping: `if (location.pathname === '/admin/settings') return 'Cấu hình & Tham số Hệ thống';`.

- [x] **Step 3: Register route in `AppRoutes.tsx`**

Edit `frontend/src/routes/AppRoutes.tsx`:
Import `AdminSettingsPage`.
Add protected route:
```tsx
<Route
  path="/admin/settings"
  element={
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <AdminSettingsPage />
    </ProtectedRoute>
  }
/>
```

- [x] **Step 4: Verify frontend build**

Run:
```bash
cd frontend && npm run build
```
Expected output: Vite build succeeds with 0 errors.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Settings/ frontend/src/components/admin/AdminSidebar.tsx frontend/src/layouts/AdminLayout.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(frontend): assemble AdminSettingsPage and integrate navigation and route"
```

---

### Task 8: Verification & Automated Tests

**Files:**
- Create: `frontend/src/pages/Admin/Settings/__tests__/AdminSettingsPage.spec.tsx`

- [x] **Step 1: Write component test for `AdminSettingsPage`**

Create `frontend/src/pages/Admin/Settings/__tests__/AdminSettingsPage.spec.tsx`:
- Mock `settingsService.getAdminSettings` and `settingsService.updateAdminSettings`.
- Test renders 4 tabs: Cổng thanh toán, Lưu trữ Cloud, Dịch vụ Email, Cài đặt chung.
- Test changing an input activates the Save button.
- Test clicking Save calls `updateAdminSettings`.

- [x] **Step 2: Run frontend vitest test suite**

Run:
```bash
cd frontend && npm test -- AdminSettingsPage
```
Expected output: PASS.

- [x] **Step 3: Run backend jest test suite**

Run:
```bash
cd backend && npm test
```
Expected output: All backend tests pass.

- [x] **Step 4: Commit**

```bash
git add frontend/src/pages/Admin/Settings/__tests__/
git commit -m "test(frontend): add component test for AdminSettingsPage"
```

