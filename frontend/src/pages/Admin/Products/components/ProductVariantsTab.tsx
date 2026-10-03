import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Switch,
  Image,
  Typography,
  Popconfirm,
  message,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { VariantFormModal } from './VariantFormModal';
import { FALLBACK_PRODUCT_IMAGE } from '../../../../utils/imageFallback';
import type { ProductVariant } from '../../../../types';

const { Text } = Typography;

export interface ProductVariantsTabProps {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  onReload: () => void;
}

const formatPrice = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const ProductVariantsTab: React.FC<ProductVariantsTabProps> = ({
  productId,
  productName,
  variants,
  onReload,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingVariant(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (variant: ProductVariant, checked: boolean) => {
    try {
      setActionLoading(variant.id);
      await productService.toggleVariantStatus(productId, variant.id, checked);
      message.success(
        `Đã ${checked ? 'bật kinh doanh' : 'tạm ngưng'} biến thể ${variant.sku || variant.name}`
      );
      onReload();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể đổi trạng thái biến thể');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (variantId: string) => {
    try {
      setActionLoading(variantId);
      await productService.deleteVariant(productId, variantId);
      message.success('Đã xóa biến thể thành công');
      onReload();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Xóa biến thể thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const columns: ColumnsType<ProductVariant> = [
    {
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 70,
      render: (imgSrc: string) => (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
          }}
        >
          <Image
            src={imgSrc || FALLBACK_PRODUCT_IMAGE}
            width="100%"
            height="100%"
            style={{ objectFit: 'contain' }}
            fallback={FALLBACK_PRODUCT_IMAGE}
          />
        </div>
      ),
    },
    {
      title: 'Mã SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 160,
      render: (sku: string) => (
        <Tag
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
            borderRadius: 6,
            background: '#f1f5f9',
            borderColor: '#e2e8f0',
            color: '#334155',
            fontSize: 12,
          }}
        >
          {sku || 'CHƯA CÓ SKU'}
        </Tag>
      ),
    },
    {
      title: 'Tên & Thuộc tính biến thể',
      key: 'nameAndAttributes',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
            {record.name || productName}
          </div>
          <Space size={6} style={{ marginTop: 3 }}>
            {record.color && (
              <Tag color="cyan" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                {record.color}
              </Tag>
            )}
            {record.storage && (
              <Tag color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                {record.storage}
              </Tag>
            )}
            {record.ram && (
              <Tag color="purple" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                RAM {record.ram}
              </Tag>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      width: 170,
      render: (price: number, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: 13 }}>
            {formatPrice(price || 0)}
          </div>
          {record.compareAtPrice && record.compareAtPrice > price && (
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                textDecoration: 'line-through',
                fontFamily: 'monospace',
              }}
            >
              {formatPrice(record.compareAtPrice)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Kích hoạt',
      key: 'isActive',
      width: 95,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isActive !== false}
          loading={actionLoading === record.id}
          onChange={(checked) => handleToggleActive(record, checked)}
          style={{
            backgroundColor: record.isActive !== false ? '#2563eb' : '#cbd5e1',
          }}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            style={{
              background: '#f8fafc',
              borderColor: '#e2e8f0',
              color: '#475569',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa biến thể này?"
            description="Lưu ý: Không thể xóa nếu biến thể đã có đơn hàng."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading === record.id}
              style={{
                borderRadius: 6,
                fontSize: 12,
              }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag
            color="processing"
            style={{
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AppstoreOutlined />
            {variants.length} biến thể
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Quản lý các phiên bản cấu hình màu sắc, bộ nhớ, giá bán và trạng thái kinh doanh
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          style={{
            background: '#2563eb',
            borderColor: '#2563eb',
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
          }}
        >
          Thêm biến thể mới
        </Button>
      </div>

      {/* Variants Table */}
      {variants.length > 0 ? (
        <Table
          columns={columns}
          dataSource={variants}
          rowKey="id"
          pagination={variants.length > 5 ? { pageSize: 5 } : false}
          size="middle"
          bordered
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      ) : (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
          }}
        >
          <Empty
            description={
              <div>
                <div style={{ fontWeight: 600, color: '#334155' }}>Chưa có biến thể nào</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Hãy thêm ít nhất một biến thể (màu sắc, dung lượng, giá) để khách hàng có thể đặt mua.
                </div>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{
                marginTop: 8,
                background: '#2563eb',
                borderColor: '#2563eb',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Tạo biến thể đầu tiên
            </Button>
          </Empty>
        </div>
      )}

      {/* Sub-modal: Variant Form Modal */}
      <VariantFormModal
        open={isModalOpen}
        productId={productId}
        productName={productName}
        variant={editingVariant}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          onReload();
        }}
      />
    </div>
  );
};
