// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationModal } from '../ReconciliationModal';
import { paymentService } from '../../../../../services/paymentService';
import type { Payment } from '../../../../../types';

// Mock matchMedia for Ant Design
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

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../../../../../services/paymentService', () => ({
  paymentService: {
    confirmPaymentAdmin: vi.fn(),
  },
}));

describe('ReconciliationModal', () => {
  const mockPayment: Payment = {
    id: 'pay-123',
    orderId: 'ord-456',
    method: 'VIETQR',
    status: 'PENDING',
    amount: 24990000,
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z',
    order: {
      id: 'ord-456',
      orderNumber: 'ORD-998877',
      userId: 'usr-1',
      user: {
        id: 'usr-1',
        email: 'customer@example.com',
        firstName: 'Nguyen',
        lastName: 'Van A',
      },
    },
  };

  const handleClose = vi.fn();
  const handleSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with order number, customer, and formatted amount', () => {
    render(
      <ReconciliationModal
        open={true}
        payment={mockPayment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/ORD-998877/)).toBeDefined();
    expect(screen.getByText(/customer@example.com/)).toBeDefined();
    expect(screen.getByText(/24\.990\.000/)).toBeDefined();
  });

  it('validates providerRef input and calls paymentService.confirmPaymentAdmin', async () => {
    vi.mocked(paymentService.confirmPaymentAdmin).mockResolvedValueOnce({
      ...mockPayment,
      status: 'PAID',
    });

    render(
      <ReconciliationModal
        open={true}
        payment={mockPayment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/FT261004/i);
    fireEvent.change(input, { target: { value: 'FT261004998877' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận khớp tiền/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentService.confirmPaymentAdmin).toHaveBeenCalledWith('pay-123', 'FT261004998877');
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('does not submit when providerRef is empty or invalid', async () => {
    render(
      <ReconciliationModal
        open={true}
        payment={mockPayment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Xác nhận khớp tiền/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentService.confirmPaymentAdmin).not.toHaveBeenCalled();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });

  it('renders nothing when payment is null', () => {
    const { container } = render(
      <ReconciliationModal
        open={true}
        payment={null}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
