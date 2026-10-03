import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Brand with this slug already exists');
    }

    return this.prisma.brand.create({
      data: dto,
    });
  }

  async findAll(search?: string, activeOnly: boolean = false) {
    const where: any = {};
    
    if (activeOnly) {
      where.isActive = true;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.brand.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { products: true },
    });
    
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id); // Check existence

    if (dto.slug) {
      const existing = await this.prisma.brand.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) throw new ConflictException('Brand slug already in use');
    }

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (brand._count && brand._count.products > 0) {
      throw new BadRequestException(
        `Không thể xóa thương hiệu "${brand.name}" vì đang có ${brand._count.products} sản phẩm liên kết. Vui lòng chuyển hoặc xóa sản phẩm trước.`,
      );
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }

  async changeStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: { isActive },
    });
  }
}
