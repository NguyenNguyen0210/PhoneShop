import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { ProductStatus, ReviewStatus } from '@prisma/client';

// Reviews with nested shop/customer replies (oldest reply first).
// Reply authors include roles so the storefront can badge shop responses.
// H9: storefront aggregation and listing only ever see APPROVED reviews —
// PENDING/REJECTED must never move the rating or render publicly. (Admin
// moderation uses reviews.findAllAdmin, which is intentionally unfiltered.)
const reviewsWithRepliesInclude = {
  where: { status: ReviewStatus.APPROVED },
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
      orderBy: { createdAt: 'asc' as const },
    },
  },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ── PRODUCTS ──────────────────────────────────────────

  async create(dto: CreateProductDto) {
    const baseSlug = (dto.slug || dto.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = dto.slug || `${baseSlug}-${Date.now().toString(36)}`;

    const existing = await this.prisma.product.findUnique({
      where: { slug },
    });
    if (existing) throw new ConflictException('Product slug already exists');

    return this.prisma.product.create({
      data: { ...dto, slug },
      include: { brand: true, category: true, variants: true },
    });
  }

  private formatProduct(product: any) {
    if (!product) return product;
    const thumb =
      product.thumbnailUrl ||
      product.variants?.[0]?.imageUrl ||
      '/images/products/iphone-16-pro-max.png';

    const images =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : thumb
        ? [thumb]
        : [];

    const variants = Array.isArray(product.variants)
      ? product.variants.map((v: any) => ({
          ...v,
          imageUrl: v.imageUrl || thumb,
          images:
            Array.isArray(v.images) && v.images.length > 0
              ? v.images
              : [v.imageUrl || thumb],
        }))
      : [];

    const reviews = Array.isArray(product.reviews) ? product.reviews : [];
    // M18: no reviews → rating null (never a fake 5.0). The storefront renders
    // "Chưa có đánh giá" from reviewCount === 0.
    const rating = reviews.length > 0
      ? Number((reviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviews.length).toFixed(1))
      : null;
    const reviewCount = reviews.length;

    return {
      ...product,
      thumbnail: thumb,
      thumbnailUrl: thumb,
      images,
      variants,
      specs: product.specs || {},
      rating,
      reviewCount,
      reviews,
    };
  }

  async findAll(filter: FilterProductDto, publicOnly = false) {
    const {
      search, brandId, categoryId, status, condition,
      minPrice, maxPrice, page = 1, limit = 50,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = filter;

    const where: any = {};

    if (publicOnly) {
      where.status = ProductStatus.ACTIVE;
    } else if (status) {
      where.status = status;
    }

    if (condition) where.condition = condition;
    if (brandId)   where.brandId   = brandId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.variants = {
        some: {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
          isActive: true,
        },
      };
    }

    const allowedSort = ['createdAt', 'name', 'updatedAt'];
    const orderBy: any = {};
    orderBy[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder;

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          brand: true,
          category: true,
          variants: { where: { isActive: true }, include: { inventory: true } },
          reviews: reviewsWithRepliesInclude,
        },
      }),
    ]);

    return {
      data: data.map((p) => this.formatProduct(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrSlug: string) {
    if (idOrSlug === 'prod-1') {
      const first = await this.prisma.product.findFirst({
        where: { status: ProductStatus.ACTIVE },
        include: {
          brand: true,
          category: true,
          variants: { include: { inventory: true } },
          reviews: {
            ...reviewsWithRepliesInclude,
            orderBy: { createdAt: 'desc' as const },
          },
        },
      });
      if (first) return this.formatProduct(first);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const product = await this.prisma.product.findFirst({
      where: isUuid
        ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
        : {
            OR: [
              { slug: idOrSlug },
              { slug: idOrSlug.replace(/^prod-/, '') },
            ],
          },
      include: {
        brand: true,
        category: true,
        variants: { include: { inventory: true } },
        reviews: {
          ...reviewsWithRepliesInclude,
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    // M9(infra): findOne accepts slugs/fuzzy ids, but update/remove/status
    // must use the canonical row id — otherwise a slug input finds the row
    // yet crashes the write (P2025).
    const product = await this.findOne(id);
    if (dto.slug) {
      const existing = await this.prisma.product.findFirst({
        where: { slug: dto.slug, id: { not: product.id } },
      });
      if (existing) throw new ConflictException('Product slug already in use');
    }
    return this.prisma.product.update({
      where: { id: product.id },
      data: dto,
      include: { brand: true, category: true, variants: true },
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    return this.prisma.product.delete({ where: { id: product.id } });
  }

  async changeStatus(id: string, status: ProductStatus) {
    const product = await this.findOne(id);
    return this.prisma.product.update({ where: { id: product.id }, data: { status } });
  }

  // ── VARIANTS ──────────────────────────────────────────

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.findOne(productId);
    const existing = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) throw new ConflictException('SKU already exists');

    const variant = await this.prisma.productVariant.create({
      data: { ...dto, productId },
    });

    // Auto-create inventory record
    await this.prisma.inventory.create({
      data: { variantId: variant.id, quantity: 0, reservedQty: 0, availableQty: 0 },
    });

    return variant;
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    if (dto.sku) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: dto.sku, id: { not: variantId } },
      });
      if (existing) throw new ConflictException('SKU already in use');
    }

    return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
  }

  async removeVariant(productId: string, variantId: string) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const [orderCount, imeiCount] = await Promise.all([
      this.prisma.orderItem.count({ where: { variantId } }),
      this.prisma.imeiDevice.count({ where: { variantId } }),
    ]);
    if (orderCount > 0 || imeiCount > 0) {
      throw new BadRequestException(
        'Không thể xóa biến thể đã phát sinh đơn hàng hoặc thiết bị IMEI. Vui lòng tắt kích hoạt biến thể thay vì xóa.',
      );
    }

    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  async toggleVariantStatus(productId: string, variantId: string, isActive: boolean) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.prisma.productVariant.update({ where: { id: variantId }, data: { isActive } });
  }
}
