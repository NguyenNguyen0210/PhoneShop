import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// M8: precomputed bcrypt hash used for dummy compares on the login
// not-found/inactive path, so response timing does not reveal whether an
// account exists. (Hash of "dummy-password-never-matches" at cost 10.)
const DUMMY_BCRYPT_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Find the default USER role
    let userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      userRole = await this.prisma.role.create({
        data: { name: 'USER', description: 'Standard User Role' },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roles: {
          create: [{ roleId: userRole.id }],
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Quý khách',
      );
    } catch (emailErr) {
      this.logger.warn(
        `Failed to send welcome email to ${user.email}: ${(emailErr as Error).message}`,
      );
    }

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async refreshToken(user: any, dto: RefreshTokenDto) {
    // Rotation: revoke exactly the presented token (matched by deterministic hash).
    const tokenHash = this.hashToken(dto.refreshToken);
    const revoked = await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (revoked.count === 0) {
      // Unknown or already-used token presented → possible theft/reuse.
      // Containment: revoke all of this user's sessions and force re-login.
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Generate new tokens
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });

    return this.generateTokens(fullUser);
  }

  getGoogleAuthUrl(): { url: string; state: string } {
    const clientId =
      this.configService.get<string>('ExternalAuth__Google__ClientId') ||
      this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      '';
    const redirectUri =
      this.configService.get<string>('ExternalAuth__RedirectUri') ||
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      'http://localhost:5173/auth/oauth/callback';

    // P7: signed OAuth state (login-CSRF protection). The SPA stores it in
    // sessionStorage and echoes it back with the code; googleLogin() rejects
    // anything that was not minted here within the last 10 minutes.
    const state = this.jwtService.sign(
      {
        purpose: 'oauth-state',
        nonce: randomBytes(16).toString('hex'),
      },
      {
        secret: this.requireSecret('JWT_SECRET'),
        expiresIn: '10m',
        algorithm: 'HS256',
      },
    );

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: redirectUri,
      client_id: clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options);
    return { url: `${rootUrl}?${qs.toString()}`, state };
  }

  async googleLogin(code: string, state?: string) {
    // P7: state is mandatory — a callback without a server-minted state is a
    // textbook login-CSRF attempt (attacker planting their Google code in a
    // victim's browser).
    if (!state) {
      throw new UnauthorizedException('Thiếu tham số state — yêu cầu đăng nhập không hợp lệ');
    }
    try {
      const decoded: any = this.jwtService.verify(state, {
        secret: this.requireSecret('JWT_SECRET'),
        algorithms: ['HS256'],
      });
      if (decoded?.purpose !== 'oauth-state') {
        throw new Error('bad purpose');
      }
    } catch {
      throw new UnauthorizedException('Tham số state không hợp lệ hoặc đã hết hạn — vui lòng thử đăng nhập lại');
    }

    const clientId =
      this.configService.get<string>('ExternalAuth__Google__ClientId') ||
      this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      '';
    const clientSecret =
      this.configService.get<string>('ExternalAuth__Google__ClientSecret') ||
      this.configService.get<string>('GOOGLE_CLIENT_SECRET') ||
      '';
    const redirectUri =
      this.configService.get<string>('ExternalAuth__RedirectUri') ||
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      'http://localhost:5173/auth/oauth/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured properly on the server');
    }

    // 1. Exchange authorization code for tokens
    let tokenData: any;
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      tokenData = await tokenResponse.json();
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Xác thực mã Google không thành công');
    }

    // 2. Fetch user profile from Google
    let googleUser: any;
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new Error('Failed to fetch Google user info');
      }

      googleUser = await userRes.json();
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Không thể lấy thông tin tài khoản Google');
    }

    if (!googleUser.email) {
      throw new BadRequestException('Tài khoản Google không có thông tin email khả dụng');
    }

    // P7: only link verified Google emails. (Google verifies at account
    // creation, so this is defense-in-depth — one line, zero UX cost.)
    if (googleUser.email_verified === false) {
      throw new BadRequestException('Email Google chưa được xác thực — vui lòng xác thực email rồi thử lại');
    }

    // 3. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (user) {
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
      }

      // Update last login and avatar with Google picture
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: googleUser.picture || user.avatarUrl || null,
          emailVerified: true,
        },
        include: {
          roles: { include: { role: true } },
        },
      });
    } else {
      // Find or create USER role
      let userRole = await this.prisma.role.findUnique({
        where: { name: 'USER' },
      });

      if (!userRole) {
        userRole = await this.prisma.role.create({
          data: { name: 'USER', description: 'Standard User Role' },
        });
      }

      // Generate random secure password for OAuth user
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          passwordHash: hashedPassword,
          firstName: googleUser.given_name || googleUser.name || 'Google',
          lastName: googleUser.family_name || 'User',
          avatarUrl: googleUser.picture || null,
          emailVerified: true,
          roles: {
            create: [{ roleId: userRole.id }],
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      });
    }

    return this.generateTokens(user);
  }

  private requireSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
    // M12: fail closed — the strategies already throw at boot, this guards
    // direct sign() calls from ever minting with a default secret.
    const secret = this.configService.get<string>(key);
    if (!secret) {
      throw new Error(`FATAL: ${key} must be set (refusing to use default secret)`);
    }
    return secret;
  }

  private async generateTokens(user: any) {
    const roles = user.roles?.map((ur) => ur.role.name) || [];
    const payload = { email: user.email, sub: user.id, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.requireSecret('JWT_SECRET'),
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const refreshTokenString = this.jwtService.sign(payload, {
      secret: this.requireSecret('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
      algorithm: 'HS256',
    });

    // Hash refresh token for storage
    const hashedRefreshToken = this.hashToken(refreshTokenString);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        avatar: user.avatarUrl || null,
        roles,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: "${normalizedEmail}". No email will be sent. (If testing, register this email first)`,
      );
      return {
        success: true,
        message:
          'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.',
      };
    }

    // Invalidate existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    const recipientName = user.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : undefined;

    await this.emailService.sendPasswordResetEmail(user.email, resetLink, recipientName);

    return {
      success: true,
      message:
        'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.',
    };
  }

  async verifyResetToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token không hợp lệ');
    }

    const tokenHash = this.hashToken(token);
    const resetTokenRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!resetTokenRecord || !resetTokenRecord.user) {
      throw new BadRequestException(
        'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    const maskedEmail = this.maskEmail(resetTokenRecord.user.email);
    return {
      valid: true,
      email: maskedEmail,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token || typeof dto.token !== 'string') {
      throw new BadRequestException('Token không hợp lệ');
    }

    const tokenHash = this.hashToken(dto.token);
    const resetTokenRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetTokenRecord) {
      throw new BadRequestException('Liên kết đã hết hạn hoặc không hợp lệ');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update user's password
    await this.prisma.user.update({
      where: { id: resetTokenRecord.userId },
      data: { passwordHash },
    });

    // Mark the reset token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all active refresh tokens for the user
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: resetTokenRecord.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  private hashToken(token: string): string {
    // Deterministic SHA-256 hex so the stored hash can be looked up for
    // rotation/reuse detection. Refresh JWTs are high-entropy (32+ chars),
    // so a fast hash is appropriate here — bcrypt's random salt would make
    // equality lookup impossible. bcrypt is still used for passwords.
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
