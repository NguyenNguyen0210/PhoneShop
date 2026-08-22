import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CachingService } from './caching.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Cache manager v6 uses keyv underneath
        // We will just use the default in-memory for now if cache-manager-redis-yet causes issues,
        // or standard configuration.
        return {
          ttl: 60 * 1000, // default 60s
        };
      },
    }),
  ],
  providers: [CachingService],
  exports: [CachingService, CacheModule],
})
export class CachingModule {}
