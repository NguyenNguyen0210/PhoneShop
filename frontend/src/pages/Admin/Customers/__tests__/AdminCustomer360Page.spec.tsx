// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminCustomer360Page } from '../AdminCustomer360Page';
import { customerService } from '../../../../services/customerService';

// Mock window.matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/customerService', () => ({
  customerService: {
    getCustomer360: vi.fn(),
  },
}));

const mockCustomer360Data = {
  customer: {
    id: '8a052a54-169d-40ba-b96f-4cf0c704afdd',
    email: 'vy.nguyenkhanh98@gmail.com',
    firstName: 'Vy',
    lastName: 'Nguyễn Khánh',
    phone: '0901234540',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-01T14:57:39.124Z',
    lastLoginAt: '2026-10-06T12:33:39.124Z',
  },
  metrics: {
    totalSpent: 71470000,
    totalOrders: 3,
    completedOrders: 3,
    processingOrders: 0,
    cancelledOrders: 0,
    totalTickets: 1,
    openTickets: 0,
    activeWarranties: 1,
    totalInstallments: 1,
    approvedInstallments: 1,
  },
  addresses: [
    {
      id: 'addr-1',
      recipientName: 'Nguyễn Khánh Vy',
      phone: '0901234540',
      addressLine1: '123 Võ Văn Ngân',
      ward: 'Phường Linh Chiểu',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  ],
  recentOrders: [
    {
      id: 'ord-1',
      orderNumber: 'ORD-20260916-0120',
      status: 'COMPLETED',
      totalAmount: 34990000,
      paymentStatus: 'PAID',
      createdAt: '2026-09-15T17:56:05.790Z',
      items: [
        {
          id: 'item-1',
          productName: 'ASUS ROG Phone 9 Pro',
          quantity: 1,
          price: 34990000,
        },
      ],
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-20260728-0080',
      status: 'COMPLETED',
      totalAmount: 27990000,
      paymentStatus: 'PAID',
      createdAt: '2026-07-27T17:56:05.790Z',
      items: [
        {
          id: 'item-2',
          productName: 'Samsung Galaxy Z Flip7',
          quantity: 1,
          price: 27990000,
        },
      ],
    },
  ],
  warranties: [
    {
      id: 'war-1',
      warrantyCode: 'WAR-2026-VY5588',
      imei: '862938061294819',
      status: 'ACTIVE',
      startDate: '2026-06-03T11:04:40.075Z',
      endDate: '2027-06-03T11:04:40.075Z',
      notes: 'Bảo hành chính hãng 12 tháng',
      orderItem: {
        productName: 'Xiaomi Redmi Note 13 Pro 5G',
        variant: { sku: 'RN13P-128', color: 'Xanh', storage: '128GB' },
      },
    },
  ],
  installments: [
    {
      id: 'inst-1',
      provider: 'HOME_CREDIT',
      termMonths: 6,
      monthlyPayment: 1040025,
      status: 'APPROVED',
      createdAt: '2026-06-03T11:04:40.075Z',
      order: {
        orderNumber: 'ORD-20260603-0040',
      },
    },
  ],
  tickets: [
    {
      id: 'tck-1',
      code: 'TCK-2026-VY01',
      title: 'Tư vấn gói bảo hành rơi vỡ VIP Care',
      category: 'WARRANTY_SUPPORT',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      createdAt: '2026-09-20T10:00:00.000Z',
    },
  ],
};

describe('AdminCustomer360Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders 2-column CRM layout with left identity sidebar and right compact KPIs & tabs', async () => {
    vi.mocked(customerService.getCustomer360).mockResolvedValueOnce(mockCustomer360Data);

    render(
      <MemoryRouter initialEntries={['/admin/customers/8a052a54-169d-40ba-b96f-4cf0c704afdd']}>
        <Routes>
          <Route path="/admin/customers/:id" element={<AdminCustomer360Page />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Left Identity Sidebar checks (appears in header, card, and address)
      const vyNames = screen.getAllByText(/Nguyễn Khánh Vy/);
      expect(vyNames.length).toBeGreaterThan(0);
      expect(screen.getByText('vy.nguyenkhanh98@gmail.com')).toBeTruthy();
      expect(screen.getAllByText('0901234540').length).toBeGreaterThan(0);
      expect(screen.getByText('VIP Kim Cương')).toBeTruthy();
      expect(screen.getByText('Đang hoạt động')).toBeTruthy();

      // Default Address checks
      expect(screen.getByText(/123 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh/)).toBeTruthy();

      // Right Compact KPIs checks
      expect(screen.getByText('71.470.000 đ')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('(3 hoàn tất)')).toBeTruthy();

      // Recent Orders in Tab
      expect(screen.getByText('ORD-20260916-0120')).toBeTruthy();
      expect(screen.getByText('ASUS ROG Phone 9 Pro')).toBeTruthy();
      expect(screen.getByText('Samsung Galaxy Z Flip7')).toBeTruthy();
      expect(screen.getByText('34.990.000 đ')).toBeTruthy();
    });

    // Check switching to Warranties Tab
    const warrantyTab = screen.getByText(/Thiết bị & Bảo hành \(/);
    fireEvent.click(warrantyTab);

    await waitFor(() => {
      expect(screen.getByText('Xiaomi Redmi Note 13 Pro 5G')).toBeTruthy();
      expect(screen.getByText('WAR-2026-VY5588')).toBeTruthy();
      expect(screen.getByText(/862938061294819/)).toBeTruthy();
      expect(screen.getByText('Còn hiệu lực')).toBeTruthy();
    });

    // Check switching to Installments Tab
    const installmentTab = screen.getByText(/Hồ sơ Trả góp \(/);
    fireEvent.click(installmentTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-20260603-0040')).toBeTruthy();
      expect(screen.getByText('6 tháng')).toBeTruthy();
      expect(screen.getByText('1.040.025 đ')).toBeTruthy();
      expect(screen.getByText('Đã phê duyệt')).toBeTruthy();
    });

    // Check switching to Tickets Tab
    const ticketTab = screen.getByText(/Vé Hỗ trợ \(/);
    fireEvent.click(ticketTab);

    await waitFor(() => {
      expect(screen.getByText('TCK-2026-VY01')).toBeTruthy();
      expect(screen.getByText('Tư vấn gói bảo hành rơi vỡ VIP Care')).toBeTruthy();
      expect(screen.getByText('Đã giải quyết')).toBeTruthy();
    });
  });

  it('allows adding an internal CRM note for staff communication', async () => {
    vi.mocked(customerService.getCustomer360).mockResolvedValueOnce(mockCustomer360Data);

    render(
      <MemoryRouter initialEntries={['/admin/customers/8a052a54-169d-40ba-b96f-4cf0c704afdd']}>
        <Routes>
          <Route path="/admin/customers/:id" element={<AdminCustomer360Page />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Nguyễn Khánh Vy/).length).toBeGreaterThan(0);
    });

    // Click "Thêm ghi chú CRM"
    const addNoteBtn = screen.getByText('Thêm ghi chú CRM');
    fireEvent.click(addNoteBtn);

    await waitFor(() => {
      expect(screen.getByText('Thêm Ghi chú CRM Nội bộ')).toBeTruthy();
    });

    const textarea = screen.getByPlaceholderText(/Khách quan tâm iPhone 16 Pro Max/);
    fireEvent.change(textarea, { target: { value: 'Khách muốn mua trả góp 0% đợt khuyến mãi cuối năm' } });

    const saveBtn = screen.getByText('Lưu ghi chú');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Khách muốn mua trả góp 0% đợt khuyến mãi cuối năm').length).toBeGreaterThan(0);
    });
  });
});
