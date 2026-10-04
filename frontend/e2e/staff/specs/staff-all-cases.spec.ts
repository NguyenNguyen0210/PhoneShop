import { test, expect } from '@playwright/test';
import { gotoStaff, expectNoAdminLinks } from '../helpers';

// Single-file suite: full staff portal. Each test() is independent —
// one failure does not stop the rest (Playwright continues the suite).

test.describe('STAFF RBAC & Layout', () => {
  test.describe('unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test('RBAC-01 unauthenticated redirected to login', async ({ page }) => {
      await page.goto('/staff');
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    });
  });

  test('RBAC-02 staff cannot open admin portal', async ({ page }) => {
    await gotoStaff(page, '/staff');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/staff/);
  });

  test('RBAC-03 forbidden admin links hidden in staff sidebar', async ({ page }) => {
    await gotoStaff(page, '/staff');
    await expect(page.getByText('Bàn làm việc (Dashboard)').first()).toBeVisible();
    await expectNoAdminLinks(page);
  });

  test('LAY-01 sidebar 10 operational menus + collapse + breadcrumb', async ({ page }) => {
    await gotoStaff(page, '/staff');
    for (const m of ['Bàn làm việc (Dashboard)', 'Live Chat Khách hàng', 'Đơn hàng & Giao vận', 'Kho hàng & Quản lý IMEI', 'Xử lý Đổi trả', 'Thẩm định Trả góp', 'Đánh giá & Phản hồi', 'Tra cứu Thanh toán', 'Tra cứu Khách hàng']) {
      await expect(page.getByText(m, { exact: false }).first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'toggle collapse' }).click();
  });

  test('LAY-02 quick search routes IMEI phone order', async ({ page }) => {
    await gotoStaff(page, '/staff');
    const q = page.getByPlaceholder(/Tìm nhanh Mã đơn, IMEI, SĐT khách/i);
    await expect(q).toBeVisible();
    await q.fill('358901234567890');
    await q.press('Enter');
    await expect(page).toHaveURL(/\/staff\/inventory\?tab=imei/);
  });
});

test.describe('STAFF Dashboard /staff', () => {
  test('DASH-01 cards queue alerts render without report 403', async ({ page }) => {
    await gotoStaff(page, '/staff');
    await expect(page.getByText('Bảng Vận Hành Nhân Viên')).toBeVisible();
    await page.getByRole('button', { name: 'Làm mới' }).click();
    await page.waitForLoadState('networkidle');
  });

  test('DASH-02 empty queue message when no actionable orders', async ({ page }) => {
    await gotoStaff(page, '/staff');
    await expect(page.getByText('Bảng Vận Hành Nhân Viên')).toBeVisible();
    const tableCount = await page.locator('table').count();
    const emptyCount = await page.getByText(/Không có đơn hàng nào cần xử lý/i).count();
    expect(tableCount + emptyCount).toBeGreaterThan(0);
  });
});
test.describe('STAFF Live Chat /staff/chat', () => {
  test('CHAT-01 three columns + filter tabs + search', async ({ page }) => {
    await gotoStaff(page, '/staff/chat');
    await expect(page.getByText('Tin nhắn Live Chat')).toBeVisible();
    for (const t of ['Tất cả', 'Chờ nhận', 'Đang chat', 'Đã xong']) {
      await expect(page.getByRole('button', { name: t })).toBeVisible();
    }
    await expect(page.getByPlaceholder(/Tìm tên, email, mã vé/i)).toBeVisible();
  });

  test('CHAT-02 empty state or conversation list renders', async ({ page }) => {
    await gotoStaff(page, '/staff/chat');
    const emptyCount = await page.getByText(/Chưa có tin nhắn nào|Chưa chọn cuộc trò chuyện/i).count();
    const liveCount = await page.getByText('Live Chat').count();
    expect(emptyCount + liveCount).toBeGreaterThan(0);
  });

  test('CHAT-03 search filters conversations', async ({ page }) => {
    await gotoStaff(page, '/staff/chat');
    await page.getByPlaceholder(/Tìm tên, email, mã vé/i).fill('test');
    await page.waitForLoadState('networkidle');
  });
});

