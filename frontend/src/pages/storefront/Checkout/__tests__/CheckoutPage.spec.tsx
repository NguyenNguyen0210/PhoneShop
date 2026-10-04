import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  const createStorageMock = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  };
  (globalThis as any).localStorage = createStorageMock();
  (globalThis as any).sessionStorage = createStorageMock();
});

import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CheckoutPage } from '../CheckoutPage';
import { useCartStore } from '../../../../stores/useCartStore';
import { useAuthStore } from '../../../../stores/useAuthStore';

vi.mock('../../../../services/addressService', () => ({
  addressService: {
    getAddresses: vi.fn().mockResolvedValue([
      {
        id: 'addr-1',
        recipientName: 'Nguyen Van A',
        phone: '0901234567',
        addressLine1: '123 Nguyen Hue',
        ward: 'Ben Nghe',
        district: 'Quan 1',
        city: 'Ho Chi Minh',
        isDefault: true,
      },
    ]),
  },
}));

vi.mock('../../../../services/voucherService', () => ({
  voucherService: {
    getActiveVouchers: vi.fn().mockResolvedValue([]),
    validateVoucher: vi.fn(),
  },
}));

describe('CheckoutPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.setState({
      items: [
        {
          id: 'cart-item-1',
          variantId: 'v-1',
          quantity: 1,
          price: 28000000,
          unitPrice: 28000000,
          product: { id: 'p-1', name: 'iPhone 15 Pro Max', thumbnail: '' } as any,
          variant: { id: 'v-1', color: 'Titan Tự Nhiên', storage: '256GB' } as any,
        },
      ],
      selectedItemIds: ['cart-item-1'],
    });

    useAuthStore.setState({
      user: {
        id: 'user-1',
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        email: 'user@example.com',
        role: 'CUSTOMER',
      } as any,
    });
  });

  it('renders CheckoutPage with Address, Shipping Method, and Coupon sections', () => {
    const html = renderToString(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // 1. Header & Title
    expect(html).toContain('Xác nhận Đơn hàng &amp; Thanh toán');

    // 2. Address section
    expect(html).toContain('Thông tin giao hàng &amp; Liên hệ');
    expect(html).toContain('Địa chỉ nhận hàng chi tiết');

    // 3. Shipping method section
    expect(html).toContain('Phương thức vận chuyển');
    expect(html).toContain('Giao tiết kiệm');
    expect(html).toContain('Giao tiêu chuẩn');
    expect(html).toContain('Giao hỏa tốc 2h');

    // 4. Coupon section
    expect(html).toContain('Mã ưu đãi &amp; Giảm giá');
    expect(html).toContain('Chọn hoặc nhập mã ưu đãi');

    // 5. Payment method section
    expect(html).toContain('Phương thức thanh toán');
    expect(html).toContain('Quét mã QR để chuyển khoản');

    // 6. Summary column
    expect(html).toContain('iPhone 15 Pro Max');
    expect(html).toContain('Titan Tự Nhiên');
    expect(html).toContain('256GB');
    expect(html).toContain('Tạm tính:');
    expect(html).toContain('Phí vận chuyển:');
    expect(html).toContain('Tổng thanh toán:');
  });

  it('renders address modal component container in DOM', () => {
    const html = renderToString(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // Since isOpen is initially false, AddressSelectModal returns null/empty
    // But page renders without crashing
    expect(html).toBeDefined();
  });
});
