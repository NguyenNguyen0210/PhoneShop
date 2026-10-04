import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProductsService } from '../products.service';

describe('ProductsService - Filter & Sort', () => {
  let service: ProductsService;
  let prisma: any;

  const mockProduct1 = {
    id: 'p-1',
    name: 'iPhone 15 Pro',
    createdAt: new Date('2026-01-01'),
    specs: {
      has5G: true,
      os: 'iOS',
      chipset: 'Apple A17 Pro',
      screenSize: 6.1,
      batteryCapacity: 3274,
    },
    variants: [
      {
        id: 'v-1',
        sku: 'IP15P-256-BLK',
        price: 27990000,
        compareAtPrice: 29990000,
        ram: '8GB',
        storage: '256GB',
        color: 'Titanium Black',
        isActive: true,
        inventory: { availableQty: 10 },
      },
    ],
    reviews: [
      { id: 'r-1', rating: 5, status: 'APPROVED', user: { id: 'u-1' }, replies: [] },
      { id: 'r-2', rating: 4, status: 'APPROVED', user: { id: 'u-2' }, replies: [] },
    ],
  };

  const mockProduct2 = {
    id: 'p-2',
    name: 'Galaxy S24 Ultra',
    createdAt: new Date('2026-02-01'),
    specs: {
      has5G: true,
      os: 'Android',
      chipset: 'Snapdragon 8 Gen 3',
      screenSize: 6.8,
      batteryCapacity: 5000,
    },
    variants: [
      {
        id: 'v-2',
        sku: 'S24U-256-BLK',
        price: 29990000,
        compareAtPrice: 33990000,
        ram: '12GB',
        storage: '256GB',
        color: 'Titanium Gray',
        isActive: true,
        inventory: { availableQty: 5 },
      },
    ],
    reviews: [
      { id: 'r-3', rating: 5, status: 'APPROVED', user: { id: 'u-3' }, replies: [] },
    ],
  };

  const mockProduct3 = {
    id: 'p-3',
    name: 'Galaxy A55',
    createdAt: new Date('2026-03-01'),
    specs: {
      has5G: false,
      os: 'Android',
      chipset: 'Exynos 1480',
      screenSize: 6.6,
      batteryCapacity: 5000,
    },
    variants: [
      {
        id: 'v-3',
        sku: 'A55-128-BLU',
        price: 9990000,
        compareAtPrice: null,
        ram: '8GB',
        storage: '128GB',
        color: 'Awesome Blue',
        isActive: true,
        inventory: { availableQty: 0 },
      },
    ],
    reviews: [
      { id: 'r-4', rating: 3, status: 'APPROVED', user: { id: 'u-4' }, replies: [] },
    ],
  };

  beforeEach(() => {
    prisma = {
      product: {
        count: jest.fn<any>().mockImplementation(async () => 3),
        findMany: jest.fn<any>().mockImplementation(async () => [mockProduct1, mockProduct2, mockProduct3]),
      },
      orderItem: {
        groupBy: jest.fn<any>().mockImplementation(async () => [
          { variantId: 'v-1', _sum: { quantity: 50 } },
          { variantId: 'v-2', _sum: { quantity: 120 } },
          { variantId: 'v-3', _sum: { quantity: 20 } },
        ]),
      },
      productVariant: {
        fields: {
          price: 'price_col',
        },
      },
    };

    service = new ProductsService(prisma);
  });

  it('should construct query with variant and specs filters', async () => {
    const res = await service.findAll({
      has5G: true,
      ram: ['8GB'],
      storage: ['256GB'],
      color: ['Black'],
      inStock: true,
      onSale: true,
      minPrice: 10000000,
      maxPrice: 30000000,
      os: ['iOS'],
      chipset: ['Apple A17 Pro'],
      minScreenSize: 6.0,
      maxScreenSize: 6.5,
      minBattery: 3000,
      maxBattery: 4000,
    });

    expect(prisma.product.findMany).toHaveBeenCalled();
    const callArgs: any = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    const where = callArgs.where;

    // Variant assertions
    expect(where.variants.some).toBeDefined();
    expect(where.variants.some.price).toEqual({ gte: 10000000, lte: 30000000 });
    expect(where.variants.some.ram).toEqual({ in: ['8GB'], mode: 'insensitive' });
    expect(where.variants.some.storage).toEqual({ in: ['256GB'], mode: 'insensitive' });
    expect(where.variants.some.inventory).toEqual({ availableQty: { gt: 0 } });
    expect(where.variants.some.compareAtPrice).toBeDefined();

    // Specs JSON AND assertions
    expect(where.AND).toBeDefined();
    expect(where.AND.length).toBeGreaterThanOrEqual(5);

    expect(res).toBeDefined();
  });

  it('should filter products by minRating', async () => {
    // mockProduct1 has average rating 4.5
    // mockProduct2 has rating 5.0
    // mockProduct3 has rating 3.0
    const res = await service.findAll({ minRating: 4.0 });

    expect(prisma.product.findMany).toHaveBeenCalled();
    // Only p-1 (4.5) and p-2 (5.0) should remain
    expect(res.data.length).toBe(2);
    expect(res.data.map((p: any) => p.id)).toEqual(['p-1', 'p-2']);
    for (const item of res.data) {
      expect(item.rating).toBeGreaterThanOrEqual(4.0);
    }
  });

  it('should sort products by best-seller descending using OrderItem groupBy', async () => {
    // sales: v-2 (120), v-1 (50), v-3 (20)
    // Product order should be: p-2 (120), p-1 (50), p-3 (20)
    const res = await service.findAll({ sortBy: 'best-seller' });

    expect(prisma.orderItem.groupBy).toHaveBeenCalledWith({
      by: ['variantId'],
      _sum: { quantity: true },
    });
    expect(res.data.map((p: any) => p.id)).toEqual(['p-2', 'p-1', 'p-3']);
  });

  it('should sort products by top-discount descending', async () => {
    // Discounts:
    // p-2: (33990000 - 29990000)/33990000 = 11.76%
    // p-1: (29990000 - 27990000)/29990000 = 6.67%
    // p-3: null / 0%
    const res = await service.findAll({ sortBy: 'top-discount' });
    expect(res.data.map((p: any) => p.id)).toEqual(['p-2', 'p-1', 'p-3']);
  });

  it('should sort products by price-asc and price-desc', async () => {
    // Prices: p-3: 9.99m, p-1: 27.99m, p-2: 29.99m
    const ascRes = await service.findAll({ sortBy: 'price-asc' });
    expect(ascRes.data.map((p: any) => p.id)).toEqual(['p-3', 'p-1', 'p-2']);

    const descRes = await service.findAll({ sortBy: 'price-desc' });
    expect(descRes.data.map((p: any) => p.id)).toEqual(['p-2', 'p-1', 'p-3']);
  });

  it('should sort products by rating descending', async () => {
    // p-2: 5.0, p-1: 4.5, p-3: 3.0
    const res = await service.findAll({ sortBy: 'rating' });
    expect(res.data.map((p: any) => p.id)).toEqual(['p-2', 'p-1', 'p-3']);
  });

  it('should retain specs, rating, reviewCount, and variants in formatted response', async () => {
    const res = await service.findAll({});
    const first = res.data[0];

    expect(first.specs).toBeDefined();
    expect(first.specs.os).toBeDefined();
    expect(first.rating).toBeDefined();
    expect(first.reviewCount).toBeGreaterThanOrEqual(1);
    expect(first.variants).toBeDefined();
    expect(first.variants.length).toBeGreaterThanOrEqual(1);
  });
});
