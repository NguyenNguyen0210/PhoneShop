import 'dotenv/config';
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { EmailService } from '../../src/infrastructure/email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('Password Reset & Change Password Full-Flow Integration', () => {
  let prisma: PrismaService;
  let authService: AuthService;
  let usersService: UsersService;
  let emailServiceMock: { sendPasswordResetEmail: any; send: any };

  const testEmail = `verify_pw_${Date.now()}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const resetNewPassword = 'ResetSecretPassword456!';
  const changedPassword = 'ChangedFinalPassword789!';
  let userId: string;

  beforeAll(async () => {
    emailServiceMock = {
      sendPasswordResetEmail: jest.fn<any>().mockImplementation(() => Promise.resolve()),
      send: jest.fn<any>().mockImplementation(() => Promise.resolve()),
    };

    const configServiceMock = {
      get: jest.fn<any>((key: string, defaultVal?: string) => {
        if (key === 'DATABASE_URL') return process.env.DATABASE_URL;
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return defaultVal;
      }),
    } as unknown as ConfigService;

    prisma = new PrismaService(configServiceMock);
    await prisma.onModuleInit();

    const jwtServiceMock = new JwtService({ secret: 'test-jwt-secret' });

    authService = new AuthService(
      prisma,
      jwtServiceMock,
      configServiceMock,
      emailServiceMock as unknown as EmailService,
    );

    usersService = new UsersService(prisma);

    // Setup test user
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Nguyen',
        lastName: 'Tester',
        status: 'ACTIVE',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('1. should create token and send email with reset link when requesting forgot-password', async () => {
    const result = await authService.forgotPassword({ email: testEmail });
    expect(result.success).toBe(true);
    expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalled();

    // Check DB
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(tokenRecord).toBeDefined();

    // Check raw token in resetLink
    const emailCall = (emailServiceMock.sendPasswordResetEmail as any).mock.calls[0];
    const resetLink = emailCall[1];
    const rawToken = new URL(resetLink).searchParams.get('token')!;
    expect(rawToken).toBeDefined();

    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(tokenRecord!.tokenHash).toBe(expectedHash);
  });

  it('2. should verify reset token and return masked email', async () => {
    const emailCall = (emailServiceMock.sendPasswordResetEmail as any).mock.calls[0];
    const rawToken = new URL(emailCall[1]).searchParams.get('token')!;

    const verifyResult = await authService.verifyResetToken(rawToken);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.email).toContain('***@');
  });

  it('3. should reset password, mark token as used, and allow login only with new password', async () => {
    const emailCall = (emailServiceMock.sendPasswordResetEmail as any).mock.calls[0];
    const rawToken = new URL(emailCall[1]).searchParams.get('token')!;

    const resetResult = await authService.resetPassword({
      token: rawToken,
      newPassword: resetNewPassword,
    });
    expect(resetResult.success).toBe(true);

    // Verify token used
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(tokenRecord!.usedAt).toBeInstanceOf(Date);

    // Single-use check: reuse token should throw
    await expect(
      authService.resetPassword({ token: rawToken, newPassword: 'AnotherPassword!' }),
    ).rejects.toThrow();

    // Old password should fail
    await expect(
      authService.login({ email: testEmail, password: initialPassword }),
    ).rejects.toThrow();

    // New password should succeed
    const loginResult = await authService.login({ email: testEmail, password: resetNewPassword });
    expect(loginResult.accessToken).toBeDefined();
  });

  it('4. should change password via usersService.changePassword and verify login', async () => {
    // Wrong old password should fail
    await expect(
      usersService.changePassword(userId, {
        oldPassword: 'WrongPassword!',
        newPassword: changedPassword,
      }),
    ).rejects.toThrow();

    // Valid change password
    const changeResult = await usersService.changePassword(userId, {
      oldPassword: resetNewPassword,
      newPassword: changedPassword,
    });
    expect(changeResult.success).toBe(true);

    // Login with reset password should fail
    await expect(
      authService.login({ email: testEmail, password: resetNewPassword }),
    ).rejects.toThrow();

    // Login with final changed password should succeed
    const finalLogin = await authService.login({ email: testEmail, password: changedPassword });
    expect(finalLogin.accessToken).toBeDefined();
  });
});
