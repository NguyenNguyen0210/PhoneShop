import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProductsService } from '../../src/modules/products/products.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductsService - specs & variant constraint checks', () => {
  let service: ProductsService;
  let mockPrisma: any;

  const mockProduct = {
    id: 'b6f4a7c2-1234-4567-8901-abcdef123456',
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    brandId: 'b6f4a7c2-1234-4567-8901-abcdef123457',
    categoryId: 'b6f4a7c2-1234-4567-8901-abcdef123458',
    variants: [],
    reviews: [],
  };

  const mockVariant = {
    id: 'var-uuid-1',
    productId: mockProduct.id,
    sku: 'IP15PM-256-BLK',
    name: '256GB Black Titanium',
    price: 30000000,
  };

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
      imeiDevice: {
        count: jest.fn(),
      },
    };

    service = new ProductsService(mockPrisma as any);
  });

  describe('removeVariant', () => {
    it('should throw BadRequestException if variant is referenced in OrderItem', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrisma.orderItem.count.mockResolvedValue(2);
      mockPrisma.imeiDevice.count.mockResolvedValue(0);

      await expect(
        service.removeVariant(mockProduct.id, mockVariant.id),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.removeVariant(mockProduct.id, mockVariant.id),
      ).rejects.toThrow(
        'Không thể xóa biến thể đã phát sinh đơn hàng hoặc thiết bị IMEI. Vui lòng tắt kích hoạt biến thể thay vì xóa.',
      );

      expect(mockPrisma.orderItem.count).toHaveBeenCalledWith({
        where: { variantId: mockVariant.id },
      });
      expect(mockPrisma.productVariant.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if variant is referenced in ImeiDevice', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.imeiDevice.count.mockResolvedValue(1);

      await expect(
        service.removeVariant(mockProduct.id, mockVariant.id),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.removeVariant(mockProduct.id, mockVariant.id),
      ).rejects.toThrow(
        'Không thể xóa biến thể đã phát sinh đơn hàng hoặc thiết bị IMEI. Vui lòng tắt kích hoạt biến thể thay vì xóa.',
      );

      expect(mockPrisma.imeiDevice.count).toHaveBeenCalledWith({
        where: { variantId: mockVariant.id },
      });
      expect(mockPrisma.productVariant.delete).not.toHaveBeenCalled();
    });

    it('should delete variant successfully when no order items or imei devices exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.imeiDevice.count.mockResolvedValue(0);
      mockPrisma.productVariant.delete.mockResolvedValue(mockVariant);

      const result = await service.removeVariant(mockProduct.id, mockVariant.id);

      expect(mockPrisma.productVariant.delete).toHaveBeenCalledWith({
        where: { id: mockVariant.id },
      });
      expect(result).toEqual(mockVariant);
    });
  });

  describe('create product with auto-slug and specs', () => {
    it('should auto-generate slug from name if slug is not provided in dto', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const dto: any = {
        name: 'iPhone 16 Pro Max 256GB',
        brandId: 'b6f4a7c2-1234-4567-8901-abcdef123457',
        categoryId: 'b6f4a7c2-1234-4567-8901-abcdef123458',
        specs: { ram: '8GB', storage: '256GB' },
      };

      const result = await service.create(dto);

      expect(result.slug).toBeDefined();
      expect(result.slug).toMatch(/^iphone-16-pro-max-256gb-[a-z0-9]+$/);
      expect(result.specs).toEqual({ ram: '8GB', storage: '256GB' });
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'iPhone 16 Pro Max 256GB',
            slug: expect.stringMatching(/^iphone-16-pro-max-256gb-[a-z0-9]+$/),
            specs: { ram: '8GB', storage: '256GB' },
          }),
        }),
      );
    });

    it('should use provided slug if present', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const dto: any = {
        name: 'iPhone 16 Pro Max',
        slug: 'custom-iphone-16-slug',
        brandId: 'b6f4a7c2-1234-4567-8901-abcdef123457',
        categoryId: 'b6f4a7c2-1234-4567-8901-abcdef123458',
      };

      const result = await service.create(dto);

      expect(result.slug).toBe('custom-iphone-16-slug');
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'custom-iphone-16-slug',
          }),
        }),
      );
    });
  });
});
