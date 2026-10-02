import { Module, Global } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

const createMockQueue = (name: string) => ({
  provide: getQueueToken(name),
  useValue: {
    name,
    add: async (jobName: string, data: any) => {
      return { id: `mock-${Date.now()}`, name: jobName, data };
    },
    on: () => {},
    close: async () => {},
  },
});

const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

@Global()
@Module({
  imports: isRedisEnabled
    ? [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: {
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
            },
          }),
        }),
        BullModule.registerQueue(
          { name: 'email-queue' },
          { name: 'notification-queue' },
          { name: 'order-queue' },
        ),
      ]
    : [],
  providers: isRedisEnabled
    ? []
    : [
        createMockQueue('email-queue'),
        createMockQueue('notification-queue'),
        createMockQueue('order-queue'),
      ],
  exports: isRedisEnabled
    ? [BullModule]
    : [
        getQueueToken('email-queue'),
        getQueueToken('notification-queue'),
        getQueueToken('order-queue'),
      ],
})
export class BackgroundJobsModule {}
