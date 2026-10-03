import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { UserStatus } from '@prisma/client';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name, email or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role (e.g. USER, STAFF, ADMIN)' })
  @IsOptional()
  @IsString()
  role?: string;
}
