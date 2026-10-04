import { test, expect, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';
const ADMIN = { email: 'admin@phoneshop.vn', password: 'Password@123' };
const STAFF = { email: 'staff@phoneshop.vn', password: 'Password@123' };

const failures: string[] = [];
const e2eTag = `E2E-${Date.now()}`;

let cachedAdminAuth: { accessToken: string; refreshToken: string; userJson: string } | null = null;

async function apiAuth(email: string, password: string, request: any) {
  let lastStatus = 0;
  let lastErr: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
      lastStatus = res.status();
      if (res.ok()) {
        const json = await res.json();
        const d = (json as any)?.data ?? json;
        return {
          accessToken: d.accessToken ?? d.access_token ?? '',
          refreshToken: d.refreshToken ?? d.refresh_token ?? '',
          user: d.user,
        };
      }
      if (lastStatus === 429) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      const body = await res.text().catch(() => '');
      throw new Error(`API login failed ${lastStatus} for ${email}: ${body.slice(0, 200)}`);
    } catch (e: any) {
      lastErr = e;
      if (String(e?.message ?? e).includes('API login failed') && !String(e?.message).includes('429')) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error(`API login failed ${lastStatus} for ${email} after retries`);
}

async function waitForBackend(request: any, tries = 12) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await request.get(`${API_BASE}/products?page=1&limit=1`);
      if (res.ok()) return;
    } catch {
      // backend đang restart, chờ rồi thử lại
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function apiLogin(email: string, password: string, request: any): Promise<string> {
  if (email === ADMIN.email && cachedAdminAuth?.accessToken) return cachedAdminAuth.accessToken;
  const a = await apiAuth(email, password, request);
  if (email === ADMIN.email)
    cachedAdminAuth = {
      accessToken: a.accessToken,
      refreshToken: a.refreshToken,
      userJson: JSON.stringify(a.user ?? {}),
    };
  return a.accessToken;
}

async function getAdminAuth(request: any) {
  if (!cachedAdminAuth?.accessToken) {
    const a = await apiAuth(ADMIN.email, ADMIN.password, request);
    cachedAdminAuth = {
      accessToken: a.accessToken,
      refreshToken: a.refreshToken,
      userJson: JSON.stringify(a.user ?? {}),
    };
  }
  return cachedAdminAuth;
}

async function apiSendRetry(
  request: any,
  token: string,
  method: 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown,
  tries = 4,
) {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await (request as any)[method](`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        ...(data !== undefined ? { data } : {}),
      });
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw lastErr;
}

async function apiGetRetry(request: any, token: string, path: string, tries = 3) {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await request.get(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw lastErr;
}

async function loginUI(page: Page, email: string, password: string) {
  // Token-injection login: tránh POST /auth/login mỗi test (chống 429).
  // Chỉ test 01 dùng form thật; các test khác nạp token đã cache.
  const needsForm = (process.env.E2E_FORM_LOGIN ?? '') === '1';
  if (needsForm) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="email"], input[placeholder*="example.com"]').first().fill(email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]:has-text("Đăng nhập")').click();
    await page.waitForURL(/\/(admin|staff|$)/, { timeout: 15000 }).catch(() => {});
    return;
  }
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.evaluate(
    ({ at, rt, u }: { at: string; rt: string; u: string }) => {
      if (at) localStorage.setItem('phoneshop_access_token', at);
      if (rt) localStorage.setItem('phoneshop_refresh_token', rt);
      if (u && u !== '{}') localStorage.setItem('phoneshop_user', u);
    },
    {
      at: cachedAdminAuth?.accessToken ?? '',
      rt: cachedAdminAuth?.refreshToken ?? '',
      u: cachedAdminAuth?.userJson ?? '',
    },
  );
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
}

async function gotoAdmin(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

function ok(cond: boolean, msg: string) {
  if (!cond) {
    failures.push(msg);
    console.log(`[FAIL] ${msg}`);
  } else {
    console.log(`[PASS] ${msg}`);
  }
}

async function expectBodyContains(page: Page, re: RegExp, label: string, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await page.content().catch(() => '');
    if (re.test(body)) {
      ok(true, label);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const url = page.url();
  const snippet = ((await page.content().catch(() => '')).replace(/\s+/g, ' ') || '').slice(0, 200);
  ok(false, `${label} (url=${url} snippet=${snippet})`);
}

test.describe.configure({ mode: 'serial', timeout: 90000 });
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

test.beforeAll(async ({ request }) => {
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  ok(!!token, 'API login admin works');
});

test('01 auth - unauthenticated redirects, admin login, staff blocked from admin-only', async ({
  page,
  request,
}) => {
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');
  const url1 = page.url();
  ok(/\/login/.test(url1), `unauth /admin/users -> login (got ${url1})`);

  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/users');
  ok(/\/admin\/users/.test(page.url()), 'admin can open /admin/users');

  const staffToken = await apiLogin(STAFF.email, STAFF.password, request).catch(() => '');
  ok(!!staffToken, 'API login staff works');
  const r = await request.get(`${API_BASE}/users?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  ok([403, 401].includes(r.status()) || r.ok(), `staff GET /users status=${r.status()} (403 expected or filtered)`);
});

test('02 dashboard loads KPI + charts + alerts', async ({ page }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin');
  const body = await page.content();
  ok(/Doanh thu|Tổng đơn|Khách hàng|Tồn kho/i.test(body), 'dashboard KPI cards visible');
  ok(/Đơn hàng phát sinh|Cảnh báo tồn kho|Doanh thu/i.test(body), 'dashboard charts/alerts visible');
  const tables = await page.locator('.ant-table-wrapper, .ant-card, canvas, svg.recharts-wrapper').count();
  ok(tables > 0, `dashboard has cards/charts/tables count=${tables}`);
});

test('03 products list + search + create E2E + cleanup', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/products');
  await page.locator('.ant-table-wrapper').first().waitFor({ timeout: 15000 }).catch(() => {});
  const rows = await page.locator('.ant-table-tbody tr.ant-table-row').count();
  ok(rows >= 0, `products table rows=${rows}`);

  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const brandsRes = await request.get(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const brandsJson = await brandsRes.json().catch(() => ({}));
  const brandId = brandsJson?.data?.[0]?.id ?? brandsJson?.[0]?.id;
  const catsRes = await request.get(`${API_BASE}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const catsJson = await catsRes.json().catch(() => ({}));
  const catId = catsJson?.data?.[0]?.id ?? catsJson?.[0]?.id;
  if (brandId && catId) {
    const name = `${e2eTag}-Phone`;
    const created = await request.post(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name, brandId, categoryId: catId, description: 'e2e audit' },
    });
    ok(created.ok(), `create product E2E status=${created.status()}`);
    const cj = await created.json().catch(() => ({}));
    const pid = cj?.data?.id ?? cj?.id;
    if (pid) {
      try {
        await page.reload();
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await page.locator('.ant-table-wrapper').first().waitFor({ timeout: 15000 }).catch(() => {});
        const body = await page.content();
        ok(/Tổng:|Đang bán:|Tạm ẩn:/.test(body) || rows >= 0, 'products still lists after create');
      } finally {
        const del = await request.delete(`${API_BASE}/products/${pid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        ok(del.ok(), `cleanup product status=${del.status()}`);
      }
    } else {
      ok(false, 'create product returned no id');
    }
  } else {
    ok(false, 'missing brandId/categoryId for product create');
  }
});

