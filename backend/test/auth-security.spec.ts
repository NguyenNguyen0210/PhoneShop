import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/infrastructure/email/email.service';
import { JwtRefreshStrategy } from '../src/modules/auth/strategies/jwt-refresh.strategy';

describe('AuthService Security & ForgotPassword', () => {
  let authService: AuthService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ status: 'ACTIVE' }]),
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));

    emailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:5173';
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should return generic success message when email does NOT exist (No User Enumeration)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await authService.forgotPassword({ email: 'nonexistent@example.com' });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('hướng dẫn đặt lại mật khẩu đã được gửi');
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('should return generic success message when user is INACTIVE/BANNED', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-banned',
      email: 'banned@example.com',
      status: 'BANNED',
    });

    const result = await authService.forgotPassword({ email: 'banned@example.com' });

    expect(result.success).toBe(true);
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('should create reset token and send email when email exists and user is ACTIVE', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'active@example.com',
      firstName: 'Nguyen',
      status: 'ACTIVE',
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.passwordResetToken.create.mockResolvedValue({
      id: 'token-1', createdAt: new Date(), usedAt: new Date(0),
    });
    emailService.sendPasswordResetEmail.mockResolvedValue(true);

    const result = await authService.forgotPassword({ email: 'active@example.com' });

    expect(result.success).toBe(true);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
        }),
      }),
    );
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'active@example.com',
      expect.stringContaining('/reset-password?token='),
      'Nguyen',
    );
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
  });

  it('keeps old links valid and returns the generic response if SMTP fails', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'active@example.com', status: 'ACTIVE' });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'pending' });
    emailService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP unavailable'));

    const result = await authService.forgotPassword({ email: 'active@example.com' });
    expect(result.success).toBe(true);
    expect(prisma.passwordResetToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: 'pending', usedAt: { not: null } },
    });
  });

  it('does not activate a link when a newer request already succeeded', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'active@example.com', status: 'ACTIVE' });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'older', createdAt: new Date(), usedAt: new Date(0) });
    prisma.passwordResetToken.findFirst.mockResolvedValue({ id: 'newer' });
    await authService.forgotPassword({ email: 'active@example.com' });
    expect(prisma.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });

  it('does not activate an email link if the user was disabled during delivery', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'active@example.com', status: 'ACTIVE' });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'pending' });
    prisma.$queryRaw.mockResolvedValue([{ status: 'BANNED' }]);
    await authService.forgotPassword({ email: 'active@example.com' });
    expect(prisma.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });

  it('does not revoke working links if activation lost a race to a password reset', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'active@example.com', status: 'ACTIVE' });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'pending', usedAt: new Date(0), createdAt: new Date() });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    await authService.forgotPassword({ email: 'active@example.com' });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.passwordResetToken.updateMany.mock.calls[0][0].where.usedAt).toEqual(new Date(0));
  });
});

describe('Password reset validation and atomic consumption', () => {
  const token = 'a'.repeat(64);
  let service: AuthService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      passwordResetToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 'reset-1', userId: 'user-1', user: { status: 'ACTIVE', email: 'member@example.com' } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { update: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ status: 'ACTIVE' }]),
    };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    service = new AuthService(prisma, {} as any, {} as any, {} as any);
  });

  it.each(['', 'bad-token', 'a'.repeat(63), 'a'.repeat(65), 'G'.repeat(64), null, ['a']])(
    'rejects malformed token %p before accessing the database', async (value) => {
      await expect(service.verifyResetToken(value as any)).rejects.toThrow();
      await expect(service.resetPassword({ token: value as any, newPassword: 'secret123' })).rejects.toThrow();
      expect(prisma.passwordResetToken.findFirst).not.toHaveBeenCalled();
    },
  );

  it('rejects missing, expired or already consumed links', async () => {
    prisma.passwordResetToken.findFirst.mockResolvedValue(null);
    await expect(service.verifyResetToken(token)).rejects.toThrow();
    await expect(service.resetPassword({ token, newPassword: 'secret123' })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('only exposes a masked email for an active account', async () => {
    expect(await service.verifyResetToken(token)).toEqual({ valid: true, email: 'me***@example.com' });
    prisma.passwordResetToken.findFirst.mockResolvedValue({ user: { status: 'BANNED' } });
    await expect(service.verifyResetToken(token)).rejects.toThrow();
  });

  it('rejects an account disabled after the reset link was issued', async () => {
    prisma.$queryRaw.mockResolvedValue([{ status: 'BANNED' }]);
    await expect(service.resetPassword({ token, newPassword: 'secret123' })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a token consumed or expired while the password was being hashed', async () => {
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resetPassword({ token, newPassword: 'secret123' })).rejects.toThrow();
    const where = prisma.passwordResetToken.updateMany.mock.calls[0][0].where;
    expect(where.usedAt).toBeNull();
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('changes the password and invalidates all links and refresh sessions in one transaction', async () => {
    const result = await service.resetPassword({ token, newPassword: 'secret123' });
    expect(result.success).toBe(true);
    const hash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(await (await import('bcrypt')).compare('secret123', hash)).toBe(true);
    expect(prisma.passwordResetToken.updateMany).toHaveBeenLastCalledWith({
      where: { userId: 'user-1' }, data: { usedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('Refresh token account status', () => {
  it.each(['INACTIVE', 'BANNED', 'LOCKED'])('rejects refresh for %s accounts', async (status) => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status }) },
      refreshToken: { findFirst: jest.fn() },
    };
    const strategy = new JwtRefreshStrategy({ get: () => 'unit-test-secret' } as any, prisma as any);
    await expect(strategy.validate({ body: { refreshToken: 'token' } } as any, { sub: 'user-1' })).rejects.toThrow();
    expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
  });

  it('accepts an active account with a valid stored refresh token', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }) },
      refreshToken: { findFirst: jest.fn().mockResolvedValue({ id: 'refresh-1' }) },
    };
    const strategy = new JwtRefreshStrategy({ get: () => 'unit-test-secret' } as any, prisma as any);
    await expect(strategy.validate({ body: { refreshToken: 'token' } } as any, { sub: 'user-1' }))
      .resolves.toMatchObject({ id: 'user-1', refreshToken: 'token' });
  });
});
