import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ValidateNested, IsUUID, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FlashSaleItemDto {
  @ApiProperty()
  @IsUUID()
  variantId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1000)
  flashPrice: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  stockLimit: number;
}

export class CreateFlashSaleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;

  @ApiProperty({ type: [FlashSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashSaleItemDto)
  items: FlashSaleItemDto[];
}
