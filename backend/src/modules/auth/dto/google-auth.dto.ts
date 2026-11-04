import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google OAuth authorization code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Signed OAuth state (CSRF protection, issued by GET /auth/google/url)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  state: string;
}
