import { describe, it, expect } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FilterProductDto } from '../dto/filter-product.dto';

describe('FilterProductDto validation and transformation', () => {
  it('should validate valid filter params successfully', async () => {
    const dto = plainToInstance(FilterProductDto, {
      minPrice: 10000000,
      maxPrice: 20000000,
      ram: ['8GB', '12GB'],
      storage: ['256GB'],
      color: ['Black', 'Blue'],
      inStock: true,
      onSale: true,
      has5G: true,
      os: ['iOS'],
      chipset: ['Apple A17 Pro'],
      minScreenSize: 6.1,
      maxScreenSize: 6.7,
      minBattery: 4000,
      maxBattery: 5000,
      minRating: 4.5,
      sortBy: 'best-seller',
      sortOrder: 'desc',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.ram).toEqual(['8GB', '12GB']);
    expect(dto.storage).toEqual(['256GB']);
    expect(dto.color).toEqual(['Black', 'Blue']);
    expect(dto.inStock).toBe(true);
    expect(dto.onSale).toBe(true);
    expect(dto.has5G).toBe(true);
    expect(dto.os).toEqual(['iOS']);
    expect(dto.chipset).toEqual(['Apple A17 Pro']);
    expect(dto.minScreenSize).toBe(6.1);
    expect(dto.maxScreenSize).toBe(6.7);
    expect(dto.minBattery).toBe(4000);
    expect(dto.maxBattery).toBe(5000);
    expect(dto.minRating).toBe(4.5);
    expect(dto.sortBy).toBe('best-seller');
  });

  it('should transform single string query params to arrays', async () => {
    const dto = plainToInstance(FilterProductDto, {
      ram: '8GB',
      storage: '128GB',
      color: 'Titanium',
      os: 'Android',
      chipset: 'Snapdragon',
      inStock: 'true',
      onSale: 'true',
      has5G: 'true',
      minScreenSize: '6.1',
      maxScreenSize: '6.7',
      minBattery: '4000',
      maxBattery: '5000',
      minRating: '4',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.ram).toEqual(['8GB']);
    expect(dto.storage).toEqual(['128GB']);
    expect(dto.color).toEqual(['Titanium']);
    expect(dto.os).toEqual(['Android']);
    expect(dto.chipset).toEqual(['Snapdragon']);
    expect(dto.inStock).toBe(true);
    expect(dto.onSale).toBe(true);
    expect(dto.has5G).toBe(true);
    expect(dto.minScreenSize).toBe(6.1);
    expect(dto.maxScreenSize).toBe(6.7);
    expect(dto.minBattery).toBe(4000);
    expect(dto.maxBattery).toBe(5000);
    expect(dto.minRating).toBe(4);
  });

  it('should transform comma-separated string to arrays', async () => {
    const dto = plainToInstance(FilterProductDto, {
      ram: '8GB,12GB, 16GB',
      storage: '128GB, 256GB',
      color: 'Black, White, Blue',
      os: 'iOS, Android',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.ram).toEqual(['8GB', '12GB', '16GB']);
    expect(dto.storage).toEqual(['128GB', '256GB']);
    expect(dto.color).toEqual(['Black', 'White', 'Blue']);
    expect(dto.os).toEqual(['iOS', 'Android']);
  });

  it('should allow all required sortBy values', async () => {
    const allowedSortBys = [
      'createdAt',
      'name',
      'updatedAt',
      'price-asc',
      'price-desc',
      'rating',
      'best-seller',
      'top-discount',
    ];

    for (const sortBy of allowedSortBys) {
      const dto = plainToInstance(FilterProductDto, { sortBy });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject invalid sortBy value', async () => {
    const dto = plainToInstance(FilterProductDto, { sortBy: 'unsupported-sort' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('sortBy');
  });

  it('should reject invalid minRating (> 5 or < 0)', async () => {
    const dtoHigh = plainToInstance(FilterProductDto, { minRating: 6 });
    const errorsHigh = await validate(dtoHigh);
    expect(errorsHigh.length).toBeGreaterThan(0);

    const dtoLow = plainToInstance(FilterProductDto, { minRating: -1 });
    const errorsLow = await validate(dtoLow);
    expect(errorsLow.length).toBeGreaterThan(0);
  });
});
