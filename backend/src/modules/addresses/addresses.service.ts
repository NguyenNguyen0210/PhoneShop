import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.resetDefaultAddress(userId);
    }

    const existingAddresses = await this.prisma.address.count({ where: { userId } });
    const isFirstAddress = existingAddresses === 0;

    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
        isDefault: dto.isDefault || isFirstAddress,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOne(userId, id); // Ensure exists and belongs to user

    if (dto.isDefault) {
      await this.resetDefaultAddress(userId);
    }

    return this.prisma.address.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure exists
    return this.prisma.address.delete({
      where: { id },
    });
  }

  async setDefault(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.resetDefaultAddress(userId);
    
    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private async resetDefaultAddress(userId: string) {
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // --- ADMIN / MANAGER FUNCTIONS ---

  async findAllForAdmin() {
    return this.prisma.address.findMany({
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }
}
