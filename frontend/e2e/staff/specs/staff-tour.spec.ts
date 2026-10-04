import { test, expect } from '@playwright/test';
import { gotoStaff } from '../helpers';

// Single-window end-to-end tour: ONE test, ONE page, all staff features
// in order. Uses soft expects so a failing step never stops the tour.
test('STAFF full tour in one window', async ({ page }) => {
  test.setTimeout(300000);
  const pause = () => page.waitForTimeout(900);

  await test.step('01 dashboard', async () => {
    await gotoStaff(page, '/staff');
    await expect.soft(page.getByText('Bảng Vận Hành Nhân Viên')).toBeVisible();
    await pause();
  });

  await test.step('02 live chat', async () => {
    await gotoStaff(page, '/staff/chat');
    await expect.soft(page.getByText('Tin nhắn Live Chat')).toBeVisible();
    await pause();
  });

  await test.step('03 orders', async () => {
    await gotoStaff(page, '/staff/orders');
    await expect.soft(page.getByRole('heading', { name: /Đơn hàng/ })).toBeVisible();
    await pause();
  });

  await test.step('04 inventory stock ledger imei', async () => {
    await gotoStaff(page, '/staff/inventory');
    await expect.soft(page.getByRole('heading', { name: 'Kho hàng & Quản lý IMEI' })).toBeVisible();
    await pause();
    await gotoStaff(page, '/staff/inventory?tab=imei');
    await expect.soft(page.getByText(/IMEI/i).first()).toBeVisible();
    await pause();
  });

  await test.step('05 tickets', async () => {
    await gotoStaff(page, '/staff/tickets');
    await expect.soft(page.getByText(/Hỗ trợ Khách hàng|Vé Hỗ trợ/i).first()).toBeVisible();
    await pause();
  });

  await test.step('06 returns', async () => {
    await gotoStaff(page, '/staff/returns');
    await expect.soft(page.getByRole('heading', { name: /Đổi trả/ })).toBeVisible();
    await pause();
  });

  await test.step('07 installments', async () => {
    await gotoStaff(page, '/staff/installments');
    await expect.soft(page.getByRole('heading', { name: 'Quản lý hồ sơ trả góp' })).toBeVisible();
    await pause();
  });

  await test.step('08 reviews', async () => {
    await gotoStaff(page, '/staff/reviews');
    await expect.soft(page.getByRole('heading', { name: /Đánh giá/ })).toBeVisible();
    await pause();
  });

  await test.step('09 payments', async () => {
    await gotoStaff(page, '/staff/payments');
    await expect.soft(page.getByRole('heading', { name: /Thanh toán/ })).toBeVisible();
    await pause();
  });

  await test.step('10 customers + 360', async () => {
    await gotoStaff(page, '/staff/customers');
    await expect.soft(page.getByRole('heading', { name: 'Tra cứu Khách hàng' })).toBeVisible();
    await pause();
  });

  await test.step('11 quick search demo', async () => {
    await gotoStaff(page, '/staff');
    const q = page.getByPlaceholder(/Tìm nhanh Mã đơn, IMEI, SĐT khách/i);
    await expect.soft(q).toBeVisible();
    await q.fill('0901999002');
    await q.press('Enter');
    await expect.soft(page).toHaveURL(/\/staff\/customers/);
    await pause();
  });

  await test.step('12 chat deep: reply to customer', async () => {
    await gotoStaff(page, '/staff/chat');
    const composer = page.getByPlaceholder(/Nhập tin nhắn gửi tới khách hàng/i);
    if (await composer.count()) {
      const msg = `E2E deep-test reply ${Date.now()}`;
      await composer.fill(msg);
      await composer.press('Enter');
      await expect.soft(page.getByText(msg).first()).toBeVisible({ timeout: 15000 });
    }
    const canned = page.getByRole('button', { name: /Mẫu trả lời nhanh/i });
    await expect.soft(canned.or(page.getByText('Tin nhắn Live Chat'))).toBeVisible();
    await pause();
  });

  await test.step('13 orders deep: detail + IMEI + shipping modal', async () => {
    await gotoStaff(page, '/staff/orders');
    const detailBtn = page.getByRole('button', { name: 'Chi tiết' }).first();
    if (await detailBtn.count()) {
      await detailBtn.click().catch(() => {});
      await expect.soft(page.getByText(/Chi tiết đơn hàng:/).first()).toBeVisible({ timeout: 15000 });
      await expect.soft(page.getByText(/IMEI/i).first()).toBeVisible();
      const shipBtn = page.getByRole('button', { name: /Vận chuyển|Cập nhật vận đơn/i }).first();
      if (await shipBtn.count()) {
        await shipBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
        const cancel = page.getByRole('button', { name: /Hủy|Đóng/i }).first();
        if (await cancel.count()) await cancel.click().catch(() => {});
      }
      const close = page.getByRole('button', { name: 'Đóng', exact: true }).first();
      if (await close.count()) await close.click().catch(() => {});
    }
    await pause();
  });

  await test.step('14 reviews deep: open detail + send staff reply', async () => {
    await gotoStaff(page, '/staff/reviews');
    const detailBtn = page.getByLabel('Xem chi tiết & Phản hồi').first();
    if (await detailBtn.count()) {
      await detailBtn.click().catch(() => {});
      await expect.soft(page.getByText('Chi tiết Đánh giá & Phản hồi')).toBeVisible({ timeout: 15000 });
      const replyBox = page.getByPlaceholder(/Nhập nội dung phản hồi/i);
      if (await replyBox.count()) {
        await replyBox.fill(`E2E staff reply ${Date.now()}: cảm ơn đánh giá của bạn!`);
        const send = page.getByRole('button', { name: 'Gửi phản hồi' });
        if (await send.count()) await send.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
      const closeDrawer = page.getByRole('button', { name: /Đóng/i }).first();
      if (await closeDrawer.count()) await closeDrawer.click().catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
    }
    await pause();
  });

  await test.step('15 inventory deep: IMEI import rejects invalid code', async () => {
    await gotoStaff(page, '/staff/inventory?tab=imei');
    const importBtn = page.getByRole('button', { name: /Nhập lô|Nhập kho|Import/i }).first();
    if (await importBtn.count()) {
      await importBtn.click().catch(() => {});
      await expect.soft(page.getByText(/Nhập lô mã IMEI/i).first()).toBeVisible({ timeout: 15000 });
      const imeiBox = page.getByPlaceholder(/353245081234567/i);
      if (await imeiBox.count()) {
        await imeiBox.fill('12345');
        await expect.soft(page.getByText(/Luhn|không hợp lệ|invalid/i).first()).toBeVisible({ timeout: 10000 });
      }
      const cancel = page.getByRole('button', { name: 'Hủy', exact: true });
      if (await cancel.count()) await cancel.click().catch(() => {});
    }
    await pause();
  });

  await test.step('16 returns deep: open detail without deciding', async () => {
    await gotoStaff(page, '/staff/returns');
    const row = page.locator('tbody tr').first();
    if (await row.count()) {
      await row.click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape').catch(() => {});
    }
    await pause();
  });

// __DEEP2__

  await test.step('17 back to dashboard, keep window open', async () => {
    await gotoStaff(page, '/staff');
    await expect.soft(page.getByText('Bảng Vận Hành Nhân Viên')).toBeVisible();
    await page.waitForTimeout(15000);
  });
});
