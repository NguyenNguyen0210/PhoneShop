import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Customer360Metrics, Customer360Response } from './dto/customer-360.dto';
import { getPagination, buildPaginatedResponse } from '../../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        addresses: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    delete (user as any).passwordHash;
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = { ...dto };
    if (data.phone !== undefined) {
      const cleanPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
      data.phone = cleanPhone || null;
    }
    if (data.fullName && !data.firstName && !data.lastName) {
      const parts = data.fullName.trim().split(/\s+/);
      data.lastName = parts.length > 1 ? parts[0] : '';
      data.firstName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';
      delete data.fullName;
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      delete (user as any).passwordHash;
      return user;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Số điện thoại này đã được đăng ký bởi tài khoản khác.');
      }
      throw err;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Invalid old password');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // M6: a password change is the standard response to suspected compromise —
    // revoke all sessions so a stolen refresh token does not survive it
    // (same predicate as AuthService.logout).
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  // --- ADMIN & STAFF FUNCTIONS ---

  async findAll(query: QueryUserDto = {}, currentUser?: any) {
    const { page, limit, skip } = getPagination(query.page, query.limit, 10);

    const roles: string[] = Array.isArray(currentUser?.roles)
      ? currentUser.roles.map((r: any) => (typeof r === 'string' ? r : r.name || r.role?.name))
      : [];
    const isOnlyStaff = roles.includes('STAFF') && !roles.includes('ADMIN');

    const where: any = {};

    // Staff is strictly scoped to role 'USER'
    if (isOnlyStaff) {
      where.roles = { some: { role: { name: 'USER' } } };
    } else if (query.role) {
      where.roles = { some: { role: { name: query.role } } };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const s = query.search.trim();
      const tokens = s.split(/\s+/).filter(Boolean);
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        // Multi-word matches: either both tokens match across first & last name
        ...(tokens.length > 1
          ? [
              {
                AND: tokens.map((tok) => ({
                  OR: [
                    { firstName: { contains: tok, mode: 'insensitive' } },
                    { lastName: { contains: tok, mode: 'insensitive' } },
                  ],
                })),
              },
            ]
          : []),
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } },
      }),
    ]);

    const sanitizedUsers = users.map((u) => {
      delete (u as any).passwordHash;
      return u;
    });

    return buildPaginatedResponse(sanitizedUsers, total, page, limit);
  }

  async findOne(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        addresses: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    if (currentUser) {
      const roles: string[] = Array.isArray(currentUser.roles)
        ? currentUser.roles.map((r: any) => (typeof r === 'string' ? r : r.name || r.role?.name))
        : [];
      const isOnlyStaff = roles.includes('STAFF') && !roles.includes('ADMIN');
      const targetIsUser = user.roles?.some((r: any) => r.role?.name === 'USER' || r.name === 'USER' || r === 'USER');
      if (isOnlyStaff && !targetIsUser) {
        throw new ForbiddenException('Staff chỉ có quyền xem thông tin khách hàng');
      }
    }

    delete (user as any).passwordHash;
    return user;
  }

  async getCustomer360(id: string, currentUser: any): Promise<Customer360Response> {
    const user = await this.findOne(id, currentUser);

    const [orders, warranties, installments, tickets] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          payments: {
            take: 1,
            select: {
              id: true,
              status: true,
              method: true,
              amount: true,
            },
          },
          items: {
            take: 3,
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      }),
      this.prisma.warranty.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: {
            select: {
              productName: true,
              variant: { select: { sku: true, color: true, storage: true } },
            },
          },
        },
      }),
      this.prisma.installmentApplication.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          termMonths: true,
          monthlyAmount: true,
          createdAt: true,
          order: { select: { id: true, orderNumber: true, totalAmount: true } },
        },
      }),
      this.prisma.ticket.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
          lastRepliedAt: true,
        },
      }),
    ]);

    // Aggregate metrics across all user orders
    const allUserOrders = await this.prisma.order.findMany({
      where: { userId: id },
      select: {
        status: true,
        totalAmount: true,
        payments: { select: { status: true } },
      },
    });

    const totalSpent = allUserOrders
      .filter((o: any) => {
        const isPaid = o.paymentStatus === 'PAID' || o.payments?.some((p: any) => p.status === 'PAID');
        return isPaid || o.status === 'COMPLETED';
      })
      .reduce((sum, o: any) => sum + Number(o.totalAmount || 0), 0);

    const metrics: Customer360Metrics = {
      totalSpent,
      totalOrders: allUserOrders.length,
      completedOrders: allUserOrders.filter((o: any) => o.status === 'COMPLETED').length,
      processingOrders: allUserOrders.filter((o: any) =>
        ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPING'].includes(o.status),
      ).length,
      cancelledOrders: allUserOrders.filter((o: any) => o.status === 'CANCELLED').length,
      totalTickets: tickets.length,
      openTickets: tickets.filter((t: any) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length,
      activeWarranties: warranties.filter((w: any) => w.status === 'ACTIVE').length,
      totalInstallments: installments.length,
      approvedInstallments: installments.filter((i: any) => i.status === 'APPROVED').length,
    };

    const recentOrders = orders.map((o: any) => ({
      ...o,
      paymentStatus: o.paymentStatus || o.payments?.[0]?.status || 'PENDING',
      items:
        o.items?.map((it: any) => ({
          ...it,
          price: it.price ?? it.unitPrice,
        })) || [],
    }));

    const mappedInstallments = installments.map((i: any) => ({
      ...i,
      monthlyPayment: i.monthlyPayment ?? i.monthlyAmount,
    }));

    return {
      customer: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      metrics,
      addresses: user.addresses || [],
      recentOrders,
      warranties,
      installments: mappedInstallments,
      tickets,
    };
  }

  async create(dto: CreateUserDto, currentUser?: any) {
    const existingUser = await this.prisma.user.findFirst({
      where: dto.phone
        ? { OR: [{ email: dto.email }, { phone: dto.phone }] }
        : { email: dto.email },
    });

    if (existingUser) throw new ConflictException('Email or phone already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const roleNames = dto.roles?.length ? dto.roles : ['USER'];
    const rolesToConnect = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status || 'ACTIVE',
        roles: {
          create: rolesToConnect.map((r) => ({ roleId: r.id })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'User',
          entityId: user.id,
          userId: currentUser?.id,
          newData: { email: user.email, roles: roleNames, status: user.status },
        },
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    delete (user as any).passwordHash;
    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser?: any) {
    if (currentUser && currentUser.id === id) {
      if (dto.roles && !dto.roles.includes('ADMIN' as any)) {
        throw new BadRequestException('Không thể tự hạ quyền ADMIN của chính mình');
      }
      if (dto.status && dto.status !== 'ACTIVE') {
        throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
      }
    }

    const data: any = { ...dto };
    delete data.password;
    delete data.roles;

    let shouldRevokeTokens = false;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      shouldRevokeTokens = true;
    }

    if (dto.status && dto.status !== 'ACTIVE') {
      shouldRevokeTokens = true;
    }

    if (dto.roles) {
      // Re-assign roles
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      const rolesToConnect = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      data.roles = {
        create: rolesToConnect.map((r) => ({ roleId: r.id })),
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });

    if (shouldRevokeTokens) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'User',
          entityId: id,
          userId: currentUser?.id,
          newData: {
            ...(dto.firstName !== undefined && { firstName: dto.firstName }),
            ...(dto.lastName !== undefined && { lastName: dto.lastName }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.roles !== undefined && { roles: dto.roles }),
            ...(dto.password ? { passwordChanged: true } : {}),
          },
        },
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    delete (user as any).passwordHash;
    return user;
  }

  async changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED', currentUser?: any) {
    if (currentUser && currentUser.id === id && status !== 'ACTIVE') {
      throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    if (status !== 'ACTIVE') {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'User',
          entityId: id,
          userId: currentUser?.id,
          newData: { status },
        },
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }

    return user;
  }
}
