import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

// NOTE: the CachingService wrapper was removed (dead code — nothing injected
// it, and an in-memory cache would not share across instances anyway).
// CacheModule stays registered for future use with explicit invalidation.
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
  providers: [],
  exports: [CacheModule],
})
export class CachingModule {}
