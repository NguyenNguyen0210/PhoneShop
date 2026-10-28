import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleCredentialDto {
  @ApiProperty({ description: 'Google ID Token (credential) returned by Google Identity Services popup' })
  @IsString()
  @IsNotEmpty()
  credential: string;
}
