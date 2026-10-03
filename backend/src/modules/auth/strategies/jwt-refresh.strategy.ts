import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // M12: fail closed on missing secret + pin HS256 (see jwt.strategy.ts).
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('FATAL: JWT_REFRESH_SECRET must be set (refusing to use default secret)');
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body.refreshToken;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Bind the presented token to its exact stored row (deterministic SHA-256
    // hash, matching AuthService.hashToken). Never accept "any valid row".
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    return { ...user, refreshToken };
  }
}
