// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffCustomer360Page } from '../StaffCustomer360Page';
import { userService } from '../../../../services/userService';

// Mock matchMedia and ResizeObserver for Ant Design components in JSDOM
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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/userService', () => ({
  userService: {
    getCustomer360: vi.fn(),
  },
}));

const mockCustomer360Data = {
  customer: {
    id: 'cust-123',
    firstName: 'Văn A',
    lastName: 'Nguyễn',
    email: 'nguyenvana@example.com',
    phone: '0987654321',
    avatarUrl: 'https://example.com/avatar.jpg',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  metrics: {
    totalSpent: 15000000,
    totalOrders: 2,
    completedOrders: 1,
    cancelledOrders: 0,
    totalTickets: 1,
    openTickets: 1,
    activeWarranties: 1,
  },
  recentOrders: [
    {
      id: 'ord-1',
      orderNumber: 'ORD-2026-001',
      totalAmount: 12000000,
      status: 'COMPLETED',
      createdAt: '2026-02-01T10:00:00Z',
      items: [
        {
          id: 'item-1',
          productName: 'iPhone 15 Pro Max 256GB',
          quantity: 1,
          unitPrice: 12000000,
        },
      ],
    },
  ],
  warranties: [
    {
      id: 'war-1',
      imei: '861234567890123',
      status: 'ACTIVE',
      endDate: '2027-02-01T10:00:00Z',
      orderItem: {
        productName: 'iPhone 15 Pro Max 256GB',
      },
    },
  ],
  tickets: [
    {
      id: 'tick-1',
      code: 'TK-1001',
      title: 'Hỗ trợ kiểm tra máy nóng',
      category: 'Kỹ thuật',
      priority: 'HIGH',
      status: 'OPEN',
      createdAt: '2026-02-15T09:00:00Z',
    },
  ],
};

describe('StaffCustomer360Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches customer 360 data by id and renders profile and tabs', async () => {
    vi.mocked(userService.getCustomer360).mockResolvedValueOnce(mockCustomer360Data);

    render(
      <MemoryRouter initialEntries={['/staff/customers/cust-123']}>
        <Routes>
          <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
        </Routes>
      </MemoryRouter>
    );

    expect(userService.getCustomer360).toHaveBeenCalledWith('cust-123');

    // Check profile info
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
      expect(screen.getByText(/nguyenvana@example.com/)).toBeDefined();
      expect(screen.getByText(/0987654321/)).toBeDefined();
      expect(screen.getByText('Hoạt động')).toBeDefined();
    });

    // Check Orders Tab (default active tab)
    expect(screen.getByText(/Lịch sử Đơn hàng/)).toBeDefined();
    expect(screen.getByText('ORD-2026-001')).toBeDefined();
    expect(screen.getByText(/iPhone 15 Pro Max 256GB/)).toBeDefined();
    expect(screen.getByText(/12.000.000/)).toBeDefined();
    expect(screen.getByText('COMPLETED')).toBeDefined();

    // Check Warranties Tab
    expect(screen.getByText(/Bảo hành & Thiết bị/)).toBeDefined();
    const warrantyTab = screen.getByRole('tab', { name: /Bảo hành & Thiết bị/i });
    fireEvent.click(warrantyTab);

    await waitFor(() => {
      expect(screen.getByText('861234567890123')).toBeDefined();
      expect(screen.getByText('Còn hiệu lực')).toBeDefined();
    });

    // Check Tickets Tab
    expect(screen.getByText(/Lịch sử Hỗ trợ/)).toBeDefined();
    const ticketsTab = screen.getByRole('tab', { name: /Lịch sử Hỗ trợ/i });
    fireEvent.click(ticketsTab);

    await waitFor(() => {
      expect(screen.getByText('TK-1001')).toBeDefined();
      expect(screen.getByText('Hỗ trợ kiểm tra máy nóng')).toBeDefined();
      expect(screen.getByText('Kỹ thuật')).toBeDefined();
      expect(screen.getByText('OPEN')).toBeDefined();
    });
  });

  it('navigates back to /staff/customers when clicking back button', async () => {
    vi.mocked(userService.getCustomer360).mockResolvedValueOnce(mockCustomer360Data);

    const CustomerList = () => <div data-testid="customer-list">Customer Directory</div>;

    render(
      <MemoryRouter initialEntries={['/staff/customers/cust-123']}>
        <Routes>
          <Route path="/staff/customers" element={<CustomerList />} />
          <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    });

    const backButton = screen.getByRole('button', { name: /Quay lại Danh sách/i });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByTestId('customer-list')).toBeDefined();
    });
  });

  it('renders error alert when API call fails', async () => {
    vi.mocked(userService.getCustomer360).mockRejectedValueOnce({
      response: { data: { message: 'Customer not found' } },
    });

    render(
      <MemoryRouter initialEntries={['/staff/customers/unknown']}>
        <Routes>
          <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Customer not found')).toBeDefined();
      expect(screen.getByRole('button', { name: /Quay lại danh sách/i })).toBeDefined();
    });
  });
});
