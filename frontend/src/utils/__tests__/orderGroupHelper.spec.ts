import { describe, it, expect } from 'vitest';
import { groupOrderItems } from '../orderGroupHelper';

describe('orderGroupHelper - groupOrderItems', () => {
  it('returns empty array when items is null, undefined, or empty', () => {
    expect(groupOrderItems(null)).toEqual([]);
    expect(groupOrderItems(undefined)).toEqual([]);
    expect(groupOrderItems([])).toEqual([]);
  });

  it('keeps single items unchanged with totalQuantity = 1 and assigned IMEI', () => {
    const rawItems = [
      {
        id: 'item-1',
        variantId: 'var-1',
        productName: 'iPhone 15',
        unitPrice: 20000000,
        quantity: 1,
        totalPrice: 20000000,
        variant: {
          color: 'Titan Tự Nhiên',
          storage: '128GB',
        },
        imeiDevice: {
          id: 'imei-1',
          imeiNumber: '358900001000001',
          status: 'RESERVED',
        },
      },
    ];

    const result = groupOrderItems(rawItems);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('iPhone 15');
    expect(result[0].totalQuantity).toBe(1);
    expect(result[0].unitPrice).toBe(20000000);
    expect(result[0].totalPrice).toBe(20000000);
    expect(result[0].imeis).toHaveLength(1);
    expect(result[0].imeis[0].imeiNumber).toBe('358900001000001');
    expect(result[0].rawItemIds).toEqual(['item-1']);
  });

  it('correctly aggregates multiple items of the same variant into a single entry with summed quantity and collected IMEIs', () => {
    const rawItems = [
      {
        id: 'item-1',
        variantId: 'var-redmi',
        productName: 'Redmi 14C',
        unitPrice: 3290000,
        quantity: 1,
        totalPrice: 3290000,
        variant: {
          color: 'Đen',
          storage: '64GB',
        },
        imeiDevice: {
          id: 'dev-1',
          imeiNumber: '358900001029494',
        },
      },
      {
        id: 'item-2',
        variantId: 'var-redmi',
        productName: 'Redmi 14C',
        unitPrice: 3290000,
        quantity: 1,
        totalPrice: 3290000,
        variant: {
          color: 'Đen',
          storage: '64GB',
        },
        imeiDevice: {
          id: 'dev-2',
          imeiNumber: '358900001029502',
        },
      },
      {
        id: 'item-3',
        variantId: 'var-redmi',
        productName: 'Redmi 14C',
        unitPrice: 3290000,
        quantity: 1,
        totalPrice: 3290000,
        variant: {
          color: 'Đen',
          storage: '64GB',
        },
        imeiDevice: {
          id: 'dev-3',
          imeiNumber: '358900001029510',
        },
      },
    ];

    const result = groupOrderItems(rawItems);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('Redmi 14C');
    expect(result[0].totalQuantity).toBe(3);
    expect(result[0].unitPrice).toBe(3290000);
    expect(result[0].totalPrice).toBe(9870000);
    expect(result[0].imeis).toHaveLength(3);
    expect(result[0].imeis.map(i => i.imeiNumber)).toEqual([
      '358900001029494',
      '358900001029502',
      '358900001029510',
    ]);
    expect(result[0].rawItemIds).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('groups items into separate entries if they belong to different variants', () => {
    const rawItems = [
      {
        id: 'item-1',
        variantId: 'var-black',
        productName: 'Redmi 14C',
        unitPrice: 3290000,
        quantity: 2,
        totalPrice: 6580000,
      },
      {
        id: 'item-2',
        variantId: 'var-blue',
        productName: 'Redmi 14C',
        unitPrice: 3290000,
        quantity: 3,
        totalPrice: 9870000,
      },
    ];

    const result = groupOrderItems(rawItems);
    expect(result).toHaveLength(2);
    expect(result[0].totalQuantity).toBe(2);
    expect(result[1].totalQuantity).toBe(3);
  });
});
