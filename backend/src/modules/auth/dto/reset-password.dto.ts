import { IsSafePassword } from '../../../common/validators/password.validator';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Raw token received via email' })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'Token không hợp lệ' })
  token: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  @IsSafePassword()
  newPassword: string;
}
