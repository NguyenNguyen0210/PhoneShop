# Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the full product reviews feature including authenticated verified buyer reviews, interactive 1-5 star ratings, image uploads, editing, deleting, and integration across Product Detail Page (PDP) and Order Detail Page.

**Architecture:** 
1. Database & Backend: Add `images String[]` to Prisma `Review` model, update DTOs, add authenticated `POST /storage/upload-review-images`, and provide `GET /reviews/product/:productId/my-review` eligibility endpoint.
2. Frontend: Create `reviewService.ts` and modular UI components (`StarRatingInput`, `ReviewImageUploader`, `ReviewModal`, `ReviewDeleteDialog`).
3. Storefront Pages: Connect PDP (`ProductHighlightsSection`) and Order Detail (`OrderDetailPage`) to review modals with full real-time state feedback.

**Tech Stack:** 
- Backend: NestJS, Prisma ORM, PostgreSQL, Sharp, Cloudflare R2 / S3 storage, Class-Validator, Jest
- Frontend: React 18, TypeScript, Tailwind CSS, Lucide React, Axios

---

## File Structure Map

### Backend
- Modify: `backend/prisma/schema.prisma` (Add `images` to `Review` model)
- Modify: `backend/src/modules/reviews/dto/review.dto.ts` (Add `images` field & validation)
- Modify: `backend/src/infrastructure/storage/storage.controller.ts` (Add `POST /storage/upload-review-images`)
- Modify: `backend/src/modules/reviews/reviews.service.ts` (Add `getMyReviewStatus`, handle `images` on create/update)
- Modify: `backend/src/modules/reviews/reviews.controller.ts` (Add `GET /reviews/product/:productId/my-review`)
- Test: `backend/src/modules/reviews/__tests__/reviews.service.spec.ts`

### Frontend
- Modify: `frontend/src/types/index.ts` (Add `images` and `status` to `Review` interface)
- Create: `frontend/src/services/reviewService.ts` (CRUD and upload service)
- Create: `frontend/src/components/storefront/reviews/StarRatingInput.tsx` (Interactive 1-5 star rating)
- Create: `frontend/src/components/storefront/reviews/ReviewImageUploader.tsx` (Image upload & thumbnail manager)
- Create: `frontend/src/components/storefront/reviews/ReviewModal.tsx` (Shared create/edit review modal)
- Create: `frontend/src/components/storefront/reviews/ReviewDeleteDialog.tsx` (Confirmation dialog for review deletion)
- Modify: `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx` (Integrate review actions, user review banner, image previews)
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx` (Integrate review button per purchased product)

---

## Task Outlines

- **Task 1: Backend Database Schema & Prisma Migration** (Add `images` field to `Review` model)
- **Task 2: Backend Review DTOs & Validation** (Update `CreateReviewDto` and `UpdateReviewDto`)
- **Task 3: Backend Review Image Upload Storage Endpoint** (Create `POST /storage/upload-review-images`)
- **Task 4: Backend Review Eligibility & CRUD Service Update** (Add `getMyReviewStatus`, update `create`/`update`)
- **Task 5: Backend Review Controller & Unit Tests** (Expose `GET /reviews/product/:productId/my-review` and tests)
- **Task 6: Frontend Types & Review Service** (Add `Review` fields and `reviewService.ts`)
- **Task 7: Frontend Interactive Star Rating Component** (`StarRatingInput.tsx`)
- **Task 8: Frontend Review Image Uploader Component** (`ReviewImageUploader.tsx`)
- **Task 9: Frontend Review Modal & Delete Dialog** (`ReviewModal.tsx` and `ReviewDeleteDialog.tsx`)
- **Task 10: Frontend Product Detail Page Integration** (`ProductHighlightsSection.tsx`)
- **Task 11: Frontend Order Detail Page Integration** (`OrderDetailPage.tsx`)
- **Task 12: End-to-End Build & Verification** (Run backend and frontend build checks)

---

### Task 1: Backend Database Schema & Prisma Migration

**Files:**
- Modify: `backend/prisma/schema.prisma:620-635`

- [ ] **Step 1: Update Review model in Prisma schema**

Edit `backend/prisma/schema.prisma` inside `model Review`:
```prisma
model Review {
  id         String       @id @default(uuid()) @db.Uuid
  userId     String       @map("user_id") @db.Uuid
  productId  String       @map("product_id") @db.Uuid
  rating     Int
  title      String?      @db.VarChar(255)
  content    String?      @db.Text
  images     String[]     @default([]) @map("images")
  status     ReviewStatus @default(PENDING)
  isVerified Boolean      @default(false) @map("is_verified")
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  replies ReviewReply[]

  @@unique([userId, productId])
  @@index([productId])
  @@index([status])
  @@map("reviews")
}
```

- [ ] **Step 2: Generate Prisma Client & Run DB Migration**

Run:
```bash
cd backend
npx prisma generate
npx prisma db push
```
Expected: `Generated Prisma Client` and database schema synchronized without errors.

- [ ] **Step 3: Commit database schema changes**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(reviews): add images array to Review model in prisma schema"
```

