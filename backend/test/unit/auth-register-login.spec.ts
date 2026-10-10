import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { AuthService } from '../../src/modules/auth/auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('Auth Register & Login Unit Tests', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockEmailService: any;
  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await bcrypt.hash('CorrectPassword123!', 10);
  });

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-jwt-refresh-secret';
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return defaultValue;
      }),
    };

    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockImplementation(() => Promise.resolve()),
      sendPasswordResetEmail: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    authService = new AuthService(
      mockPrisma,
      mockJwtService,
      mockConfigService,
      mockEmailService,
    );
  });

  describe('AuthService - register', () => {
    it('should throw ConflictException with message containing "email này đã được đăng ký" when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@example.com',
      });

      const dto = {
        email: 'Existing@example.com ',
        password: 'Password123!',
        firstName: 'Nguyen',
        lastName: 'Van A',
        phone: '0901234567',
      };

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
      await expect(authService.register(dto)).rejects.toThrow(/email này đã được đăng ký/i);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException with message containing "số điện thoại này đã được sử dụng" when phone exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-2',
        phone: '0901234567',
      });

      const dto = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Nguyen',
        lastName: 'Van B',
        phone: '0901234567',
      };

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
      await expect(authService.register(dto)).rejects.toThrow(/số điện thoại này đã được sử dụng/i);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { phone: '0901234567' },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should register successfully when email and phone are unique', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'USER' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'unique@example.com',
        firstName: 'Nguyen',
        lastName: 'Van C',
        phone: '0912345678',
        roles: [{ role: { name: 'USER' } }],
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const dto = {
        email: 'Unique@example.com ',
        password: 'Password123!',
        firstName: 'Nguyen',
        lastName: 'Van C',
        phone: '0912345678',
      };

      const result = await authService.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('unique@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('AuthService - login', () => {
    it('should throw UnauthorizedException with message containing "tài khoản của bạn đã bị tạm khóa" when valid password but user.status === "LOCKED"', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-locked-id',
        email: 'locked@example.com',
        passwordHash: validPasswordHash,
        status: 'LOCKED',
        roles: [{ role: { name: 'USER' } }],
      });

      const dto = {
        email: 'locked@example.com',
        password: 'CorrectPassword123!',
      };

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(dto)).rejects.toThrow(/tài khoản của bạn đã bị tạm khóa/i);
    });

    it('should throw UnauthorizedException with message containing "không chính xác" when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-active-id',
        email: 'active@example.com',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        roles: [{ role: { name: 'USER' } }],
      });

      const dto = {
        email: 'active@example.com',
        password: 'WrongPassword!',
      };

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(dto)).rejects.toThrow(/không chính xác/i);
    });

    it('should throw UnauthorizedException with message containing "không chính xác" when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      };

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(dto)).rejects.toThrow(/không chính xác/i);
    });

    it('should throw UnauthorizedException when password is wrong even for LOCKED user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-locked-id',
        email: 'locked@example.com',
        passwordHash: validPasswordHash,
        status: 'LOCKED',
        roles: [{ role: { name: 'USER' } }],
      });

      const dto = {
        email: 'locked@example.com',
        password: 'WrongPassword!',
      };

      // Attacker should not learn account is locked without the correct password
      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(dto)).rejects.toThrow(/không chính xác/i);
    });

    it('should throw UnauthorizedException with message containing "chưa được kích hoạt hoặc đang tạm ngưng" when user is not ACTIVE and not LOCKED', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-inactive-id',
        email: 'inactive@example.com',
        passwordHash: validPasswordHash,
        status: 'INACTIVE',
        roles: [{ role: { name: 'USER' } }],
      });

      const dto = {
        email: 'inactive@example.com',
        password: 'CorrectPassword123!',
      };

      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(dto)).rejects.toThrow(/chưa được kích hoạt hoặc đang tạm ngưng/i);
    });

    it('should login successfully when credentials are correct and status is ACTIVE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-active-id',
        email: 'active@example.com',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        roles: [{ role: { name: 'USER' } }],
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-active-id' });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-active-1' });

      const dto = {
        email: 'active@example.com',
        password: 'CorrectPassword123!',
      };

      const result = await authService.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-active-id' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });
});