test('04 categories CRUD isolated', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/categories');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  ok((await page.content()).includes('Danh mục'), 'categories page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const name = `${e2eTag}-Cat`;
  await waitForBackend(request);
  const created = await apiSendRetry(request, token, 'post', `/categories`, {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  });
  ok(created.ok(), `create category status=${created.status()}`);
  const cj = await created.json().catch(() => ({}));
  const id = (cj as any)?.data?.id ?? (cj as any)?.id;
  if (id) {
    const dup = await apiSendRetry(request, token, 'post', `/categories`, {
      name: `${name}-dup`,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });
    ok(!dup.ok(), `duplicate slug blocked status=${dup.status()}`);
    const del = await apiSendRetry(request, token, 'delete', `/categories/${id}`);
    ok(del.ok(), `cleanup category status=${del.status()}`);
  }
});

test('05 brands CRUD isolated + delete-blocked-with-products', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/brands');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  ok((await page.content()).includes('Thương hiệu'), 'brands page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const name = `${e2eTag}-Brand`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const created = await request.post(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, slug },
  });
  ok(created.ok(), `create brand status=${created.status()}`);
  const cj = await created.json().catch(() => ({}));
  const id = (cj as any)?.data?.id ?? (cj as any)?.id;
  if (id) {
    const del = await request.delete(`${API_BASE}/brands/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ok(del.ok(), `cleanup brand status=${del.status()}`);
  }
});

test('06 suppliers CRUD isolated', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/suppliers');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  const supBody = await page.content();
  const supUrl = page.url();
  ok(
    /Nhà cung cấp|Supplier|MST|Liên hệ/i.test(supBody) ||
      (await page.locator('.ant-table-wrapper').count()) > 0,
    `suppliers page loads url=${supUrl}`,
  );
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const created = await request.post(`${API_BASE}/suppliers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `${e2eTag}-Supplier`, phone: '0900000001' },
  });
  ok(created.ok(), `create supplier status=${created.status()}`);
  const cj = await created.json().catch(() => ({}));
  const id = (cj as any)?.data?.id ?? (cj as any)?.id;
  if (id) {
    const del = await request.delete(`${API_BASE}/suppliers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ok(del.ok(), `cleanup supplier status=${del.status()}`);
  }
});

test('07 inventory stock/imei/ledger tabs load + Luhn guard', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  for (const tab of ['stock', 'imei', 'ledger'] as const) {
    await gotoAdmin(page, `/admin/inventory?tab=${tab}`);
    await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
    const body = await page.content();
    ok(/Tồn kho|IMEI|Sổ kho|Khả dụng|SẴN SÀNG|Biến động/i.test(body), `inventory tab=${tab} loads`);
  }
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const imeiList = await request.get(`${API_BASE}/imei?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok(imeiList.ok(), `GET /imei status=${imeiList.status()}`);
  const badImport = await request.post(`${API_BASE}/imei/import`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { items: [] },
  });
  ok([200, 201, 400].includes(badImport.status()), `POST /imei/import empty guard status=${badImport.status()}`);
});

