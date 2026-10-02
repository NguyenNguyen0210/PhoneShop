# Phase 3: Supabase Storage & Sharp Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack asset management for MobileCommerce: upload real images (product thumbnails, variant color gallery, brand logos, customer avatars) with automatic backend Sharp WebP optimization, stored on Supabase Storage bucket `mobile-commerce`, with Ant Design upload drag-and-drop in Admin and Tailwind avatar uploader in Storefront.

**Architecture:** Frontend (Ant Design `Upload.Dragger` / Tailwind Avatar Uploader) sends multipart/form-data to NestJS `/api/storage/upload/:folder`. NestJS intercepts via Multer memory storage, validates file type and max 5MB size, pipes the buffer through a Sharp optimization pipeline (resizing dimension <= 1600px, converting to WebP at quality 80), uploads to Supabase Cloud Object Storage via `@supabase/supabase-js`, and returns the permanent CDN public URL.

**Tech Stack:** NestJS 11, `@supabase/supabase-js`, `sharp`, Multer, React 19, Vite, Ant Design 6, Tailwind CSS v4, Axios, Jest.

---

## File Structure Map

```text
MobileCommerce/
├── backend/
│   ├── package.json                                         (Add sharp, @types/sharp, @types/multer)
│   ├── src/
│   │   ├── infrastructure/
│   │   │   └── storage/
│   │   │       ├── storage.service.ts                       (Upgrade with Sharp WebP pipeline)
│   │   │       ├── storage.controller.ts                    (New: Endpoints for single/multi upload)
│   │   │       ├── storage.module.ts                        (Register controller and MulterModule)
│   │   │       └── dto/
│   │   │           └── upload-response.dto.ts               (Type definitions for upload response)
│   │   └── app.module.ts                                    (Ensure StorageModule is loaded)
│   └── test/
│       └── unit/
│           └── storage.spec.ts                              (Unit tests for Sharp & StorageService)
└── frontend/
    └── src/
        ├── services/
        │   └── storageService.ts                            (New: Axios upload & delete methods)
        ├── components/
        │   └── admin/
        │       └── ImageUploadDragger.tsx                   (New: Ant Design drag-and-drop uploader)
        ├── pages/
        │   ├── Admin/
        │   │   └── Products/
        │   │       └── AdminProductsPage.tsx                (Modify: integrate thumbnail & gallery upload)
        │   └── storefront/
        │       └── Profile/
        │           └── ProfilePage.tsx                      (New: Customer profile & avatar uploader)
        ├── components/
        │   └── common/
        │       └── Header.tsx                               (Modify: add link to /profile in user dropdown)
        └── routes/
            └── AppRoutes.tsx                                (Modify: register /profile route)
```

---

### Task 1: Backend Dependencies & Image Optimization Engine (Sharp)

**Files:**
- Modify: `MobileCommerce/backend/package.json`
- Modify: `MobileCommerce/backend/src/infrastructure/storage/storage.service.ts`
- Create: `MobileCommerce/backend/test/unit/storage.spec.ts`

- [ ] **Step 1: Install `sharp`, `@types/sharp`, and `@types/multer`**

Run in `MobileCommerce/backend`:
```powershell
npm install sharp
npm install -D @types/sharp @types/multer
```

- [ ] **Step 2: Write failing unit test for `StorageService` with Sharp WebP optimization**

Create `MobileCommerce/backend/test/unit/storage.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import * as sharp from 'sharp';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'SUPABASE_URL') return 'https://mock.supabase.co';
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock-key';
              if (key === 'SUPABASE_STORAGE_BUCKET') return 'mobile-commerce';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compress and convert an image buffer to WebP', async () => {
    // Generate a test 100x100 PNG buffer
    const testPngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.optimizeImage(testPngBuffer, 800);
    expect(result.mimeType).toBe('image/webp');
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify Sharp can inspect the resulting buffer as webp
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(800);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run in `MobileCommerce/backend`:
```powershell
npx jest test/unit/storage.spec.ts
```
Expected: FAIL (`service.optimizeImage is not a function`).

- [ ] **Step 4: Implement Sharp optimization pipeline in `StorageService`**

Modify `MobileCommerce/backend/src/infrastructure/storage/storage.service.ts`:
```typescript
import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as sharp from 'sharp';

