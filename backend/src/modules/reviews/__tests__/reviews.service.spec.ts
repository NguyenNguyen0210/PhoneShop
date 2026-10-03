import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ReviewsService } from '../reviews.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(() => {
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

    service = new ReviewsService(prisma as any);
  });

  describe('getMyReviewStatus', () => {
    it('should return canReview: false if user has not purchased product', async () => {
      (prisma.orderItem.findFirst as any).mockResolvedValue(null);
      (prisma.review.findUnique as any).mockResolvedValue(null);

      const result = await service.getMyReviewStatus('user-1', 'prod-1');
      expect(result.canReview).toBe(false);
      expect(result.hasPurchased).toBe(false);
      expect(result.myReview).toBeNull();
    });

    it('should return canReview: true if user purchased and has not reviewed', async () => {
      (prisma.orderItem.findFirst as any).mockResolvedValue({ id: 'item-1' });
      (prisma.review.findUnique as any).mockResolvedValue(null);

      const result = await service.getMyReviewStatus('user-1', 'prod-1');
      expect(result.canReview).toBe(true);
      expect(result.hasPurchased).toBe(true);
      expect(result.myReview).toBeNull();
    });

    it('should return canReview: false and existing review if already reviewed', async () => {
      const existing = { id: 'rev-1', rating: 5, content: 'Great', images: ['https://example.com/img1.webp'] };
      (prisma.orderItem.findFirst as any).mockResolvedValue({ id: 'item-1' });
      (prisma.review.findUnique as any).mockResolvedValue(existing);

      const result = await service.getMyReviewStatus('user-1', 'prod-1');
      expect(result.canReview).toBe(false);
      expect(result.hasPurchased).toBe(true);
      expect(result.myReview).toEqual(existing);
    });
  });

  describe('create', () => {
    it('should create review with images if purchased', async () => {
      (prisma.review.findUnique as any).mockResolvedValue(null);
      (prisma.orderItem.findFirst as any).mockResolvedValue({ id: 'item-1' });
      (prisma.review.create as any).mockImplementation((args: any) => Promise.resolve({ id: 'rev-1', ...args.data }));

      const dto = {
        productId: 'prod-1',
        rating: 5,
        title: 'Excellent',
        content: 'Great product!',
        images: ['https://example.com/img1.webp'],
      };

      const result = await service.create('user-1', dto);
      expect(result).toMatchObject({
        productId: 'prod-1',
        userId: 'user-1',
        rating: 5,
        title: 'Excellent',
        content: 'Great product!',
        images: ['https://example.com/img1.webp'],
        status: ReviewStatus.PENDING,
        isVerified: true,
      });
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: ['https://example.com/img1.webp'],
          }),
        }),
      );
    });

    it('should throw ForbiddenException if user has not purchased product', async () => {
      (prisma.review.findUnique as any).mockResolvedValue(null);
      (prisma.orderItem.findFirst as any).mockResolvedValue(null);

      await expect(
        service.create('user-1', { productId: 'prod-1', rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update review with images and set status to PENDING', async () => {
      (prisma.review.findUnique as any).mockResolvedValue({ id: 'rev-1', userId: 'user-1' });
      (prisma.review.update as any).mockImplementation((args: any) => Promise.resolve({ id: 'rev-1', ...args.data }));

      await service.update('user-1', 'rev-1', {
        rating: 4,
        images: ['https://example.com/img2.webp'],
      });

      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-1' },
          data: expect.objectContaining({
            rating: 4,
            images: ['https://example.com/img2.webp'],
            status: ReviewStatus.PENDING,
          }),
        }),
      );
    });

    it('should throw ForbiddenException if updating someone else review', async () => {
      (prisma.review.findUnique as any).mockResolvedValue({ id: 'rev-1', userId: 'other-user' });

      await expect(
        service.update('user-1', 'rev-1', { rating: 4 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
