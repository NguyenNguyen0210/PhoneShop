import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarrantyDto, ClaimWarrantyDto } from './dto/warranty.dto';
import { WarrantyStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class WarrantyService {
  constructor(private prisma: PrismaService) {}

  private generateWarrantyCode(): string {
    return `WRT-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(dto: CreateWarrantyDto) {
    return this.prisma.warranty.create({
      data: {
        ...dto,
        warrantyCode: this.generateWarrantyCode(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: { productVariant: { include: { product: true } }, orderItem: true },
    });
  }

  async findAll(userId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.prisma.warranty.findMany({
      where,
      include: {
        productVariant: { include: { product: true } },
        imeiDevice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        productVariant: { include: { product: true } },
        imeiDevice: true,
        orderItem: true,
      },
    });
    if (!warranty) throw new NotFoundException('Warranty not found');
    return warranty;
  }

  async searchByCode(warrantyCode: string) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { warrantyCode },
      include: { productVariant: { include: { product: true } }, imeiDevice: true },
    });
    if (!warranty) throw new NotFoundException('Warranty not found');
    return warranty;
  }

  async checkStatus(warrantyCode: string) {
    const warranty = await this.searchByCode(warrantyCode);
    const now = new Date();
    const isExpired = warranty.endDate < now;
    return {
      warrantyCode,
      status: warranty.status,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      isExpired,
      daysRemaining: isExpired ? 0 : Math.ceil((warranty.endDate.getTime() - now.getTime()) / 86400000),
    };
  }

  async claimWarranty(userId: string, id: string, dto: ClaimWarrantyDto) {
    const warranty = await this.findOne(id);
    if (warranty.userId !== userId) throw new BadRequestException('Not your warranty');
    if (warranty.status !== WarrantyStatus.ACTIVE) {
      throw new BadRequestException('Warranty is not in ACTIVE status');
    }
    const now = new Date();
    if (warranty.endDate < now) throw new BadRequestException('Warranty has expired');

    return this.prisma.warranty.update({
      where: { id },
      data: { status: WarrantyStatus.CLAIMED, notes: dto.reason },
    });
  }

  async voidWarranty(id: string) {
    await this.findOne(id);
    return this.prisma.warranty.update({
      where: { id },
      data: { status: WarrantyStatus.VOIDED },
    });
  }

  async getUserWarranties(userId: string) {
    return this.prisma.warranty.findMany({
      where: { userId },
      include: { productVariant: { include: { product: true } }, imeiDevice: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
