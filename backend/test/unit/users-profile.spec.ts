import 'reflect-metadata';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsersService } from '../../src/modules/users/users.service';
import { ConflictException } from '@nestjs/common';

const mockFn = (): any => jest.fn();

describe('UsersService.updateProfile', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        update: mockFn(),
      },
    };

    service = new UsersService(prisma as any);
  });

  it('updates firstName, lastName and phone successfully', async () => {
    const updatedUser = {
      id: 'user-1',
      firstName: 'Van B',
      lastName: 'Nguyen',
      phone: '0901234567',
      email: 'user@test.com',
      passwordHash: 'secret-hash',
    };
    prisma.user.update.mockResolvedValue(updatedUser);

    const result = await service.updateProfile('user-1', {
      firstName: 'Van B',
      lastName: 'Nguyen',
      phone: '  0901234567  ',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        firstName: 'Van B',
        lastName: 'Nguyen',
        phone: '0901234567',
      },
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.firstName).toBe('Van B');
  });

  it('splits fullName when provided without explicit firstName/lastName', async () => {
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      firstName: 'Van B',
      lastName: 'Nguyen',
      phone: null,
    });

    await service.updateProfile('user-1', {
      fullName: 'Nguyen Van B',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        firstName: 'Van B',
        lastName: 'Nguyen',
      },
    });
  });

  it('converts empty phone to null', async () => {
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      phone: null,
    });

    await service.updateProfile('user-1', {
      phone: '   ',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phone: null,
      },
    });
  });

  it('throws ConflictException on duplicate phone (P2002 error)', async () => {
    const error: any = new Error('Unique constraint failed');
    error.code = 'P2002';
    prisma.user.update.mockRejectedValue(error);

    await expect(
      service.updateProfile('user-1', {
        phone: '0901234567',
      })
    ).rejects.toThrow(ConflictException);
  });
});
