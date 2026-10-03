import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    delete (user as any).passwordHash;
    return user;
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

  // --- ADMIN FUNCTIONS ---

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { roles: { include: { role: true } } },
    });
    return users.map((u) => {
      delete (u as any).passwordHash;
      return u;
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    delete (user as any).passwordHash;
    return user;
  }

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
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

    delete (user as any).passwordHash;
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: any = { ...dto };
    delete data.password;
    delete data.roles;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
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

    delete (user as any).passwordHash;
    return user;
  }

  async changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED') {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }
}
