import { registerDecorator, ValidationOptions } from 'class-validator';

// bcrypt ignores bytes after byte 72. Reject them rather than silently
// accepting different passwords as equivalent. Never trim a password.
export function IsSafePassword(options?: ValidationOptions) {
  return (target: object, propertyName: string) => registerDecorator({
    name: 'isSafePassword',
    target: target.constructor,
    propertyName,
    options,
    validator: {
      validate: (value: unknown) => typeof value === 'string' &&
        /\S/u.test(value) && Buffer.byteLength(value, 'utf8') <= 72,
      defaultMessage: () => 'Mật khẩu không được chỉ chứa khoảng trắng và không được vượt quá 72 byte UTF-8',
    },
  });
}
