import { IsNumber, IsPositive, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundOrderDto {
  @ApiProperty({ description: 'Refund amount in VND', example: 500000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Reason for refund', example: 'Khách hàng đổi ý / Sản phẩm lỗi' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'External provider transaction reference', example: 'VNPAY-REF-123456' })
  @IsOptional()
  @IsString()
  providerReference?: string;
}
