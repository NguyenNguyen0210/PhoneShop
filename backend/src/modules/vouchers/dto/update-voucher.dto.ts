import { PartialType } from '@nestjs/swagger';
import { CreateVoucherDto } from './voucher.dto';
export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}
