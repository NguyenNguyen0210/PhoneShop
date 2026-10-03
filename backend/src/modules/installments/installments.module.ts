import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { InstallmentsService } from './installments.service';
import {
  InstallmentsController,
  AdminInstallmentsController,
} from './installments.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => OrdersModule)],
  controllers: [InstallmentsController, AdminInstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}
