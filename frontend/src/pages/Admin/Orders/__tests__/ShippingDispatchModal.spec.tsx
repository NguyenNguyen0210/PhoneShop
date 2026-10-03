// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShippingDispatchModal } from '../components/ShippingDispatchModal';
import { shippingService } from '../../../../services/shippingService';
import type { Order } from '../../../../types';

// Mock window.matchMedia for Ant Design in jsdom
beforeAll(() => {
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
});

vi.mock('../../../../services/shippingService', () => ({
  CARRIER_PRESETS: [
    { key: 'GHN', name: 'Giao Hàng Nhanh (GHN)' },
    { key: 'VIETTEL_POST', name: 'Viettel Post' },
    { key: 'GHTK', name: 'Giao Hàng Tiết Kiệm (GHTK)' },
    { key: 'JT_EXPRESS', name: 'J&T Express' },
    { key: 'VNPOST', name: 'Bưu Điện Việt Nam (VNPost)' },
    { key: 'HAPPY_EXPRESS', name: 'Hỏa Tốc Happy Express' },
  ],
  shippingService: {
    assignShipping: vi.fn(),
    updateShipping: vi.fn(),
    updateShippingStatus: vi.fn(),
    getCarrierTrackingUrl: vi.fn(),
  },
}));

describe('ShippingDispatchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockOrder: Order = {
    id: 'ord-123',
    orderNumber: 'ORD-9021',
    customerName: 'Nguyễn Văn A',
    shippingPhone: '0912345678',
    shippingAddress: '123 Lê Lợi, Q.1, HCM',
    status: 'CONFIRMED',
    totalAmount: 15000000,
    subtotal: 15000000,
    shippingFee: 30000,
    discount: 0,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    items: [],
    createdAt: '2026-10-03T10:00:00Z',
    shipping: {
      id: 'ship-123',
      orderId: 'ord-123',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN88291039VN',
      status: 'READY_TO_SHIP',
      shippingFee: 30000,
      createdAt: '2026-10-03T10:00:00Z',
    },
  };

  it('renders order number, customer info, and carrier selection', () => {
    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/ORD-9021/)).toBeDefined();
    expect(screen.getByText(/Nguyễn Văn A/)).toBeDefined();
    expect(screen.getByDisplayValue('GHN88291039VN')).toBeDefined();
  });

  it('allows clicking quick carrier presets to update provider field', () => {
    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const viettelTag = screen.getByText('Viettel Post');
    fireEvent.click(viettelTag);

    expect(screen.getByDisplayValue('Viettel Post')).toBeDefined();
  });

  it('progresses shipping status when transition button is clicked', async () => {
    const handleSuccess = vi.fn();
    vi.mocked(shippingService.updateShippingStatus).mockResolvedValue({
      id: 'ship-123',
      orderId: 'ord-123',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN88291039VN',
      status: 'PICKED_UP',
      shippingFee: 30000,
      createdAt: '2026-10-03T10:00:00Z',
    });

    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />,
    );

    // Current status is READY_TO_SHIP -> next transition should be PICKED_UP
    const transitionBtn = screen.getByRole('button', { name: /PICKED_UP/i });
    expect(transitionBtn).toBeDefined();

    fireEvent.click(transitionBtn);

    await waitFor(() => {
      expect(shippingService.updateShippingStatus).toHaveBeenCalledWith(
        'ship-123',
        expect.objectContaining({ status: 'PICKED_UP' }),
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('submits updated shipping details when form is saved', async () => {
    const handleSuccess = vi.fn();
    vi.mocked(shippingService.updateShipping).mockResolvedValue({
      id: 'ship-123',
      orderId: 'ord-123',
      providerName: 'Giao Hàng Nhanh (GHN)',
      trackingNumber: 'GHN999999VN',
      status: 'READY_TO_SHIP',
      shippingFee: 30000,
      createdAt: '2026-10-03T10:00:00Z',
    });

    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />,
    );

    const trackingInput = screen.getByDisplayValue('GHN88291039VN');
    fireEvent.change(trackingInput, { target: { value: 'GHN999999VN ' } });

    const saveBtn = screen.getByRole('button', { name: /Lưu thông tin/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shippingService.updateShipping).toHaveBeenCalledWith(
        'ship-123',
        expect.objectContaining({
          trackingNumber: 'GHN999999VN',
        }),
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('calls assignShipping if order has no existing shipping record', async () => {
    const handleSuccess = vi.fn();
    const orderWithoutShipping: Order = {
      ...mockOrder,
      shipping: undefined,
    };

    vi.mocked(shippingService.assignShipping).mockResolvedValue({
      id: 'new-ship',
      orderId: 'ord-123',
      providerName: 'Viettel Post',
      trackingNumber: 'VT123456',
      status: 'READY_TO_SHIP',
      shippingFee: 30000,
      createdAt: '2026-10-03T10:00:00Z',
    });

    render(
      <ShippingDispatchModal
        open={true}
        order={orderWithoutShipping}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />,
    );

    const viettelTag = screen.getByText('Viettel Post');
    fireEvent.click(viettelTag);

    const trackingInput = screen.getByPlaceholderText(/Mã vận đơn|GHN123456789/i);
    fireEvent.change(trackingInput, { target: { value: 'VT123456' } });

    const saveBtn = screen.getByRole('button', { name: /Lưu thông tin|Khởi tạo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shippingService.assignShipping).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'ord-123',
          providerName: 'Viettel Post',
          trackingNumber: 'VT123456',
        }),
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('renders DELIVERED and FAILED transition buttons for IN_TRANSIT status', () => {
    const inTransitOrder: Order = {
      ...mockOrder,
      shipping: {
        ...mockOrder.shipping!,
        status: 'IN_TRANSIT',
      },
    };

    render(
      <ShippingDispatchModal
        open={true}
        order={inTransitOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /DELIVERED/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /FAILED/i })).toBeDefined();
  });

  it('renders IN_TRANSIT and RETURNED transition buttons for FAILED status', () => {
    const failedOrder: Order = {
      ...mockOrder,
      shipping: {
        ...mockOrder.shipping!,
        status: 'FAILED',
      },
    };

    render(
      <ShippingDispatchModal
        open={true}
        order={failedOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /IN_TRANSIT/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /RETURNED/i })).toBeDefined();
  });

  it('shows terminal status message when DELIVERED', () => {
    const deliveredOrder: Order = {
      ...mockOrder,
      shipping: {
        ...mockOrder.shipping!,
        status: 'DELIVERED',
      },
    };

    render(
      <ShippingDispatchModal
        open={true}
        order={deliveredOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/Bưu kiện đã ở trạng thái kết thúc \(DELIVERED\)/i)).toBeDefined();
  });

  it('supports typing custom carrier name directly', () => {
    render(
      <ShippingDispatchModal
        open={true}
        order={mockOrder}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const carrierInput = screen.getByDisplayValue('Giao Hàng Nhanh (GHN)');
    fireEvent.change(carrierInput, { target: { value: 'AhaMove Siêu Tốc' } });

    expect(screen.getByDisplayValue('AhaMove Siêu Tốc')).toBeDefined();
  });

  it('returns null if order is null', () => {
    const { container } = render(
      <ShippingDispatchModal
        open={true}
        order={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
