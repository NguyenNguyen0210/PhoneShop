import type { APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:3000/api';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function apiCreate(
  request: APIRequestContext,
  token: string,
  path: string,
  data: unknown,
) {
  return request.post(`${API_BASE}${path}`, {
    headers: authHeaders(token),
    data,
  });
}

export async function apiDelete(request: APIRequestContext, token: string, path: string) {
  return request.delete(`${API_BASE}${path}`, {
    headers: authHeaders(token),
  });
}

export async function apiCleanupPrefix(
  request: APIRequestContext,
  token: string,
  cleaners: Array<() => Promise<unknown>>,
) {
  for (const fn of cleaners) {
    try {
      await fn();
    } catch {
      // best-effort cleanup, never fail test on cleanup
    }
  }
}
