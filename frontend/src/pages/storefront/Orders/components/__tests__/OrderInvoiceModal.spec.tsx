// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OrderInvoiceModal } from '../OrderInvoiceModal';
import type { Order } from '../../../../../types';

describe('OrderInvoiceModal - Grouped Variant Items', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('aggregates multiple order items of identical variants into a single row with SL = 2 and displays both IMEIs', () => {
    const orderWithDuplicateVariants: Order = {
      id: 'ord-inv-group-1',
      orderNumber: 'ORD-5566',
      customerName: 'Tran Van Test',
      shippingPhone: '0987654321',
      shippingAddress: '123 CMT8, Q3, HCMC',
      status: 'DELIVERED',
      paymentMethod: 'VIETQR',
      paymentStatus: 'PAID',
      subtotal: 56000000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 56000000,
      createdAt: '2026-10-11T10:00:00Z',
      items: [
        {
          id: 'item-101',
          orderId: 'ord-inv-group-1',
          variantId: 'var-iphone-15-pro-blue',
          productName: 'iPhone 15 Pro 128GB',
          quantity: 1,
          unitPrice: 28000000,
          totalPrice: 28000000,
          variant: {
            id: 'var-iphone-15-pro-blue',
            productId: 'prod-ip15p',
            sku: 'IP15P-BLU-128',
            color: 'Blue Titanium',
            storage: '128GB',
            price: 28000000,
          },
          imeiDevice: {
            id: 'imei-dev-1',
            imeiNumber: '356789012345678',
          },
        },
        {
          id: 'item-102',
          orderId: 'ord-inv-group-1',
          variantId: 'var-iphone-15-pro-blue',
          productName: 'iPhone 15 Pro 128GB',
          quantity: 1,
          unitPrice: 28000000,
          totalPrice: 28000000,
          variant: {
            id: 'var-iphone-15-pro-blue',
            productId: 'prod-ip15p',
            sku: 'IP15P-BLU-128',
            color: 'Blue Titanium',
            storage: '128GB',
            price: 28000000,
          },
          imeiDevice: {
            id: 'imei-dev-2',
            imeiNumber: '356789012345679',
          },
        },
      ],
    };

    render(<OrderInvoiceModal order={orderWithDuplicateVariants} isOpen={true} onClose={vi.fn()} />);

    // Table rows: 1 header row + 1 item row (instead of 2 separate item rows)
    const tableRows = screen.getAllByRole('row');
    expect(tableRows).toHaveLength(2);

    const bodyCells = tableRows[1].querySelectorAll('td');
    expect(bodyCells).toHaveLength(5);

    // STT column: 1
    expect(bodyCells[0].textContent).toBe('1');

    // Product info column
    expect(bodyCells[1].textContent).toContain('iPhone 15 Pro 128GB');
    expect(bodyCells[1].textContent).toContain('Blue Titanium • 128GB');

    // Both IMEIs displayed in the same row
    expect(screen.getByText(/IMEI: 356789012345678/)).toBeTruthy();
    expect(screen.getByText(/IMEI: 356789012345679/)).toBeTruthy();

    // Quantity column (SL = 2)
    expect(bodyCells[2].textContent).toBe('2');

    // Unit price and total price columns
    expect(bodyCells[3].textContent).toMatch(/28\.000\.000/);
    expect(bodyCells[4].textContent).toMatch(/56\.000\.000/);
  });

  it('renders separate rows for different product variants', () => {
    const orderWithDifferentVariants: Order = {
      id: 'ord-inv-diff-1',
      orderNumber: 'ORD-7788',
      customerName: 'Le Thi C',
      shippingPhone: '0901122334',
      shippingAddress: '456 Tran Phu, Da Nang',
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 58000000,
      shippingFee: 30000,
      discount: 0,
      totalAmount: 58030000,
      createdAt: '2026-10-11T11:00:00Z',
      items: [
        {
          id: 'item-201',
          orderId: 'ord-inv-diff-1',
          variantId: 'var-1',
          productName: 'iPhone 15 Pro 128GB',
          quantity: 1,
          unitPrice: 28000000,
          totalPrice: 28000000,
          variant: {
            id: 'var-1',
            productId: 'prod-1',
            sku: 'IP15P-BLK-128',
            color: 'Black Titanium',
            storage: '128GB',
            price: 28000000,
          },
          imeiDevice: {
            id: 'im-1',
            imeiNumber: '111112222233333',
          },
        },
        {
          id: 'item-202',
          orderId: 'ord-inv-diff-1',
          variantId: 'var-2',
          productName: 'iPhone 15 Pro Max 256GB',
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
          variant: {
            id: 'var-2',
            productId: 'prod-2',
            sku: 'IP15PM-NAT-256',
            color: 'Natural Titanium',
            storage: '256GB',
            price: 30000000,
          },
          imeiDevice: {
            id: 'im-2',
            imeiNumber: '444445555566666',
          },
        },
      ],
    };

    render(<OrderInvoiceModal order={orderWithDifferentVariants} isOpen={true} onClose={vi.fn()} />);

    // Table rows: 1 header + 2 separate item rows
    const tableRows = screen.getAllByRole('row');
    expect(tableRows).toHaveLength(3);

    expect(screen.getByText(/iPhone 15 Pro 128GB/)).toBeTruthy();
    expect(screen.getByText(/iPhone 15 Pro Max 256GB/)).toBeTruthy();
    expect(screen.getByText(/IMEI: 111112222233333/)).toBeTruthy();
    expect(screen.getByText(/IMEI: 444445555566666/)).toBeTruthy();
  });
});
