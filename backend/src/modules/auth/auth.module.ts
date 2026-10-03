import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // M12: fail closed — never boot with a publicly known default secret.
        // Previously every site fell back to 'super-secret'/'super-refresh-secret'
        // (published in source), so any env missing the vars minted forgeable JWTs.
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('FATAL: JWT_SECRET must be set (refusing to use default secret)');
        }
        return {
          secret,
          signOptions: { expiresIn: '15m', algorithm: 'HS256' as const },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
