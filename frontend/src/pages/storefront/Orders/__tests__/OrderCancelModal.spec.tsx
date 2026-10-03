// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { OrderCancelModal, CANCEL_REASONS } from '../components/OrderCancelModal';
import { orderService } from '../../../../services/orderService';
import type { Order } from '../../../../types';

describe('OrderCancelModal', () => {
  afterEach(() => {
    cleanup();
  });
  const mockOrder: Order = {
    id: 'order-123',
    orderNumber: 'ORD-99999',
    customerName: 'Nguyen Van A',
    shippingPhone: '0901234567',
    shippingAddress: '123 Le Loi, Q1, HCM',
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    subtotal: 10000000,
    shippingFee: 30000,
    discount: 50000,
    totalAmount: 9980000,
    items: [
      {
        id: 'item-1',
        orderId: 'order-123',
        variantId: 'variant-1',
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        unitPrice: 28000000,
        totalPrice: 28000000,
        variant: {
          id: 'variant-1',
          productId: 'prod-1',
          sku: 'IP15PM-256-TI',
          color: 'Titan',
          storage: '256GB',
          price: 28000000,
        },
      },
    ],
    createdAt: '2026-10-01T10:00:00Z',
  };

  const defaultProps = {
    order: mockOrder,
    isOpen: true,
    onClose: vi.fn(),
    onCancelled: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render modal when isOpen is false', () => {
    render(<OrderCancelModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal title and reason radio options when isOpen is true', () => {
    render(<OrderCancelModal {...defaultProps} />);

    // Check modal title
    expect(
      screen.getByText(`Hủy đơn hàng #${mockOrder.orderNumber}`)
    ).toBeTruthy();

    // Check notice about reserved IMEIs and voucher release
    expect(
      screen.getByText(/Mọi thiết bị\/IMEI đã giữ chỗ.*voucher/i)
    ).toBeTruthy();

    // Check reason radio options
    for (const reason of CANCEL_REASONS) {
      expect(screen.getByLabelText(reason)).toBeTruthy();
    }
  });

  it('calls orderService.cancelMyOrder and onCancelled callback when submitted', async () => {
    const updatedOrder: Order = { ...mockOrder, status: 'CANCELLED' };
    vi.spyOn(orderService, 'cancelMyOrder').mockResolvedValue(updatedOrder);

    render(<OrderCancelModal {...defaultProps} />);

    // Default reason is 'Đổi ý không muốn mua nữa'
    const submitBtn = screen.getByRole('button', { name: /Xác nhận hủy/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(orderService.cancelMyOrder).toHaveBeenCalledWith(
        'order-123',
        'Đổi ý không muốn mua nữa'
      );
      expect(defaultProps.onCancelled).toHaveBeenCalledWith(updatedOrder);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('allows selecting another reason and submits selected reason', async () => {
    const updatedOrder: Order = { ...mockOrder, status: 'CANCELLED' };
    vi.spyOn(orderService, 'cancelMyOrder').mockResolvedValue(updatedOrder);

    render(<OrderCancelModal {...defaultProps} />);

    const option = screen.getByLabelText('Thời gian giao hàng dự kiến quá lâu');
    fireEvent.click(option);

    const submitBtn = screen.getByRole('button', { name: /Xác nhận hủy/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(orderService.cancelMyOrder).toHaveBeenCalledWith(
        'order-123',
        'Thời gian giao hàng dự kiến quá lâu'
      );
      expect(defaultProps.onCancelled).toHaveBeenCalledWith(updatedOrder);
    });
  });

  it('shows textarea when "Lý do khác" is selected and submits custom reason', async () => {
    const updatedOrder: Order = { ...mockOrder, status: 'CANCELLED' };
    vi.spyOn(orderService, 'cancelMyOrder').mockResolvedValue(updatedOrder);

    render(<OrderCancelModal {...defaultProps} />);

    const otherRadio = screen.getByLabelText('Lý do khác');
    fireEvent.click(otherRadio);

    // Textarea should now appear
    const textarea = screen.getByPlaceholderText(
      /Vui lòng chia sẻ thêm lý do bạn muốn hủy đơn hàng/i
    );
    expect(textarea).toBeTruthy();

    // Type custom reason
    fireEvent.change(textarea, { target: { value: 'Tôi tìm thấy quà tặng khác thích hợp hơn' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận hủy/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(orderService.cancelMyOrder).toHaveBeenCalledWith(
        'order-123',
        'Tôi tìm thấy quà tặng khác thích hợp hơn'
      );
      expect(defaultProps.onCancelled).toHaveBeenCalledWith(updatedOrder);
    });
  });

  it('handles submission error with error alert', async () => {
    vi.spyOn(orderService, 'cancelMyOrder').mockRejectedValue({
      response: { data: { message: 'Đơn hàng đang giao, không thể hủy.' } },
    });

    render(<OrderCancelModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Xác nhận hủy/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Đơn hàng đang giao, không thể hủy.')).toBeTruthy();
      expect(defaultProps.onCancelled).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  it('calls onClose when close button or header X is clicked', () => {
    render(<OrderCancelModal {...defaultProps} />);

    // Footer button
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    // Header X button
    const xBtn = screen.getByLabelText('Đóng hộp thoại');
    fireEvent.click(xBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
