import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

export class CreateVnpayUrlDto {
  @ApiProperty({ description: 'ID of the order to create VNPay payment for' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsOptional()
  @IsString()
  ipAddr?: string;

  @ApiPropertyOptional({ description: 'Optional specific bank code, e.g. VNBANK, NCB' })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Bank transaction reference proving the money arrived (mandatory evidence for manual confirmation)',
  })
  @IsString()
  @IsNotEmpty()
  providerRef: string;
}
