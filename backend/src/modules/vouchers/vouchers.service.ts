import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVoucherDto, ValidateVoucherDto } from './dto/voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherType } from '@prisma/client';
import { STANDARD_SHIPPING_FEE } from '../../common/constants';

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

  async validate(userId: string | undefined, dto: ValidateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (!voucher) throw new NotFoundException('Mã voucher không tồn tại');

    // M3: never trust the client-sent orderTotal when we can compute it. For
    // authenticated users the quote is built from their real cart at current
    // catalog prices (same source as checkout); anonymous callers keep the
    // estimate-only path via dto.orderTotal.
    let orderTotal = dto.orderTotal;
    if (userId) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { variant: { select: { price: true } } } } },
      });
      if (cart) {
        orderTotal = cart.items.reduce(
          (acc, item) => acc + Number(item.variant?.price ?? item.unitPrice) * item.quantity,
          0,
        );
      }
    }

    const now = new Date();
    if (!voucher.isActive) throw new BadRequestException('Mã voucher đang tạm khóa');
    if (voucher.startAt > now) throw new BadRequestException('Mã voucher chưa đến thời gian áp dụng');
    if (voucher.endAt < now) throw new BadRequestException('Mã voucher đã hết hạn sử dụng');

    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new BadRequestException('Mã voucher đã hết lượt sử dụng');
    }

    if (voucher.minOrderValue && orderTotal < Number(voucher.minOrderValue)) {
      throw new BadRequestException(`Đơn hàng tối thiểu để áp dụng mã là ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}₫`);
    }

    if (userId && voucher.perUserLimit) {
      const userUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId },
      });
      if (userUsage >= voucher.perUserLimit) {
        throw new BadRequestException('Bạn đã dùng hết số lượt cho phép của voucher này');
      }
    }

    // Calculate discount
    let discount = 0;
    if (voucher.type === VoucherType.PERCENTAGE) {
      discount = (orderTotal * Number(voucher.value)) / 100;
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, Number(voucher.maxDiscountAmount));
      }
    } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
      discount = Math.min(Number(voucher.value), orderTotal);
    } else if (voucher.type === VoucherType.FREE_SHIPPING) {
      // M2: must match checkout — freeship discounts the flat shipping fee,
      // capped by the voucher value.
      discount = Math.min(Number(voucher.value), STANDARD_SHIPPING_FEE);
    }

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        type: voucher.type,
        value: Number(voucher.value),
      },
      discount,
    };
  }

  async viewUsage(id: string) {
    await this.findOne(id);
    return this.prisma.voucherUsage.findMany({
      where: { voucherId: id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { usedAt: 'desc' },
    });
  }

  async getSummaryAnalytics() {
    const now = new Date();
    const [totalVouchers, activeVouchers, expiredOrExhausted, totalUsages, discountSum] = await Promise.all([
      this.prisma.voucher.count(),
      this.prisma.voucher.count({
        where: {
          isActive: true,
          startAt: { lte: now },
          endAt: { gte: now },
        },
      }),
      this.prisma.voucher.count({
        where: {
          OR: [
            { isActive: false },
            { endAt: { lt: now } },
          ],
        },
      }),
      this.prisma.voucherUsage.count(),
      this.prisma.voucherUsage.aggregate({
        _sum: {
          discountAmount: true,
        },
      }),
    ]);

    return {
      totalVouchers,
      activeVouchers,
      expiredOrExhausted,
      totalUsages,
      totalDiscountAmount: Number(discountSum._sum.discountAmount || 0),
    };
  }
}