export interface UploadResult {
  url: string;
  path: string;
}

export interface OptimizedImageResult {
  buffer: Buffer;
  mimeType: string;
  format: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;
  private bucket: string;
  private isMock: boolean;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'mobile-commerce');

    this.isMock = !url || !key || key.includes('your-supabase');

    if (this.isMock) {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured. ' +
          'Running in mock mode — storage calls will return placeholder URLs.',
      );
      return;
    }

    this.supabase = createClient(url, key);
    this.logger.log(`Supabase Storage initialized (bucket=${this.bucket})`);
  }

  /**
   * Optimize image buffer: resize large images down to maxWidth and convert to WebP format.
   */
  async optimizeImage(
    buffer: Buffer,
    maxWidth = 1600,
    quality = 80,
  ): Promise<OptimizedImageResult> {
    try {
      const pipeline = sharp(buffer);
      const metadata = await pipeline.metadata();

      if (!metadata.format) {
        throw new BadRequestException('Invalid image buffer');
      }

      // If SVG, return as is (scalable vector graphics do not need compression)
      if (metadata.format === 'svg') {
        return { buffer, mimeType: 'image/svg+xml', format: 'svg' };
      }

      const optimized = await pipeline
        .resize({
          width: maxWidth,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality })
        .toBuffer();

      return {
        buffer: optimized,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      this.logger.error(`Sharp optimization failed: ${err.message}`);
      throw new BadRequestException(`Cannot process image file: ${err.message}`);
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
    shouldOptimize = true,
  ): Promise<UploadResult> {
    let finalBuffer = buffer;
    let mimeType = 'image/webp';
    let ext = 'webp';

    if (shouldOptimize) {
      const opt = await this.optimizeImage(buffer);
      finalBuffer = opt.buffer;
      mimeType = opt.mimeType;
      ext = opt.format;
    }

    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${folder}/${Date.now()}-${baseName}.${ext}`;

    if (this.isMock) {
      this.logger.log(`[STORAGE MOCK] Uploading: ${path} (${mimeType}, ${finalBuffer.length} bytes)`);
      return {
        url: `https://placeholder.supabase.co/storage/v1/object/public/${this.bucket}/${path}`,
        path,
      };
    }

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, finalBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${path}`, error.message);
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    this.logger.log(`File uploaded to Supabase: ${data.publicUrl}`);

    return { url: data.publicUrl, path };
  }

  async deleteFile(path: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[STORAGE MOCK] Deleting: ${path}`);
      return;
    }

    const { error } = await this.supabase.storage.from(this.bucket).remove([path]);
    if (error) {
      this.logger.error(`Delete failed: ${path}`, error.message);
      throw new InternalServerErrorException(`File delete failed: ${error.message}`);
    }
    this.logger.log(`File deleted from Supabase: ${path}`);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run in `MobileCommerce/backend`:
```powershell
npx jest test/unit/storage.spec.ts
```
Expected: PASS (`2 passed, 2 total`).

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/infrastructure/storage/storage.service.ts backend/test/unit/storage.spec.ts
git commit -m "feat(backend): integrate sharp webp image optimization into storage service"
```

---

### Task 2: Backend Storage Controller & Upload Endpoints

**Files:**
- Create: `MobileCommerce/backend/src/infrastructure/storage/dto/upload-response.dto.ts`
- Create: `MobileCommerce/backend/src/infrastructure/storage/storage.controller.ts`
- Modify: `MobileCommerce/backend/src/infrastructure/storage/storage.module.ts`

- [ ] **Step 1: Create response DTO**

Create `MobileCommerce/backend/src/infrastructure/storage/dto/upload-response.dto.ts`:
```typescript
export class UploadResponseDto {
  url: string;
  path: string;
}

