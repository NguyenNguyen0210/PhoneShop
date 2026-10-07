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
});
