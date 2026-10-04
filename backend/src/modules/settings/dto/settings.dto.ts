import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSettingsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}

export class TestStorageDto {
  @IsString()
  @IsOptional()
  bucket?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  accessKeyId?: string;

  @IsString()
  @IsOptional()
  secretAccessKey?: string;
}

export class TestEmailDto {
  @IsString()
  @IsOptional()
  toEmail?: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsOptional()
  port?: number | string;

  @IsOptional()
  secure?: boolean | string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  pass?: string;

  @IsString()
  @IsOptional()
  from?: string;
}

export class TestVietQrDto {
  @IsString()
  @IsOptional()
  bankId?: string;

  @IsString()
  @IsOptional()
  accountNo?: string;

  @IsString()
  @IsOptional()
  accountName?: string;
}
