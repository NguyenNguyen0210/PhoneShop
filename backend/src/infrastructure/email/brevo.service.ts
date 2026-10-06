import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface BrevoSendOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

type FetchFn = (
  url: string,
  init?: Record<string, any>,
) => Promise<{ ok: boolean; status?: number; json?: () => Promise<any>; text?: () => Promise<string> }>;

/**
 * Brevo transactional sender via POST /v3/smtp/email (no extra npm dep —
 * uses global fetch; auth = `api-key` header with BREVO_API_KEY).
 * Missing key → mock mode (log only), same contract as other senders.
 * Free plan: 300 emails/day. The sender address must be validated under
 * Brevo > Senders & IP, otherwise the API rejects with 401/400.
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
    // @Optional: Nest DI injects undefined (no Function provider);
    // tests / manual wiring can still pass a custom fetch.
    @Optional() private readonly fetchFn?: FetchFn,
  ) {}

  private clean(val?: string | null): string {
    return (val ?? '').trim().replace(/^["']|["']$/g, '');
  }

  async getResolvedConfig(): Promise<{ apiKey: string; from: string }> {
    let dbKey: string | undefined;
    let dbFrom: string | undefined;

    if (this.prisma) {
      try {
        const records = await this.prisma.systemSetting.findMany({
          where: { group: { equals: 'EMAIL', mode: 'insensitive' } },
        });
        for (const rec of records) {
          if (rec.key === 'BREVO_API_KEY') dbKey = rec.value;
          if (rec.key === 'EMAIL_FROM') dbFrom = rec.value;
        }
      } catch {
        // Fallback to env when DB is unreachable.
      }
    }

    const apiKey = this.clean(dbKey || this.config.get<string>('BREVO_API_KEY'));
    const from =
      this.clean(dbFrom || this.config.get<string>('EMAIL_FROM')) ||
      'Phone Shop <no-reply@phoneshop.vn>';

    return { apiKey, from };
  }

  async isConfigured(): Promise<boolean> {
    const { apiKey } = await this.getResolvedConfig();
    return Boolean(apiKey);
  }

  parseSender(from: string): { email: string; name?: string } {
    const match = from.match(/^(.*)<([^<>]+)>$/);
    if (match) {
      const name = match[1].trim().replace(/^["']|["']$/g, '');
      const email = match[2].trim();
      return name ? { email, name } : { email };
    }
    return { email: from.trim() };
  }

  async send(options: BrevoSendOptions): Promise<{ mocked: boolean }> {
    const { apiKey, from } = await this.getResolvedConfig();

    if (!apiKey) {
      this.logger.log(
        `[BREVO MOCK] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | Subject: ${options.subject}`,
      );
      return { mocked: true };
    }

    const sender = this.parseSender(options.from || from);
    const to = (Array.isArray(options.to) ? options.to : [options.to])
      .map((email) => String(email).trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    const fetchFn = this.fetchFn ?? (globalThis.fetch as unknown as FetchFn);
    const response = await fetchFn('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
        to,
        subject: options.subject,
        ...(options.text ? { textContent: options.text } : {}),
        ...(options.html ? { htmlContent: options.html } : {}),
      }),
    });

    if (!response.ok) {
      const detail =
        typeof response.text === 'function' ? await response.text() : '';
      throw new Error(
        `Brevo API error${response.status ? ` (${response.status})` : ''}${detail ? `: ${detail}` : ''}`,
      );
    }

    this.logger.log(`Brevo email sent to ${options.to}: ${options.subject}`);
    return { mocked: false };
  }
}
