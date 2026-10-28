// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ensureFreshAccessToken } from '../apiClient';

vi.mock('axios', () => {
  const post = vi.fn();
  const use = vi.fn();
  const instance = {
    interceptors: { request: { use }, response: { use } },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { default: { create: () => instance, post } };
});

const mockedPost = () => vi.mocked(axios.post);

const makeJwt = (expSec: number) =>
  `h.${btoa(JSON.stringify({ exp: expSec }))}.s`;

describe('ensureFreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should refresh when access token is expired', async () => {
    localStorage.setItem('phoneshop_access_token', makeJwt(Math.floor(Date.now() / 1000) - 10));
    localStorage.setItem('phoneshop_refresh_token', 'refresh-123');
    mockedPost().mockResolvedValueOnce({
      data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
    });

    await ensureFreshAccessToken();

    expect(mockedPost()).toHaveBeenCalledOnce();
    expect(localStorage.getItem('phoneshop_access_token')).toBe('new-access');
    expect(localStorage.getItem('phoneshop_refresh_token')).toBe('new-refresh');
  });

  it('should not refresh when access token is still valid', async () => {
    localStorage.setItem('phoneshop_access_token', makeJwt(Math.floor(Date.now() / 1000) + 3600));
    localStorage.setItem('phoneshop_refresh_token', 'refresh-123');

    await ensureFreshAccessToken();

    expect(mockedPost()).not.toHaveBeenCalled();
  });

  it('should do nothing when tokens are missing', async () => {
    await ensureFreshAccessToken();

    expect(mockedPost()).not.toHaveBeenCalled();
  });

  it('joins the in-flight refresh so concurrent proactive calls hit the endpoint once (E9)', async () => {
    localStorage.setItem('phoneshop_access_token', makeJwt(Math.floor(Date.now() / 1000) - 10));
    localStorage.setItem('phoneshop_refresh_token', 'refresh-123');

    let resolvePost!: (value: unknown) => void;
    mockedPost().mockImplementationOnce(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );

    const p1 = ensureFreshAccessToken();
    const p2 = ensureFreshAccessToken();
    resolvePost({ data: { data: { accessToken: 'a2', refreshToken: 'r2' } } });
    await Promise.all([p1, p2]);

    expect(mockedPost()).toHaveBeenCalledOnce();
    expect(localStorage.getItem('phoneshop_access_token')).toBe('a2');
    expect(localStorage.getItem('phoneshop_refresh_token')).toBe('r2');
  });

  it('rejects every concurrent caller with a single failed refresh request (E9)', async () => {
    localStorage.setItem('phoneshop_access_token', makeJwt(Math.floor(Date.now() / 1000) - 10));
    localStorage.setItem('phoneshop_refresh_token', 'refresh-123');

    let rejectPost!: (reason?: unknown) => void;
    mockedPost().mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectPost = reject; })
    );

    const p1 = ensureFreshAccessToken();
    const p2 = ensureFreshAccessToken();
    rejectPost(new Error('invalid refresh token'));

    await expect(p1).rejects.toThrow('invalid refresh token');
    await expect(p2).rejects.toThrow('invalid refresh token');
    expect(mockedPost()).toHaveBeenCalledOnce();
  });
});
