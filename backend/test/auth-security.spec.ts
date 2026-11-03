import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/infrastructure/email/email.service';

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
      },
    };

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
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });
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
  });
});
