// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ProductHighlightsSection } from '../ProductHighlightsSection';
import { reviewService } from '../../../../services/reviewService';
import { apiClient } from '../../../../services/apiClient';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { Product } from '../../../../types';

const mockProduct: Product = {
  id: 'prod-100',
  name: 'iPhone 15 Pro',
  slug: 'iphone-15-pro',
  description: 'Test description',
  brandId: 'b1',
  categoryId: 'c1',
  variants: [],
  status: 'ACTIVE',
  rating: 5,
  reviewCount: 1,
  reviews: [
    {
      id: 'rev-100',
      userId: 'u-user',
      productId: 'prod-100',
      rating: 5,
      title: 'Hài lòng',
      content: 'Máy dùng rất sướng',
      status: 'APPROVED',
      isVerified: true,
      createdAt: '2026-10-03T00:00:00Z',
      user: { id: 'u-user', firstName: 'Nam', lastName: 'Lê' },
      replies: [],
    },
  ],
};

vi.mock('../../../../services/reviewService', () => ({
  reviewService: {
    getMyReviewStatus: vi.fn().mockResolvedValue({ hasPurchased: false, canReview: false, myReview: null }),
    createReply: vi.fn(),
  },
}));

vi.mock('../../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/reviews') {
        return Promise.resolve({ data: mockProduct.reviews });
      }
      return Promise.resolve({ data: [] });
    }),
  },
}));

describe('ProductHighlightsSection Staff CSKH Reply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does NOT show reply button for regular customer USER', async () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'user@example.com', fullName: 'Normal User', role: 'USER' } as any,
    });

    render(<ProductHighlightsSection product={mockProduct} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    expect(screen.queryByText('Trả lời đánh giá')).toBeNull();
  });

  it('shows reply button and submits reply for STAFF', async () => {
    useAuthStore.setState({
      user: { id: 'staff-1', email: 'staff@phoneshop.com', fullName: 'Staff 1', role: 'STAFF' } as any,
    });

    const newReply = {
      id: 'rep-999',
      reviewId: 'rev-100',
      userId: 'staff-1',
      content: 'PhoneShop cảm ơn quý khách!',
      createdAt: '2026-10-03T10:00:00Z',
      user: {
        id: 'staff-1',
        firstName: 'Staff',
        lastName: 'One',
        roles: [{ role: { name: 'STAFF' } }],
      },
    };
    vi.mocked(reviewService.createReply).mockResolvedValueOnce(newReply);

    render(<ProductHighlightsSection product={mockProduct} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    // Click "Trả lời đánh giá"
    const replyTriggerBtn = screen.getByText('Trả lời đánh giá');
    expect(replyTriggerBtn).toBeTruthy();
    fireEvent.click(replyTriggerBtn);

    // Form appears
    expect(screen.getByPlaceholderText('Nhập nội dung phản hồi gửi khách hàng...')).toBeTruthy();
    expect(screen.getByText('Trả lời với tư cách PhoneShop CSKH')).toBeTruthy();

    const textarea = screen.getByPlaceholderText('Nhập nội dung phản hồi gửi khách hàng...');
    fireEvent.change(textarea, { target: { value: 'PhoneShop cảm ơn quý khách!' } });

    const submitBtn = screen.getByText('Gửi phản hồi');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.createReply).toHaveBeenCalledWith('rev-100', 'PhoneShop cảm ơn quý khách!');
    });

    // Check newly added reply is visible
    await waitFor(() => {
      expect(screen.getByText('PhoneShop cảm ơn quý khách!')).toBeTruthy();
      expect(screen.getByText('Phản hồi từ PhoneShop')).toBeTruthy();
    });
  });

  it('disables submit button when text is empty and closes form on cancel', async () => {
    useAuthStore.setState({
      user: { id: 'staff-1', email: 'staff@phoneshop.com', fullName: 'Staff 1', role: 'STAFF' } as any,
    });

    render(<ProductHighlightsSection product={mockProduct} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    const replyTriggerBtn = screen.getByText('Trả lời đánh giá');
    fireEvent.click(replyTriggerBtn);

    const submitBtn = screen.getByText('Gửi phản hồi') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const cancelBtn = screen.getByText('Hủy');
    fireEvent.click(cancelBtn);

    expect(screen.queryByPlaceholderText('Nhập nội dung phản hồi gửi khách hàng...')).toBeNull();
    expect(screen.getByText('Trả lời đánh giá')).toBeTruthy();
  });
});
