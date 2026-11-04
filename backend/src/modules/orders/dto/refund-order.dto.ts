import { IsNumber, IsPositive, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundOrderDto {
  @ApiProperty({ description: 'Refund amount in VND', example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Reason for refund', example: 'Khách hàng đổi ý / Sản phẩm lỗi' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Reference proving that the external refund has already succeeded', example: 'VNPAY-REF-123456' })
  @IsString()
  @IsNotEmpty()
  providerReference: string;
}
