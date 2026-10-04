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
    // NOTE: Product/ProductVariant rows only carry thumbnailUrl/imageUrl —
    // there is no `images` column, so never read product.images/v.images.
    const thumb =
      product.thumbnailUrl ||
      product.thumbnail ||
      product.variants?.[0]?.imageUrl ||
      '/images/products/iphone-16-pro-max.png';

    const variants = Array.isArray(product.variants)
      ? product.variants.map((v: any) => ({
          ...v,
          imageUrl: v.imageUrl || thumb,
          images: [v.imageUrl || thumb],
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
      images: [thumb],
      variants,
      specs: product.specs || {},
      rating,
      reviewCount,
      reviews,
    };
  }

  async findAll(filter: FilterProductDto, publicOnly = false) {
    const {
      search,
      brandId,
      categoryId,
      status,
      condition,
      minPrice,
      maxPrice,
      ram,
      storage,
      color,
      inStock,
      onSale,
      has5G,
      os,
      chipset,
      minScreenSize,
      maxScreenSize,
      minBattery,
      maxBattery,
      minRating,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: any = {};

    if (publicOnly) {
      where.status = ProductStatus.ACTIVE;
    } else if (status) {
      where.status = status;
    }

    if (condition) where.condition = condition;
    if (brandId) where.brandId = brandId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ── Variant Filtering ──────────────────────────────────
    const variantWhere: any = { isActive: true };
    let hasVariantFilter = false;

    if (minPrice !== undefined || maxPrice !== undefined) {
      hasVariantFilter = true;
      variantWhere.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    if (ram && ram.length > 0) {
      hasVariantFilter = true;
      variantWhere.ram = { in: ram, mode: 'insensitive' };
    }

    if (storage && storage.length > 0) {
      hasVariantFilter = true;
      variantWhere.storage = { in: storage, mode: 'insensitive' };
    }

    if (color && color.length > 0) {
      hasVariantFilter = true;
      variantWhere.OR = [
        { color: { in: color, mode: 'insensitive' } },
        ...color.map((c) => ({ color: { contains: c, mode: 'insensitive' } })),
      ];
    }

    if (inStock === true) {
      hasVariantFilter = true;
      variantWhere.inventory = {
        availableQty: { gt: 0 },
      };
    }

    if (onSale === true) {
      hasVariantFilter = true;
      if (this.prisma.productVariant?.fields?.price) {
        variantWhere.compareAtPrice = { gt: this.prisma.productVariant.fields.price };
      } else {
        variantWhere.compareAtPrice = { not: null };
      }
    }

    if (hasVariantFilter) {
      where.variants = {
        some: variantWhere,
      };
    }

    // ── Specs JSON Filtering ───────────────────────────────
    const andConditions: any[] = [];

    if (has5G !== undefined) {
      andConditions.push({
        OR: [
          { specs: { path: ['has5G'], equals: has5G } },
          { specs: { path: ['has5G'], equals: String(has5G) } },
        ],
      });
    }

    if (os && os.length > 0) {
      andConditions.push({
        OR: os.flatMap((item) => [
          { specs: { path: ['os'], equals: item } },
          { specs: { path: ['os'], string_contains: item } },
        ]),
      });
    }

    if (chipset && chipset.length > 0) {
      andConditions.push({
        OR: chipset.map((item) => ({
          specs: { path: ['chipset'], string_contains: item },
        })),
      });
    }

    if (minScreenSize !== undefined || maxScreenSize !== undefined) {
      const screenCond: any = {};
      if (minScreenSize !== undefined) screenCond.gte = minScreenSize;
      if (maxScreenSize !== undefined) screenCond.lte = maxScreenSize;
      andConditions.push({
        specs: {
          path: ['screenSize'],
          ...screenCond,
        },
      });
    }

    if (minBattery !== undefined || maxBattery !== undefined) {
      const batteryCond: any = {};
      if (minBattery !== undefined) batteryCond.gte = minBattery;
      if (maxBattery !== undefined) batteryCond.lte = maxBattery;
      andConditions.push({
        specs: {
          path: ['batteryCapacity'],
          ...batteryCond,
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = [...(where.AND || []), ...andConditions];
    }

    // ── Reviews Filtering for minRating ────────────────────
    if (minRating !== undefined && minRating > 0) {
      where.reviews = { some: { status: ReviewStatus.APPROVED } };
    }

    // ── Sorting & Execution ────────────────────────────────
    const isComputedSortOrFilter =
      ['price-asc', 'price-desc', 'rating', 'best-seller', 'top-discount'].includes(sortBy) ||
      minRating !== undefined ||
      onSale === true;

    if (isComputedSortOrFilter) {
      let salesByVariant: Record<string, number> = {};
      if (sortBy === 'best-seller') {
        try {
          if (typeof this.prisma.orderItem?.groupBy === 'function') {
            const orderSales = await this.prisma.orderItem.groupBy({
              by: ['variantId'],
              _sum: { quantity: true },
            });
            for (const item of orderSales) {
              salesByVariant[item.variantId] = item._sum?.quantity || 0;
            }
          }
        } catch {
          // Fallback if orderItem.groupBy is not available
        }
      }

      const getProductSales = (p: any): number => {
        if (!Array.isArray(p.variants)) return 0;
        return p.variants.reduce((sum: number, v: any) => sum + (salesByVariant[v.id] || 0), 0);
      };

      const getProductMaxDiscount = (p: any): number => {
        if (!Array.isArray(p.variants) || p.variants.length === 0) return 0;
        let maxDiscount = 0;
        for (const v of p.variants) {
          const price = Number(v.price) || 0;
          const compareAt = Number(v.compareAtPrice) || 0;
          if (compareAt > price && compareAt > 0) {
            const discount = ((compareAt - price) / compareAt) * 100;
            if (discount > maxDiscount) maxDiscount = discount;
          }
        }
        return maxDiscount;
      };

      const getProductMinPrice = (p: any): number => {
        if (!Array.isArray(p.variants) || p.variants.length === 0) return 0;
        const prices = p.variants
          .map((v: any) => Number(v.price))
          .filter((price: number) => !isNaN(price));
        return prices.length > 0 ? Math.min(...prices) : 0;
      };

      const rawData = await this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          category: true,
          variants: { where: { isActive: true }, include: { inventory: true } },
          reviews: reviewsWithRepliesInclude,
        },
      });

      let formatted = rawData.map((p) => this.formatProduct(p));

      // Filter minRating
      if (minRating !== undefined) {
        formatted = formatted.filter((p) => p.rating !== null && p.rating >= minRating);
      }

      // Filter onSale
      if (onSale === true) {
        formatted = formatted.filter(
          (p) =>
            Array.isArray(p.variants) &&
            p.variants.some((v: any) => v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price)),
        );
      }

      // Sort
      if (sortBy === 'best-seller') {
        formatted.sort((a, b) => {
          const diff = getProductSales(b) - getProductSales(a);
          if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortBy === 'top-discount') {
        formatted.sort((a, b) => {
          const diff = getProductMaxDiscount(b) - getProductMaxDiscount(a);
          if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortBy === 'price-asc') {
        formatted.sort((a, b) => {
          const diff = getProductMinPrice(a) - getProductMinPrice(b);
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortBy === 'price-desc') {
        formatted.sort((a, b) => {
          const diff = getProductMinPrice(b) - getProductMinPrice(a);
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortBy === 'rating') {
        formatted.sort((a, b) => {
          const rateA = a.rating ?? 0;
          const rateB = b.rating ?? 0;
          const diff = rateB - rateA;
          if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
          const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
          if (reviewDiff !== 0) return reviewDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }

      const total = formatted.length;
      const skip = (page - 1) * limit;
      const pagedData = formatted.slice(skip, skip + limit);

      return {
        data: pagedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
