// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminTicketsPage } from '../AdminTicketsPage';
import { ticketService } from '../../../../services/ticketService';

// Mock matchMedia for Ant Design in jsdom
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

// Mock ResizeObserver for Ant Design in jsdom
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../services/ticketService', () => ({
  ticketService: {
    getAdminTickets: vi.fn(),
    getAdminTicketAnalytics: vi.fn(),
  },
}));

const mockTickets = [
  {
    id: 'ticket-1',
    code: 'TK-202610-0001',
    title: 'Yêu cầu đổi địa chỉ nhận hàng',
    category: 'ORDER_INQUIRY',
    priority: 'HIGH',
    status: 'OPEN',
    userId: 'user-1',
    user: {
      id: 'user-1',
      firstName: 'Phong',
      lastName: 'Thái Đình',
      email: 'phong@example.com',
    },
    order: {
      id: 'ord-1',
      orderNumber: 'ORD-20260827-0105',
    },
    assignedTo: null,
    _count: { messages: 1 },
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:10:00Z',
  },
  {
    id: 'ticket-2',
    code: 'TK-202610-0002',
    title: '[Live Chat] Tư vấn chọn màu iPhone 15 Pro',
    category: 'PRODUCT_INQUIRY',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    userId: 'user-2',
    user: {
      id: 'user-2',
      firstName: 'Nhi',
      lastName: 'Bùi Yến',
      email: 'nhi@example.com',
    },
    order: null,
    assignedTo: {
      id: 'staff-1',
      firstName: 'Staff',
      lastName: 'Support',
      email: 'staff@phoneshop.vn',
    },
    _count: { messages: 3 },
    createdAt: '2026-10-06T11:00:00Z',
    updatedAt: '2026-10-06T11:15:00Z',
  },
];

const mockAnalytics = {
  open: 3,
  inProgress: 4,
  resolved: 6,
  urgent: 2,
  total: 13,
};

describe('AdminTicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketService.getAdminTickets).mockResolvedValue({
      data: mockTickets,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    } as any);
    vi.mocked(ticketService.getAdminTicketAnalytics).mockResolvedValue(mockAnalytics as any);
  });

  it('renders page header and global KPI summary cards', async () => {
    render(
      <BrowserRouter>
        <AdminTicketsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Quản lý Vé Hỗ trợ & Inquiry Khách hàng')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Chờ tiếp nhận').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đang giải quyết').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đã xử lý xong').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cần xử lý gấp').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('6').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
  });

  it('renders ticket table with rows, badges, and action buttons', async () => {
    render(
      <BrowserRouter>
        <AdminTicketsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('TK-202610-0001')).toBeDefined();
      expect(screen.getByText('Yêu cầu đổi địa chỉ nhận hàng')).toBeDefined();
      expect(screen.getByText('TK-202610-0002')).toBeDefined();
      expect(screen.getByText('[Live Chat] Tư vấn chọn màu iPhone 15 Pro')).toBeDefined();
    });

    expect(screen.getByText('Live Chat')).toBeDefined();
    expect(screen.getByText('Xử lý vé')).toBeDefined();
    expect(screen.getByText('Mở phòng chat')).toBeDefined();
  });

  it('toggles live chat filter when clicking "Tin Live Chat"', async () => {
    render(
      <BrowserRouter>
        <AdminTicketsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tin Live Chat')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Tin Live Chat'));

    await waitFor(() => {
      expect(screen.getByText('Đang lọc Live Chat')).toBeDefined();
      expect(ticketService.getAdminTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '[Live Chat]',
        })
      );
    });
  });
});
