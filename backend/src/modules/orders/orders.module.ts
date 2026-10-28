import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersProcessor } from './orders.processor';
import { HoldExpirySweeper } from './hold-expiry.sweeper';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
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
    // When Redis is disabled, register the expire-order-hold handler on the
    // local fallback queue so enqueued jobs actually run instead of being
    // silently dropped. The factory wires the same Prisma-based logic that
    // OrdersProcessor.handleExpireOrderHold uses, via a lightweight closure.
    ...(!isRedisEnabled
      ? [
          {
            provide: 'ORDER_QUEUE_LOCAL_HANDLERS',
            inject: ['BullQueue_order-queue', PrismaService],
            useFactory: (queue: any, prisma: PrismaService) => {
              if (typeof queue?.registerHandler === 'function') {
                const processor = new OrdersProcessor(prisma);
                queue.registerHandler('expire-order-hold', async (data: any) => {
                  await processor.process({
                    name: 'expire-order-hold',
                    data,
                    id: `local-${Date.now()}`,
                  } as any);
                });
              }
            },
          },
        ]
      : []),
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
