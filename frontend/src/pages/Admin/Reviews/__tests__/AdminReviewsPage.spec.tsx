// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AdminReviewsPage } from '../AdminReviewsPage';
import { reviewService } from '../../../../services/reviewService';
import { useAuthStore } from '../../../../stores/useAuthStore';

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

vi.mock('../../../../services/reviewService', () => ({
  reviewService: {
    getAdminReviews: vi.fn(),
    approveReview: vi.fn(),
    rejectReview: vi.fn(),
    deleteReviewAdmin: vi.fn(),
  },
}));

const mockReviews = [
  {
    id: 'rev-1',
    productId: 'p-1',
    userId: 'u-1',
    rating: 5,
    title: 'Máy rất đẹp',
    content: 'Dùng mượt mà pin trâu',
    status: 'PENDING',
    isVerified: true,
    createdAt: '2026-10-03T10:00:00Z',
    product: { id: 'p-1', name: 'iPhone 15 Pro Max', thumbnail: 'https://example.com/p1.jpg' },
    user: { id: 'u-1', firstName: 'Văn A', lastName: 'Nguyễn', email: 'vana@example.com' },
    replies: [],
  },
  {
    id: 'rev-2',
    productId: 'p-2',
    userId: 'u-2',
    rating: 1,
    title: 'Giao hàng trễ',
    content: 'Đóng gói móp méo',
    status: 'APPROVED',
    isVerified: false,
    createdAt: '2026-10-02T10:00:00Z',
    product: { id: 'p-2', name: 'Samsung Galaxy S24', thumbnail: 'https://example.com/p2.jpg' },
    user: { id: 'u-2', firstName: 'Thị B', lastName: 'Trần', email: 'thib@example.com' },
    replies: [],
  },
];

describe('AdminReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviewService.getAdminReviews).mockResolvedValue({
      data: mockReviews as any,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders review table and displays customer reviews', async () => {
    useAuthStore.setState({
      user: { id: 'staff-1', email: 'staff@phoneshop.com', fullName: 'Staff User', role: 'STAFF' } as any,
    });

    render(<AdminReviewsPage />);

    expect(screen.getByText('Quản lý Đánh giá & Kiểm duyệt')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeTruthy();
      expect(screen.getByText('Máy rất đẹp')).toBeTruthy();
    });
  });

  it('hides delete button for STAFF and shows for ADMIN', async () => {
    // 1. Staff role: no delete button
    useAuthStore.setState({
      user: { id: 'staff-1', email: 'staff@phoneshop.com', fullName: 'Staff User', role: 'STAFF' } as any,
    });

    const { unmount } = render(<AdminReviewsPage />);
    await waitFor(() => expect(screen.getByText('iPhone 15 Pro Max')).toBeTruthy());

    expect(screen.queryByTitle('Xóa vĩnh viễn')).toBeNull();
    unmount();

    // 2. Admin role: has delete button
    useAuthStore.setState({
      user: { id: 'admin-1', email: 'admin@phoneshop.com', fullName: 'Admin User', role: 'ADMIN' } as any,
    });

    render(<AdminReviewsPage />);
    await waitFor(() => expect(screen.getByText('iPhone 15 Pro Max')).toBeTruthy());

    const deleteButtons = screen.getAllByTitle('Xóa vĩnh viễn');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('calls approveReview when clicking Duyệt button', async () => {
    vi.mocked(reviewService.approveReview).mockResolvedValueOnce({ id: 'rev-1', status: 'APPROVED' } as any);

    useAuthStore.setState({
      user: { id: 'staff-1', email: 'staff@phoneshop.com', fullName: 'Staff User', role: 'STAFF' } as any,
    });

    render(<AdminReviewsPage />);
    await waitFor(() => expect(screen.getByText('iPhone 15 Pro Max')).toBeTruthy());

    const approveBtn = screen.getByTitle('Duyệt đánh giá này');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(reviewService.approveReview).toHaveBeenCalledWith('rev-1');
    });
  });
});
