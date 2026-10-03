import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewInstallmentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Hồ sơ đầy đủ, đối chiếu thông tin hợp lệ' })
  @IsOptional()
  @IsString()
  staffNotes?: string;

  @ApiPropertyOptional({ example: 'Ảnh CCCD bị mờ, không đọc được số' })
  @ValidateIf((o) => o.status === 'REJECTED')
  @IsNotEmpty({ message: 'rejectionReason is required when status is REJECTED' })
  @IsString()
  rejectionReason?: string;
}