export class DeleteFileDto {
  path: string;
}
```

- [ ] **Step 2: Create `StorageController` with single & multi-file endpoints**

Create `MobileCommerce/backend/src/infrastructure/storage/storage.controller.ts`:
```typescript
import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { StorageService, UploadResult } from './storage.service';
import { DeleteFileDto } from './dto/upload-response.dto';

const ALLOWED_IMAGE_REGEX = /(jpg|jpeg|png|webp|svg\+xml)$/;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload single image for products, brands, or categories (Admin/Staff only)
   */
  @Post('upload/:folder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @Param('folder') folder: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    const validFolders = ['products', 'brands', 'categories'];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException(`Folder must be one of: ${validFolders.join(', ')}`);
    }

    return this.storageService.uploadFile(file.buffer, file.originalname, folder, true);
  }

  /**
   * Upload up to 5 images simultaneously for product variant gallery
   */
  @Post('upload-gallery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadGallery(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }

    const uploadPromises = files.map((file) => {
      if (file.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds 5MB limit`);
      }
      return this.storageService.uploadFile(file.buffer, file.originalname, 'products/gallery', true);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Upload user avatar (available to any authenticated user)
   */
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.storageService.uploadFile(file.buffer, file.originalname, 'avatars', true);
  }

  /**
   * Delete asset from Supabase storage by path
   */
  @Delete('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async deleteFile(@Body() dto: DeleteFileDto): Promise<{ success: boolean; message: string }> {
    if (!dto.path) {
      throw new BadRequestException('File path is required');
    }

    await this.storageService.deleteFile(dto.path);
    return { success: true, message: `File ${dto.path} deleted successfully` };
  }
}
```

- [ ] **Step 3: Register `StorageController` in `StorageModule`**

Modify `MobileCommerce/backend/src/infrastructure/storage/storage.module.ts`:
```typescript
import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 4: Verify backend compilation and tests**

Run in `MobileCommerce/backend`:
```powershell
npm test
npm run build
```
Expected: PASS (all tests pass, build finishes with 0 errors).

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/storage/
git commit -m "feat(backend): add storage controller with single, gallery, and avatar upload endpoints"
```

---

### Task 3: Frontend Storage API Client

**Files:**
- Create: `MobileCommerce/frontend/src/services/storageService.ts`

- [ ] **Step 1: Implement `storageService.ts`**

Create `MobileCommerce/frontend/src/services/storageService.ts`:
```typescript
import apiClient from './apiClient';

export interface UploadResponse {
  url: string;
  path: string;
}

export const storageService = {
  /**
   * Upload single image (products, brands, categories)
   */
  uploadSingle: async (
    file: File,
    folder: 'products' | 'brands' | 'categories',
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<UploadResponse>(`/storage/upload/${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return res.data;
  },

  /**
   * Upload multiple images for variant gallery (up to 5 images)
   */
  uploadGallery: async (files: File[]): Promise<UploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await apiClient.post<UploadResponse[]>('/storage/upload-gallery', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<UploadResponse>('/storage/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return res.data;
  },

  /**
   * Delete uploaded asset
   */
  deleteAsset: async (path: string): Promise<void> => {
    await apiClient.delete('/storage/delete', { data: { path } });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/storageService.ts
git commit -m "feat(frontend): create storage client service for single, gallery, and avatar uploads"
```

---

### Task 4: Admin Reusable Image Drag-and-Drop Component

**Files:**
- Create: `MobileCommerce/frontend/src/components/admin/ImageUploadDragger.tsx`

- [ ] **Step 1: Build `ImageUploadDragger.tsx` with preview & delete support**

Create `MobileCommerce/frontend/src/components/admin/ImageUploadDragger.tsx`:
```tsx
import React, { useState } from 'react';
import { Upload, message, Image, Button, Progress, Space } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { storageService } from '../../services/storageService';

const { Dragger } = Upload;

interface ImageUploadDraggerProps {
  folder?: 'products' | 'brands' | 'categories';
  value?: string;
  onChange?: (url: string) => void;
  maxSizeMB?: number;
}

export const ImageUploadDragger: React.FC<ImageUploadDraggerProps> = ({
  folder = 'products',
  value,
  onChange,
  maxSizeMB = 5,
}) => {
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const customUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const rawFile = file as File;

    if (!rawFile.type.startsWith('image/')) {
      message.error('Chỉ được phép tải lên file hình ảnh (PNG, JPG, WEBP)!');
      onError?.(new Error('Invalid file type'));
      return;
    }

    if (rawFile.size / 1024 / 1024 > maxSizeMB) {
      message.error(`Kích thước ảnh không được vượt quá ${maxSizeMB}MB!`);
      onError?.(new Error('File too large'));
      return;
    }

    setLoading(true);
    setPercent(0);

    try {
      const result = await storageService.uploadSingle(rawFile, folder, (p) => {
        setPercent(p);
      });
      message.success('Tải ảnh và tối ưu WebP thành công!');
      onChange?.(result.url);
      onSuccess?.(result);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Tải ảnh thất bại. Vui lòng thử lại!');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className="w-full">
      {value ? (
        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={value}
              alt="Thumbnail"
              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
              preview={{ visible: previewVisible, onVisibleChange: setPreviewVisible }}
            />
            <div className="max-w-xs truncate">
              <p className="text-xs text-slate-500 font-medium truncate">{value}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded font-semibold">
                Supabase CDN (WebP)
              </span>
            </div>
          </div>
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setPreviewVisible(true)}
            >
              Xem
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
            >
              Đổi ảnh
            </Button>
          </Space>
        </div>
      ) : (
        <Dragger
          name="file"
          multiple={false}
          showUploadList={false}
          customRequest={customUpload}
          className="rounded-xl border-dashed border-2 border-slate-300 hover:border-blue-500 bg-slate-50 transition-colors"
        >
          <p className="ant-upload-drag-icon text-blue-500 text-4xl mb-2">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text font-semibold text-slate-800 text-sm">
            Kéo thả hoặc nhấp để tải ảnh lên
          </p>
          <p className="ant-upload-hint text-xs text-slate-400">
            Hỗ trợ PNG, JPG, WEBP (Tối đa {maxSizeMB}MB). Tự động nén sang định dạng WebP siêu nhẹ.
          </p>
          {loading && (
            <div className="mt-3 px-6">
              <Progress percent={percent} size="small" status="active" />
              <p className="text-xs text-blue-600 mt-1">Đang tối ưu & đẩy lên Supabase Storage...</p>
            </div>
          )}
        </Dragger>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/ImageUploadDragger.tsx
git commit -m "feat(frontend): create reusable Ant Design ImageUploadDragger component"
```

---

### Task 5: Integrate Real Image Upload into Admin Products & Brands

**Files:**
- Modify: `MobileCommerce/frontend/src/pages/Admin/Products/AdminProductsPage.tsx`

- [ ] **Step 1: Replace placeholder inputs with `ImageUploadDragger` in Product Modal**

Edit `MobileCommerce/frontend/src/pages/Admin/Products/AdminProductsPage.tsx`:
- Import `ImageUploadDragger` from `../../../components/admin/ImageUploadDragger`.
- Replace the text input for thumbnail with `<ImageUploadDragger folder="products" />` inside `Form.Item name="thumbnail"`.
- Add an image column preview with zoom support on the products table.

- [ ] **Step 2: Test frontend compilation**

Run in `MobileCommerce/frontend`:
```powershell
npm run build
```
Expected: PASS (`built in ...s`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin/Products/AdminProductsPage.tsx
git commit -m "feat(frontend): integrate ImageUploadDragger into AdminProductsPage"
```

---

### Task 6: Storefront Customer Profile & Avatar Uploader

**Files:**
- Create: `MobileCommerce/frontend/src/pages/storefront/Profile/ProfilePage.tsx`
- Modify: `MobileCommerce/frontend/src/components/common/Header.tsx`
- Modify: `MobileCommerce/frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create `ProfilePage.tsx` with Tailwind CSS and live Avatar upload**

Create `MobileCommerce/frontend/src/pages/storefront/Profile/ProfilePage.tsx`:
```tsx
import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { storageService } from '../../../services/storageService';
import { Camera, CheckCircle2, User, Mail, Shield, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, setAuth } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh tối đa là 5MB.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const res = await storageService.uploadAvatar(file);
      if (user) {
        // Update user state with new avatar
        const token = localStorage.getItem('access_token') || '';
        setAuth({ ...user, avatar: res.url }, token);
      }
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Tải ảnh thất bại. Vui lòng thử lại!',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative" />

        {/* Content */}
        <div className="px-8 pb-8 relative">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.fullName || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition cursor-pointer"
                title="Đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{user?.fullName || 'Khách hàng'}</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                <Shield className="w-3.5 h-3.5" />
                Vai trò: {user?.roles?.join(', ') || 'USER'}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-500 mb-1">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Họ và tên</span>
              </div>
              <p className="text-slate-900 font-medium">{user?.fullName || 'Chưa cập nhật'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 text-slate-500 mb-1">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Địa chỉ Email</span>
              </div>
              <p className="text-slate-900 font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add `/profile` route to `AppRoutes.tsx` and dropdown link in `Header.tsx`**

- In `MobileCommerce/frontend/src/routes/AppRoutes.tsx`, import `ProfilePage` and register route `<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />`.
- In `MobileCommerce/frontend/src/components/common/Header.tsx`, add `<Link to="/profile">Thông tin tài khoản</Link>` in the user dropdown.

- [ ] **Step 3: Test frontend compilation and linting**

Run in `MobileCommerce/frontend`:
```powershell
npm run lint
npm run build
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Profile/ frontend/src/routes/AppRoutes.tsx frontend/src/components/common/Header.tsx
git commit -m "feat(frontend): add customer profile page with live avatar upload to supabase"
```

---

### Task 7: End-to-End Verification & Real Upload Validation

**Files:**
- Create: `MobileCommerce/backend/scripts/test-live-upload.cjs`

- [ ] **Step 1: Write an automated test script to verify live upload to Supabase Storage**

Create `MobileCommerce/backend/scripts/test-live-upload.cjs`:
```javascript
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testUpload() {
  console.log('--- 1. Checking Supabase Credentials ---');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'mobile-commerce';

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, key);

  console.log('--- 2. Generating test image with Sharp ---');
  const testWebp = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 4,
      background: { r: 16, g: 185, b: 129, alpha: 1 },
    },
  })
    .webp({ quality: 80 })
    .toBuffer();

  const testPath = `products/test-${Date.now()}.webp`;

  console.log(`--- 3. Uploading to Bucket: ${bucket} at path: ${testPath} ---`);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(testPath, testWebp, {
      contentType: 'image/webp',
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(testPath);
  console.log(`✅ Success! Image uploaded to Supabase Storage CDN: ${publicData.publicUrl}`);

  console.log('--- 4. Cleaning up test image ---');
  await supabase.storage.from(bucket).remove([testPath]);
  console.log('✅ Cleaned up test image successfully!');
}

testUpload().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run the live verification script**

Run in `MobileCommerce/backend`:
```powershell
node scripts/test-live-upload.cjs
```
Expected: `✅ Success! Image uploaded to Supabase Storage CDN` followed by `✅ Cleaned up test image successfully!`.

- [ ] **Step 3: Remove the verification script & run final test suite**

Run in `MobileCommerce/backend`:
```powershell
rm scripts/test-live-upload.cjs
npm test
npm run build
```

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: complete phase 3 supabase storage and sharp image optimization verification"
```
