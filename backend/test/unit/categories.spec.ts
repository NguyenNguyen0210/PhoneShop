import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { CategoriesController } from '../../src/modules/categories/categories.controller';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CategoriesService(prisma);
  });

  describe('activate and deactivate (changeStatus)', () => {
    it('should activate category successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: false });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: true });

      const result = await service.changeStatus('cat-1', true);
      expect(result.isActive).toBe(true);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: true },
      });
    });

    it('should deactivate category successfully', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: true });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại', isActive: false });

      const result = await service.changeStatus('cat-1', false);
      expect(result.isActive).toBe(false);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove with constraints', () => {
    it('should prevent deletion if category has products', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'iPhone',
        children: [],
        products: [{ id: 'prod-1' }],
      });

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should prevent deletion if category has children', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Điện thoại',
        children: [{ id: 'cat-2' }],
        products: [],
      });

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion if category has no products and no children', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Điện thoại cũ',
        children: [],
        products: [],
      });
      prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const result = await service.remove('cat-1');
      expect(result).toEqual({ id: 'cat-1' });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });

  describe('cyclic hierarchy check on update', () => {
    it('should reject setting parentId to itself', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Điện thoại' });

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(ConflictException);
    });

    it('should reject setting parentId to one of its descendants', async () => {
      prisma.category.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'cat-1') return Promise.resolve({ id: 'cat-1', name: 'Điện thoại' });
        if (where.id === 'cat-sub') return Promise.resolve({ id: 'cat-sub', parentId: 'cat-1' });
        return Promise.resolve(null);
      });

      await expect(service.update('cat-1', { parentId: 'cat-sub' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getTree with product counts', () => {
    it('should include _count for products and children', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await service.getTree(false);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { products: true, children: true } },
          }),
        })
      );
    });
  });

  describe('reorder', () => {
    it('should run a transaction to update sortOrder for all items', async () => {
      (prisma as any).$transaction = jest.fn().mockImplementation(() => Promise.resolve([]));
      (prisma.category as any).update = jest.fn().mockReturnValue({});

      const items = [
        { id: 'cat-1', sortOrder: 0 },
        { id: 'cat-2', sortOrder: 1 },
      ];

      const res = await service.reorder(items);
      expect((prisma as any).$transaction).toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });
  });
});

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      changeStatus: jest.fn(),
      reorder: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    };
    controller = new CategoriesController(mockService);
  });

  it('activate should delegate to service.changeStatus(id, true)', async () => {
    mockService.changeStatus.mockResolvedValue({ id: 'cat-1', isActive: true });
    const result = await controller.activate('cat-1');
    expect(mockService.changeStatus).toHaveBeenCalledWith('cat-1', true);
    expect(result).toEqual({ id: 'cat-1', isActive: true });
  });

  it('deactivate should delegate to service.changeStatus(id, false)', async () => {
    mockService.changeStatus.mockResolvedValue({ id: 'cat-1', isActive: false });
    const result = await controller.deactivate('cat-1');
    expect(mockService.changeStatus).toHaveBeenCalledWith('cat-1', false);
    expect(result).toEqual({ id: 'cat-1', isActive: false });
  });

  it('reorder should delegate to service.reorder(items)', async () => {
    const items = [{ id: 'cat-1', sortOrder: 1 }, { id: 'cat-2', sortOrder: 0 }];
    const result = await controller.reorder({ items });
    expect(mockService.reorder).toHaveBeenCalledWith(items);
    expect(result).toEqual({ success: true });
  });
});
