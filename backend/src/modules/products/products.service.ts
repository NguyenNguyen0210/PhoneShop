import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ── PRODUCTS ──────────────────────────────────────────

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Product slug already exists');

    return this.prisma.product.create({
      data: dto,
      include: { brand: true, category: true, variants: true },
    });
  }

  async findAll(filter: FilterProductDto, publicOnly = false) {
    const {
      search, brandId, categoryId, status, condition,
      minPrice, maxPrice, page = 1, limit = 20,
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
        include: { brand: true, category: true, variants: { where: { isActive: true } } },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        variants: { include: { inventory: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.slug) {
      const existing = await this.prisma.product.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Product slug already in use');
    }
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { brand: true, category: true, variants: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  async changeStatus(id: string, status: ProductStatus) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { status } });
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
