import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkDeleteCartItemsDto {
  @ApiProperty({ type: [String], description: 'List of CartItem IDs to delete' })
  @IsArray()
  @IsUUID('all', { each: true })
  itemIds: string[];
}

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  variantId: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ApplyVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}
