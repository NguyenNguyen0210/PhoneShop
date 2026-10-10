# Product Detail Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the external storefront eye button on `AdminProductsPage` into an in-place `ProductDetailDrawer` that displays full product details (Brand, Category, Supplier/Inbound history, Variants & real-time stock, Specs, Description) with quick edit and storefront links.

**Architecture:** Create a standalone React component `ProductDetailDrawer.tsx` utilizing Ant Design's `Drawer`, `Descriptions`, `Table`, and `Tag`. Integrate it into `AdminProductsPage.tsx` with dedicated open/close states and wire the eye icon button to open it. Support jumping directly to `ProductEditModal` via an `onOpenEdit` callback.

**Tech Stack:** React 19, TypeScript, Ant Design 5, Vitest, React Testing Library.

---

## File Structure

- **New:** `frontend/src/pages/Admin/Products/components/ProductDetailDrawer.tsx` — Product Detail Drawer component.
- **New:** `frontend/src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx` — Unit tests for the Drawer component.
- **Modify:** `frontend/src/pages/Admin/Products/AdminProductsPage.tsx` — Add drawer state, update eye button action, mount `ProductDetailDrawer`.
- **Modify:** `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx` — Test that eye button opens `ProductDetailDrawer`.

---

## Tasks

### Task 1: Create `ProductDetailDrawer` Component & Unit Tests

**Files:**
- Create: `frontend/src/pages/Admin/Products/components/ProductDetailDrawer.tsx`
- Create: `frontend/src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx`

- [x] **Step 1: Write the failing unit tests for `ProductDetailDrawer`**

Create `frontend/src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProductDetailDrawer } from '../ProductDetailDrawer';
import { productService } from '../../../../../services/productService';
import { supplierService } from '../../../../../services/supplierService';
import { inventoryService } from '../../../../../services/inventoryService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

vi.mock('../../../../../services/supplierService', () => ({
  supplierService: {
    getSuppliers: vi.fn(),
  },
}));

vi.mock('../../../../../services/inventoryService', () => ({
  inventoryService: {
    getVariantLedger: vi.fn(),
  },
}));

const mockProduct = {
  id: 'prod-101',
  name: 'iPhone 15 Pro Max',
  slug: 'iphone-15-pro-max',
  brandId: 'b-apple',
  categoryId: 'c-phone',
  condition: 'NEW',
  status: 'ACTIVE',
  warrantyMonths: 12,
  description: 'Khung viền titan siêu bền nhẹ chuẩn hàng không vũ trụ.',
  shortDescription: 'Flagship Apple 2023',
  thumbnailUrl: 'https://example.com/ip15.jpg',
  brand: { id: 'b-apple', name: 'Apple' },
  category: { id: 'c-phone', name: 'Điện thoại' },
  specs: {
    'Màn hình': '6.7 inch OLED 120Hz',
    'Chipset': 'Apple A17 Pro',
  },
  variants: [
    {
      id: 'var-1',
      productId: 'prod-101',
      sku: 'IP15PM-256-NAT',
      name: 'iPhone 15 Pro Max 256GB Tự Nhiên',
      color: 'Titan Tự Nhiên',
      storage: '256GB',
      ram: '8GB',
      price: 29990000,
      costPrice: 26500000,
      compareAtPrice: 34990000,
      inventory: {
        availableQty: 12,
        quantity: 12,
      },
    },
  ],
};

const mockSuppliers = [
  {
    id: 'sup-1',
    name: 'Công ty TNHH Apple Việt Nam',
    contactName: 'Nguyễn Văn Quản Lý',
    phone: '0909123456',
    email: 'contact@apple.vn',
  },
];

const mockLedger = {
  items: [
    {
      id: 'mov-1',
      type: 'INBOUND',
      quantity: 30,
      unitPrice: 26500000,
      referenceType: 'SUPPLIER',
      referenceId: 'sup-1',
      note: '[NCC: Công ty TNHH Apple Việt Nam] Nhập lô mới',
      createdAt: '2026-10-10T08:00:00Z',
    },
  ],
  pagination: { total: 1, page: 1, limit: 5 },
};

describe('ProductDetailDrawer', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();
    vi.mocked(productService.getProductById).mockResolvedValue(mockProduct as any);
    vi.mocked(supplierService.getSuppliers).mockResolvedValue(mockSuppliers as any);
    vi.mocked(inventoryService.getVariantLedger).mockResolvedValue(mockLedger as any);
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('renders product overview details, brand, category, and warranty', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeTruthy();
      expect(screen.getByText('Apple')).toBeTruthy();
      expect(screen.getByText('Điện thoại')).toBeTruthy();
      expect(screen.getByText(/12 tháng/i)).toBeTruthy();
      expect(screen.getByText(/Máy mới 100%/i)).toBeTruthy();
    });
  });

  it('renders supplier information derived from inbound ledger', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Công ty TNHH Apple Việt Nam/i)).toBeTruthy();
      expect(screen.getByText(/0909123456/i)).toBeTruthy();
    });
  });

  it('renders variant list and specs correctly', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('IP15PM-256-NAT')).toBeTruthy();
      expect(screen.getByText('Titan Tự Nhiên')).toBeTruthy();
      expect(screen.getByText('6.7 inch OLED 120Hz')).toBeTruthy();
    });
  });

  it('triggers onOpenEdit when clicking "Chỉnh sửa sản phẩm" button', async () => {
    const handleOpenEdit = vi.fn();
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
        onOpenEdit={handleOpenEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Chỉnh sửa sản phẩm'));
    expect(handleOpenEdit).toHaveBeenCalledWith('prod-101');
  });

  it('opens storefront URL when clicking "Xem trên Storefront" button', async () => {
    render(
      <ProductDetailDrawer
        open={true}
        productId="prod-101"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Xem trên Storefront')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Xem trên Storefront'));
    expect(window.open).toHaveBeenCalledWith('/products/iphone-15-pro-max', '_blank');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx --run` in `frontend` directory.  
