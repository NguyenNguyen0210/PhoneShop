import { test as base, expect } from '@playwright/test';

export const ADMIN = { email: 'admin@phoneshop.vn', password: 'Password@123' };
export const STAFF = { email: 'staff@phoneshop.vn', password: 'Password@123' };
export const API_BASE = 'http://localhost:3000/api';

export const test = base.extend<{ adminToken: string; staffToken: string }>({
  adminToken: async ({ request }, use) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    const json = await res.json().catch(() => ({}));
    await use(json.accessToken ?? json.access_token ?? '');
  },
  staffToken: async ({ request }, use) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: STAFF.email, password: STAFF.password },
    });
    const json = await res.json().catch(() => ({}));
    await use(json.accessToken ?? json.access_token ?? '');
  },
});

export { expect };
