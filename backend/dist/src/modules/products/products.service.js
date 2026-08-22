"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.product.findUnique({
            where: { slug: dto.slug },
        });
        if (existing)
            throw new common_1.ConflictException('Product slug already exists');
        return this.prisma.product.create({
            data: dto,
            include: { brand: true, category: true, variants: true },
        });
    }
    async findAll(filter, publicOnly = false) {
        const { search, brandId, categoryId, status, condition, minPrice, maxPrice, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filter;
        const where = {};
        if (publicOnly) {
            where.status = client_1.ProductStatus.ACTIVE;
        }
        else if (status) {
            where.status = status;
        }
        if (condition)
            where.condition = condition;
        if (brandId)
            where.brandId = brandId;
        if (categoryId)
            where.categoryId = categoryId;
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
        const orderBy = {};
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
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                category: true,
                variants: { include: { inventory: true } },
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return product;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.slug) {
            const existing = await this.prisma.product.findFirst({
                where: { slug: dto.slug, id: { not: id } },
            });
            if (existing)
                throw new common_1.ConflictException('Product slug already in use');
        }
        return this.prisma.product.update({
            where: { id },
            data: dto,
            include: { brand: true, category: true, variants: true },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.delete({ where: { id } });
    }
    async changeStatus(id, status) {
        await this.findOne(id);
        return this.prisma.product.update({ where: { id }, data: { status } });
    }
    async createVariant(productId, dto) {
        await this.findOne(productId);
        const existing = await this.prisma.productVariant.findUnique({
            where: { sku: dto.sku },
        });
        if (existing)
            throw new common_1.ConflictException('SKU already exists');
        const variant = await this.prisma.productVariant.create({
            data: { ...dto, productId },
        });
        await this.prisma.inventory.create({
            data: { variantId: variant.id, quantity: 0, reservedQty: 0, availableQty: 0 },
        });
        return variant;
    }
    async updateVariant(productId, variantId, dto) {
        await this.findOne(productId);
        const variant = await this.prisma.productVariant.findFirst({
            where: { id: variantId, productId },
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        if (dto.sku) {
            const existing = await this.prisma.productVariant.findFirst({
                where: { sku: dto.sku, id: { not: variantId } },
            });
            if (existing)
                throw new common_1.ConflictException('SKU already in use');
        }
        return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
    }
    async removeVariant(productId, variantId) {
        await this.findOne(productId);
        const variant = await this.prisma.productVariant.findFirst({
            where: { id: variantId, productId },
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        return this.prisma.productVariant.delete({ where: { id: variantId } });
    }
    async toggleVariantStatus(productId, variantId, isActive) {
        await this.findOne(productId);
        const variant = await this.prisma.productVariant.findFirst({
            where: { id: variantId, productId },
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        return this.prisma.productVariant.update({ where: { id: variantId }, data: { isActive } });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map