// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPromotionsPage } from '../AdminPromotionsPage';
import { BrowserRouter } from 'react-router-dom';
import { VoucherType } from '../../../../types';

// Mock matchMedia for Ant Design components in jsdom
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

// Mock ResizeObserver for Ant Design components in jsdom
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock promotionService
vi.mock('../../../../services/promotionService', () => ({
  promotionService: {
    getSummary: vi.fn(),
    getAllVouchers: vi.fn(),
    getVoucher: vi.fn(),
    createVoucher: vi.fn(),
    updateVoucher: vi.fn(),
    toggleVoucherStatus: vi.fn(),
    deleteVoucher: vi.fn(),
    getVoucherUsages: vi.fn(),
  },
}));

// Mock flashSaleService
vi.mock('../../../../services/flashSaleService', () => ({
  flashSaleService: {
    getAdminCampaigns: vi.fn(),
    getActiveCampaign: vi.fn(),
    getCampaignDetail: vi.fn(),
    createCampaign: vi.fn(),
    endEarly: vi.fn(),
    deleteCampaign: vi.fn(),
  },
}));

// Mock productService
vi.mock('../../../../services/productService', () => ({
  productService: {
    getProducts: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getProductById: vi.fn(),
  },
}));

import { promotionService } from '../../../../services/promotionService';
import { flashSaleService } from '../../../../services/flashSaleService';

describe('AdminPromotionsPage', () => {
  const mockVouchers = [
    {
      id: 'voucher-1',
      code: 'PANDA50K',
      name: 'Giảm 50K đơn từ 500K',
      description: 'Áp dụng cho mọi đơn hàng',
      type: VoucherType.FIXED_AMOUNT,
      value: 50000,
      minOrderValue: 500000,
      usageLimit: 200,
      usageCount: 45,
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 86400000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'voucher-2',
      code: 'FREESHIP',
      name: 'Miễn phí giao hàng',
      description: 'Tối đa 30K',
      type: VoucherType.FREE_SHIPPING,
      value: 30000,
      minOrderValue: 200000,
      usageLimit: 100,
      usageCount: 10,
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 86400000).toISOString(),
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockCampaigns = [
    {
      id: 'camp-1',
      name: 'Flash Sale Cuối Tuần',
      description: 'Giảm sốc điện thoại',
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      isActive: true,
      items: [
        {
          id: 'item-1',
          campaignId: 'camp-1',
          variantId: 'var-1',
          flashPrice: 15000000,
          stockLimit: 10,
          soldCount: 4,
          variant: {
            id: 'var-1',
            sku: 'IP15-128',
            name: '128GB Đen',
            price: 20000000,
            product: { id: 'p-1', name: 'iPhone 15 128GB', slug: 'iphone-15' },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(promotionService.getSummary).mockResolvedValue({
      totalVouchers: 10,
      activeVouchers: 5,
      expiredOrExhausted: 5,
      totalUsages: 100,
      totalDiscountAmount: 2000000,
    });

    vi.mocked(promotionService.getAllVouchers).mockResolvedValue(mockVouchers);
    vi.mocked(promotionService.getVoucherUsages).mockResolvedValue([
      {
        id: 'usage-1',
        voucherId: 'voucher-1',
        userId: 'u-1',
        orderId: 'ORD-999',
        discountAmount: 50000,
        usedAt: new Date().toISOString(),
        user: { firstName: 'Van', lastName: 'Nguyen', email: 'van@panda.vn' },
      },
    ]);

    vi.mocked(flashSaleService.getAdminCampaigns).mockResolvedValue(mockCampaigns);
  });

  it('renders KPI summary cards and promotion tabs', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Quản lý Khuyến mãi & Flash Sale/i)).toBeDefined();
    expect(screen.getByText(/Mã giảm giá \(Vouchers\)/i)).toBeDefined();
    expect(screen.getByText(/Flash Sale & Khung giờ vàng/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Voucher đang hoạt động')).toBeDefined();
      expect(screen.getByText('Chiến dịch Flash Sale')).toBeDefined();
      expect(screen.getByText('Tổng lượt áp mã')).toBeDefined();
      expect(screen.getByText('Tổng chiết khấu đã hỗ trợ')).toBeDefined();
      expect(screen.getByText('PANDA50K')).toBeDefined();
      expect(screen.getByText('FREESHIP')).toBeDefined();
    });
  });

  it('opens VoucherFormModal when clicking "+ Tạo mã giảm giá mới"', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Tạo mã giảm giá mới')).toBeDefined();
    });

    fireEvent.click(screen.getByText('+ Tạo mã giảm giá mới'));

    await waitFor(() => {
      expect(screen.getByText('Tạo mã giảm giá mới')).toBeDefined();
      expect(screen.getByText(/Tạo mã ngẫu nhiên/i)).toBeDefined();
    });
  });

  it('opens VoucherUsageDrawer when clicking "Lịch sử"', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PANDA50K')).toBeDefined();
    });

    const historyButtons = screen.getAllByText('Lịch sử');
    fireEvent.click(historyButtons[0]);

    await waitFor(() => {
      expect(promotionService.getVoucherUsages).toHaveBeenCalledWith('voucher-1');
      expect(screen.getByText(/Lịch sử sử dụng: PANDA50K/i)).toBeDefined();
      expect(screen.getByText('ORD-999')).toBeDefined();
      expect(screen.getByText('van@panda.vn')).toBeDefined();
    });
  });

  it('switches to Flash Sale tab and displays campaigns', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    const flashSaleTab = screen.getByText(/Flash Sale & Khung giờ vàng/i);
    fireEvent.click(flashSaleTab);

    await waitFor(() => {
      expect(screen.getByText('Flash Sale Cuối Tuần')).toBeDefined();
      expect(screen.getByText('+ Tạo chiến dịch Flash Sale')).toBeDefined();
      expect(screen.getByText('Chi tiết')).toBeDefined();
    });
  });

  it('opens FlashSaleFormModal when clicking "+ Tạo chiến dịch Flash Sale"', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    const flashSaleTab = screen.getByText(/Flash Sale & Khung giờ vàng/i);
    fireEvent.click(flashSaleTab);

    await waitFor(() => {
      expect(screen.getByText('+ Tạo chiến dịch Flash Sale')).toBeDefined();
    });

    fireEvent.click(screen.getByText('+ Tạo chiến dịch Flash Sale'));

    await waitFor(() => {
      expect(screen.getByText('Tạo chiến dịch Flash Sale mới')).toBeDefined();
      expect(screen.getByText('Tên chiến dịch Flash Sale')).toBeDefined();
    });
  });

  it('opens campaign detail modal when clicking "Chi tiết"', async () => {
    render(
      <BrowserRouter>
        <AdminPromotionsPage />
      </BrowserRouter>
    );

    const flashSaleTab = screen.getByText(/Flash Sale & Khung giờ vàng/i);
    fireEvent.click(flashSaleTab);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Chi tiết'));

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết chiến dịch: Flash Sale Cuối Tuần/i)).toBeDefined();
      expect(screen.getByText('iPhone 15 128GB')).toBeDefined();
    });
  });
});
