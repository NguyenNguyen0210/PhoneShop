import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarkTermPaidDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi staff xác nhận đã thu kỳ góp (tối đa 255 ký tự)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paidNote?: string;
}
