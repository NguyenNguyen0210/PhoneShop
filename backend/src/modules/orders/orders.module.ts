import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersProcessor } from './orders.processor';
import { HoldExpirySweeper } from './hold-expiry.sweeper';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarrantyModule } from '../warranty/warranty.module';

const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    PrismaModule,
    WarrantyModule,
    ...(isRedisEnabled ? [BullModule.registerQueue({ name: 'order-queue' })] : []),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    HoldExpirySweeper,
    ...(isRedisEnabled ? [OrdersProcessor] : []),
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
