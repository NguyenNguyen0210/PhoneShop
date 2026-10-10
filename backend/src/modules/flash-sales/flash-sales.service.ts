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
                  select: { quantity: true, availableQty: true },
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
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, thumbnailUrl: true },
                },
                inventory: {
                  select: { quantity: true, availableQty: true },
                },
              },
            },
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
    const variantIds = dto.items.map((i) => i.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException('Duplicate variant in flash sale items');
    }
    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { inventory: true },
      });
      if (!variant) {
        throw new NotFoundException(`Biến thể ${item.variantId} không tồn tại`);
      }
      if (variant.isActive === false) {
        throw new BadRequestException(`Biến thể ${variant.sku} đã ngừng kinh doanh`);
      }
      if (item.flashPrice >= Number(variant.price)) {
        throw new BadRequestException(
          `Giá Flash Sale (${item.flashPrice.toLocaleString()}₫) phải nhỏ hơn giá gốc (${Number(variant.price).toLocaleString()}₫) của SKU: ${variant.sku}`,
        );
      }
      const stock = variant.inventory?.availableQty ?? 0;
      if (item.stockLimit > stock) {
        throw new BadRequestException(
          `Số lượng bán Flash Sale (${item.stockLimit}) vượt quá tồn kho thực tế (${stock}) của SKU: ${variant.sku}`,
        );
      }
    }

    // Reject overlapping active campaigns on the same variants.
    const overlapping = await this.prisma.flashSaleItem.findFirst({
      where: {
        variantId: { in: variantIds },
        campaign: {
          isActive: true,
          startAt: { lte: endAt },
          endAt: { gte: startAt },
        },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new BadRequestException('Một số biến thể đã thuộc chiến dịch Flash Sale khác trong cùng thời gian');
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

  async update(id: string, dto: CreateFlashSaleDto) {
    const campaign = await this.prisma.flashSaleCampaign.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!campaign) {
      throw new NotFoundException('Chiến dịch Flash Sale không tồn tại');
    }

    const now = new Date();
    if (!campaign.isActive || campaign.endAt < now) {
      throw new BadRequestException('Chiến dịch Flash Sale đã kết thúc, không thể chỉnh sửa');
    }

    let startAt: Date;
    let endAt: Date;

    if (campaign.startAt <= now && campaign.endAt >= now) {
      // ACTIVE
      startAt = campaign.startAt;
      endAt = new Date(dto.endAt);
      if (endAt <= now) {
        throw new BadRequestException('Thời gian kết thúc phải lớn hơn thời điểm hiện tại');
      }

      for (const existingItem of campaign.items) {
        if (existingItem.soldCount > 0) {
          const dtoItem = dto.items.find((i) => i.variantId === existingItem.variantId);
          if (!dtoItem) {
            throw new BadRequestException('Không thể xóa mặt hàng đã có lượt mua khỏi chiến dịch đang diễn ra');
          }
          if (Number(dtoItem.flashPrice) !== Number(existingItem.flashPrice)) {
            throw new BadRequestException('Không thể thay đổi giá Flash Sale của mặt hàng đã có lượt mua');
          }
          if (dtoItem.stockLimit < existingItem.soldCount) {
            throw new BadRequestException('Số lượng Flash Sale không thể nhỏ hơn số lượng đã bán');
          }
        }
      }
    } else {
      // UPCOMING (now < campaign.startAt)
      startAt = new Date(dto.startAt);
      endAt = new Date(dto.endAt);
      if (startAt >= endAt || endAt <= now) {
        throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc');
      }
    }

    // Validate item prices & stock limits
    const variantIds = dto.items.map((i) => i.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new BadRequestException('Duplicate variant in flash sale items');
    }

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { inventory: true },
      });
      if (!variant) {
        throw new NotFoundException(`Biến thể ${item.variantId} không tồn tại`);
      }
      if (variant.isActive === false) {
        throw new BadRequestException(`Biến thể ${variant.sku} đã ngừng kinh doanh`);
      }
      if (item.flashPrice >= Number(variant.price)) {
        throw new BadRequestException(
          `Giá Flash Sale (${item.flashPrice.toLocaleString()}₫) phải nhỏ hơn giá gốc (${Number(variant.price).toLocaleString()}₫) của SKU: ${variant.sku}`,
        );
      }
      const existingItem = campaign.items.find((i) => i.variantId === item.variantId);
      if (existingItem && item.stockLimit < existingItem.soldCount) {
        throw new BadRequestException('Số lượng Flash Sale không thể nhỏ hơn số lượng đã bán');
      }
      const availableStock = (variant.inventory?.availableQty ?? 0) + (existingItem?.soldCount ?? 0);
      if (item.stockLimit > availableStock) {
        throw new BadRequestException(
          `Số lượng bán Flash Sale (${item.stockLimit}) vượt quá tồn kho thực tế (${availableStock}) của SKU: ${variant.sku}`,
        );
      }
    }

    // Check overlapping active campaigns excluding current campaign
    if (variantIds.length > 0) {
      const overlapping = await this.prisma.flashSaleItem.findFirst({
        where: {
          campaignId: { not: id },
          variantId: { in: variantIds },
          campaign: {
            isActive: true,
            startAt: { lte: endAt },
            endAt: { gte: startAt },
          },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new BadRequestException('Một số biến thể đã thuộc chiến dịch Flash Sale khác trong cùng thời gian');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const deleteIds = campaign.items
        .filter((it) => !dto.items.some((d) => d.variantId === it.variantId))
        .map((it) => it.id);
      if (deleteIds.length > 0) {
        await tx.flashSaleItem.deleteMany({
          where: { id: { in: deleteIds } },
        });
      }

      for (const item of dto.items) {
        const existing = campaign.items.find((it) => it.variantId === item.variantId);
        if (existing) {
          await tx.flashSaleItem.update({
            where: { id: existing.id },
            data: {
              flashPrice: item.flashPrice,
              stockLimit: item.stockLimit,
            },
          });
        } else {
          await tx.flashSaleItem.create({
            data: {
              campaignId: id,
              variantId: item.variantId,
              flashPrice: item.flashPrice,
              stockLimit: item.stockLimit,
            },
          });
        }
      }

      return tx.flashSaleCampaign.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          startAt,
          endAt,
        },
        include: {
          items: true,
        },
      });
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
