import { ValidationPipe } from '@nestjs/common';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { ForgotPasswordDto } from '../src/modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../src/modules/auth/dto/reset-password.dto';
import { ChangePasswordDto } from '../src/modules/users/dto/change-password.dto';
import { CreateUserDto } from '../src/modules/users/dto/create-user.dto';

// Exercise the same transformation and validation boundary as real HTTP calls.
const pipe = new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const body = (metatype: any, value: object) => pipe.transform(value, { type: 'body', metatype });
const registration = {
  email: 'member@example.com', password: 'secret123', firstName: 'Nguyen', lastName: 'An', phone: '0901234567',
};

describe('Auth HTTP input validation', () => {
  it.each([RegisterDto, LoginDto, ForgotPasswordDto])('normalizes padded mixed-case email for %p', async (dto) => {
    const data = dto === RegisterDto ? registration : dto === LoginDto ? { password: 'secret123' } : {};
    const result = await body(dto, { ...data, email: '  Member@Example.COM  ' });
    expect(result.email).toBe('member@example.com');
  });

  it.each(['', ' ', 'invalid', null, ['member@example.com']])('rejects invalid email %p', async (email) => {
    await expect(body(ForgotPasswordDto, { email })).rejects.toThrow();
  });

  it.each(['firstName', 'lastName'])('rejects whitespace-only %s', async (field) => {
    await expect(body(RegisterDto, { ...registration, [field]: ' \t ' })).rejects.toThrow();
  });

  it.each(['abc', '123', '090123456789', '0000000000', '090 123 4567'])('rejects invalid phone %p', async (phone) => {
    await expect(body(RegisterDto, { ...registration, phone })).rejects.toThrow();
  });

  it.each(['0901234567', '+84901234567'])('accepts a Vietnamese phone %p', async (phone) => {
    await expect(body(RegisterDto, { ...registration, phone })).resolves.toBeDefined();
  });

  it.each(['      ', 'short', 'a'.repeat(73), '\u00e9'.repeat(37)])('rejects unsafe password %p on every password-writing DTO', async (password) => {
    for (const [dto, data] of [
      [RegisterDto, { ...registration, password }],
      [CreateUserDto, { ...registration, password }],
      [ResetPasswordDto, { token: 'a'.repeat(64), newPassword: password }],
      [ChangePasswordDto, { oldPassword: 'oldSecret', newPassword: password }],
    ] as const) {
      await expect(body(dto, data)).rejects.toThrow();
    }
  });

  it('preserves intentional password whitespace and accepts exactly 72 UTF-8 bytes', async () => {
    const password = ' ' + '\u00e9'.repeat(35) + ' ';
    expect((await body(RegisterDto, { ...registration, password })).password).toBe(password);
  });

  it('rejects malformed reset token and unexpected fields', async () => {
    await expect(body(ResetPasswordDto, { token: 'bad', newPassword: 'secret123' })).rejects.toThrow();
    await expect(body(RegisterDto, { ...registration, roles: ['ADMIN'] })).rejects.toThrow();
  });
});