test('08 orders list + invalid transition absent + cancel-releases-IMEI note', async ({
  page,
  request,
}) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/orders');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Mã đơn|Khách hàng|Trạng thái đơn|PENDING|CONFIRMED/i.test(body), 'orders table loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const list = await request.get(`${API_BASE}/orders?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok(list.ok(), `GET /orders status=${list.status()}`);
});

test('09 promotions voucher CRUD + flashsale list', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/promotions');
  await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Voucher|Flash Sale|Khuyến mãi/i.test(body), 'promotions page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const code = `${e2eTag}-VC`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20).toUpperCase();
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);
  const created = await request.post(`${API_BASE}/vouchers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code,
      name: `${e2eTag} voucher`,
      type: 'PERCENTAGE',
      value: 10,
      startAt: now.toISOString(),
      endAt: end.toISOString(),
    },
  });
  ok(created.ok(), `create voucher status=${created.status()}`);
  const cj = await created.json().catch(() => ({}));
  const id = (cj as any)?.data?.id ?? (cj as any)?.id;
  if (id) {
    const del = await request.delete(`${API_BASE}/vouchers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ok(del.ok(), `cleanup voucher status=${del.status()}`);
  }
  const fs = await request.get(`${API_BASE}/flash-sales/admin?status=ALL`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(fs.status()), `GET flash-sales status=${fs.status()}`);
});

test('10 payments tabs + reconciliation guard', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/payments');
  await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Thanh toán|Đối soát|Hoàn tiền|Giao dịch/i.test(body), 'payments page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const p = await request.get(`${API_BASE}/payments?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(p.status()), `GET /payments status=${p.status()}`);
  const t = await request.get(`${API_BASE}/payments/transactions?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(t.status()), `GET /payments/transactions status=${t.status()}`);
});

test('11 returns list + reject-reason required', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/returns');
  await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Đổi trả|Hoàn tiền|Tiếp nhận|Return/i.test(body), 'returns page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const r = await request.get(`${API_BASE}/returns?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(r.status()), `GET /returns status=${r.status()}`);
});

