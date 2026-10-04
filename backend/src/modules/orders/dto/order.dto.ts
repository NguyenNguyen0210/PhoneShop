import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, ShippingMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateInstallmentApplicationDto } from '../../installments/dto/create-installment-application.dto';

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ type: [String], description: 'Selected CartItem IDs or Variant IDs to checkout' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedItemIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiPropertyOptional({ enum: ShippingMethod, default: ShippingMethod.STANDARD })
  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ type: () => CreateInstallmentApplicationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInstallmentApplicationDto)
  installmentData?: CreateInstallmentApplicationDto;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class ShipOrderDto {
  @ApiPropertyOptional({ example: 'Giao Hàng Nhanh (GHN)' })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: '2026-10-10T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  estimatedDeliveryDate?: string;
}

