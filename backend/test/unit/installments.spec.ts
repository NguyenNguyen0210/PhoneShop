import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InstallmentProvider,
  InstallmentStatus,
  OrderStatus,
  ImeiStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import {
  CreateInstallmentApplicationDto,
  ReviewInstallmentDto,
  QueryInstallmentDto,
} from '../../src/modules/installments/dto';
import { InstallmentsService } from '../../src/modules/installments/installments.service';
import { OrdersService } from '../../src/modules/orders/orders.service';

const mockFn = (): any => jest.fn();

describe('Installment System Unit Tests', () => {
  describe('DTO Validation', () => {
    it('should validate CreateInstallmentApplicationDto and reject under 18 years old', async () => {
      const under18BirthDate = new Date();
      under18BirthDate.setFullYear(under18BirthDate.getFullYear() - 17);

      const dto = plainToInstance(CreateInstallmentApplicationDto, {
        provider: InstallmentProvider.HOME_CREDIT,
        termMonths: 6,
        prepayPercent: 20,
        fullName: 'Nguyen Van A',
        citizenId: '012345678901',
        birthDate: under18BirthDate.toISOString().slice(0, 10),
        phoneNumber: '0987654321',
        currentAddress: '123 Nguyen Hue, Quan 1, TP. HCM',
        incomeRange: '10 - 20 triệu',
        cccdFrontUrl: 'https://r2.domain.com/cccd/front.jpg',
        cccdBackUrl: 'https://r2.domain.com/cccd/back.jpg',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const birthError = errors.find((e) => e.property === 'birthDate');
      expect(birthError).toBeDefined();
    });

    it('should pass CreateInstallmentApplicationDto for adult (>= 18 years old)', async () => {
      const adultBirthDate = new Date();
      adultBirthDate.setFullYear(adultBirthDate.getFullYear() - 25);

      const dto = plainToInstance(CreateInstallmentApplicationDto, {
        provider: InstallmentProvider.HOME_CREDIT,
        termMonths: 6,
        prepayPercent: 20,
        fullName: 'Nguyen Van A',
        citizenId: '012345678901',
        birthDate: adultBirthDate.toISOString().slice(0, 10),
        phoneNumber: '0987654321',
        currentAddress: '123 Nguyen Hue, Quan 1, TP. HCM',
        incomeRange: '10 - 20 triệu',
        cccdFrontUrl: 'https://r2.domain.com/cccd/front.jpg',
        cccdBackUrl: 'https://r2.domain.com/cccd/back.jpg',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid citizenId (not 12 digits)', async () => {
      const dto = plainToInstance(CreateInstallmentApplicationDto, {
        provider: InstallmentProvider.FE_CREDIT,
        termMonths: 12,
        prepayPercent: 30,
        fullName: 'Tran Van B',
        citizenId: '12345', // invalid length
        birthDate: '1995-05-15',
        phoneNumber: '0912345678',
        currentAddress: '456 Le Loi, Quan 1, TP. HCM',
        incomeRange: '15 - 25 triệu',
        cccdFrontUrl: 'https://r2.domain.com/front.jpg',
        cccdBackUrl: 'https://r2.domain.com/back.jpg',
      });

      const errors = await validate(dto);
      const citizenError = errors.find((e) => e.property === 'citizenId');
      expect(citizenError).toBeDefined();
    });

    it('should require rejectionReason when ReviewInstallmentDto status is REJECTED', async () => {
      const dto = plainToInstance(ReviewInstallmentDto, {
        status: 'REJECTED',
        staffNotes: 'Note',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const reasonError = errors.find((e) => e.property === 'rejectionReason');
      expect(reasonError).toBeDefined();
    });

    it('should pass ReviewInstallmentDto when status is APPROVED without rejectionReason', async () => {
      const dto = plainToInstance(ReviewInstallmentDto, {
        status: 'APPROVED',
        staffNotes: 'Ho so tot',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('InstallmentsService', () => {
    let service: InstallmentsService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        installmentApplication: {
          findMany: mockFn(),
          count: mockFn(),
          findUnique: mockFn(),
          findFirst: mockFn(),
          update: mockFn(),
        },
        order: {
          update: mockFn(),
        },
        voucher: {
          findUnique: mockFn(),
          update: mockFn(),
        },
        voucherUsage: {
          deleteMany: mockFn(),
        },
        imeiDevice: {
          updateMany: mockFn(),
        },
        inventory: {
          update: mockFn(),
        },
        $transaction: jest.fn((callback: any) => callback(mockPrisma)),
      };

      service = new InstallmentsService(mockPrisma as any);
    });

    it('should find all installment applications with pagination and filters', async () => {
      mockPrisma.installmentApplication.findMany.mockResolvedValue([
        { id: 'app-1', status: InstallmentStatus.PENDING },
      ]);
      mockPrisma.installmentApplication.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: InstallmentStatus.PENDING,
        provider: InstallmentProvider.HOME_CREDIT,
        search: 'Nguyen',
      });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.installmentApplication.findMany).toHaveBeenCalled();
    });

    it('should find installment application by ID or throw NotFoundException', async () => {
      mockPrisma.installmentApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        fullName: 'Nguyen Van A',
      });

      const found = await service.findById('app-1');
      expect(found.id).toBe('app-1');

      mockPrisma.installmentApplication.findUnique.mockResolvedValueOnce(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should find installment application by order ID or throw NotFoundException', async () => {
      mockPrisma.installmentApplication.findFirst.mockResolvedValueOnce({
        id: 'app-1',
        orderId: 'order-1',
      });

      const found = await service.findByOrderId('order-1', 'user-1');
      expect(found.id).toBe('app-1');

      mockPrisma.installmentApplication.findFirst.mockResolvedValueOnce(null);
      await expect(service.findByOrderId('invalid-order')).rejects.toThrow(NotFoundException);
    });

    it('should approve an installment application and confirm the order', async () => {
      const mockApp = {
        id: 'app-1',
        orderId: 'order-1',
        status: InstallmentStatus.PENDING,
        order: { items: [] },
      };
      mockPrisma.installmentApplication.findUnique.mockResolvedValue(mockApp);
      mockPrisma.installmentApplication.update.mockResolvedValue({
        ...mockApp,
        status: InstallmentStatus.APPROVED,
        reviewedBy: 'staff-1',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
      });

      const result = await service.review('app-1', 'staff-1', {
        status: 'APPROVED',
        staffNotes: 'Verified and approved',
      });

      expect(result.status).toBe(InstallmentStatus.APPROVED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.CONFIRMED }),
        }),
      );
    });

    it('should reject an installment application, cancel order, release inventory and rollback voucher', async () => {
      const mockApp = {
        id: 'app-1',
        orderId: 'order-1',
        status: InstallmentStatus.PENDING,
        order: {
          id: 'order-1',
          voucherCode: 'VOUCHER10',
          items: [
            {
              variantId: 'var-1',
              quantity: 1,
              imeiDeviceId: 'imei-1',
            },
          ],
        },
      };

      mockPrisma.installmentApplication.findUnique.mockResolvedValue(mockApp);
      mockPrisma.installmentApplication.update.mockResolvedValue({
        ...mockApp,
        status: InstallmentStatus.REJECTED,
        rejectionReason: 'Bad credit history',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      });
      mockPrisma.voucher.findUnique.mockResolvedValue({ id: 'vouch-1' });
      mockPrisma.voucher.update.mockResolvedValue({});
      mockPrisma.voucherUsage.deleteMany.mockResolvedValue({});
      mockPrisma.imeiDevice.updateMany.mockResolvedValue({});
      mockPrisma.inventory.update.mockResolvedValue({});

      const result = await service.review('app-1', 'staff-1', {
        status: 'REJECTED',
        rejectionReason: 'Bad credit history',
      });

      expect(result.status).toBe(InstallmentStatus.REJECTED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelledReason: 'Từ chối hồ sơ trả góp: Bad credit history',
          }),
        }),
      );
      expect(mockPrisma.voucher.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vouch-1' },
          data: { usageCount: { decrement: 1 } },
        }),
      );
      expect(mockPrisma.imeiDevice.updateMany).toHaveBeenCalledWith({
        where: { id: 'imei-1', status: ImeiStatus.RESERVED },
        data: { status: ImeiStatus.AVAILABLE },
      });
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: {
          reservedQty: { decrement: 1 },
          availableQty: { increment: 1 },
        },
      });
    });

    it('should throw BadRequestException when reviewing an already processed application', async () => {
      mockPrisma.installmentApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: InstallmentStatus.APPROVED,
      });

      await expect(
        service.review('app-1', 'staff-1', { status: 'APPROVED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rejecting without rejectionReason', async () => {
      mockPrisma.installmentApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: InstallmentStatus.PENDING,
      });

      await expect(
        service.review('app-1', 'staff-1', {
          status: 'REJECTED',
          rejectionReason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('OrdersService - Installment Checkout Integration', () => {
    let ordersService: OrdersService;
    let mockPrisma: any;
    let mockOrderQueue: any;

    beforeEach(() => {
      mockOrderQueue = {
        add: mockFn().mockReturnValue(Promise.resolve()),
      };
    });

    it('should reject installment checkout if applicant is under 18', async () => {
      mockPrisma = {
        cart: {
          findUnique: mockFn().mockResolvedValue({
            id: 'cart-1',
            items: [
              {
                variantId: 'var-1',
                quantity: 1,
                unitPrice: 20000000,
                variant: { id: 'var-1', name: 'iPhone 15', isActive: true, inventory: { availableQty: 5 } },
              },
            ],
          }),
        },
      };

      ordersService = new OrdersService(mockPrisma as any, mockOrderQueue as any);

      const under18Birth = new Date();
      under18Birth.setFullYear(under18Birth.getFullYear() - 16);

      await expect(
        ordersService.checkout('user-1', {
          addressId: 'addr-1',
          paymentMethod: PaymentMethod.INSTALLMENT,
          installmentData: {
            provider: InstallmentProvider.HOME_CREDIT,
            termMonths: 6,
            prepayPercent: 20,
            fullName: 'Nguyen Van Minor',
            citizenId: '012345678901',
            birthDate: under18Birth.toISOString().slice(0, 10),
            phoneNumber: '0987654321',
            currentAddress: '123 Nguyen Hue',
            incomeRange: '10 - 20 triệu',
            cccdFrontUrl: 'https://r2.domain.com/front.jpg',
            cccdBackUrl: 'https://r2.domain.com/back.jpg',
          },
        }),
      ).rejects.toThrow('Người đăng ký trả góp phải từ 18 tuổi trở lên');
    });

    it('should create order with 24h hold, payment and installment application on installment checkout', async () => {
      const adultBirth = new Date();
      adultBirth.setFullYear(adultBirth.getFullYear() - 25);

      const mockTx: any = {
        address: {
          findFirst: mockFn().mockResolvedValue({ id: 'addr-1', userId: 'user-1' }),
        },
        productVariant: {
          findMany: mockFn().mockResolvedValue([{ id: 'var-1', price: 20000000 }]),
        },
        $queryRaw: mockFn().mockResolvedValue([{ id: 'imei-1' }]),
        imeiDevice: {
          updateMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        inventory: {
          update: mockFn().mockResolvedValue({}),
        },
        order: {
          create: mockFn().mockImplementation((args: any) =>
            Promise.resolve({
              id: 'order-inst-1',
              orderNumber: args.data.orderNumber,
              totalAmount: args.data.totalAmount,
              holdExpiresAt: args.data.holdExpiresAt,
              items: args.data.items.create,
            }),
          ),
        },
        payment: {
          create: mockFn().mockResolvedValue({ id: 'pay-1' }),
        },
        installmentApplication: {
          create: mockFn().mockImplementation((args: any) =>
            Promise.resolve({
              id: 'app-inst-1',
              ...args.data,
            }),
          ),
          updateMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        cartItem: {
          deleteMany: mockFn().mockResolvedValue({ count: 1 }),
        },
      };

      mockPrisma = {
        cart: {
          findUnique: mockFn().mockResolvedValue({
            id: 'cart-1',
            items: [
              {
                variantId: 'var-1',
                quantity: 1,
                unitPrice: 20000000,
                variant: {
                  id: 'var-1',
                  name: 'iPhone 15 Pro',
                  sku: 'IP15P',
                  isActive: true,
                  inventory: { availableQty: 10 },
                },
              },
            ],
          }),
        },
        order: {
          findUnique: mockFn(),
          updateMany: mockFn(),
        },
        $transaction: jest.fn((callback: any) => callback(mockTx)),
      };

      ordersService = new OrdersService(mockPrisma as any, mockOrderQueue as any);

      const order = await ordersService.checkout('user-1', {
        addressId: 'addr-1',
        paymentMethod: PaymentMethod.INSTALLMENT,
        installmentData: {
          provider: InstallmentProvider.HOME_CREDIT,
          termMonths: 6,
          prepayPercent: 20,
          fullName: 'Nguyen Van Adult',
          citizenId: '012345678901',
          birthDate: adultBirth.toISOString().slice(0, 10),
          phoneNumber: '0987654321',
          currentAddress: '123 Nguyen Hue',
          incomeRange: '10 - 20 triệu',
          cccdFrontUrl: 'https://r2.domain.com/front.jpg',
          cccdBackUrl: 'https://r2.domain.com/back.jpg',
        },
      });

      expect(order.id).toBe('order-inst-1');
      // Verify 24-hour hold duration (within 5 seconds tolerance of 24h = 86400000ms)
      const holdTimeDiff = order.holdExpiresAt.getTime() - Date.now();
      expect(holdTimeDiff).toBeGreaterThan(86300000);
      expect(holdTimeDiff).toBeLessThanOrEqual(86400000);

      // Verify payment was created with INSTALLMENT method
      expect(mockTx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: PaymentMethod.INSTALLMENT,
            orderId: 'order-inst-1',
          }),
        }),
      );

      // Verify InstallmentApplication created with computed financials
      expect(mockTx.installmentApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-inst-1',
            provider: InstallmentProvider.HOME_CREDIT,
            termMonths: 6,
            prepayPercent: 20,
            fullName: 'Nguyen Van Adult',
          }),
        }),
      );

      // Verify BullMQ enqueued with 24 hours delay
      expect(mockOrderQueue.add).toHaveBeenCalledWith(
        'expire-order-hold',
        { orderId: 'order-inst-1' },
        { delay: 24 * 60 * 60 * 1000 },
      );
    });

    it('should cancel pending installment application when releaseExpiredHold runs', async () => {
      const mockTx: any = {
        order: {
          updateMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        installmentApplication: {
          updateMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        imeiDevice: {
          updateMany: mockFn().mockResolvedValue({ count: 1 }),
        },
        inventory: {
          update: mockFn().mockResolvedValue({}),
        },
      };

      mockPrisma = {
        order: {
          findUnique: mockFn().mockResolvedValue({
            id: 'ord-hold-exp',
            status: OrderStatus.PENDING,
            items: [{ variantId: 'var-1', quantity: 1, imeiDeviceId: 'imei-1' }],
          }),
        },
        $transaction: jest.fn((callback: any) => callback(mockTx)),
      };

      ordersService = new OrdersService(mockPrisma as any, mockOrderQueue as any);

      const result = await ordersService.releaseExpiredHold('ord-hold-exp');
      expect(result).toBe(true);

      expect(mockTx.installmentApplication.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'ord-hold-exp', status: InstallmentStatus.PENDING },
        data: {
          status: InstallmentStatus.CANCELLED,
          rejectionReason: 'Hết thời hạn 24h thẩm định hồ sơ',
        },
      });
    });
  });
});
