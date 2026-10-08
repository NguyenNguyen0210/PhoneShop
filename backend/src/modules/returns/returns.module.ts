import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarrantyModule } from '../warranty/warranty.module';

@Module({
  imports: [PrismaModule, WarrantyModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
