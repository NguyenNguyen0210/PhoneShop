import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SystemSettingsService } from '../src/modules/settings/settings.service';
import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';

describe('OrdersService - System Settings Integration', () => {
  let ordersService: OrdersService;
  let settingsService: any;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
      },
    };

    settingsService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: SystemSettingsService,
          useValue: settingsService,
        },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  const baseDto = {
    addressId: 'addr-uuid-1',
    customerNote: 'Deliver quickly',
  };

  it('INVARIANT: Rejects order creation when MAINTENANCE_MODE is true', async () => {
    settingsService.get.mockImplementation(async (key: string) => {
      if (key === 'MAINTENANCE_MODE') return 'true';
      return 'true';
    });

    await expect(
      ordersService.createOrder('user-1', {
        ...baseDto,
        paymentMethod: PaymentMethod.COD,
      }),
    ).rejects.toThrow('Hệ thống đang trong thời gian bảo trì, vui lòng quay lại sau');
  });

  it('INVARIANT: Rejects COD order when PAYMENT_COD_ENABLED is false', async () => {
    settingsService.get.mockImplementation(async (key: string) => {
      if (key === 'MAINTENANCE_MODE') return 'false';
      if (key === 'PAYMENT_COD_ENABLED') return 'false';
      return 'true';
    });

    await expect(
      ordersService.createOrder('user-1', {
        ...baseDto,
        paymentMethod: PaymentMethod.COD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Rejects VNPAY order when PAYMENT_VNPAY_ENABLED is false', async () => {
    settingsService.get.mockImplementation(async (key: string) => {
      if (key === 'MAINTENANCE_MODE') return 'false';
      if (key === 'PAYMENT_VNPAY_ENABLED') return 'false';
      return 'true';
    });

    await expect(
      ordersService.createOrder('user-1', {
        ...baseDto,
        paymentMethod: PaymentMethod.VNPAY,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: Rejects BANK_TRANSFER / VIETQR order when PAYMENT_VIETQR_ENABLED is false', async () => {
    settingsService.get.mockImplementation(async (key: string) => {
      if (key === 'MAINTENANCE_MODE') return 'false';
      if (key === 'PAYMENT_VIETQR_ENABLED') return 'false';
      return 'true';
    });

    await expect(
      ordersService.createOrder('user-1', {
        ...baseDto,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
