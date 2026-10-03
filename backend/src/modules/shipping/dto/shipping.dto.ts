import { IsString, IsOptional, IsDecimal, IsDateString, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ShippingStatus {
  PENDING = 'PENDING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

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

  @ApiPropertyOptional({ example: '30000' })
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional({ example: '2026-08-25T00:00:00.000Z' })
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
