import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateFeaturedBrandsDto {
  @ApiProperty({
    type: [String],
    description: 'Featured brand slugs shown on homepage',
    example: ['apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'honor', 'oneplus'],
  })
  @IsArray()
  @IsString({ each: true })
  slugs: string[];
}
