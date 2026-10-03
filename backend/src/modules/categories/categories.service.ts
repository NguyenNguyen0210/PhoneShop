import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    if (dto.parentId) {
      await this.findOne(dto.parentId); // Ensure parent exists
    }

    return this.prisma.category.create({
      data: dto,
    });
  }

  async findAll(activeOnly: boolean = false) {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTree(activeOnly: boolean = false) {
    const where: any = { parentId: null };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true, children: true },
        },
        children: {
          where: activeOnly ? { isActive: true } : undefined,
          include: {
            _count: {
              select: { products: true, children: true },
            },
            children: {
              where: activeOnly ? { isActive: true } : undefined,
              include: {
                _count: {
                  select: { products: true, children: true },
                },
                children: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Category slug already in use');
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }

      // Check if candidate parent is a descendant of this category
      let currentParentId: string | null = dto.parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new ConflictException('Cannot set parent to a descendant category (cyclic hierarchy)');
        }
        const candidateParent = await this.prisma.category.findUnique({
          where: { id: currentParentId },
        });
        if (!candidateParent) break;
        currentParentId = candidateParent.parentId;
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async changeStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.products && category.products.length > 0) {
      throw new BadRequestException(
        `Danh mục đang chứa ${category.products.length} sản phẩm liên kết. Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa.`
      );
    }

    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        `Danh mục đang chứa ${category.children.length} danh mục con. Vui lòng xóa hoặc di chuyển danh mục con trước.`
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
