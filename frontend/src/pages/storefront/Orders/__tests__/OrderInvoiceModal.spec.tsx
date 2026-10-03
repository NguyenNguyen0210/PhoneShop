// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OrderInvoiceModal } from '../components/OrderInvoiceModal';
import type { Order } from '../../../../types';

describe('OrderInvoiceModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const baseOrder: Order = {
    id: 'ord-invoice-test',
    orderNumber: 'ORD-8899',
    customerName: 'Le Thi B',
    shippingPhone: '0912345678',
    shippingAddress: '456 Nguyen Trai, Q5, HCMC',
    status: 'DELIVERED',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PAID',
    subtotal: 30000000,
    shippingFee: 0,
    discount: 500000,
    totalAmount: 29500000,
    createdAt: '2026-10-02T12:00:00Z',
    items: [
      {
        id: 'item-1',
        orderId: 'ord-invoice-test',
        variantId: 'var-1',
        productName: 'iPhone 15 Pro Max 256GB',
        quantity: 1,
        unitPrice: 30000000,
        totalPrice: 30000000,
        variant: {
          id: 'var-1',
          productId: 'prod-1',
          sku: 'IP15PM-256',
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          price: 30000000,
        },
        imeiDevice: {
          id: 'imei-1',
          imeiNumber: '356789012345678',
        },
      },
    ],
  };

  it('does not render modal when isOpen is false', () => {
    render(<OrderInvoiceModal order={baseOrder} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders invoice header, company branding, order details, and IMEI number correctly', () => {
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/HAPPY GARDEN MOBILE/i)).toBeTruthy();
    expect(screen.getByText(/1900 6868/i)).toBeTruthy();
    expect(screen.getByText(/HÓA ĐƠN BÁN LẺ KIÊM PHIẾU BẢO HÀNH THEO IMEI/i)).toBeTruthy();
    expect(screen.getByText(/ORD-8899/i)).toBeTruthy();
    expect(screen.getByText(/Le Thi B/i)).toBeTruthy();
    expect(screen.getByText(/0912345678/i)).toBeTruthy();
    expect(screen.getByText(/456 Nguyen Trai, Q5, HCMC/i)).toBeTruthy();
    expect(screen.getByText(/iPhone 15 Pro Max 256GB/i)).toBeTruthy();
    expect(screen.getByText(/IMEI: 356789012345678/i)).toBeTruthy();
    expect(screen.getByText(/HAPPY GARDEN VERIFIED/i)).toBeTruthy();
    expect(screen.getByText(/Quy định bảo hành:/i)).toBeTruthy();
  });

  it('renders correct payment status label', () => {
    const { rerender } = render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Trạng thái: ĐÃ THANH TOÁN/i)).toBeTruthy();

    const pendingOrder: Order = {
      ...baseOrder,
      paymentStatus: 'PENDING',
    };
    rerender(<OrderInvoiceModal order={pendingOrder} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Trạng thái: CHỜ THANH TOÁN \(COD\)/i)).toBeTruthy();
  });

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={vi.fn()} />);

    const printButton = screen.getByRole('button', { name: /In hóa đơn \/ Lưu PDF/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalled();
  });

  it('triggers onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={onCloseMock} />);

    const closeButton = screen.getByRole('button', { name: /Đóng hóa đơn/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('triggers onClose when Escape key is pressed', () => {
    const onCloseMock = vi.fn();
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={onCloseMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('renders financial breakdown including VAT, voucher discount, and totals', () => {
    render(<OrderInvoiceModal order={baseOrder} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Tạm tính:/i)).toBeTruthy();
    expect(screen.getByText(/Chiết khấu Voucher:/i)).toBeTruthy();
    expect(screen.getByText(/Phí vận chuyển:/i)).toBeTruthy();
    expect(screen.getByText(/Miễn phí/i)).toBeTruthy();
    expect(screen.getByText(/Đã gồm thuế GTGT \(VAT 10%\):/i)).toBeTruthy();
    expect(screen.getByText(/TỔNG THANH TOÁN:/i)).toBeTruthy();
  });
});
