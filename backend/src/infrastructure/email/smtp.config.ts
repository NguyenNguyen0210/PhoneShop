import { ConfigService } from '@nestjs/config';

interface SmtpOverrides {
  host?: string;
  port?: number | string;
  secure?: boolean | string;
  user?: string;
  pass?: string;
  from?: string;
}

const clean = (value: unknown): string =>
  String(value ?? '').trim().replace(/^["']|["']$/g, '');

export function resolveSmtpConfig(config: ConfigService, overrides: SmtpOverrides = {}) {
  const host = clean(overrides.host || config.get('EMAIL_HOST')) || 'smtp.resend.com';
  const port = Number(clean(overrides.port ?? config.get('EMAIL_PORT'))) || 2465;
  const secure = [465, 2465].includes(port) ||
    clean(overrides.secure ?? config.get('EMAIL_SECURE')) === 'true';
  const user = clean(overrides.user || config.get('EMAIL_USER')) || 'resend';
  const pass = clean(overrides.pass || config.get('EMAIL_PASS'));
  const from = clean(overrides.from || config.get('EMAIL_FROM')) ||
    'PhoneShop <no-reply@example.com>';
  return { host, port, secure, user, pass, from };
}

export function smtpTransportOptions(config: ReturnType<typeof resolveSmtpConfig>) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
}
