import { IsSafePassword } from '../../../common/validators/password.validator';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @IsSafePassword()
  newPassword: string;
}
