import { IsSafePassword } from '../../../common/validators/password.validator';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  @IsSafePassword()
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/\S/u, { message: 'Họ và tên không được chỉ chứa khoảng trắng' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/\S/u, { message: 'Họ và tên không được chỉ chứa khoảng trắng' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^(?:0|\+84)[1-9]\d{8}$/, { message: 'Số điện thoại không đúng định dạng Việt Nam' })
  phone: string;
}