---

### Task 2: Backend Review DTOs & Validation

**Files:**
- Modify: `backend/src/modules/reviews/dto/review.dto.ts`

- [ ] **Step 1: Update CreateReviewDto and UpdateReviewDto**

Edit `backend/src/modules/reviews/dto/review.dto.ts`:
```typescript
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID of the product being reviewed' })
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional short summary/title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed review content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of image URLs (max 5)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  images?: string[];
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of image URLs (max 5)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  images?: string[];
}
```

- [ ] **Step 2: Commit DTO updates**

```bash
git add backend/src/modules/reviews/dto/review.dto.ts
git commit -m "feat(reviews): add images validation to CreateReviewDto and UpdateReviewDto"
```

---

### Task 3: Backend Review Image Upload Storage Endpoint

**Files:**
- Modify: `backend/src/infrastructure/storage/storage.controller.ts`

- [ ] **Step 1: Add upload-review-images endpoint**

In `backend/src/infrastructure/storage/storage.controller.ts`, add:
```typescript
  /**
   * Upload up to 5 review photos by authenticated customers
   */
  @Post('upload-review-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadReviewImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed per review');
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds 5MB limit`);
      }
      if (!file.mimetype || !ALLOWED_IMAGE_REGEX.test(file.mimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} has an invalid type. Only JPG, JPEG, PNG, and WebP are allowed`,
        );
      }
    }

    const uploadPromises = files.map((file) => {
      return this.storageService.uploadFile(file.buffer, file.originalname, 'reviews', true);
    });

    return Promise.all(uploadPromises);
  }
```

- [ ] **Step 2: Verify endpoint compiles**

Run:
```bash
cd backend
npm run build
```
Expected: Compilation succeeds without errors.

- [ ] **Step 3: Commit storage upload endpoint**

```bash
git add backend/src/infrastructure/storage/storage.controller.ts
git commit -m "feat(storage): add POST /storage/upload-review-images endpoint for customers"
```

---

### Task 4: Backend Review Eligibility & CRUD Service Update

**Files:**
- Modify: `backend/src/modules/reviews/reviews.service.ts`

- [ ] **Step 1: Add getMyReviewStatus and update create/update in reviews.service.ts**

In `backend/src/modules/reviews/reviews.service.ts`:
```typescript
  async getMyReviewStatus(userId: string, productId: string) {
    const [purchased, existingReview] = await Promise.all([
      this.prisma.orderItem.findFirst({
        where: {
          variant: { productId },
          order: {
            userId,
            status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
          },
        },
        select: { id: true },
      }),
      this.prisma.review.findUnique({
        where: { userId_productId: { userId, productId } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  roles: { select: { role: { select: { name: true } } } },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const hasPurchased = !!purchased;
    const canReview = hasPurchased && !existingReview;

    return {
      hasPurchased,
      canReview,
      myReview: existingReview || null,
    };
  }
```

Ensure `create` handles `images`:
```typescript
  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this product');

    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        variant: { productId: dto.productId },
        order: {
          userId,
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      },
      select: { id: true },
    });
    if (!purchased) {
      throw new ForbiddenException('Only customers with a delivered order can review this product');
    }

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        images: dto.images || [],
        status: ReviewStatus.PENDING,
        isVerified: true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }
```

Ensure `update` handles `images`:
```typescript
  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.findOne(id);
    if (review.userId !== userId) throw new ForbiddenException('You can only edit your own reviews');
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.images !== undefined && { images: dto.images }),
        status: ReviewStatus.PENDING,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }
```

- [ ] **Step 2: Commit service updates**

```bash
git add backend/src/modules/reviews/reviews.service.ts
git commit -m "feat(reviews): add getMyReviewStatus and support images in create and update"
```

---

### Task 5: Backend Review Controller & Unit Tests

**Files:**
- Modify: `backend/src/modules/reviews/reviews.controller.ts`
- Create: `backend/src/modules/reviews/__tests__/reviews.service.spec.ts`

- [ ] **Step 1: Expose GET /reviews/product/:productId/my-review in Controller**

In `backend/src/modules/reviews/reviews.controller.ts`:
```typescript
  @Get('product/:productId/my-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user review and review eligibility for a product' })
  getMyReviewStatus(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.reviewsService.getMyReviewStatus(user.id, productId);
  }
```

- [ ] **Step 2: Write unit test for reviews.service.ts**

Create `backend/src/modules/reviews/__tests__/reviews.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../reviews.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { ReviewStatus, OrderStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      review: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should return canReview: false if user has not purchased product', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(null);
    prisma.review.findUnique.mockResolvedValue(null);

    const result = await service.getMyReviewStatus('user-1', 'prod-1');
    expect(result.canReview).toBe(false);
    expect(result.hasPurchased).toBe(false);
    expect(result.myReview).toBeNull();
  });

  it('should return canReview: true if user purchased and has not reviewed', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });
    prisma.review.findUnique.mockResolvedValue(null);

    const result = await service.getMyReviewStatus('user-1', 'prod-1');
    expect(result.canReview).toBe(true);
    expect(result.hasPurchased).toBe(true);
    expect(result.myReview).toBeNull();
  });

  it('should return canReview: false and existing review if already reviewed', async () => {
    const existing = { id: 'rev-1', rating: 5, content: 'Great' };
    prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });
    prisma.review.findUnique.mockResolvedValue(existing);

    const result = await service.getMyReviewStatus('user-1', 'prod-1');
    expect(result.canReview).toBe(false);
    expect(result.hasPurchased).toBe(true);
    expect(result.myReview).toEqual(existing);
  });
});
```

- [ ] **Step 3: Run unit tests**

Run:
```bash
cd backend
npx jest src/modules/reviews/__tests__/reviews.service.spec.ts --passWithNoTests
```
Expected: PASS

- [ ] **Step 4: Commit Controller and Tests**

```bash
git add backend/src/modules/reviews/reviews.controller.ts backend/src/modules/reviews/__tests__/reviews.service.spec.ts
git commit -m "feat(reviews): add getMyReviewStatus endpoint and unit tests"
```

---

### Task 6: Frontend Types & Review Service

**Files:**
- Modify: `frontend/src/types/index.ts:100-118`
- Create: `frontend/src/services/reviewService.ts`

- [ ] **Step 1: Update Review interface in frontend/src/types/index.ts**

Update `interface Review`:
```typescript
export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  replies?: ReviewReply[];
}
```

- [ ] **Step 2: Create frontend/src/services/reviewService.ts**

Create `frontend/src/services/reviewService.ts`:
```typescript
import { apiClient } from './apiClient';
import type { Review } from '../types';

export interface MyReviewStatusResponse {
  hasPurchased: boolean;
  canReview: boolean;
  myReview: Review | null;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  title?: string;
  content?: string;
  images?: string[];
}

export const reviewService = {
  async getMyReviewStatus(productId: string): Promise<MyReviewStatusResponse> {
    const response = await apiClient.get<MyReviewStatusResponse>(
      `/reviews/product/${productId}/my-review`,
    );
    return response.data;
  },

  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const response = await apiClient.post<Review>('/reviews', payload);
    return response.data;
  },

  async updateReview(id: string, payload: UpdateReviewPayload): Promise<Review> {
    const response = await apiClient.patch<Review>(`/reviews/${id}`, payload);
    return response.data;
  },

  async deleteReview(id: string): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },

  async uploadReviewImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<Array<{ url: string }>>(
      '/storage/upload-review-images',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.map((item) => item.url);
  },
};
```

- [ ] **Step 3: Commit Frontend Types and Review Service**

```bash
git add frontend/src/types/index.ts frontend/src/services/reviewService.ts
git commit -m "feat(frontend): add reviewService and update Review type"
```

---

### Task 7: Frontend Interactive Star Rating Component

**Files:**
- Create: `frontend/src/components/storefront/reviews/StarRatingInput.tsx`

- [ ] **Step 1: Implement StarRatingInput component**

Create `frontend/src/components/storefront/reviews/StarRatingInput.tsx`:
```tsx
import React, { useState } from 'react';
import { Star } from 'lucide-react';

export interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating ?? value;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Đánh giá sao">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(null)}
            className={`p-1 rounded-lg transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
            aria-label={`${star} sao - ${RATING_LABELS[star]}`}
            role="radio"
            aria-checked={value === star}
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                star <= activeRating
                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                  : 'text-slate-200'
              }`}
            />
          </button>
        ))}
      </div>
      {activeRating > 0 && (
        <span className="text-sm font-semibold text-amber-600 sm:ml-2 animate-fadeIn">
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
};

export default StarRatingInput;
```

