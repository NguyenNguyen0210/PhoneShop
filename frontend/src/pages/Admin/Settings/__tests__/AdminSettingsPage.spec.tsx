// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminSettingsPage } from '../AdminSettingsPage';
import { settingsService } from '../../../../services/settingsService';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/settingsService', () => ({
  settingsService: {
    getAdminSettings: vi.fn(),
    updateAdminSettings: vi.fn(),
    testVietQr: vi.fn(),
    testStorage: vi.fn(),
    testEmail: vi.fn(),
    getPublicSettings: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: {
        id: 'admin-id-1',
        email: 'admin@phoneshop.vn',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
    };
    return selector ? selector(state) : state;
  },
}));

const mockGroupedSettings = {
  payment: {
    PAYMENT_VNPAY_ENABLED: 'true',
    VNPAY_TMN_CODE: 'SANDBOX1',
    VNPAY_HASH_SECRET: '••••••••••••',
    VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_RETURN_URL: 'http://localhost:5173/order/vnpay-return',
    PAYMENT_VIETQR_ENABLED: 'true',
    VIETQR_BANK_ID: '970422',
    VIETQR_ACCOUNT_NO: '0987654321',
    VIETQR_ACCOUNT_NAME: 'CONG TY PHONE SHOP',
    VIETQR_TEMPLATE: 'compact',
  },
  storage: {
    CLOUDFLARE_R2_ACCOUNT_ID: 'r2-acc-123',
    CLOUDFLARE_R2_BUCKET: 'phoneshop-media',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'acc-key-id',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: '••••••••••••',
    CLOUDFLARE_R2_PUBLIC_URL: 'https://media.phoneshop.vn',
  },
  email: {
    EMAIL_HOST: 'smtp.gmail.com',
    EMAIL_PORT: '587',
    EMAIL_SECURE: 'false',
    EMAIL_USER: 'support@phoneshop.vn',
    EMAIL_PASS: '••••••••••••',
    EMAIL_FROM: 'Phone Shop <no-reply@phoneshop.vn>',
  },
  general: {
    STORE_NAME: 'Phone Shop',
    STORE_HOTLINE: '1900 6868',
    STORE_EMAIL: 'support@phoneshop.vn',
    STORE_ADDRESS: 'Hồ Chí Minh, Việt Nam',
    MAINTENANCE_MODE: 'false',
  },
};

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAdminSettings).mockResolvedValue(mockGroupedSettings);
    vi.mocked(settingsService.updateAdminSettings).mockResolvedValue({
      success: true,
      message: 'Cập nhật cấu hình thành công',
    });
  });

  it('renders page header and 4 tabs with loaded settings', async () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('Đang nạp cấu hình hệ thống...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Cấu hình & Tham số Hệ thống')).toBeDefined();
    });

    expect(screen.getByText('Cổng thanh toán')).toBeDefined();
    expect(screen.getByText('Lưu trữ Cloud')).toBeDefined();
    expect(screen.getByText('Dịch vụ Email')).toBeDefined();
    expect(screen.getByText('Cài đặt chung')).toBeDefined();

    // Verify initial values loaded in first tab
    const tmnInput = screen.getByDisplayValue('SANDBOX1');
    expect(tmnInput).toBeDefined();
  });

  it('activates Save button when an input value is modified and calls updateAdminSettings on click', async () => {
    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cấu hình & Tham số Hệ thống')).toBeDefined();
    });

    const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    expect(saveButton).toHaveProperty('disabled', true);

    const tmnInput = screen.getByDisplayValue('SANDBOX1');
    fireEvent.change(tmnInput, { target: { value: 'NEWSANDBOX99' } });

    await waitFor(() => {
      expect(saveButton).toHaveProperty('disabled', false);
      expect(screen.getByText('Có thay đổi chưa lưu')).toBeDefined();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(settingsService.updateAdminSettings).toHaveBeenCalled();
    });
  });

  it('switches tabs and renders General settings with maintenance alert', async () => {
    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cài đặt chung')).toBeDefined();
    });

    const generalTab = screen.getByText('Cài đặt chung');
    fireEvent.click(generalTab);

    await waitFor(() => {
      expect(screen.getByText('Thông tin Cửa hàng & Sàn Thương mại')).toBeDefined();
      expect(screen.getByText('Chế độ Vận hành & Bảo trì Hệ thống')).toBeDefined();
    });
  });

  it('triggers VietQR test and opens modal when clicking Tạo QR Test', async () => {
    vi.mocked(settingsService.testVietQr).mockResolvedValue({
      success: true,
      qrUrl: 'https://img.vietqr.io/image/970422-0987654321-compact.png',
    });

    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cấu hình & Tham số Hệ thống')).toBeDefined();
    });

    const testQrButton = screen.getByRole('button', { name: /Tạo QR Test/i });
    fireEvent.click(testQrButton);

    await waitFor(() => {
      expect(settingsService.testVietQr).toHaveBeenCalledWith(
        expect.objectContaining({
          bankId: '970422',
          accountNo: '0987654321',
          accountName: 'CONG TY PHONE SHOP',
        })
      );
      expect(screen.getByText('Kiểm tra Mã VietQR Thử nghiệm')).toBeDefined();
    });
  });

  it('switches to Storage tab and calls testStorage when clicking button', async () => {
    vi.mocked(settingsService.testStorage).mockResolvedValue({
      success: true,
      message: 'Kết nối thành công tới bucket: phoneshop-media',
    });

    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lưu trữ Cloud')).toBeDefined();
    });

    const storageTab = screen.getByText('Lưu trữ Cloud');
    fireEvent.click(storageTab);

    await waitFor(() => {
      expect(screen.getByText('Lưu trữ Đám mây Cloudflare R2')).toBeDefined();
    });

    const testStorageBtn = screen.getByRole('button', { name: /Kiểm tra kết nối R2/i });
    fireEvent.click(testStorageBtn);

    await waitFor(() => {
      expect(settingsService.testStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'r2-acc-123',
          bucket: 'phoneshop-media',
        })
      );
    });
  });
});