Expected: FAIL because `ProductDetailDrawer.tsx` does not exist yet.

- [x] **Step 3: Implement `ProductDetailDrawer.tsx`**

Create `frontend/src/pages/Admin/Products/components/ProductDetailDrawer.tsx`:

```tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Drawer,
  Spin,
  Tag,
  Typography,
  Image,
  Table,
  Button,
  Empty,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  InfoCircleOutlined,
  EditOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ShopOutlined,
  BarcodeOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { supplierService } from '../../../../services/supplierService';
import { inventoryService } from '../../../../services/inventoryService';
import { FALLBACK_PRODUCT_IMAGE } from '../../../../utils/imageFallback';
import type { Product, ProductVariant, Supplier, StockMovement } from '../../../../types';

const { Title, Text, Paragraph } = Typography;

export interface ProductDetailDrawerProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onOpenEdit?: (productId: string) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  open,
  productId,
  onClose,
  onOpenEdit,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [latestSupplier, setLatestSupplier] = useState<{
    supplier: Supplier | null;
    movement: StockMovement | null;
  } | null>(null);

  const formatPrice = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const loadProductData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setLatestSupplier(null);

    try {
      const [prodRes, suppliersRes] = await Promise.all([
        productService.getProductById(productId),
        supplierService.getSuppliers(true).catch(() => [] as Supplier[]),
      ]);

      setProduct(prodRes);

      // Resolve latest supplier from variants inbound movements
      if (prodRes?.variants && prodRes.variants.length > 0) {
        const suppliersList = Array.isArray(suppliersRes) ? suppliersRes : [];
        const supplierMap = new Map<string, Supplier>();
        suppliersList.forEach((s) => {
          if (s.id) supplierMap.set(s.id, s);
          if (s.name) supplierMap.set(s.name.toLowerCase(), s);
        });

        // Search the ledger of the variants (check first 3 variants)
        const variantsToCheck = prodRes.variants.slice(0, 3);
        let foundInbound: StockMovement | null = null;
        let matchedSupplier: Supplier | null = null;

        for (const v of variantsToCheck) {
          try {
            const ledgerRes = await inventoryService.getVariantLedger(v.id, { page: 1, limit: 5 });
            const inboundMovements = (ledgerRes?.items || []).filter((m) => m.type === 'INBOUND');

            for (const mov of inboundMovements) {
              // Try matching by referenceId or note
              let sup: Supplier | null = null;
              if (mov.referenceId && supplierMap.has(mov.referenceId)) {
                sup = supplierMap.get(mov.referenceId)!;
              } else if (mov.note) {
                const noteLower = mov.note.toLowerCase();
                for (const s of suppliersList) {
                  if (noteLower.includes(s.name.toLowerCase())) {
                    sup = s;
                    break;
                  }
                }
              }

              if (sup || mov.referenceId || mov.note) {
                foundInbound = mov;
                matchedSupplier = sup;
                break;
              }
            }
            if (foundInbound) break;
          } catch {
            // Non-critical supplier resolution failure
          }
        }

        if (foundInbound) {
          setLatestSupplier({
            supplier: matchedSupplier,
            movement: foundInbound,
          });
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải chi tiết sản phẩm';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      void loadProductData();
    } else {
      setProduct(null);
      setLatestSupplier(null);
    }
  }, [open, productId, loadProductData]);

  const totalStock = useMemo(() => {
    if (!product?.variants) return 0;
    return product.variants.reduce((acc, v) => {
      const qty = v.inventory?.availableQty ?? v.inventory?.quantity ?? (v as any).stock ?? 0;
      return acc + Number(qty);
    }, 0);
  }, [product]);

  const variantColumns: ColumnsType<ProductVariant> = [
    {
      title: 'Mã SKU / Tên bản',
      key: 'sku',
      render: (_, record) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
            {record.sku}
          </span>
          {record.name && <div style={{ fontSize: 11, color: '#64748b' }}>{record.name}</div>}
        </div>
      ),
    },
    {
      title: 'Màu sắc',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => color || <span style={{ color: '#94a3b8' }}>Mặc định</span>,
    },
    {
      title: 'Cấu hình',
      key: 'config',
      render: (_, record) => {
        const parts = [record.ram && `RAM ${record.ram}`, record.storage].filter(Boolean);
        return parts.length > 0 ? parts.join(' / ') : <span style={{ color: '#94a3b8' }}>Tiêu chuẩn</span>;
      },
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (price: number) => (
        <span style={{ fontWeight: 600, color: '#2563eb' }}>{formatPrice(price)}</span>
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      align: 'right',
      render: (cost: number) => (
        <span style={{ color: '#64748b' }}>{cost ? formatPrice(cost) : '—'}</span>
      ),
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      align: 'center',
      render: (_, record) => {
        const qty = record.inventory?.availableQty ?? record.inventory?.quantity ?? (record as any).stock ?? 0;
        return (
          <Tag color={Number(qty) > 0 ? 'success' : 'error'}>
            {Number(qty)} máy
          </Tag>
        );
      },
    },
  ];

  const handleOpenStorefront = () => {
    if (!product) return;
    const url = `/products/${product.slug || product.id}`;
    window.open(url, '_blank');
  };

  const handleEditClick = () => {
    if (productId && onOpenEdit) {
      onClose();
      onOpenEdit(productId);
    }
  };

  const isActive = product?.status === 'ACTIVE';

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShopOutlined style={{ fontSize: 18, color: '#2563eb' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {product?.name || 'Chi tiết sản phẩm'}
              </span>
              {product && (
                <Tag color={isActive ? 'success' : 'default'} style={{ margin: 0 }}>
                  {isActive ? 'Đang kinh doanh' : 'Tạm dừng'}
                </Tag>
              )}
            </div>
            {product && (
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                Mã: {product.id} • Slug: {product.slug}
              </div>
            )}
          </div>
        </div>
      }
      width="min(100vw, 720px)"
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ExportOutlined />} onClick={handleOpenStorefront} disabled={!product}>
            Xem trên Storefront
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose}>Đóng</Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEditClick}
              disabled={!product}
            >
              Chỉnh sửa sản phẩm
            </Button>
          </div>
        </div>
      }
    >
      <Spin spinning={loading}>
        {!product && !loading ? (
          <Empty description="Không tìm thấy thông tin sản phẩm" />
        ) : product ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. TỔNG QUAN SẢN PHẨM */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <InfoCircleOutlined style={{ color: '#2563eb' }} />
                Thông tin tổng quan
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <Image
                    src={product.thumbnailUrl || (product as any).thumbnail || FALLBACK_PRODUCT_IMAGE}
                    alt={product.name}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                    fallback={FALLBACK_PRODUCT_IMAGE}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    rowGap: 10,
                    columnGap: 16,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Thương hiệu</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {product.brand?.name || 'Chưa gán'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Danh mục</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {product.category?.name || 'Chưa gán'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Tình trạng</span>
                    <span style={{ fontWeight: 600, color: '#0369a1' }}>
                      {(product as any).condition === 'LIKE_NEW' ? 'Máy cũ (Like New)' : 'Máy mới 100%'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Bảo hành</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {(product as any).warrantyMonths ?? 12} tháng chính hãng
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Số biến thể</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {product.variants?.length || 0} phiên bản
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Tổng tồn kho</span>
                    <span style={{ fontWeight: 700, color: totalStock > 0 ? '#10b981' : '#f43f5e' }}>
                      {totalStock} máy sẵn có
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. NHÀ CUNG CẤP & NGUỒN NHẬP KHO */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b45309',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BarcodeOutlined style={{ color: '#d97706' }} />
                Nhà cung cấp & Lịch sử nhập hàng gần nhất
              </div>

              {latestSupplier ? (
                <div
                  style={{
                    background: '#fffbeb',
                    borderRadius: 8,
                    padding: 12,
                    border: '1px solid #fef3c7',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#92400e' }}>
                      {latestSupplier.supplier?.name ||
                        (latestSupplier.movement?.note ? latestSupplier.movement.note : 'Nhà cung cấp đối tác')}
                    </div>
                    <Tag color="gold" style={{ margin: 0, fontWeight: 600 }}>
                      NCC gần nhất
                    </Tag>
                  </div>

                  {latestSupplier.supplier?.phone && (
                    <div style={{ color: '#b45309', marginTop: 4 }}>
                      Liên hệ: {latestSupplier.supplier.contactName || 'Quản lý'} • SĐT: {latestSupplier.supplier.phone}
                    </div>
                  )}

                  {latestSupplier.movement && (
                    <div style={{ color: '#78350f', fontSize: 11, marginTop: 4 }}>
                      Lô nhập gần nhất:{' '}
                      {new Date(latestSupplier.movement.createdAt).toLocaleDateString('vi-VN')} (Số lượng: +
                      {latestSupplier.movement.quantity} máy
                      {latestSupplier.movement.unitPrice
                        ? ` • Giá nhập: ${formatPrice(latestSupplier.movement.unitPrice)}`
                        : ''}
                      )
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                  Chưa ghi nhận dữ liệu nhập kho từ Nhà cung cấp cho sản phẩm này.
                </div>
              )}
            </div>

            {/* 3. BẢNG BIẾN THỂ & TỒN KHO */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BarcodeOutlined style={{ color: '#4f46e5' }} />
                Danh sách biến thể ({product.variants?.length || 0} SKU)
              </div>

              <Table
                columns={variantColumns}
                dataSource={product.variants || []}
                rowKey="id"
                pagination={false}
                size="small"
                bordered
              />
            </div>

            {/* 4. THÔNG SỐ KỸ THUẬT */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <SettingOutlined style={{ color: '#7c3aed' }} />
                Thông số kỹ thuật (Specs)
              </div>

              {product.specs && Object.keys(product.specs).length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        padding: '6px 10px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: '#64748b' }}>{key}:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                  Chưa cập nhật thông số kỹ thuật.
                </div>
              )}
            </div>

            {/* 5. MÔ TẢ SẢN PHẨM */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileTextOutlined style={{ color: '#475569' }} />
                Mô tả chi tiết sản phẩm
              </div>

              {product.description || (product as any).shortDescription ? (
                <Paragraph
                  style={{
                    fontSize: 12,
                    color: '#334155',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line',
                    margin: 0,
                  }}
                >
                  {product.description || (product as any).shortDescription}
                </Paragraph>
              ) : (
                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                  Chưa có nội dung mô tả cho sản phẩm này.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Spin>
    </Drawer>
  );
};

export default ProductDetailDrawer;
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx --run` in `frontend` directory.  
Expected: PASS with all tests passing.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Products/components/ProductDetailDrawer.tsx frontend/src/pages/Admin/Products/components/__tests__/ProductDetailDrawer.spec.tsx
git commit -m "feat(admin): implement ProductDetailDrawer component and unit tests"
```

---

### Task 2: Integrate `ProductDetailDrawer` into `AdminProductsPage`

**Files:**
- Modify: `frontend/src/pages/Admin/Products/AdminProductsPage.tsx:55-80, 715-745, 1420-1435`
- Modify: `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx`

- [x] **Step 1: Write the failing test in `AdminProductsPage.spec.tsx`**

Update `frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx` to verify clicking the eye button opens the detail drawer:

```tsx
  it('clicking eye button opens ProductDetailDrawer with selected product ID', async () => {
    render(<AdminProductsPage />);
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();
    });

    const viewDetailBtn = screen.getByLabelText('Xem chi tiết');
    expect(viewDetailBtn).toBeDefined();
    fireEvent.click(viewDetailBtn);

    // Detail drawer should be triggered and open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx --run` in `frontend` directory.  
