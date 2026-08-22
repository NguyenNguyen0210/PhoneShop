import { Module } from '@nestjs/common';
import { ImeiService } from './imei.service';
import { ImeiController } from './imei.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImeiController],
  providers: [ImeiService],
  exports: [ImeiService],
})
export class ImeiModule {}
