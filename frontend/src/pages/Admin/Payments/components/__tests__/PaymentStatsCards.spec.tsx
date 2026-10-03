// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentStatsCards } from '../PaymentStatsCards';
import { PaymentMethodTag } from '../PaymentMethodTag';
import { PaymentStatusTag } from '../PaymentStatusTag';
import type { Payment, RefundItem } from '../../../../../types';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void>, T> {
    toBeInTheDocument(): R;
  }
}

// Mock matchMedia for Ant Design components
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

expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined && (document.body.contains(received) || false);
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to be in document`,
    };
  },
});

describe('PaymentStatsCards', () => {
  const mockPayments: Payment[] = [
    { id: '1', orderId: 'o1', method: 'VNPAY', status: 'PAID', amount: 10000000, createdAt: '', updatedAt: '' },
    { id: '2', orderId: 'o2', method: 'VIETQR', status: 'PAID', amount: 5000000, createdAt: '', updatedAt: '' },
    { id: '3', orderId: 'o3', method: 'VIETQR', status: 'PENDING', amount: 3000000, createdAt: '', updatedAt: '' },
    { id: '4', orderId: 'o4', method: 'COD', status: 'PAID', amount: 2000000, createdAt: '', updatedAt: '' },
  ];

  const mockRefunds: RefundItem[] = [
    { id: 'r1', returnId: 'ret1', refundNumber: 'REF-001', amount: 1000000, status: 'COMPLETED', createdAt: '' },
    { id: 'r2', returnId: 'ret2', refundNumber: 'REF-002', amount: 500000, status: 'PENDING', createdAt: '' },
  ];

  it('renders total revenue and formatted amounts accurately', () => {
    render(<PaymentStatsCards payments={mockPayments} refunds={mockRefunds} loading={false} />);

    // Total Paid = 10m + 5m + 2m = 17m
    expect(screen.getByText('Tổng doanh thu đã thu')).toBeInTheDocument();
    expect(screen.getByText(/17\.000\.000/)).toBeInTheDocument();

    // Pending Recon = 1 item (id 3)
    expect(screen.getByText('Chờ đối soát VietQR')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Total Refunded = 1m
    expect(screen.getByText('Tổng tiền đã hoàn trả')).toBeInTheDocument();
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();
  });

  it('renders zero counts and empty values gracefully when no data', () => {
    render(<PaymentStatsCards payments={[]} refunds={[]} loading={false} />);

    expect(screen.getByText('Tổng doanh thu đã thu')).toBeInTheDocument();
    expect(screen.getByText('Chờ đối soát VietQR')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Tổng tiền đã hoàn trả')).toBeInTheDocument();
  });
});

describe('PaymentMethodTag', () => {
  it('renders tags for VNPAY, VIETQR, and COD correctly', () => {
    const { rerender } = render(<PaymentMethodTag method="VNPAY" />);
    expect(screen.getByText('VNPay')).toBeInTheDocument();

    rerender(<PaymentMethodTag method="VIETQR" />);
    expect(screen.getByText('VietQR')).toBeInTheDocument();

    rerender(<PaymentMethodTag method="COD" />);
    expect(screen.getByText(/COD/)).toBeInTheDocument();
  });
});

describe('PaymentStatusTag', () => {
  it('renders tags for PAID, PENDING, FAILED, and REFUNDED correctly', () => {
    const { rerender } = render(<PaymentStatusTag status="PAID" />);
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();

    rerender(<PaymentStatusTag status="PENDING" />);
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();

    rerender(<PaymentStatusTag status="FAILED" />);
    expect(screen.getByText('Thất bại')).toBeInTheDocument();

    rerender(<PaymentStatusTag status="REFUNDED" />);
    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
  });
});
