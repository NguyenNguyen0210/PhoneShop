import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImeiStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateImeiDto {
  @ApiProperty()
  @IsUUID()
  variantId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imei: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imei2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchasePrice?: number;
}

export class UpdateImeiStatusDto {
  @ApiProperty({ enum: ImeiStatus })
  @IsEnum(ImeiStatus)
  status: ImeiStatus;
}

export class ImportImeiItemDto extends CreateImeiDto {}

export class ImportImeiDto {
  @ApiProperty({ type: [ImportImeiItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportImeiItemDto)
  items: ImportImeiItemDto[];
}
