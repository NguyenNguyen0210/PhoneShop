import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id); // Check existence

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Category slug already in use');
    }

    if (dto.parentId) {
      if (dto.parentId === id) throw new ConflictException('Category cannot be its own parent');
      await this.findOne(dto.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    // Depending on logic, you might want to prevent deleting if it has children or products
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
