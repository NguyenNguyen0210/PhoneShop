import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Google OAuth sign-in', () => {
  const clientId = 'test-client.apps.googleusercontent.com';
  const activeUser = {
    id: 'user-1',
    email: 'member@example.com',
    status: 'ACTIVE',
    avatarUrl: null,
    roles: [{ role: { name: 'USER' } }],
  };

  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let settings: Record<string, string>;

  const googleTokenInfo = (overrides: Record<string, unknown> = {}) => ({
    aud: clientId,
    iss: 'https://accounts.google.com',
    sub: 'google-subject-1',
    exp: String(Math.floor(Date.now() / 1000) + 3600),
    email: 'member@example.com',
    email_verified: 'true',
    ...overrides,
  });

  const okResponse = (body: unknown) =>
    ({ ok: true, json: jest.fn().mockResolvedValue(body) }) as unknown as Response;

  beforeEach(() => {
    settings = {
      JWT_SECRET: 'unit-test-secret',
      FRONTEND_URL: 'http://localhost:5173',
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: 'unit-test-client-secret',
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(activeUser),
        update: jest.fn().mockResolvedValue(activeUser),
      },
    };
    jwt = {
      sign: jest.fn().mockReturnValue('signed-state'),
      verify: jest.fn().mockReturnValue({ purpose: 'oauth-state' }),
    };
    service = new AuthService(
      prisma,
      jwt,
      { get: (key: string) => settings[key] } as any,
      {} as any,
    );
    jest.spyOn(service as any, 'generateTokens').mockResolvedValue({ accessToken: 'app-jwt' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('requests only openid, email and profile without offline access or forced consent', () => {
    const { url, state } = service.getGoogleAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')).toBe('openid email profile');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('access_type')).toBeNull();
    expect(params.get('prompt')).toBeNull();
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe('http://localhost:5173/auth/oauth/callback');
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'oauth-state', nonce: expect.any(String) }),
      expect.objectContaining({ expiresIn: '10m', algorithm: 'HS256' }),
    );
  });

  it('requires a configured Google client ID before creating a sign-in URL', () => {
    delete settings.GOOGLE_CLIENT_ID;
    expect(() => service.getGoogleAuthUrl()).toThrow(BadRequestException);
  });

  it('requires a signed state in authorization code callbacks', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(service.googleLogin('auth-code')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a tampered or expired state before exchanging a code', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    jwt.verify.mockImplementation(() => { throw new Error('invalid state'); });
    await expect(service.googleLogin('auth-code', 'tampered-state'))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts a signed callback and a Google-verified email', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(okResponse({ access_token: 'google-access-token' }))
      .mockResolvedValueOnce(okResponse({
        email: activeUser.email,
        email_verified: true,
        given_name: 'Test',
      }));

    await expect(service.googleLogin('auth-code', 'signed-state'))
      .resolves.toEqual({ accessToken: 'app-jwt' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('rejects an unverified email in the authorization code flow', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(okResponse({ access_token: 'google-access-token' }))
      .mockResolvedValueOnce(okResponse({ email: activeUser.email, email_verified: false }));

    await expect(service.googleLogin('auth-code', 'signed-state'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires a Google client ID before verifying a popup credential', async () => {
    delete settings.GOOGLE_CLIENT_ID;
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(service.googleLoginWithCredential('google-id-token'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong audience', { aud: 'other-client.apps.googleusercontent.com' }],
    ['wrong issuer', { iss: 'https://untrusted.example.com' }],
    ['expired token', { exp: String(Math.floor(Date.now() / 1000) - 10) }],
    ['missing subject', { sub: undefined }],
  ])('rejects a popup credential with %s', async (_reason, overrides) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(googleTokenInfo(overrides)));

    await expect(service.googleLoginWithCredential('google-id-token'))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects popup credentials with an unverified email', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      okResponse(googleTokenInfo({ email_verified: 'false' })),
    );

    await expect(service.googleLoginWithCredential('google-id-token'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('accepts a valid popup credential for the configured app', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(googleTokenInfo()));

    await expect(service.googleLoginWithCredential('google-id-token'))
      .resolves.toEqual({ accessToken: 'app-jwt' });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
