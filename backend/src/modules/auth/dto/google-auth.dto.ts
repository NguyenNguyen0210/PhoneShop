import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google OAuth authorization code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Signed OAuth state (CSRF protection, issued by GET /auth/google/url)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  state?: string;
}
