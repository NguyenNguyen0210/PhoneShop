import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InstallmentProvider, InstallmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryInstallmentDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: InstallmentStatus })
  @IsOptional()
  @IsEnum(InstallmentStatus)
  status?: InstallmentStatus;

  @ApiPropertyOptional({ enum: InstallmentProvider })
  @IsOptional()
  @IsEnum(InstallmentProvider)
  provider?: InstallmentProvider;

  @ApiPropertyOptional({ description: 'Search by order number, full name, citizen ID, or phone number' })
  @IsOptional()
  @IsString()
  search?: string;
}
