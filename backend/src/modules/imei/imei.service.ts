import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateImeiDto, UpdateImeiStatusDto, ImportImeiDto } from './dto/imei.dto';
import { ImeiStatus } from '@prisma/client';

@Injectable()
export class ImeiService {
  constructor(private prisma: PrismaService) {}

  async add(dto: CreateImeiDto) {
    const existing = await this.prisma.imeiDevice.findUnique({ where: { imei: dto.imei } });
    if (existing) throw new ConflictException('IMEI already registered');
    return this.prisma.imeiDevice.create({ data: dto });
  }

  async import(dto: ImportImeiDto) {
    return this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      const variantCountMap = new Map<string, number>();

      for (const item of dto.items) {
        const existing = await tx.imeiDevice.findUnique({ where: { imei: item.imei } });
        if (!existing) {
          const device = await tx.imeiDevice.create({ data: item });
          created.push(device);
          variantCountMap.set(
            item.variantId,
            (variantCountMap.get(item.variantId) || 0) + 1,
          );
        }
      }

      for (const [variantId, count] of variantCountMap.entries()) {
        await tx.inventory.upsert({
          where: { variantId },
          create: {
            variantId,
            quantity: count,
            availableQty: count,
            reservedQty: 0,
          },
          update: {
            quantity: { increment: count },
            availableQty: { increment: count },
          },
        });
      }

      return { imported: created.length, total: dto.items.length };
    });
  }

  async findAll(variantId?: string, status?: ImeiStatus) {
    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (status)    where.status    = status;
    return this.prisma.imeiDevice.findMany({
      where,
      include: { variant: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const imei = await this.prisma.imeiDevice.findUnique({
      where: { id },
      include: { variant: true },
    });
    if (!imei) throw new NotFoundException('IMEI device not found');
    return imei;
  }

  async searchByImei(imei: string) {
    const device = await this.prisma.imeiDevice.findUnique({
      where: { imei },
      include: { variant: { include: { product: true } } },
    });
    if (!device) throw new NotFoundException('IMEI not found');
    return device;
  }

  async checkAvailability(imei: string) {
    const device = await this.prisma.imeiDevice.findUnique({ where: { imei } });
    if (!device) throw new NotFoundException('IMEI not found');
    return { imei, status: device.status, available: device.status === ImeiStatus.AVAILABLE };
  }

  async validate(imei: string): Promise<boolean> {
    if (!/^\d{15}$/.test(imei)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(imei[i]);
      if (i % 2 !== 0) digit *= 2;
      if (digit > 9) digit -= 9;
      sum += digit;
    }
    return sum % 10 === 0;
  }

  async updateStatus(id: string, dto: UpdateImeiStatusDto) {
    await this.findOne(id);
    const data: any = { status: dto.status };
    if (dto.status === ImeiStatus.SOLD) data.soldAt = new Date();
    return this.prisma.imeiDevice.update({ where: { id }, data });
  }

  async reserve(id: string) {
    const device = await this.findOne(id);
    if (device.status !== ImeiStatus.AVAILABLE) {
      throw new BadRequestException('IMEI is not available for reservation');
    }
    return this.prisma.imeiDevice.update({
      where: { id },
      data: { status: ImeiStatus.RESERVED },
    });
  }

  async markSold(id: string) {
    const device = await this.findOne(id);
    if (device.status !== ImeiStatus.AVAILABLE && device.status !== ImeiStatus.RESERVED) {
      throw new BadRequestException('Cannot mark IMEI as sold in current state');
    }
    return this.prisma.imeiDevice.update({
      where: { id },
      data: { status: ImeiStatus.SOLD, soldAt: new Date() },
    });
  }

  async returnDevice(id: string) {
    await this.findOne(id);
    return this.prisma.imeiDevice.update({
      where: { id },
      data: { status: ImeiStatus.RETURNED },
    });
  }

  async block(id: string) {
    await this.findOne(id);
    return this.prisma.imeiDevice.update({
      where: { id },
      data: { status: ImeiStatus.BLOCKED },
    });
  }

  async warranty(id: string) {
    await this.findOne(id);
    return this.prisma.imeiDevice.update({
      where: { id },
      data: { status: ImeiStatus.WARRANTY },
    });
  }
}
