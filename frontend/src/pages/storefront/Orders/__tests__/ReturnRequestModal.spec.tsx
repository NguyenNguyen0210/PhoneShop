// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ReturnRequestModal } from '../components/ReturnRequestModal';
import { returnService } from '../../../../services/returnService';
import type { Order } from '../../../../types';

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    createReturn: vi.fn(),
  },
}));

const mockOrder: Order = {
  id: 'order-12345',
  orderNumber: 'ORD-998877',
  customerName: 'Nguyen Van A',
  shippingPhone: '0901234567',
  shippingAddress: '123 Le Loi, Q1, HCMC',
  status: 'DELIVERED',
  paymentMethod: 'COD',
  paymentStatus: 'PAID',
  subtotal: 20500000,
  shippingFee: 0,
  discount: 0,
  totalAmount: 20500000,
  createdAt: '2026-10-01T10:00:00.000Z',
  items: [
    {
      id: 'order-item-1',
      orderId: 'order-12345',
      variantId: 'variant-1',
      productName: 'iPhone 15 Pro Max',
      quantity: 2,
      unitPrice: 20000000,
      totalPrice: 40000000,
      variant: {
        id: 'variant-1',
        productId: 'prod-1',
        sku: 'IP15PM-NAT-256',
        color: 'Titan Tự Nhiên',
        storage: '256GB',
        price: 20000000,
      },
      imeiDevice: {
        id: 'imei-1',
        imeiNumber: '356789012345678',
      },
    },
    {
      id: 'order-item-2',
      orderId: 'order-12345',
      variantId: 'variant-2',
      productName: 'Củ sạc 20W Apple',
      quantity: 1,
      unitPrice: 500000,
      totalPrice: 500000,
      variant: {
        id: 'variant-2',
        productId: 'prod-2',
        sku: 'CHARGER-20W',
        color: 'Trắng',
        storage: '',
        price: 500000,
      },
    },
  ],
};

describe('ReturnRequestModal', () => {
  const onClose = vi.fn();
  const onSubmitted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render dialog when isOpen is false', () => {
    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={false}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal header and items checklist when isOpen is true', () => {
    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    // Modal Header
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Yêu cầu trả hàng / hoàn tiền')).toBeDefined();
    expect(screen.getByText('Đơn hàng #ORD-998877')).toBeDefined();

    // Items Checklist
    const checklist = screen.getByTestId('return-items-checklist');
    expect(checklist).toBeDefined();

    // Product 1 details
    expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();
    expect(screen.getByText('Titan Tự Nhiên • 256GB')).toBeDefined();
    expect(screen.getByText('IMEI: 356789012345678')).toBeDefined();

    // Product 2 details
    expect(screen.getByText('Củ sạc 20W Apple')).toBeDefined();

    // Reason dropdown with default value
    const select = screen.getByLabelText(/Lý do đổi trả/i) as HTMLSelectElement;
    expect(select.value).toBe('Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)');

    // Textarea
    expect(screen.getByPlaceholderText(/Mô tả cụ thể vấn đề/i)).toBeDefined();
  });

  it('validates that at least 1 item is selected before submitting', async () => {
    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu hoàn trả/i });
    fireEvent.click(submitBtn);

    // Validation error should appear
    expect(
      await screen.findByText('Vui lòng chọn ít nhất một sản phẩm cần hoàn trả.')
    ).toBeDefined();

    // API should not have been called
    expect(returnService.createReturn).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows quantity stepping for selected items within bounds', () => {
    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    const checkbox1 = screen.getByLabelText('iPhone 15 Pro Max') as HTMLInputElement;
    fireEvent.click(checkbox1);
    expect(checkbox1.checked).toBe(true);

    const qtyDisplay = screen.getByTestId('qty-order-item-1');
    expect(qtyDisplay.textContent).toBe('1');

    const plusBtn = screen.getByLabelText('Tăng số lượng cho iPhone 15 Pro Max') as HTMLButtonElement;
    const minusBtn = screen.getByLabelText('Giảm số lượng cho iPhone 15 Pro Max') as HTMLButtonElement;

    // Initially minus is disabled at min 1
    expect(minusBtn.disabled).toBe(true);

    // Increment to 2 (item quantity is 2)
    fireEvent.click(plusBtn);
    expect(qtyDisplay.textContent).toBe('2');
    expect(plusBtn.disabled).toBe(true); // Reached max
    expect(minusBtn.disabled).toBe(false);

    // Decrement back to 1
    fireEvent.click(minusBtn);
    expect(qtyDisplay.textContent).toBe('1');
    expect(minusBtn.disabled).toBe(true);
  });

  it('submits successfully when items are selected and form is submitted', async () => {
    vi.mocked(returnService.createReturn).mockResolvedValueOnce({
      id: 'return-new-1',
      orderId: 'order-12345',
      userId: 'user-1',
      returnNumber: 'RET-0001',
      status: 'REQUESTED',
      reason: 'Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)',
      customerNote: 'Máy bị sọc màn hình khi mới bóc seal',
      requestedAt: new Date().toISOString(),
      items: [],
    });

    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    // Check first item
    const checkbox1 = screen.getByLabelText('iPhone 15 Pro Max');
    fireEvent.click(checkbox1);

    // Enter customer note
    const noteInput = screen.getByPlaceholderText(/Mô tả cụ thể vấn đề/i);
    fireEvent.change(noteInput, {
      target: { value: 'Máy bị sọc màn hình khi mới bóc seal' },
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu hoàn trả/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(returnService.createReturn).toHaveBeenCalledTimes(1);
    });

    expect(returnService.createReturn).toHaveBeenCalledWith({
      orderId: 'order-12345',
      reason: 'Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)',
      customerNote: 'Máy bị sọc màn hình khi mới bóc seal',
      items: [
        {
          orderItemId: 'order-item-1',
          quantity: 1,
        },
      ],
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays error alert if API fails', async () => {
    vi.mocked(returnService.createReturn).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Đơn hàng đã vượt quá thời hạn hoàn trả 15 ngày.',
        },
      },
    });

    render(
      <ReturnRequestModal
        order={mockOrder}
        isOpen={true}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    // Select second item
    const checkbox2 = screen.getByLabelText('Củ sạc 20W Apple');
    fireEvent.click(checkbox2);

    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu hoàn trả/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Đơn hàng đã vượt quá thời hạn hoàn trả 15 ngày.')
    ).toBeDefined();

    expect(onSubmitted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
