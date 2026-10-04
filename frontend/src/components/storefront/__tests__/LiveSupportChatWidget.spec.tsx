// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LiveSupportChatWidget } from '../LiveSupportChatWidget';
import { ticketService } from '../../../services/ticketService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { Ticket } from '../../../types/ticket';

vi.mock('../../../services/ticketService', () => ({
  ticketService: {
    getMyTickets: vi.fn(),
    getTicketDetail: vi.fn(),
    createTicket: vi.fn(),
    replyTicket: vi.fn(),
    closeTicket: vi.fn(),
  },
}));

describe('LiveSupportChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({ user: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders collapsed circular button with tooltip and opens widget on click', async () => {
    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    // Collapsed button should exist
    const openBtn = screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i });
    expect(openBtn).toBeTruthy();
    expect(screen.getByText(/Cần hỗ trợ\? Chat ngay/i)).toBeTruthy();

    // Widget dialog should not be rendered yet
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click button to open
    fireEvent.click(openBtn);

    // Now dialog should be open
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Hỗ trợ khách hàng PhoneShop')).toBeTruthy();
    expect(screen.getByText('Trực tuyến')).toBeTruthy();
  });

  it('minimizes and closes the chat window when buttons clicked', async () => {
    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    // Open widget
    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Click minimize button
    const minimizeBtn = screen.getByRole('button', { name: /Thu nhỏ/i });
    fireEvent.click(minimizeBtn);

    // Dialog should be closed, button reappears
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i })).toBeTruthy();

    // Open again and click close button
    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));
    const closeBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('prompts login with Link to /login when user is not authenticated', async () => {
    useAuthStore.setState({ user: null });

    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    // Open widget
    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));

    // Should prompt login
    expect(screen.getByText(/Vui lòng đăng nhập để bắt đầu trò chuyện/i)).toBeTruthy();
    const loginLink = screen.getByRole('link', { name: /Đăng nhập để chat với nhân viên/i });
    expect(loginLink).toBeTruthy();
    expect(loginLink.getAttribute('href')).toBe('/login');

    // Should not call ticketService
    expect(ticketService.getMyTickets).not.toHaveBeenCalled();
  });

  it('loads active ticket and displays customer & staff messages while filtering internal notes', async () => {
    const mockUser = {
      id: 'customer-1',
      email: 'customer@test.com',
      fullName: 'Nguyễn Văn A',
      role: 'USER',
    };
    useAuthStore.setState({ user: mockUser as any });

    const mockOpenTicket: Ticket = {
      id: 'ticket-101',
      code: 'TCK-101',
      title: '[Live Chat] Hỗ trợ khách hàng',
      category: 'PRODUCT_INQUIRY',
      priority: 'MEDIUM',
      status: 'OPEN',
      userId: 'customer-1',
      createdAt: '2026-10-04T08:00:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
    };

    const mockTicketDetail: Ticket = {
      ...mockOpenTicket,
      messages: [
        {
          id: 'msg-1',
          ticketId: 'ticket-101',
          senderId: 'customer-1',
          message: 'Chào shop, iPhone 15 Pro còn màu titan tự nhiên không?',
          attachments: [],
          isInternalNote: false,
          createdAt: '2026-10-04T08:00:00Z',
        },
        {
          id: 'msg-2',
          ticketId: 'ticket-101',
          senderId: 'staff-9',
          sender: {
            id: 'staff-9',
            firstName: 'Lan',
            lastName: 'CSKH',
            avatarUrl: null,
            roles: [{ role: { name: 'STAFF' } }],
          },
          message: 'Dạ chào anh A, màu titan tự nhiên bên em vẫn còn sẵn hàng ạ!',
          attachments: [],
          isInternalNote: false,
          createdAt: '2026-10-04T08:01:00Z',
        },
        {
          id: 'msg-3',
          ticketId: 'ticket-101',
          senderId: 'staff-9',
          message: 'Private internal note for staff only',
          attachments: [],
          isInternalNote: true, // Internal message
          createdAt: '2026-10-04T08:01:30Z',
        },
        {
          id: 'msg-4',
          ticketId: 'ticket-101',
          senderId: 'staff-9',
          message: 'Another internal message with isInternal true',
          attachments: [],
          isInternalNote: false,
          createdAt: '2026-10-04T08:01:45Z',
          ...({ isInternal: true } as any),
        },
      ],
    };

    vi.mocked(ticketService.getMyTickets).mockResolvedValueOnce({
      items: [mockOpenTicket],
      total: 1,
    } as any);

    vi.mocked(ticketService.getTicketDetail).mockResolvedValueOnce(mockTicketDetail as any);

    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    // Open widget
    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));

    // Wait for ticket detail to be loaded
    await waitFor(() => {
      expect(ticketService.getMyTickets).toHaveBeenCalledWith({ limit: 10 });
      expect(ticketService.getTicketDetail).toHaveBeenCalledWith('ticket-101');
    });

    // Customer message should be rendered
    const customerMsg = screen.getByText('Chào shop, iPhone 15 Pro còn màu titan tự nhiên không?');
    expect(customerMsg).toBeTruthy();
    const customerBubble = customerMsg.closest('div');
    expect(customerBubble?.className).toContain('bg-blue-600');
    expect(customerBubble?.className).toContain('text-white');

    // Staff message should be rendered with CSKH badge and staff name
    const staffMsg = screen.getByText('Dạ chào anh A, màu titan tự nhiên bên em vẫn còn sẵn hàng ạ!');
    expect(staffMsg).toBeTruthy();
    expect(screen.getByText('Lan CSKH')).toBeTruthy();
    expect(screen.getByText('CSKH')).toBeTruthy();
    const staffBubble = staffMsg.closest('div');
    expect(staffBubble?.className).toContain('bg-slate-100');
    expect(staffBubble?.className).toContain('text-slate-800');

    // Internal messages MUST NOT be rendered
    expect(screen.queryByText('Private internal note for staff only')).toBeNull();
    expect(screen.queryByText('Another internal message with isInternal true')).toBeNull();
  });

  it('sends reply message via form submit and enter key', async () => {
    const mockUser = { id: 'customer-1', fullName: 'Khách hàng', role: 'USER' };
    useAuthStore.setState({ user: mockUser as any });

    const mockTicket: Ticket = {
      id: 'ticket-101',
      code: 'TCK-101',
      title: '[Live Chat] Hỗ trợ',
      category: 'PRODUCT_INQUIRY',
      priority: 'MEDIUM',
      status: 'OPEN',
      userId: 'customer-1',
      createdAt: '2026-10-04T08:00:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
      messages: [],
    };

    vi.mocked(ticketService.getMyTickets).mockResolvedValueOnce({ items: [mockTicket] } as any);
    vi.mocked(ticketService.getTicketDetail).mockResolvedValue(mockTicket as any);
    vi.mocked(ticketService.replyTicket).mockResolvedValue({ id: 'reply-1', message: 'Test reply' } as any);

    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));

    await waitFor(() => {
      expect(ticketService.getMyTickets).toHaveBeenCalled();
    });

    const replyInput = screen.getByPlaceholderText('Nhập tin nhắn...') as HTMLTextAreaElement;
    const sendBtn = screen.getByRole('button', { name: /Gửi tin nhắn/i });

    // Type message
    fireEvent.change(replyInput, { target: { value: 'Tôi muốn đặt hàng ngay bây giờ' } });
    expect(replyInput.value).toBe('Tôi muốn đặt hàng ngay bây giờ');

    // Click send
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(ticketService.replyTicket).toHaveBeenCalledWith('ticket-101', {
        message: 'Tôi muốn đặt hàng ngay bây giờ',
      });
    });

    // Input should be cleared
    expect(replyInput.value).toBe('');

    // Test Enter key sending
    fireEvent.change(replyInput, { target: { value: 'Giao nhanh trong 2h được không?' } });
    fireEvent.keyDown(replyInput, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(ticketService.replyTicket).toHaveBeenCalledWith('ticket-101', {
        message: 'Giao nhanh trong 2h được không?',
      });
    });
  });

  it('shows starter form when no active ticket exists and creates ticket upon submit', async () => {
    const mockUser = { id: 'customer-1', fullName: 'User A', role: 'USER' };
    useAuthStore.setState({ user: mockUser as any });

    // No open ticket
    vi.mocked(ticketService.getMyTickets).mockResolvedValueOnce({
      items: [{ id: 'old-closed', status: 'CLOSED' }],
    } as any);

    const createdTicket: Ticket = {
      id: 'ticket-new',
      code: 'TCK-NEW',
      title: '[Live Chat] Hỗ trợ khách hàng',
      category: 'WARRANTY_SUPPORT',
      priority: 'MEDIUM',
      status: 'OPEN',
      userId: 'customer-1',
      createdAt: '2026-10-04T08:00:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
      messages: [
        {
          id: 'msg-start',
          ticketId: 'ticket-new',
          senderId: 'customer-1',
          message: 'Tôi muốn bảo hành máy sạc không vào',
          attachments: [],
          isInternalNote: false,
          createdAt: '2026-10-04T08:00:00Z',
        },
      ],
    };

    vi.mocked(ticketService.createTicket).mockResolvedValueOnce(createdTicket as any);
    vi.mocked(ticketService.getTicketDetail).mockResolvedValueOnce(createdTicket as any);

    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));

    // Wait for starter form to show
    await waitFor(() => {
      expect(screen.getByText('Bắt đầu yêu cầu tư vấn')).toBeTruthy();
      expect(screen.getByText('Bắt đầu trò chuyện')).toBeTruthy();
    });

    const categorySelect = screen.getByLabelText(/Chủ đề cần hỗ trợ/i);
    const initialTextarea = screen.getByPlaceholderText(/Mô tả thắc mắc của bạn.../i);

    // Select 'Bảo hành' (WARRANTY_SUPPORT)
    fireEvent.change(categorySelect, { target: { value: 'WARRANTY_SUPPORT' } });
    fireEvent.change(initialTextarea, {
      target: { value: 'Tôi muốn bảo hành máy sạc không vào' },
    });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu trò chuyện/i }));

    await waitFor(() => {
      expect(ticketService.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[Live Chat] Hỗ trợ khách hàng',
          category: 'WARRANTY_SUPPORT',
          description: 'Tôi muốn bảo hành máy sạc không vào',
          message: 'Tôi muốn bảo hành máy sạc không vào',
        })
      );
    });

    // Should load the created ticket detail and display message
    await waitFor(() => {
      expect(screen.getByText('Tôi muốn bảo hành máy sạc không vào')).toBeTruthy();
    });
  });

  it('starts polling ticket details every 3.5s when open and stops when closed', async () => {
    vi.useFakeTimers();

    const mockUser = { id: 'customer-1', fullName: 'User A', role: 'USER' };
    useAuthStore.setState({ user: mockUser as any });

    const mockTicket: Ticket = {
      id: 'ticket-101',
      code: 'TCK-101',
      title: '[Live Chat] Hỗ trợ',
      category: 'PRODUCT_INQUIRY',
      priority: 'MEDIUM',
      status: 'OPEN',
      userId: 'customer-1',
      createdAt: '2026-10-04T08:00:00Z',
      updatedAt: '2026-10-04T08:00:00Z',
      messages: [],
    };

    vi.mocked(ticketService.getMyTickets).mockResolvedValue({ items: [mockTicket] } as any);
    vi.mocked(ticketService.getTicketDetail).mockResolvedValue(mockTicket as any);

    render(
      <BrowserRouter>
        <LiveSupportChatWidget />
      </BrowserRouter>
    );

    // Open widget
    fireEvent.click(screen.getByRole('button', { name: /Cần hỗ trợ\? Chat ngay/i }));

    // Run microtasks for initial fetch
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ticketService.getTicketDetail).toHaveBeenCalledTimes(1);

    // Advance by 3500ms
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(ticketService.getTicketDetail).toHaveBeenCalledTimes(2);

    // Advance another 3500ms
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(ticketService.getTicketDetail).toHaveBeenCalledTimes(3);

    // Close widget
    fireEvent.click(screen.getByRole('button', { name: /Đóng/i }));

    // Advance time again - polling should have stopped
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    expect(ticketService.getTicketDetail).toHaveBeenCalledTimes(3);
  });
});
