// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { PaymentsListTab } from '../PaymentsListTab';
import { TransactionsLogTab } from '../TransactionsLogTab';
import type { Payment, PaymentTransaction } from '../../../../../types';

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

expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined && (document.body.contains(received) || false);
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to be in document`,
    };
  },
});

describe('PaymentsListTab', () => {
  const mockPayments: Payment[] = [
    {
      id: 'p-1',
      orderId: 'o-1',
      method: 'VNPAY',
      status: 'PAID',
      amount: 15000000,
      createdAt: '2026-10-04T08:00:00Z',
      paidAt: '2026-10-04T08:05:00Z',
      updatedAt: '',
      order: { id: 'o-1', orderNumber: 'ORD-101', userId: 'u-1', user: { id: 'u-1', email: 'alice@test.com' } },
    },
    {
      id: 'p-2',
      orderId: 'o-2',
      method: 'COD',
      status: 'PENDING',
      amount: 5000000,
      createdAt: '2026-10-04T09:00:00Z',
      updatedAt: '',
      order: { id: 'o-2', orderNumber: 'ORD-102', userId: 'u-2', user: { id: 'u-2', email: 'bob@test.com' } },
    },
  ];

  it('renders table rows and filters by search keyword', () => {
    render(
      <BrowserRouter>
        <PaymentsListTab payments={mockPayments} loading={false} />
      </BrowserRouter>
    );

    expect(screen.getByText('#ORD-101')).toBeInTheDocument();
    expect(screen.getByText('#ORD-102')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mã đơn/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(screen.getByText('#ORD-101')).toBeInTheDocument();
    expect(screen.queryByText('#ORD-102')).not.toBeInTheDocument();
  });

  it('filters by payment ID in search input', () => {
    render(
      <BrowserRouter>
        <PaymentsListTab payments={mockPayments} loading={false} />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mã đơn/i);
    fireEvent.change(searchInput, { target: { value: 'p-2' } });

    expect(screen.queryByText('#ORD-101')).not.toBeInTheDocument();
    expect(screen.getByText('#ORD-102')).toBeInTheDocument();
  });
});

describe('TransactionsLogTab', () => {
  const mockTransactions: PaymentTransaction[] = [
    {
      id: 'txn-1',
      paymentId: 'pay-1',
      transactionCode: 'TXN-VNPAY-001',
      type: 'PAYMENT',
      status: 'SUCCESS',
      amount: 15000000,
      providerReference: 'VNP12345678',
      responseData: { code: '00', message: 'Success' },
      createdAt: '2026-10-04T08:00:00Z',
      payment: {
        id: 'pay-1',
        orderId: 'o-1',
        method: 'VNPAY',
        status: 'PAID',
        amount: 15000000,
        createdAt: '2026-10-04T08:00:00Z',
        updatedAt: '',
        order: { id: 'o-1', orderNumber: 'ORD-101', userId: 'u-1' },
      },
    },
  ];

  it('renders transaction details and opens JSON payload modal', () => {
    render(<TransactionsLogTab transactions={mockTransactions} loading={false} />);

    expect(screen.getByText('TXN-VNPAY-001')).toBeInTheDocument();
    expect(screen.getByText('#ORD-101')).toBeInTheDocument();
    expect(screen.getByText('THÀNH CÔNG')).toBeInTheDocument();
    expect(screen.getByText('VNP12345678')).toBeInTheDocument();

    const jsonBtn = screen.getByRole('button', { name: /JSON/i });
    fireEvent.click(jsonBtn);

    expect(screen.getByText(/Raw Response Payload/i)).toBeInTheDocument();
  });
});
