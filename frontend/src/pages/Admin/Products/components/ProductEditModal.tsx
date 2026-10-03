import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  InfoCircleOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { ProductGeneralTab } from './ProductGeneralTab';
import { ProductVariantsTab } from './ProductVariantsTab';
import { ProductSpecsTab } from './ProductSpecsTab';
import type { Product, Brand, Category } from '../../../../types';

const { Title, Text } = Typography;

export interface ProductEditModalProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  open,
  productId,
  onClose,
  onSuccess,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const loadData = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const [prodRes, brandsRes, catRes] = await Promise.all([
        productService.getProductById(productId),
        productService.getBrands(),
        productService.getCategories(),
      ]);

      setProduct(prodRes);
      if (Array.isArray(brandsRes)) setBrands(brandsRes);
      if (Array.isArray(catRes)) setCategories(catRes);
    } catch (err: any) {
      console.error('Failed to load product detail:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      setActiveTab('general');
      void loadData();
    } else {
      setProduct(null);
    }
  }, [open, productId, loadData]);

  const handleReload = async () => {
    await loadData();
    onSuccess();
  };

  const isDraft = product?.status !== 'ACTIVE';

  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          Thông tin chung
        </span>
      ),
      children: product ? (
        <ProductGeneralTab
          product={product}
          brands={brands}
          categories={categories}
          onSaveSuccess={handleReload}
        />
      ) : null,
    },
    {
      key: 'variants',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          Quản lý biến thể ({product?.variants?.length || 0})
        </span>
      ),
      children: product ? (
        <ProductVariantsTab
          productId={product.id}
          productName={product.name}
          variants={product.variants || []}
          onReload={handleReload}
        />
      ) : null,
    },
    {
      key: 'specs',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 6 }} />
          Thông số kỹ thuật (Specs)
        </span>
      ),
      children: product ? (
        <ProductSpecsTab
          productId={product.id}
          initialSpecs={product.specs}
          onSaveSuccess={handleReload}
        />
      ) : null,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 24 }}
      styles={{
        body: { padding: '8px 24px 24px 24px', minHeight: 460 },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
                {product ? product.name : 'Chi tiết sản phẩm'}
              </Title>
              {product && (
                <Tag
                  color={isDraft ? 'default' : 'success'}
                  style={{
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isDraft ? (
                    <>
                      <EyeInvisibleOutlined /> Tạm ẩn
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined /> Đang bán
                    </>
                  )}
                </Tag>
              )}
            </div>
            {product && (
              <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                ID: {product.id} {product.slug && `| slug: ${product.slug}`}
              </Text>
            )}
          </div>
        </div>
      }
    >
      {loading && !product ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>Đang tải dữ liệu sản phẩm...</div>
        </div>
      ) : product ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </Modal>
  );
};
