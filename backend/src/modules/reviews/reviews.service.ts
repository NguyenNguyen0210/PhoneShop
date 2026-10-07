import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, CreateReplyDto } from './dto/review.dto';
import { ReviewStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

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
    const canReview = !existingReview;

    return {
      hasPurchased,
      canReview,
      myReview: existingReview || null,
    };
  }

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

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        images: dto.images || [],
        status: ReviewStatus.APPROVED,
        isVerified: Boolean(purchased),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async findAll(productId?: string, status?: ReviewStatus) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (status)    where.status    = status;
    else           where.status    = ReviewStatus.APPROVED; // Default: show approved only

    return this.prisma.review.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getModerationStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.review.count(),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.review.count({ where: { status: ReviewStatus.APPROVED } }),
      this.prisma.review.count({ where: { status: ReviewStatus.REJECTED } }),
    ]);
    return { total, pending, approved, rejected };
  }

  async findAllAdmin(productId?: string, status?: ReviewStatus, page = 1, limit = 20) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (status)    where.status    = status;

    const [total, data] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
          product: { select: { id: true, name: true, thumbnailUrl: true } },
          replies: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, requireApproved = false) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    // AUDIT: public detail endpoint must not leak PENDING/REJECTED reviews —
    // callers serving unauthenticated traffic pass requireApproved=true so
    // non-approved reviews 404 exactly like missing ones (no oracle).
    if (requireApproved && review.status !== ReviewStatus.APPROVED) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

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
        status: ReviewStatus.APPROVED,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async remove(userId: string, id: string, isAdmin = false) {
    const review = await this.findOne(id);
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    return this.prisma.review.delete({ where: { id } });
  }

  async approve(id: string, actorId?: string) {
    const review = await this.findOne(id);
    // Separation of duties: staff cannot approve their own review.
    if (actorId && review.userId === actorId) {
      throw new ForbiddenException('You cannot approve your own review');
    }
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.APPROVED } });
  }

  async reject(id: string, actorId?: string) {
    const review = await this.findOne(id);
    if (actorId && review.userId === actorId) {
      throw new ForbiddenException('You cannot reject your own review');
    }
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.REJECTED } });
  }

  async verify(id: string, actorId?: string) {
    const review = await this.findOne(id);
    // Separation of duties: staff cannot verify their own review.
    if (actorId && review.userId === actorId) {
      throw new ForbiddenException('You cannot verify your own review');
    }
    return this.prisma.review.update({ where: { id }, data: { isVerified: true } });
  }

  // ── M14: REPLIES ──────────────────────────────────────────
  // Previously replies were a read-only dead end (seedable only by direct
  // DB writes). Shop staff answer customers through this endpoint; reply
  // authorship + roles drive the storefront "Phản hồi từ PhoneShop" badge.
  async createReply(reviewId: string, userId: string, dto: CreateReplyDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return (this.prisma as any).reviewReply.create({
      data: { reviewId, userId, content: dto.content },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async deleteReply(replyId: string, userId: string, isStaff = false) {
    const reply = await (this.prisma as any).reviewReply.findUnique({
      where: { id: replyId },
    });
    if (!reply) throw new NotFoundException('Reply not found');
    if (!isStaff && reply.userId !== userId) {
      throw new ForbiddenException('You can only delete your own replies');
    }
    return (this.prisma as any).reviewReply.delete({ where: { id: replyId } });
  }
}
