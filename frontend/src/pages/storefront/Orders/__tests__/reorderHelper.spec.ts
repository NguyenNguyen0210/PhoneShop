import { describe, it, expect, beforeEach } from 'vitest';
import { reorderOrderItems } from '../utils/reorderHelper';
import { useCartStore } from '../../../../stores/useCartStore';
import type { Order } from '../../../../types';

describe('reorderHelper - reorderOrderItems', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      selectedItemIds: [],
    });
  });

  it('adds items with variants to the cart', () => {
    const mockOrder: Order = {
      id: 'order-1',
      orderNumber: 'ORD-001',
      customerName: 'Test Customer',
      shippingPhone: '0123456789',
      shippingAddress: '123 Test St',
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      subtotal: 500000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 500000,
      createdAt: '2026-10-01T00:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          variantId: 'var-1',
          productName: 'iPhone 15',
          quantity: 2,
          unitPrice: 20000000,
          totalPrice: 40000000,
          variant: {
            id: 'var-1',
            productId: 'prod-1',
            sku: 'IP15-128-BLK',
            color: 'Đen',
            storage: '128GB',
            price: 20000000,
            imageUrl: 'https://example.com/img1.jpg',
            product: {
              id: 'prod-1',
              name: 'iPhone 15',
              slug: 'iphone-15',
            },
          },
        },
        {
          id: 'item-2',
          orderId: 'order-1',
          variantId: 'var-2',
          productName: 'Tai nghe AirPods Pro',
          quantity: 1,
          unitPrice: 5000000,
          totalPrice: 5000000,
          variant: {
            id: 'var-2',
            productId: 'prod-2',
            sku: 'APP2',
            color: 'Trắng',
            storage: 'N/A',
            price: 5000000,
          },
        },
      ],
    };

    const result = reorderOrderItems(mockOrder);

    expect(result.addedCount).toBe(2);
    expect(result.totalItems).toBe(2);

    const cartState = useCartStore.getState();
    expect(cartState.items).toHaveLength(2);
    expect(cartState.items[0].variantId).toBe('var-1');
    expect(cartState.items[0].quantity).toBe(2);
    expect(cartState.items[1].variantId).toBe('var-2');
    expect(cartState.items[1].quantity).toBe(1);
  });

  it('skips items without a variant and calculates correct counts', () => {
    const mockOrder: Order = {
      id: 'order-2',
      orderNumber: 'ORD-002',
      customerName: 'Test Customer',
      shippingPhone: '0123456789',
      shippingAddress: '123 Test St',
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      subtotal: 500000,
      shippingFee: 0,
      discount: 0,
      totalAmount: 500000,
      createdAt: '2026-10-01T00:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'order-2',
          variantId: 'var-1',
          productName: 'Sản phẩm đã ngừng kinh doanh',
          quantity: 1,
          unitPrice: 100000,
          totalPrice: 100000,
          // variant is undefined (e.g. deleted variant)
        },
        {
          id: 'item-2',
          orderId: 'order-2',
          variantId: 'var-2',
          productName: 'iPhone 14',
          quantity: 1,
          unitPrice: 15000000,
          totalPrice: 15000000,
          variant: {
            id: 'var-2',
            productId: 'prod-2',
            sku: 'IP14-128',
            color: 'Xanh',
            storage: '128GB',
            price: 15000000,
          },
        },
      ],
    };

    const result = reorderOrderItems(mockOrder);

    expect(result.addedCount).toBe(1);
    expect(result.totalItems).toBe(2);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('handles empty items array gracefully', () => {
    const mockOrder: Order = {
      id: 'order-3',
      orderNumber: 'ORD-003',
      customerName: 'Test Customer',
      shippingPhone: '0123456789',
      shippingAddress: '123 Test St',
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      subtotal: 0,
      shippingFee: 0,
      discount: 0,
      totalAmount: 0,
      createdAt: '2026-10-01T00:00:00Z',
      items: [],
    };

    const result = reorderOrderItems(mockOrder);

    expect(result.addedCount).toBe(0);
    expect(result.totalItems).toBe(0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
