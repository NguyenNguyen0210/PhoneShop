import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty({ description: 'Positive to increase, negative to decrease' })
  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit cost or transaction price in VND' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SetReorderLevelDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderLevel: number;
}

export class ReserveStockDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}