- [ ] **Step 2: Commit StarRatingInput component**

```bash
git add frontend/src/components/storefront/reviews/StarRatingInput.tsx
git commit -m "feat(frontend): create interactive StarRatingInput component"
```

---

### Task 8: Frontend Review Image Uploader Component

**Files:**
- Create: `frontend/src/components/storefront/reviews/ReviewImageUploader.tsx`

- [ ] **Step 1: Implement ReviewImageUploader component**

Create `frontend/src/components/storefront/reviews/ReviewImageUploader.tsx`:
```tsx
import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { reviewService } from '../../../services/reviewService';

export interface ReviewImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ReviewImageUploader: React.FC<ReviewImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 5,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Reset input value so same files can be re-selected if needed
    e.target.value = '';

    const remainingSlots = maxImages - images.length;
    if (files.length > remainingSlots) {
      setErrorMessage(`Bạn chỉ có thể tải lên tối đa ${maxImages} hình ảnh (còn lại ${remainingSlots} ảnh).`);
      return;
    }

    const invalidSize = files.some((f) => f.size > 5 * 1024 * 1024);
    if (invalidSize) {
      setErrorMessage('Mỗi hình ảnh không được vượt quá 5MB.');
      return;
    }

    setErrorMessage(null);
    setUploading(true);

    try {
      const uploadedUrls = await reviewService.uploadReviewImages(files);
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại sau.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {images.map((url, index) => (
          <div
            key={url + index}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 group bg-slate-50"
          >
            <img
              src={url}
              alt={`Review image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-opacity opacity-90 group-hover:opacity-100"
                aria-label="Xóa ảnh"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium font-mono">
                  {images.length}/{maxImages}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}
      <p className="text-[11px] text-slate-400">
        Định dạng hỗ trợ: JPG, PNG, WebP (Tối đa {maxImages} ảnh, dưới 5MB/ảnh)
      </p>
    </div>
  );
};

