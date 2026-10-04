import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCondition, ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

const transformToArray = ({ value }: { value: any }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.includes(',')
      ? value.split(',').map((s) => s.trim()).filter(Boolean)
      : [value.trim()];
  }
  return [String(value)];
};

const transformToBoolean = ({ value }: { value: any }) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value === 'true' || value === true || value === '1' || value === 1;
};

export class FilterProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ProductCondition })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // Thuộc tính biến thể (Variant attributes)
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  ram?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  storage?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(transformToBoolean)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(transformToBoolean)
  @IsBoolean()
  onSale?: boolean;

  // Thông số phần cứng specs (Hardware specs)
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(transformToBoolean)
  @IsBoolean()
  has5G?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  os?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  chipset?: string[];

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minScreenSize?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxScreenSize?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBattery?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBattery?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: [
      'createdAt',
      'name',
      'updatedAt',
      'price-asc',
      'price-desc',
      'rating',
      'best-seller',
      'top-discount',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt',
    'name',
    'updatedAt',
    'price-asc',
    'price-desc',
    'rating',
    'best-seller',
    'top-discount',
  ])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
