import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

@Injectable()
export class FlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCampaign() {
    const now = new Date();
    return this.prisma.flashSaleCampaign.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, thumbnailUrl: true },
                },
                inventory: {
                  select: { quantity: true },
                },
              },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findAllAdmin(status?: 'ALL' | 'ACTIVE' | 'UPCOMING' | 'ENDED') {
    const now = new Date();
    const where: any = {};

    if (status === 'ACTIVE') {
      where.isActive = true;
      where.startAt = { lte: now };
      where.endAt = { gte: now };
    } else if (status === 'UPCOMING') {
      where.startAt = { gt: now };
    } else if (status === 'ENDED') {
      where.OR = [
        { endAt: { lt: now } },
        { isActive: false },
      ];
    }

    return this.prisma.flashSaleCampaign.findMany({
      where,
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          select: {
            stockLimit: true,
            soldCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.flashSaleCampaign.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Chiến dịch Flash Sale không tồn tại');
    return campaign;
  }

  async create(dto: CreateFlashSaleDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc');
    }

    // Validate item prices & stock limits
    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { inventory: true },
      });
      if (!variant) {
        throw new NotFoundException(`Biến thể ${item.variantId} không tồn tại`);
      }
      if (item.flashPrice >= Number(variant.price)) {
        throw new BadRequestException(
          `Giá Flash Sale (${item.flashPrice.toLocaleString()}₫) phải nhỏ hơn giá gốc (${Number(variant.price).toLocaleString()}₫) của SKU: ${variant.sku}`,
        );
      }
      const stock = variant.inventory?.quantity || 0;
      if (item.stockLimit > stock) {
        throw new BadRequestException(
          `Số lượng bán Flash Sale (${item.stockLimit}) vượt quá tồn kho thực tế (${stock}) của SKU: ${variant.sku}`,
        );
      }
    }

    return this.prisma.flashSaleCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        startAt,
        endAt,
        items: {
          create: dto.items.map((i) => ({
            variantId: i.variantId,
            flashPrice: i.flashPrice,
            stockLimit: i.stockLimit,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async endEarly(id: string) {
    await this.findOne(id);
    return this.prisma.flashSaleCampaign.update({
      where: { id },
      data: {
        isActive: false,
        endAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    const campaign = await this.findOne(id);
    const now = new Date();
    if (campaign.isActive && campaign.startAt <= now && campaign.endAt >= now) {
      throw new BadRequestException('Chiến dịch đang diễn ra. Vui lòng chọn "Kết thúc sớm" thay vì xóa.');
    }
    return this.prisma.flashSaleCampaign.delete({ where: { id } });
  }
}
