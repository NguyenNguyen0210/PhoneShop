import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersProcessor } from './orders.processor';
import { PrismaModule } from '../../prisma/prisma.module';

const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    PrismaModule,
    ...(isRedisEnabled ? [BullModule.registerQueue({ name: 'order-queue' })] : []),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ...(isRedisEnabled ? [OrdersProcessor] : []),
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
