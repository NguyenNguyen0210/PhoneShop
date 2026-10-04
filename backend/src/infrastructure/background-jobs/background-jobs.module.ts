import { Module, Global } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// In-memory queue fallback used when Redis is disabled (REDIS_ENABLED !== 'true').
// Internal-only job IDs (never user-facing, never persisted as business data).
const createLocalQueue = (name: string) => ({
  provide: getQueueToken(name),
  useValue: {
    name,
    add: async (jobName: string, data: any) => {
      return { id: `local-${Date.now()}`, name: jobName, data };
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
          useFactory: (config: ConfigService) => {
            const username = config.get<string>('REDIS_USERNAME', '');
            const password = config.get<string>('REDIS_PASSWORD', '');
            const tlsEnabled =
              config.get<string>('REDIS_TLS', '').toLowerCase() === 'true';
            return {
              connection: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
                ...(username ? { username } : {}),
                ...(password ? { password } : {}),
                ...(tlsEnabled ? { tls: {} } : {}),
              },
            };
          },
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
        createLocalQueue('email-queue'),
        createLocalQueue('notification-queue'),
        createLocalQueue('order-queue'),
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
