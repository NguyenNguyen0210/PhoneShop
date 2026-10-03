import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InstallmentProvider } from '@prisma/client';
import { Type } from 'class-transformer';

export function IsApplicantAdult(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isApplicantAdult',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (!value) return false;
          const birth = new Date(value);
          if (isNaN(birth.getTime())) return false;
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age >= 18;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Applicant must be at least 18 years old';
        },
      },
    });
  };
}

export class CreateInstallmentApplicationDto {
  @ApiProperty({ enum: InstallmentProvider, example: InstallmentProvider.HOME_CREDIT })
  @IsEnum(InstallmentProvider)
  provider: InstallmentProvider;

  @ApiProperty({ example: 6, enum: [3, 6, 9, 12] })
  @Type(() => Number)
  @IsInt()
  @IsIn([3, 6, 9, 12])
  termMonths: number;

  @ApiProperty({ example: 20, enum: [0, 20, 30, 50] })
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 20, 30, 50])
  prepayPercent: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '012345678901', description: '12-digit Citizen Identity Card (CCCD)' })
  @IsString()
  @Matches(/^[0-9]{12}$/, { message: 'citizenId must be exactly 12 digits' })
  citizenId: string;

  @ApiProperty({ example: '2000-01-15', description: 'Date of birth (ISO 8601 or YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsApplicantAdult({ message: 'Applicant must be at least 18 years old' })
  birthDate: string;

  @ApiProperty({ example: '0987654321', description: '10-digit Vietnamese phone number' })
  @IsString()
  @Matches(/^(0[3|5|7|8|9])[0-9]{8}$/, {
    message: 'phoneNumber must be a valid 10-digit Vietnamese phone number',
  })
  phoneNumber: string;

  @ApiProperty({ example: '123 Nguyen Hue, Quan 1, TP. HCM' })
  @IsString()
  @MinLength(5)
  currentAddress: string;

  @ApiProperty({ example: '10 - 20 triệu / tháng' })
  @IsString()
  @IsNotEmpty()
  incomeRange: string;

  @ApiProperty({ example: 'https://r2.domain.com/cccd/front-123.jpg' })
  @IsString()
  @IsNotEmpty()
  cccdFrontUrl: string;

  @ApiProperty({ example: 'https://r2.domain.com/cccd/back-123.jpg' })
  @IsString()
  @IsNotEmpty()
  cccdBackUrl: string;
}
