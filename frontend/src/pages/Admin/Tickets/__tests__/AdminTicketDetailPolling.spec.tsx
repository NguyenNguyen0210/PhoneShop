// @vitest-environment jsdom
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AdminTicketDetailPage } from '../AdminTicketDetailPage';
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ticket-123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../../../services/ticketService', () => ({
  ticketService: {
    getAdminTicketDetail: vi.fn(),
    addAdminReply: vi.fn(),
    updateTicketStatus: vi.fn(),
    assignTicket: vi.fn(),
  },
}));

const mockTicketInitial = {
  id: 'ticket-123',
  code: 'TK-1001',
  title: 'Màn hình bị sọc xanh',
  category: 'WARRANTY_SUPPORT',
  priority: 'HIGH',
  status: 'OPEN',
  userId: 'user-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  user: {
    id: 'user-1',
    firstName: 'Văn A',
    lastName: 'Nguyễn',
    email: 'vana@example.com',
    phone: '0901234567',
  },
  messages: [
    {
      id: 'msg-1',
      ticketId: 'ticket-123',
      senderId: 'user-1',
      message: 'Màn hình của tôi xuất hiện sọc xanh từ sáng nay',
      attachments: [],
      isInternalNote: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      sender: {
        id: 'user-1',
        firstName: 'Văn A',
        lastName: 'Nguyễn',
        avatarUrl: null,
      },
    },
  ],
};

const mockTicketUpdated = {
  ...mockTicketInitial,
  messages: [
    ...mockTicketInitial.messages,
    {
      id: 'msg-2',
      ticketId: 'ticket-123',
      senderId: 'user-1',
      message: 'Tôi đã khởi động lại nhưng vẫn bị lỗi',
      attachments: [],
      isInternalNote: false,
      createdAt: '2026-10-01T10:05:00.000Z',
      sender: {
        id: 'user-1',
        firstName: 'Văn A',
        lastName: 'Nguyễn',
        avatarUrl: null,
      },
    },
  ],
};

describe('AdminTicketDetailPage Polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('periodically polls ticket details via ticketService.getAdminTicketDetail every 3.5 seconds', async () => {
    vi.mocked(ticketService.getAdminTicketDetail).mockResolvedValue(mockTicketInitial as any);

    render(<AdminTicketDetailPage />);

    // Initial load call
    await act(async () => {
      await Promise.resolve();
    });

    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledTimes(1);
    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledWith('ticket-123');
    expect(screen.getByText('Màn hình bị sọc xanh')).toBeTruthy();

    // Advance by 3.5 seconds (3500ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledTimes(2);

    // Advance by another 3.5 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledTimes(3);
  });

  it('smoothly updates conversation with new messages fetched via polling', async () => {
    vi.mocked(ticketService.getAdminTicketDetail).mockResolvedValueOnce(mockTicketInitial as any);

    render(<AdminTicketDetailPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Màn hình của tôi xuất hiện sọc xanh từ sáng nay')).toBeTruthy();
    expect(screen.queryByText('Tôi đã khởi động lại nhưng vẫn bị lỗi')).toBeNull();

    // Next polling response returns a new message
    vi.mocked(ticketService.getAdminTicketDetail).mockResolvedValueOnce(mockTicketUpdated as any);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(screen.getByText('Tôi đã khởi động lại nhưng vẫn bị lỗi')).toBeTruthy();
  });

  it('cleans up polling interval when component unmounts', async () => {
    vi.mocked(ticketService.getAdminTicketDetail).mockResolvedValue(mockTicketInitial as any);

    const { unmount } = render(<AdminTicketDetailPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledTimes(1);

    // Unmount component
    unmount();

    // Advance timers by 7 seconds (two polling cycles)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });

    // Should not have made any more calls after unmount
    expect(ticketService.getAdminTicketDetail).toHaveBeenCalledTimes(1);
  });
});
