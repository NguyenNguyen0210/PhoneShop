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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.category.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException('Category with this slug already exists');
        }
        if (dto.parentId) {
            await this.findOne(dto.parentId);
        }
        return this.prisma.category.create({
            data: dto,
        });
    }
    async findAll(activeOnly = false) {
        const where = {};
        if (activeOnly) {
            where.isActive = true;
        }
        return this.prisma.category.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getTree(activeOnly = false) {
        const where = { parentId: null };
        if (activeOnly) {
            where.isActive = true;
        }
        return this.prisma.category.findMany({
            where,
            include: {
                children: {
                    where: activeOnly ? { isActive: true } : undefined,
                    include: {
                        children: {
                            where: activeOnly ? { isActive: true } : undefined,
                            include: { children: true },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async findOne(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { children: true, products: true },
        });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return category;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.slug) {
            const existing = await this.prisma.category.findFirst({
                where: { slug: dto.slug, id: { not: id } },
            });
            if (existing)
                throw new common_1.ConflictException('Category slug already in use');
        }
        if (dto.parentId) {
            if (dto.parentId === id)
                throw new common_1.ConflictException('Category cannot be its own parent');
            await this.findOne(dto.parentId);
        }
        return this.prisma.category.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.category.delete({
            where: { id },
        });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map