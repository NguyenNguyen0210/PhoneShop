import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarrantyDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty()
  @IsUUID()
  orderItemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  imeiDeviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClaimWarrantyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
