// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

const { getResponseErrorHandler, setResponseErrorHandler } = vi.hoisted(() => {
  let handler: ((error: any) => Promise<any>) | null = null;
  return {
    getResponseErrorHandler: () => handler,
    setResponseErrorHandler: (h: any) => { handler = h; },
  };
});

vi.mock('axios', () => {
  const post = vi.fn();
  const reqUse = vi.fn();
  const resUse = vi.fn((_success, error) => {
    setResponseErrorHandler(error);
  });
  const instance = Object.assign(vi.fn(), {
    interceptors: { request: { use: reqUse }, response: { use: resUse } },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  });
  return { default: { create: () => instance, post } };
});

import { ensureFreshAccessToken, apiClient } from '../apiClient';

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

  it('coalesces proactive refresh and concurrent 401 response into a single refresh request', async () => {
    localStorage.setItem('phoneshop_access_token', makeJwt(Math.floor(Date.now() / 1000) - 10));
    localStorage.setItem('phoneshop_refresh_token', 'refresh-shared');

    let resolvePost!: (value: unknown) => void;
    mockedPost().mockImplementationOnce(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );

    // Mock apiClient retry response
    const mockApiClient = vi.mocked(apiClient);
    mockApiClient.mockResolvedValueOnce({ data: 'retried-ok' });

    // 1. Kick off proactive refresh (in flight)
    const proactivePromise = ensureFreshAccessToken();

    // 2. Concurrently, a 401 response error arrives from an existing request
    const dummy401Error = {
      response: { status: 401 },
      config: { url: '/api/cart', headers: {} },
    };
    const interceptorPromise = getResponseErrorHandler()!(dummy401Error);

    // 3. Resolve the refresh endpoint
    resolvePost({
      data: { data: { accessToken: 'new-acc-shared', refreshToken: 'new-ref-shared' } },
    });

    await Promise.all([proactivePromise, interceptorPromise]);

    // Crucial assertion: only ONE call to /auth/refresh-token was made
    expect(mockedPost()).toHaveBeenCalledOnce();
    expect(localStorage.getItem('phoneshop_access_token')).toBe('new-acc-shared');
    expect(localStorage.getItem('phoneshop_refresh_token')).toBe('new-ref-shared');
    // And the 401 request was retried with the new token
    expect(mockApiClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/cart',
        headers: expect.objectContaining({
          Authorization: 'Bearer new-acc-shared',
        }),
      }),
    );
  });
});
