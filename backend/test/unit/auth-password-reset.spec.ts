import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

describe('Auth Password Reset & Forgot Password Unit Tests', () => {
  let authService: AuthService;
  let authController: AuthController;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return defaultValue;
      }),
    };

    mockEmailService = {
      sendPasswordResetEmail: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    authService = new AuthService(
      mockPrisma,
      mockJwtService,
      mockConfigService,
      mockEmailService,
    );

    authController = new AuthController(authService);
  });

  describe('AuthService - forgotPassword', () => {
    it('should create a hashed token and send reset email when user exists', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'customer@example.com',
        firstName: 'Nguyen',
        lastName: 'Van A',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'token-uuid-1' });

      const res = await authService.forgotPassword({ email: 'Customer@example.com ' });

      expect(res.success).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'customer@example.com' },
      });
      // Should invalidate previous unused tokens
      expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      // Should create new reset token record with 15m expiration
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      // Should send email with link
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'customer@example.com',
        expect.stringMatching(/^http:\/\/localhost:5173\/reset-password\?token=[a-f0-9]{64}$/),
        'Nguyen Van A',
      );
    });

    it('should return success and NOT send email when user does not exist (anti-enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await authService.forgotPassword({ email: 'nonexistent@example.com' });

      expect(res.success).toBe(true);
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('AuthService - verifyResetToken', () => {
    it('should return valid true and masked email when token is valid and unexpired', async () => {
      const rawToken = 'sample-valid-token-1234567890';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-id-1',
        tokenHash: expectedHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
        user: {
          id: 'user-id-1',
          email: 'nguyenvanan@gmail.com',
        },
      });

      const res = await authService.verifyResetToken(rawToken);

      expect(res.valid).toBe(true);
      expect(res.email).toBe('ng***@gmail.com');
      expect(mockPrisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: expectedHash,
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        include: {
          user: true,
        },
      });
    });

    it('should throw BadRequestException if token is empty or invalid string', async () => {
      await expect(authService.verifyResetToken('')).rejects.toThrow(BadRequestException);
      await expect(authService.verifyResetToken(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token not found, expired, or already used', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(authService.verifyResetToken('expired-or-invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('AuthService - resetPassword', () => {
    it('should hash new password, update user, mark token used, and revoke sessions', async () => {
      const rawToken = 'valid-token-for-reset';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-rec-1',
        userId: 'user-rec-1',
        tokenHash: expectedHash,
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-rec-1' });
      mockPrisma.passwordResetToken.update.mockResolvedValue({ id: 'token-rec-1' });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const res = await authService.resetPassword({
        token: rawToken,
        newPassword: 'MyNewSecurePassword123',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: expectedHash,
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });

      // Verify user update with bcrypt hash
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-rec-1' },
        data: {
          passwordHash: expect.any(String),
        },
      });
      const updatedHash = mockPrisma.user.update.mock.calls[0][0].data.passwordHash;
      const isMatch = await bcrypt.compare('MyNewSecurePassword123', updatedHash);
      expect(isMatch).toBe(true);

      // Verify token marked used
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-rec-1' },
        data: { usedAt: expect.any(Date) },
      });

      // Verify refresh tokens revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-rec-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException if token is missing or invalid', async () => {
      await expect(
        authService.resetPassword({ token: '', newPassword: 'password123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token record is not found or expired', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'invalid-or-expired-token',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AuthController - Endpoints', () => {
    it('forgotPassword should call authService.forgotPassword', async () => {
      const spy = jest
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue({ success: true, message: 'Sent' });

      const dto = { email: 'user@example.com' };
      const result = await authController.forgotPassword(dto);

      expect(spy).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'Sent' });
    });

    it('verifyResetToken should call authService.verifyResetToken', async () => {
      const spy = jest
        .spyOn(authService, 'verifyResetToken')
        .mockResolvedValue({ valid: true, email: 'us***@example.com' });

      const result = await authController.verifyResetToken('test-token');

      expect(spy).toHaveBeenCalledWith('test-token');
      expect(result).toEqual({ valid: true, email: 'us***@example.com' });
    });

    it('resetPassword should call authService.resetPassword', async () => {
      const spy = jest
        .spyOn(authService, 'resetPassword')
        .mockResolvedValue({ success: true, message: 'Password reset successful' });

      const dto = { token: 'test-token', newPassword: 'newSecretPassword' };
      const result = await authController.resetPassword(dto);

      expect(spy).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, message: 'Password reset successful' });
    });
  });
});
