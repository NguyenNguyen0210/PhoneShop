import React, { useEffect, useState, useMemo } from 'react';
import {
  Drawer,
  Card,
  Typography,
  Tag,
  Image,
  Table,
  Descriptions,
  Space,
  Button,
  Row,
  Col,
  Spin,
  Empty,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  CloseOutlined,
  GlobalOutlined,
  ShopOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { supplierService } from '../../../../services/supplierService';
import { inventoryService } from '../../../../services/inventoryService';
import { FALLBACK_PRODUCT_IMAGE } from '../../../../utils/imageFallback';
import type { Product, ProductVariant, StockMovement } from '../../../../types';
import type { Supplier } from '../../../../types/supplier';

const { Title, Text, Paragraph } = Typography;

export interface ProductDetailDrawerProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onOpenEdit?: (productId: string) => void;
}

interface LatestSupplierInfo {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  inboundDate?: string;
  inboundQuantity?: number;
  inboundUnitPrice?: number | string;
}

const formatPrice = (val?: number | string | null): string => {
  if (val === undefined || val === null || val === '') return '-';
  const num = typeof val === 'string' ? Number(val) : val;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  open,
  productId,
  onClose,
  onOpenEdit,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [supplierInfo, setSupplierInfo] = useState<LatestSupplierInfo | null>(null);

  useEffect(() => {
    if (!open || !productId) return;

    let active = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodResult, suppliersResult] = await Promise.allSettled([
          productService.getProductById(productId),
          supplierService.getSuppliers(true),
        ]);

        if (!active) return;

        if (prodResult.status === 'rejected') {
          throw prodResult.reason;
        }

        const prod = prodResult.status === 'fulfilled' ? prodResult.value : null;
        const suppliers: Supplier[] =
          suppliersResult.status === 'fulfilled' && Array.isArray(suppliersResult.value)
            ? suppliersResult.value
            : [];

        setProduct(prod);

        if (prod && prod.variants && prod.variants.length > 0) {
          const variantsToCheck = prod.variants.slice(0, 5);
          const ledgerResults = await Promise.allSettled(
            variantsToCheck.map((v) =>
              inventoryService.getVariantLedger(v.id, { page: 1, limit: 5 })
            )
          );

          if (!active) return;

          const allMovements: StockMovement[] = [];
          for (const res of ledgerResults) {
            if (res.status === 'fulfilled' && res.value?.items) {
              allMovements.push(...res.value.items);
            }
          }

          allMovements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          let resolvedSupplier: LatestSupplierInfo | null = null;

          for (const m of allMovements) {
            const isInbound =
              (m.type as string) === 'INBOUND' ||
              m.type === 'IMPORT_MANUAL' ||
              (m.quantity !== undefined && m.quantity > 0);

            if (!isInbound) continue;

            let matchedSupplier = suppliers.find(
              (s) => s.id === m.referenceId || s.name === m.referenceId
            );
            let extractedName: string | undefined = undefined;

            if (m.note) {
              const nccMatch = m.note.match(/\[NCC:\s*([^\]]+)\]/i);
              if (nccMatch) {
                extractedName = nccMatch[1].trim();
                if (!matchedSupplier) {
                  matchedSupplier = suppliers.find(
                    (s) =>
                      s.name.toLowerCase() === extractedName?.toLowerCase() ||
                      s.id === extractedName
                  );
                }
              }
              if (!matchedSupplier) {
                matchedSupplier = suppliers.find(
                  (s) => s.name && m.note && m.note.toLowerCase().includes(s.name.toLowerCase())
                );
              }
            }

            if (m.referenceType === 'SUPPLIER' || matchedSupplier || extractedName) {
              const supplierName =
                matchedSupplier?.name ||
                extractedName ||
                (m.referenceType === 'SUPPLIER' && m.referenceId ? m.referenceId : 'Nhà cung cấp');

              const inboundUnitPrice =
                (m as any).unitPrice !== undefined && (m as any).unitPrice !== null
                  ? (m as any).unitPrice
                  : (m as any).unit_price !== undefined && (m as any).unit_price !== null
                  ? (m as any).unit_price
                  : undefined;

              resolvedSupplier = {
                name: supplierName,
                contactName: matchedSupplier?.contactName,
                phone: matchedSupplier?.phone,
                email: matchedSupplier?.email,
                inboundDate: m.createdAt,
                inboundQuantity: m.quantity,
                inboundUnitPrice,
              };
              break;
            }
          }

          setSupplierInfo(resolvedSupplier);
        } else {
          setSupplierInfo(null);
        }
      } catch (err: any) {
        console.error('Failed to load product details:', err);
        message.error(
          err?.response?.data?.message || err?.message || 'Không thể tải chi tiết sản phẩm'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [open, productId]);

  const totalStock = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((sum, v) => {
      const qty =
        v.inventory?.availableQty ??
        v.inventory?.quantity ??
        (v as any).stock ??
        0;
      return sum + Number(qty);
    }, 0);
  }, [product]);

  const variantColumns: ColumnsType<ProductVariant> = [
    {
      title: 'SKU / Tên biến thể',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string, record: ProductVariant) => (
        <div>
          <Text strong>{sku || '-'}</Text>
          {record.name && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>{record.name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Màu sắc',
      dataIndex: 'color',
      key: 'color',
      render: (color: string, record: ProductVariant) => (
        <Space size={6}>
          {record.colorHex && (
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: record.colorHex,
                border: '1px solid #d1d5db',
              }}
            />
          )}
          <span>{color || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Cấu hình (RAM/Bộ nhớ)',
      key: 'config',
      render: (_: any, record: ProductVariant) => {
        const configStr = [record.ram, record.storage].filter(Boolean).join(' / ');
        return <span>{configStr || '-'}</span>;
      },
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ color: '#2563eb' }}>
          {formatPrice(price)}
        </Text>
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (costPrice?: number) => (
        <Text type="secondary">{formatPrice(costPrice)}</Text>
      ),
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      render: (_: any, record: ProductVariant) => {
        const qty =
          record.inventory?.availableQty ??
          record.inventory?.quantity ??
          (record as any).stock ??
          0;
        const color = qty > 10 ? 'green' : qty > 0 ? 'orange' : 'red';
        return <Tag color={color}>{qty}</Tag>;
      },
    },
  ];

  const conditionDisplay = useMemo(() => {
    const cond = (product as any)?.condition;
    if (cond === 'NEW') return 'Mới 100% (New)';
    if (cond === 'LIKE_NEW') return 'Like New 99%';
    return cond || 'Mới 100% (New)';
  }, [product]);

  const warrantyDisplay = useMemo(() => {
    const warranty = (product as any)?.warrantyMonths;
    if (warranty !== undefined && warranty !== null) {
      return `${warranty} tháng`;
    }
    return '12 tháng';
  }, [product]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      afterOpenChange={(visible) => {
        if (!visible) {
          setProduct(null);
          setSupplierInfo(null);
        }
      }}
      width="min(100vw, 720px)"
      destroyOnHidden
      title={
        product ? (
          <Space orientation="vertical" size={2} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <MobileOutlined style={{ color: '#2563eb', fontSize: 18 }} />
              <Title level={4} style={{ margin: 0 }}>
                {product.name}
              </Title>
              <Tag color={product.status === 'ACTIVE' ? 'success' : 'default'}>
                {product.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Tạm dừng'}
              </Tag>
            </Space>
            <Space size={16} wrap style={{ fontSize: 13, color: '#6b7280' }}>
              <span>
                Mã SP: <Text code>{product.id}</Text>
              </span>
              <span>
                Slug: <Text code>{product.slug || '-'}</Text>
              </span>
            </Space>
          </Space>
        ) : (
          <Space align="center">
            <MobileOutlined style={{ color: '#2563eb' }} />
            <span>Chi tiết sản phẩm</span>
          </Space>
        )
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            icon={<GlobalOutlined />}
            disabled={!product}
            onClick={() => {
              if (product) {
                window.open('/products/' + (product.slug || product.id), '_blank');
              }
            }}
          >
            Xem trên Storefront
          </Button>

          <Space>
            <Button icon={<CloseOutlined />} onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              disabled={!product}
              style={{ background: '#2563eb', borderColor: '#2563eb' }}
              onClick={() => {
                onClose();
                if (productId) {
                  onOpenEdit?.(productId);
                }
              }}
            >
              Chỉnh sửa sản phẩm
            </Button>
          </Space>
        </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Đang tải dữ liệu sản phẩm...</Text>
        </div>
      ) : !product ? (
        <Empty description="Không tìm thấy thông tin sản phẩm" />
      ) : (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {/* Section 1: Product overview card */}
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: '#2563eb' }} />
                <span>Tổng quan sản phẩm</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
                <Image
                  src={
                    product.thumbnailUrl ||
                    product.thumbnail ||
                    FALLBACK_PRODUCT_IMAGE
                  }
                  fallback={FALLBACK_PRODUCT_IMAGE}
                  alt={product.name}
                  width={110}
                  height={110}
                  style={{
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                />
              </Col>
              <Col xs={24} sm={18}>
                <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
                  <Descriptions.Item label="Thương hiệu">
                    <Text strong>{product.brand?.name || '-'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Danh mục">
                    <Text strong>{product.category?.name || '-'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tình trạng">
                    <Tag color="blue">{conditionDisplay}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Bảo hành">
                    <Text>{warrantyDisplay}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng biến thể">
                    <Text strong>{product.variants?.length || 0}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tồn kho">
                    <Text strong style={{ color: totalStock > 0 ? '#16a34a' : '#dc2626' }}>
                      {totalStock}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>

          {/* Section 2: Supplier card */}
          <Card
            title={
              <Space>
                <ShopOutlined style={{ color: '#16a34a' }} />
                <span>Nhà cung cấp & Lịch sử nhập hàng</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8 }}
          >
            {supplierInfo ? (
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
                <Descriptions.Item label="Nhà cung cấp">
                  <Text strong>{supplierInfo.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Người liên hệ">
                  <Text>{supplierInfo.contactName || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <Text>{supplierInfo.phone || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày nhập gần nhất">
                  <Text>
                    {supplierInfo.inboundDate
                      ? new Date(supplierInfo.inboundDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng nhập gần nhất">
                  <Tag color="cyan">{supplierInfo.inboundQuantity ?? '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Giá nhập">
                  <Text strong style={{ color: '#059669' }}>
                    {formatPrice(supplierInfo.inboundUnitPrice)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                <Text type="secondary">
                  Chưa có thông tin nhập kho từ nhà cung cấp
                </Text>
              </div>
            )}
          </Card>

          {/* Section 3: Variants Table */}
          <Card
            title={
              <Space>
                <AppstoreOutlined style={{ color: '#9333ea' }} />
                <span>Danh sách biến thể</span>
                <Tag color="purple">{product.variants?.length || 0}</Tag>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={product.variants || []}
              columns={variantColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Section 4: Specs grid */}
          <Card
            title={
              <Space>
                <DatabaseOutlined style={{ color: '#ea580c' }} />
                <span>Thông số kỹ thuật</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8 }}
          >
            {product.specs && Object.keys(product.specs).length > 0 ? (
              <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
                {Object.entries(product.specs).map(([key, val]) => (
                  <Descriptions.Item key={key} label={key}>
                    {val !== undefined && val !== null ? String(val) : '-'}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <div style={{ padding: '8px 0', textAlign: 'center' }}>
                <Text type="secondary">Chưa có thông số kỹ thuật</Text>
              </div>
            )}
          </Card>

          {/* Section 5: Description paragraph */}
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: '#4b5563' }} />
                <span>Mô tả sản phẩm</span>
              </Space>
            }
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Paragraph
              style={{
                margin: 0,
                whiteSpace: 'pre-line',
                color: (product.description || (product as any).shortDescription) ? undefined : '#9ca3af',
              }}
            >
              {product.description || (product as any).shortDescription || 'Chưa có mô tả cho sản phẩm này.'}
            </Paragraph>
          </Card>
        </Space>
      )}
    </Drawer>
  );
};
