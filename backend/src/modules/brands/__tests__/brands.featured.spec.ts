import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BrandsService } from '../brands.service';
import { BrandsController } from '../brands.controller';

describe('Brands Featured (Service & Controller)', () => {
  let service: BrandsService;
  let controller: BrandsController;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      brand: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      systemSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    service = new BrandsService(prisma as any);
    controller = new BrandsController(service);
  });

  describe('BrandsService.getFeaturedBrands', () => {
    it('should return array of slugs from systemSetting when setting exists', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        key: 'FEATURED_BRANDS',
        value: 'apple,samsung,xiaomi',
      });

      const result = await service.getFeaturedBrands();
      expect(result).toEqual(['apple', 'samsung', 'xiaomi']);
      expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'FEATURED_BRANDS' },
      });
    });

    it('should normalize uppercase, trim whitespace, and filter empty slugs', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        key: 'FEATURED_BRANDS',
        value: ' Apple , SAMSUNG , , Xiaomi ',
      });

      const result = await service.getFeaturedBrands();
      expect(result).toEqual(['apple', 'samsung', 'xiaomi']);
    });

    it('should fallback to default featured brands when setting is null', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue(null);

      const result = await service.getFeaturedBrands();
      expect(result).toEqual([
        'apple',
        'samsung',
        'xiaomi',
        'oppo',
        'vivo',
        'realme',
        'honor',
        'oneplus',
      ]);
      expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'FEATURED_BRANDS' },
      });
    });

    it('should fallback to default featured brands when setting value is empty', async () => {
      (prisma.systemSetting.findUnique as any).mockResolvedValue({
        key: 'FEATURED_BRANDS',
        value: '',
      });

      const result = await service.getFeaturedBrands();
      expect(result).toEqual([
        'apple',
        'samsung',
        'xiaomi',
        'oppo',
        'vivo',
        'realme',
        'honor',
        'oneplus',
      ]);
    });
  });

  describe('BrandsService.updateFeaturedBrands', () => {
    it('should clean slugs, upsert into prisma.systemSetting, and return cleaned slugs', async () => {
      (prisma.systemSetting.upsert as any).mockResolvedValue({
        key: 'FEATURED_BRANDS',
        value: 'apple,samsung,google',
      });

      const input = [' Apple ', 'SAMSUNG', '', ' google '];
      const result = await service.updateFeaturedBrands(input);

      expect(result).toEqual(['apple', 'samsung', 'google']);
      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'FEATURED_BRANDS' },
        update: { value: 'apple,samsung,google' },
        create: {
          key: 'FEATURED_BRANDS',
          value: 'apple,samsung,google',
          group: 'GENERAL',
          isSecret: false,
          description: 'Featured brand slugs shown on homepage',
        },
      });
    });

    it('should handle empty or undefined input array gracefully', async () => {
      (prisma.systemSetting.upsert as any).mockResolvedValue({
        key: 'FEATURED_BRANDS',
        value: '',
      });

      const result = await service.updateFeaturedBrands([] as any);
      expect(result).toEqual([]);
      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'FEATURED_BRANDS' },
        update: { value: '' },
        create: {
          key: 'FEATURED_BRANDS',
          value: '',
          group: 'GENERAL',
          isSecret: false,
          description: 'Featured brand slugs shown on homepage',
        },
      });
    });
  });

  describe('BrandsController featured endpoints', () => {
    it('getFeatured should delegate to brandsService.getFeaturedBrands', async () => {
      const getFeaturedSpy = jest
        .spyOn(service, 'getFeaturedBrands')
        .mockResolvedValue(['apple', 'samsung']);

      const result = await controller.getFeatured();

      expect(result).toEqual(['apple', 'samsung']);
      expect(getFeaturedSpy).toHaveBeenCalledTimes(1);
    });

    it('updateFeatured should delegate to brandsService.updateFeaturedBrands with body.slugs', async () => {
      const updateFeaturedSpy = jest
        .spyOn(service, 'updateFeaturedBrands')
        .mockResolvedValue(['apple', 'samsung', 'xiaomi']);

      const dto = { slugs: ['apple', 'samsung', 'xiaomi'] };
      const result = await controller.updateFeatured(dto);

      expect(result).toEqual(['apple', 'samsung', 'xiaomi']);
      expect(updateFeaturedSpy).toHaveBeenCalledWith(['apple', 'samsung', 'xiaomi']);
    });
  });
});
