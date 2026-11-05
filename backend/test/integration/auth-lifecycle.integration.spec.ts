import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const url = process.env.TEST_DATABASE_URL;
const integration = url ? describe : describe.skip;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

integration('Auth lifecycle against real PostgreSQL', () => {
  let db: PrismaService;
  let auth: AuthService;
  let user: any;
  let email: { sendPasswordResetEmail: jest.Mock };
  let links: string[];
  const rawToken = (link: string) => new URL(link).searchParams.get('token')!;

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/_(test|ci|audit)$/.test(target.pathname)) {
      throw new Error('Auth integration requires a local disposable database ending _test, _ci or _audit');
    }
    db = new PrismaService(new ConfigService({ DATABASE_URL: url }));
    await db.$connect();
  });
  afterAll(async () => { await db?.$disconnect(); });
  beforeEach(async () => {
    user = await db.user.create({ data: { email: `${randomUUID()}@test.invalid`, passwordHash: 'original' } });
    links = [];
    email = { sendPasswordResetEmail: jest.fn(async (_to, link) => { links.push(link); }) };
    auth = new AuthService(db, {} as any, new ConfigService({ FRONTEND_URL: 'https://example.test' }), email as any);
  });
  afterEach(async () => { if (user) await db.user.delete({ where: { id: user.id } }); });
  const requestLink = () => auth.forgotPassword({ email: user.email });

  it('leaves exactly one usable token after simultaneous requests', async () => {
    await Promise.all(Array.from({ length: 8 }, requestLink));
    const active = await db.passwordResetToken.findMany({ where: { userId: user.id, usedAt: null } });
    expect(active).toHaveLength(1);
    const valid = await Promise.allSettled(links.map((link) => auth.verifyResetToken(rawToken(link))));
    expect(valid.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(active[0].tokenHash).toHaveLength(64);
    expect(links.some((link) => rawToken(link) === active[0].tokenHash)).toBe(false);
  });

  it('allows only one of two simultaneous resets and revokes refresh sessions', async () => {
    await requestLink();
    const token = rawToken(links[0]);
    await db.refreshToken.create({ data: { userId: user.id, tokenHash: 'session', expiresAt: new Date(Date.now() + 60000) } });
    const results = await Promise.allSettled([
      auth.resetPassword({ token, newPassword: 'firstPassword' }),
      auth.resetPassword({ token, newPassword: 'secondPassword' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const winningPassword = results[0].status === 'fulfilled' ? 'firstPassword' : 'secondPassword';
    expect(await bcrypt.compare(winningPassword, saved.passwordHash)).toBe(true);
    expect(await db.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    await expect(auth.verifyResetToken(token)).rejects.toThrow();
  });

  it('preserves the previous usable link if SMTP rejects a replacement', async () => {
    await requestLink();
    const token = rawToken(links[0]);
    email.sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP failure'));
    await expect(requestLink()).resolves.toMatchObject({ success: true });
    await expect(auth.verifyResetToken(token)).resolves.toMatchObject({ valid: true });
    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it('does not let delayed older delivery replace a newer link', async () => {
    const started = deferred();
    const release = deferred();
    email.sendPasswordResetEmail.mockImplementationOnce(async (_to, link) => {
      links.push(link);
      started.resolve();
      await release.promise;
    });
    const older = requestLink();
    try {
      await started.promise;
      // Make ordering explicit even on databases with millisecond timestamps.
      await db.passwordResetToken.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(Date.now() - 1000) } });
      await requestLink();
    } finally { release.resolve(); await older; }
    await expect(auth.verifyResetToken(rawToken(links[0]))).rejects.toThrow();
    await expect(auth.verifyResetToken(rawToken(links[1]))).resolves.toMatchObject({ valid: true });
  });

  it('cannot reactivate an in-flight link after a successful password reset', async () => {
    await requestLink();
    const workingToken = rawToken(links[0]);
    const started = deferred();
    const release = deferred();
    email.sendPasswordResetEmail.mockImplementationOnce(async (_to, link) => {
      links.push(link);
      started.resolve();
      await release.promise;
    });
    const pending = requestLink();
    try {
      await started.promise;
      await auth.resetPassword({ token: workingToken, newPassword: 'newSecret123' });
    } finally { release.resolve(); await pending; }
    await expect(auth.verifyResetToken(rawToken(links[1]))).rejects.toThrow();
    expect(await db.passwordResetToken.count({ where: { userId: user.id, usedAt: null } })).toBe(0);
  });

  it('rejects a disabled account even when its link has not expired', async () => {
    await requestLink();
    const token = rawToken(links[0]);
    await db.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } });
    await expect(auth.verifyResetToken(token)).rejects.toThrow();
    await expect(auth.resetPassword({ token, newPassword: 'newSecret123' })).rejects.toThrow();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe('original');
  });

  it('rejects expired links without modifying the password', async () => {
    await requestLink();
    const token = rawToken(links[0]);
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex') },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await expect(auth.verifyResetToken(token)).rejects.toThrow();
    await expect(auth.resetPassword({ token, newPassword: 'newSecret123' })).rejects.toThrow();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe('original');
  });

  it('rechecks expiration after reading the token and before changing the password', async () => {
    await requestLink();
    const token = rawToken(links[0]);
    const locked = deferred();
    const tokenRead = deferred();
    const observedDb = {
      passwordResetToken: {
        findFirst: async (args: any) => {
          const record = await db.passwordResetToken.findFirst(args);
          tokenRead.resolve();
          return record;
        },
      },
      $transaction: db.$transaction.bind(db),
    };
    const resettingAuth = new AuthService(observedDb as any, {} as any, {} as any, {} as any);
    const blocker = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      locked.resolve();
      await tokenRead.promise;
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1) },
      });
    });
    await locked.promise;
    const outcome = Promise.allSettled([resettingAuth.resetPassword({ token, newPassword: 'newSecret123' })]);
    await blocker;
    expect((await outcome)[0].status).toBe('rejected');
    const savedToken = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(savedToken.usedAt).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe('original');
  });
});
