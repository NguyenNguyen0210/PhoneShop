import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID of the product being reviewed' })
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional short summary/title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed review content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of image URLs (max 5)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  images?: string[];
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'List of image URLs (max 5)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  images?: string[];
}

export class CreateReplyDto {
  @ApiProperty({ description: 'Reply content (shop response or customer follow-up)' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ModerateReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;
}
