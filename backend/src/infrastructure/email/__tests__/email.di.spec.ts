import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';
import { BrevoService } from '../brevo.service';
import { PrismaService } from '../../../prisma/prisma.service';

// Guards the UnknownDependenciesException regression: provider constructor
// params must be resolvable by real Nest DI (ts-jest emits decorator
// metadata, plain tsx does not — so this test boots a real container).
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: (k: string, d?: any) => (k === 'EMAIL_PROVIDER' ? 'brevo' : d),
      },
    },
    {
      provide: PrismaService,
      useValue: { systemSetting: { findMany: async () => [] } },
    },
    BrevoService,
    EmailService,
  ],
})
class EmailTestModule {}

describe('Email Nest DI', () => {
  it('resolves EmailService with BrevoService through the container', async () => {
    const ctx = await NestFactory.createApplicationContext(EmailTestModule, {
      logger: false,
    });
    try {
      const email = ctx.get(EmailService);
      expect(email).toBeDefined();
      // No BREVO_API_KEY configured -> Brevo mock path, no network.
      await email.send({ to: 'a@b.vn', subject: 'di', html: '<p>x</p>' });
    } finally {
      await ctx.close();
    }
  });
});
