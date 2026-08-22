import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this product');

    return this.prisma.review.create({
      data: { ...dto, userId, status: ReviewStatus.PENDING },
    });
  }

  async findAll(productId?: string, status?: ReviewStatus) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (status)    where.status    = status;
    else           where.status    = ReviewStatus.APPROVED; // Default: show approved only

    return this.prisma.review.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(productId?: string, status?: ReviewStatus) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (status)    where.status    = status;

    return this.prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.findOne(id);
    if (review.userId !== userId) throw new ForbiddenException('You can only edit your own reviews');
    return this.prisma.review.update({ where: { id }, data: { ...dto, status: ReviewStatus.PENDING } });
  }

  async remove(userId: string, id: string, isAdmin = false) {
    const review = await this.findOne(id);
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    return this.prisma.review.delete({ where: { id } });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.APPROVED } });
  }

  async reject(id: string) {
    await this.findOne(id);
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.REJECTED } });
  }

  async verify(id: string) {
    await this.findOne(id);
    return this.prisma.review.update({ where: { id }, data: { isVerified: true } });
  }
}
