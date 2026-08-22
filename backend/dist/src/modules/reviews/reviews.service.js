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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReviewsService = class ReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const existing = await this.prisma.review.findUnique({
            where: { userId_productId: { userId, productId: dto.productId } },
        });
        if (existing)
            throw new common_1.ConflictException('You have already reviewed this product');
        return this.prisma.review.create({
            data: { ...dto, userId, status: client_1.ReviewStatus.PENDING },
        });
    }
    async findAll(productId, status) {
        const where = {};
        if (productId)
            where.productId = productId;
        if (status)
            where.status = status;
        else
            where.status = client_1.ReviewStatus.APPROVED;
        return this.prisma.review.findMany({
            where,
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAllAdmin(productId, status) {
        const where = {};
        if (productId)
            where.productId = productId;
        if (status)
            where.status = status;
        return this.prisma.review.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                product: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const review = await this.prisma.review.findUnique({
            where: { id },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        return review;
    }
    async update(userId, id, dto) {
        const review = await this.findOne(id);
        if (review.userId !== userId)
            throw new common_1.ForbiddenException('You can only edit your own reviews');
        return this.prisma.review.update({ where: { id }, data: { ...dto, status: client_1.ReviewStatus.PENDING } });
    }
    async remove(userId, id, isAdmin = false) {
        const review = await this.findOne(id);
        if (!isAdmin && review.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own reviews');
        }
        return this.prisma.review.delete({ where: { id } });
    }
    async approve(id) {
        await this.findOne(id);
        return this.prisma.review.update({ where: { id }, data: { status: client_1.ReviewStatus.APPROVED } });
    }
    async reject(id) {
        await this.findOne(id);
        return this.prisma.review.update({ where: { id }, data: { status: client_1.ReviewStatus.REJECTED } });
    }
    async verify(id) {
        await this.findOne(id);
        return this.prisma.review.update({ where: { id }, data: { isVerified: true } });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map