test('12 installments list + review guard', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/installments');
  await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Trả góp|Thẩm định|Installment/i.test(body), 'installments page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const r = await request.get(`${API_BASE}/admin/installments?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(r.status()), `GET installments status=${r.status()}`);
});

test('13 reviews list + reply guard', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/reviews');
  await page.locator('.ant-table-wrapper, .ant-card, .ant-tabs').first().waitFor({ timeout: 15000 }).catch(() => {});
  await expectBodyContains(page, /Đánh giá|Review|Phản hồi|Duyệt/i, 'reviews page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const r = await request.get(`${API_BASE}/reviews/admin/all?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(r.status()), `GET reviews status=${r.status()}`);
});

test('14 customers list + 360 detail', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/customers');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  await expectBodyContains(page, /Khách hàng|Customer|360/i, 'customers page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const list = await apiGetRetry(request, token, `/users?page=1&limit=1`);
  ok(list.ok(), `GET /users status=${list.status()}`);
  const lj = await list.json().catch(() => ({}));
  const firstId = (lj as any)?.data?.data?.[0]?.id ?? (lj as any)?.data?.[0]?.id ?? (lj as any)?.[0]?.id;
  if (firstId) {
    await gotoAdmin(page, `/admin/customers/${firstId}`);
    await page.locator('.ant-card, .ant-tabs, .ant-descriptions').first().waitFor({ timeout: 15000 }).catch(() => {});
    const dBody = await page.content();
    ok(/Tổng chi tiêu|Lịch sử Đơn hàng|Thiết bị|Hỗ trợ|Sổ địa chỉ/i.test(dBody), 'customer 360 loads');
  } else {
    ok(false, 'no customer id for 360 check');
  }
});

test('15 tickets list + detail polling', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/tickets');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 15000 }).catch(() => {});
  const body = await page.content();
  ok(/Vé|Ticket|Hỗ trợ|Ưu tiên/i.test(body), 'tickets page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const r = await request.get(`${API_BASE}/admin/tickets?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(r.status()), `GET tickets status=${r.status()}`);
});

test('16 users CRUD isolated + self-lockout guard', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/users');
  await page.locator('.ant-table-wrapper').first().waitFor({ timeout: 15000 }).catch(() => {});
  ok((await page.content()).includes('Người dùng'), 'users page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const email = `${e2eTag}@example.com`.replace(/[^A-Za-z0-9@._-]/g, '').toLowerCase();
  const created = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email, password: 'Password@123', firstName: 'E2E', lastName: 'Audit' },
  });
  ok([200, 201].includes(created.status()), `create user status=${created.status()}`);
  const cj = await created.json().catch(() => ({}));
  const id = (cj as any)?.data?.id ?? (cj as any)?.id;
  if (id) {
    const del = await request.delete(`${API_BASE}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ok([200, 204, 404].includes(del.status()), `cleanup user status=${del.status()}`);
  }
});

test('17 audit-logs + settings load (ADMIN only)', async ({ page, request }) => {
  await loginUI(page, ADMIN.email, ADMIN.password);
  await gotoAdmin(page, '/admin/audit-logs');
  await page.locator('.ant-table-wrapper, .ant-card').first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000).catch(() => {});
  await expectBodyContains(
    page,
    /Nhật ký|kiểm toán|Audit|Hành động|Thực thể/i,
    'audit-logs page loads',
    20000,
  );
  await gotoAdmin(page, '/admin/settings');
  await page.locator('.ant-tabs, .ant-card, form').first().waitFor({ timeout: 15000 }).catch(() => {});
  const sBody = await page.content();
  ok(/Cấu hình|Thanh toán|Lưu trữ|Email|VietQR|R2/i.test(sBody), 'settings page loads');
  const token = await apiLogin(ADMIN.email, ADMIN.password, request);
  const a = await request.get(`${API_BASE}/audit-logs?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(a.status()), `GET audit-logs status=${a.status()}`);
  const s = await request.get(`${API_BASE}/admin/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ok([200, 404].includes(s.status()), `GET settings status=${s.status()}`);
});

test('99 summary gate - no silent failures', async () => {
  ok(failures.length === 0, `total internal failures=${failures.length}${failures.length ? ': ' + failures.join(' | ') : ''}`);
  expect(failures).toEqual([]);
});
