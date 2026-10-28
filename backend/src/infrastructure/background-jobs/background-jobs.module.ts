import { Module, Global, Logger } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// In-memory queue fallback used when Redis is disabled (REDIS_ENABLED !== 'true').
// Unlike the old stub that silently dropped jobs, this fallback actually
// executes each job's handler synchronously via `setImmediate` so that
// critical paths (hold-expiry, emails) still run in dev/test environments.
const logger = new Logger('LocalQueue');

const createLocalQueue = (name: string) => ({
  provide: getQueueToken(name),
  useValue: {
    name,
    _handlers: new Map<string, (data: any) => Promise<void>>(),
    /**
     * Register a handler that will be invoked for matching jobNames.
     * Called from modules that provide processor services.
     */
    registerHandler(jobName: string, handler: (data: any) => Promise<void>) {
      this._handlers.set(jobName, handler);
    },
    async add(jobName: string, data: any, _opts?: any) {
      const id = `local-${Date.now()}`;
      const handler = this._handlers.get(jobName);
      if (handler) {
        // Execute asynchronously so the caller is not blocked by the handler,
        // but the work IS performed (unlike the old stub).
        setImmediate(async () => {
          try {
            await handler(data);
          } catch (err) {
            logger.error(`Local queue "${name}" job "${jobName}" failed: ${(err as Error).message}`);
          }
        });
      } else {
        logger.warn(`Local queue "${name}": no handler for "${jobName}" — job ${id} dropped`);
      }
      return { id, name: jobName, data };
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