export default ReviewImageUploader;
```

- [ ] **Step 2: Commit ReviewImageUploader component**

```bash
git add frontend/src/components/storefront/reviews/ReviewImageUploader.tsx
git commit -m "feat(frontend): create ReviewImageUploader component"
```

---

### Task 9: Frontend Review Modal & Delete Dialog

**Files:**
- Create: `frontend/src/components/storefront/reviews/ReviewModal.tsx`
- Create: `frontend/src/components/storefront/reviews/ReviewDeleteDialog.tsx`

- [ ] **Step 1: Create ReviewModal component**

Create `frontend/src/components/storefront/reviews/ReviewModal.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';
import { ReviewImageUploader } from './ReviewImageUploader';
import { reviewService } from '../../../services/reviewService';
import type { Review } from '../../../types';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string;
  initialData?: Review | null;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  initialData,
  onSuccess,
}) => {
  const isEditing = Boolean(initialData?.id);
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setRating(initialData.rating || 5);
        setTitle(initialData.title || '');
        setContent(initialData.content || '');
        setImages(initialData.images || []);
      } else {
        setRating(5);
        setTitle('');
        setContent('');
        setImages([]);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && initialData?.id) {
        await reviewService.updateReview(initialData.id, {
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          images,
        });
      } else {
        await reviewService.createReview({
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          images,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? 'Chỉnh sửa đánh giá' : 'Đánh giá sản phẩm'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Product brief */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-slate-200/60 shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 font-medium">Sản phẩm bạn đã mua:</p>
              <h4 className="text-sm font-bold text-slate-900 truncate">{productName}</h4>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Đánh giá chung <span className="text-red-500">*</span>
            </label>
            <StarRatingInput value={rating} onChange={setRating} disabled={loading} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Tiêu đề <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="Tóm tắt cảm nhận của bạn (VD: Rất đáng tiền, máy đẹp mượt mà...)"
              maxLength={255}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Nội dung nhận xét <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              rows={4}
              maxLength={2000}
              placeholder="Chia sẻ thêm về chất lượng sản phẩm, thời lượng pin, camera, cảm giác sử dụng thực tế..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 font-mono">
              {content.length}/2000 ký tự
            </div>
          </div>

          {/* Image Uploader */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Ảnh thực tế đính kèm
            </label>
            <ReviewImageUploader
              images={images}
              onChange={setImages}
              disabled={loading}
              maxImages={5}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Lưu thay đổi' : 'Gửi đánh giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
```

- [ ] **Step 2: Create ReviewDeleteDialog component**

Create `frontend/src/components/storefront/reviews/ReviewDeleteDialog.tsx`:
```tsx
import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { reviewService } from '../../../services/reviewService';

export interface ReviewDeleteDialogProps {
  isOpen: boolean;
  reviewId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewDeleteDialog: React.FC<ReviewDeleteDialogProps> = ({
  isOpen,
  reviewId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await reviewService.deleteReview(reviewId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-slate-900">Xóa đánh giá của bạn?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hành động này không thể hoàn tác. Bạn sẽ có thể viết đánh giá mới cho sản phẩm này sau khi xóa.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDeleteDialog;
```

- [ ] **Step 3: Commit Modal and Dialog components**

```bash
git add frontend/src/components/storefront/reviews/ReviewModal.tsx frontend/src/components/storefront/reviews/ReviewDeleteDialog.tsx
git commit -m "feat(frontend): create ReviewModal and ReviewDeleteDialog components"
```

---

### Task 10: Frontend Product Detail Page Integration

**Files:**
- Modify: `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx`

- [ ] **Step 1: Integrate Review actions and gallery into ProductHighlightsSection.tsx**

In `frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx`:
1. Import `ReviewModal`, `ReviewDeleteDialog`, `reviewService`, and `useAuthStore`.
2. Fetch `getMyReviewStatus(product.id)` if user is logged in.
3. Show "Viết đánh giá" button in the summary card if `canReview` is true.
4. If `myReview` exists:
   - Render user's review at top of review list with amber/green badge:
     `PENDING`: "Đang chờ duyệt", `APPROVED`: "Đã duyệt".
   - Render "Chỉnh sửa" and "Xóa" buttons for user's own review.
5. In review items, render attached `rev.images` as clickable thumbnails that open a full-size preview.
6. Refresh review status and product reviews when `onSuccess` fires.

- [ ] **Step 2: Commit ProductHighlightsSection integration**

```bash
git add frontend/src/components/storefront/pdp/ProductHighlightsSection.tsx
git commit -m "feat(frontend): integrate review modal, review management, and photos into PDP"
```

---

### Task 11: Frontend Order Detail Page Integration

**Files:**
- Modify: `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`

- [ ] **Step 1: Add review button per delivered order item**

In `frontend/src/pages/storefront/Orders/OrderDetailPage.tsx`:
1. Check order status: if `DELIVERED` or `COMPLETED`, allow reviewing each item.
2. Render "Đánh giá sản phẩm" button next to each order item.
3. Clicking opens `ReviewModal` with the selected item's `productId`, `productName`, and `productImage`.
4. After submission, show success notification and mark item as reviewed.

- [ ] **Step 2: Commit OrderDetailPage integration**

```bash
git add frontend/src/pages/storefront/Orders/OrderDetailPage.tsx
git commit -m "feat(frontend): add product review action buttons in OrderDetailPage"
```

---

### Task 12: End-to-End Build & Verification

- [ ] **Step 1: Run Backend Build & Tests**

Run:
```bash
cd backend
npm run build
npx jest src/modules/reviews/__tests__/reviews.service.spec.ts --passWithNoTests
```
Expected: Build succeeds with 0 errors, all unit tests PASS.

- [ ] **Step 2: Run Frontend Build & Type Check**

Run:
```bash
cd frontend
npm run build
```
Expected: Vite build succeeds with 0 errors.

- [ ] **Step 3: Final Commit**

```bash
git add .
git commit -m "chore: complete product reviews feature across backend and frontend"
```