Expected: FAIL because eye button still has label "Xem sản phẩm ngoài storefront" and does not open a dialog.

- [x] **Step 3: Modify `AdminProductsPage.tsx` to integrate `ProductDetailDrawer`**

In `frontend/src/pages/Admin/Products/AdminProductsPage.tsx`:
1. Import `ProductDetailDrawer`:
   ```tsx
   import { ProductDetailDrawer } from './components/ProductDetailDrawer';
   ```
2. Add state:
   ```tsx
   const [detailProductId, setDetailProductId] = useState<string | null>(null);
   const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
   ```
3. Update the eye button in columns definition:
   ```tsx
   <Tooltip title="Xem chi tiết sản phẩm">
     <Button
       size="small"
       type="text"
       icon={<EyeOutlined />}
       onClick={() => {
         setDetailProductId(record.id);
         setIsDetailDrawerOpen(true);
       }}
       style={{ color: '#2563eb', borderRadius: 6 }}
       aria-label="Xem chi tiết"
       title="Xem chi tiết"
     />
   </Tooltip>
   ```
4. Render `ProductDetailDrawer` before closing tag:
   ```tsx
   <ProductDetailDrawer
     open={isDetailDrawerOpen}
     productId={detailProductId}
     onClose={() => {
       setIsDetailDrawerOpen(false);
       setDetailProductId(null);
     }}
     onOpenEdit={(prodId) => {
       setEditingProductId(prodId);
       setEditModalInitialTab('general');
       setIsEditModalOpen(true);
     }}
   />
   ```

- [x] **Step 4: Run tests to verify all pass**

Run: `npm test -- src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx --run` in `frontend` directory.  
Expected: PASS.

- [x] **Step 5: Run full frontend build check**

Run: `npm run build` in `frontend` directory.  
Expected: Build succeeds without TypeScript or bundling errors.

- [x] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin/Products/AdminProductsPage.tsx frontend/src/pages/Admin/Products/__tests__/AdminProductsPage.spec.tsx
git commit -m "feat(admin): wire eye icon button to ProductDetailDrawer on AdminProductsPage"
```