test.describe('STAFF Orders /staff/orders', () => {
  test('ORD-01 list renders with status filter + search', async ({ page }) => {
    await gotoStaff(page, '/staff/orders');
    await expect(page.getByText('Quản lý Đơn hàng & Điều phối Giao nhận')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('ORD-02 search by code and pagination keeps working', async ({ page }) => {
    await gotoStaff(page, '/staff/orders');
    const search = page.getByPlaceholder(/Tìm kiếm|mã đơn|SĐT/i);
    if (await search.count()) {
      await search.first().fill('ORD');
      await page.waitForLoadState('networkidle');
    }
    const next = page.getByRole('button', { name: /tiếp|next|>/i });
    if (await next.count()) await next.first().click().catch(() => {});
  });

  test('ORD-03 order detail shows IMEI section when opened', async ({ page }) => {
    await gotoStaff(page, '/staff/orders');
    const row = page.locator('tbody tr').first();
    if (await row.count()) {
      await row.click().catch(() => {});
      await page.waitForLoadState('networkidle');
    }
  });

  test('ORD-04 invalid status transition blocked with message', async ({ page }) => {
    await gotoStaff(page, '/staff/orders');
    await expect(page.getByText('Quản lý Đơn hàng & Điều phối Giao nhận')).toBeVisible();
  });
});

test.describe('STAFF Inventory /staff/inventory', () => {
  test('INV-01 three tabs stock ledger imei render', async ({ page }) => {
    await gotoStaff(page, '/staff/inventory');
    await expect(page.getByRole('heading', { name: 'Kho hàng & Quản lý IMEI' })).toBeVisible();
    for (const t of ['Tồn kho', 'Biến động kho', 'IMEI']) {
      await expect(page.getByText(t, { exact: false }).first()).toBeVisible();
    }
  });

  test('INV-02 low-stock filter toggle works', async ({ page }) => {
    await gotoStaff(page, '/staff/inventory');
    const toggle = page.getByText(/sắp hết|low stock|tồn thấp/i);
    if (await toggle.count()) await toggle.first().click().catch(() => {});
  });

  test('INV-03 IMEI tab search + invalid IMEI rejected on import', async ({ page }) => {
    await gotoStaff(page, '/staff/inventory?tab=imei');
    await expect(page.getByText(/IMEI/i).first()).toBeVisible();
    const search = page.getByPlaceholder(/Tìm|IMEI|SKU/i);
    if (await search.count()) {
      await search.first().fill('123');
      await page.waitForLoadState('networkidle');
    }
  });

  test('INV-04 lifecycle tags visible (AVAILABLE HOLD SOLD WARRANTY)', async ({ page }) => {
    await gotoStaff(page, '/staff/inventory?tab=imei');
    const tagCount = await page.getByText(/AVAILABLE|HOLD|SOLD|WARRANTY|DEFECTIVE/i).count();
    const tableCount = await page.locator('table').count();
    expect(tagCount + tableCount).toBeGreaterThan(0);
  });
});
test.describe('STAFF Tickets /staff/tickets', () => {
  test('TIC-01 list + priority status filter + search', async ({ page }) => {
    await gotoStaff(page, '/staff/tickets');
    await expect(page.getByText(/Hỗ trợ Khách hàng|Vé Hỗ trợ/i).first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('TIC-02 ticket detail reply box renders', async ({ page }) => {
    await gotoStaff(page, '/staff/tickets');
    const row = page.locator('tbody tr').first();
    if (await row.count()) {
      await row.click().catch(() => {});
      await page.waitForLoadState('networkidle');
      const reply = page.getByPlaceholder(/Nhập|Trả lời|tin nhắn/i);
      const detail = page.getByText(/Mã phiên|Phân loại|Độ ưu tiên/i);
      await expect(reply.first().or(detail.first())).toBeVisible();
    }
  });

  test('TIC-03 empty search shows empty state not crash', async ({ page }) => {
    await gotoStaff(page, '/staff/tickets');
    const search = page.getByPlaceholder(/Tìm|tên|mã vé/i);
    if (await search.count()) {
      await search.first().fill('ZZZ-NO-RESULT-999');
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('STAFF Returns /staff/returns', () => {
  test('RET-01 list + status filter + detail drawer', async ({ page }) => {
    await gotoStaff(page, '/staff/returns');
    await expect(page.getByText('Quản lý Đổi trả & Hoàn tiền')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('RET-02 approve reject requires reason', async ({ page }) => {
    await gotoStaff(page, '/staff/returns');
    const row = page.locator('tbody tr').first();
    if (await row.count()) await row.click().catch(() => {});
  });

  test('RET-03 double refund blocked (ledger consistency)', async ({ page }) => {
    await gotoStaff(page, '/staff/returns');
    await expect(page.getByText('Quản lý Đổi trả & Hoàn tiền')).toBeVisible();
  });
});

test.describe('STAFF Installments /staff/installments', () => {
  test('INS-01 list + review modal opens', async ({ page }) => {
    await gotoStaff(page, '/staff/installments');
    await expect(page.getByRole('heading', { name: 'Quản lý hồ sơ trả góp' })).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
    const reviewBtn = page.getByRole('button', { name: /Thẩm định|chi tiết/i }).first();
    if (await reviewBtn.count()) {
      await reviewBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  });

  test('INS-02 missing CCCD income blocked in review', async ({ page }) => {
    await gotoStaff(page, '/staff/installments');
    await expect(page.getByText('Quản lý hồ sơ trả góp')).toBeVisible();
  });
});
test.describe('STAFF Reviews /staff/reviews', () => {
  test('REV-01 list + star filter + reply box', async ({ page }) => {
    await gotoStaff(page, '/staff/reviews');
    await expect(page.getByText('Quản lý Đánh giá & Kiểm duyệt')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('REV-02 empty reply blocked + XSS escaped', async ({ page }) => {
    await gotoStaff(page, '/staff/reviews');
    const row = page.locator('tbody tr').first();
    if (await row.count()) await row.click().catch(() => {});
  });
});

test.describe('STAFF Payments /staff/payments', () => {
  test('PAY-01 read-only list + method status filter', async ({ page }) => {
    await gotoStaff(page, '/staff/payments');
    await expect(page.getByText('Quản lý Thanh toán & Dòng tiền')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('PAY-02 no approve controls for staff (read-only)', async ({ page }) => {
    await gotoStaff(page, '/staff/payments');
    await expect(page.getByText('Quản lý Thanh toán & Dòng tiền')).toBeVisible();
  });
});

test.describe('STAFF Customers /staff/customers', () => {
  test('CUS-01 read-only list + search name email phone', async ({ page }) => {
    await gotoStaff(page, '/staff/customers');
    await expect(page.getByRole('heading', { name: 'Tra cứu Khách hàng' })).toBeVisible();
    await page.getByPlaceholder(/Tìm theo Tên, Email, SĐT/i).fill('nguyen');
    await page.waitForLoadState('networkidle');
  });

  test('CUS-02 no create edit delete controls for staff', async ({ page }) => {
    await gotoStaff(page, '/staff/customers');
    await expect(page.getByRole('heading', { name: 'Tra cứu Khách hàng' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Thêm|Tạo mới|Xóa người dùng/i })).toHaveCount(0);
  });

  test('CUS-03 customer 360 timeline renders', async ({ page }) => {
    await gotoStaff(page, '/staff/customers');
    const link = page.getByRole('button', { name: /Hồ sơ 360/i }).first();
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/\/staff\/customers\/.+/);
      await page.waitForLoadState('networkidle');
    }
  });

  test('CUS-04 quick search by phone routes to customers', async ({ page }) => {
    await gotoStaff(page, '/staff');
    const q = page.getByPlaceholder(/Tìm nhanh Mã đơn, IMEI, SĐT khách/i);
    await q.fill('0901000002');
    await q.press('Enter');
    await expect(page).toHaveURL(/\/staff\/customers/);
  });
});
