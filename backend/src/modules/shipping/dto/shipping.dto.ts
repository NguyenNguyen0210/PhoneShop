import { IsString, IsOptional, IsDateString, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// Single source of truth: re-export the Prisma enum instead of maintaining
// a duplicate ShippingStatus definition that can drift from the schema.
import { ShippingStatus } from '@prisma/client';
export { ShippingStatus };

export class CreateShippingDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'GHN' })
  @IsString()
  @Length(2, 100)
  providerName: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional({ example: '2026-08-25T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}

export class AssignShippingDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'GHN' })
  @IsString()
  @Length(2, 100)
  providerName: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional({ example: '2026-10-06T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}

export class UpdateShippingStatusDto {
  @ApiProperty({ enum: ShippingStatus })
  @IsEnum(ShippingStatus)
  status: ShippingStatus;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}

export class UpdateShippingDto extends PartialType(CreateShippingDto) {}

export class UpdateOrderShippingDto {
  @ApiPropertyOptional({ example: 'Viettel Post' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  providerName?: string;

  @ApiPropertyOptional({ example: 'VTP123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}
