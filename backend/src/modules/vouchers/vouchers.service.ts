import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVoucherDto, ValidateVoucherDto } from './dto/voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherType } from '@prisma/client';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVoucherDto) {
    const existing = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Voucher code already exists');
    return this.prisma.voucher.create({ data: { ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) } });
  }

  async findAll(activeOnly = false) {
    const where: any = {};
    if (activeOnly) {
      const now = new Date();
      where.isActive = true;
      where.startAt = { lte: now };
      where.endAt = { gte: now };
    }
    return this.prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: { usages: true },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.startAt) data.startAt = new Date(dto.startAt);
    if (dto.endAt) data.endAt = new Date(dto.endAt);
    return this.prisma.voucher.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.voucher.delete({ where: { id } });
  }

  async changeStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.voucher.update({ where: { id }, data: { isActive } });
  }

  async validate(userId: string, dto: ValidateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (!voucher) throw new NotFoundException('Voucher not found');

    const now = new Date();
    if (!voucher.isActive) throw new BadRequestException('Voucher is not active');
    if (voucher.startAt > now) throw new BadRequestException('Voucher is not yet valid');
    if (voucher.endAt < now) throw new BadRequestException('Voucher has expired');

    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    if (voucher.minOrderValue && dto.orderTotal < Number(voucher.minOrderValue)) {
      throw new BadRequestException(`Minimum order value is ${voucher.minOrderValue}`);
    }

    if (voucher.perUserLimit) {
      const userUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId },
      });
      if (userUsage >= voucher.perUserLimit) {
        throw new BadRequestException('You have reached the per-user usage limit');
      }
    }

    // Calculate discount
    let discount = 0;
    if (voucher.type === VoucherType.PERCENTAGE) {
      discount = (dto.orderTotal * Number(voucher.value)) / 100;
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, Number(voucher.maxDiscountAmount));
      }
    } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
      discount = Math.min(Number(voucher.value), dto.orderTotal);
    } else if (voucher.type === VoucherType.FREE_SHIPPING) {
      discount = 0; // Shipping discount handled at order level
    }

    return { valid: true, voucher, discount };
  }

  async viewUsage(id: string) {
    await this.findOne(id);
    return this.prisma.voucherUsage.findMany({
      where: { voucherId: id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { usedAt: 'desc' },
    });
  }
}
