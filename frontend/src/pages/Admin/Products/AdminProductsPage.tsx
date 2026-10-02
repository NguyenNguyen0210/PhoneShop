import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Typography,
  Image,
  Divider,
  Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { mockProducts, mockBrands, mockCategories } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import { ImageUploadDragger } from '../../../components/admin/ImageUploadDragger';
import type { Product } from '../../../types';

const { Title, Text } = Typography;

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [form] = Form.useForm();

  const loadProducts = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const res = await productService.getAllProductsAdmin();
      if (res.items && res.items.length > 0) {
        setProducts(res.items);
      }
    } catch {
      // Use existing mock
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const handleCreateProduct = async (values: any) => {
    try {
      const created = await productService.createProduct({
        name: values.name,
        description: values.description,
        brandId: values.brandId,
        categoryId: values.categoryId,
        thumbnail: values.thumbnail,
      });

      if (created?.id && values.sku) {
        try {
          await productService.addVariant(created.id, {
            sku: values.sku,
            color: values.variantColor || 'Đen Titan',
            storage: values.variantStorage || '256GB',
            ram: values.variantRam || '8GB',
            price: values.variantPrice || 25000000,
            compareAtPrice: values.variantComparePrice || undefined,
            inventoryQty: values.inventoryQty || 10,
          });
        } catch (vErr) {
          console.warn('Initial variant creation failed:', vErr);
        }
      }

      message.success('Thêm sản phẩm thành công!');
      setIsModalOpen(false);
      form.resetFields();
      await loadProducts();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const handleToggleStatus = async (record: Product, checked: boolean) => {
    const nextStatus = checked ? 'ACTIVE' : 'DRAFT';
    try {
      await productService.updateProduct(record.id, { status: nextStatus as any });
      const updated = products.map((p) =>
        p.id === record.id ? { ...p, status: nextStatus as any } : p
      );
      setProducts(updated);
      message.info(`Đã đổi trạng thái sản phẩm sang ${checked ? 'ĐANG BÁN' : 'TẠM ẨN'}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      message.success('Đã xóa sản phẩm thành công!');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedBrand !== 'ALL' && p.brandId !== selectedBrand) return false;
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand?.name?.toLowerCase().includes(q);
        if (!matchName && !matchBrand) return false;
      }
      return true;
    });
  }, [products, selectedBrand, selectedStatus, searchQuery]);

  const activeCount = useMemo(() => products.filter((p) => p.status === 'ACTIVE').length, [products]);
  const draftCount = useMemo(() => products.filter((p) => p.status !== 'ACTIVE').length, [products]);

  const columns: ColumnsType<Product> = [
    {
      title: 'Hình ảnh',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 80,
      render: (src: string) => (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#151d30',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <Image
            src={src || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5'}
            width="100%"
            height="100%"
            style={{ objectFit: 'contain' }}
            fallback="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5"
          />
        </div>
      ),
    },
    {
      title: 'Tên sản phẩm & Thiết bị',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
            ID: {record.id}
          </div>
        </div>
      ),
    },
    {
      title: 'Thương hiệu',
      dataIndex: 'brand',
      key: 'brand',
      render: (brand, record) => (
        <Tag
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            fontWeight: 600,
            borderRadius: 6,
          }}
        >
          {brand?.name || record.brandId || 'Chính hãng'}
        </Tag>
      ),
    },
    {
      title: 'Biến thể SKU',
      dataIndex: 'variants',
      key: 'variants',
      render: (variants: any[]) => (
        <Tag
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontWeight: 600,
            borderRadius: 6,
          }}
        >
          {variants?.length || 0} biến thể
        </Tag>
      ),
    },
    {
      title: 'Khoảng giá niêm yết',
      key: 'priceRange',
      render: (_, record) => {
        const prices = record.variants?.map((v) => v.price) || [0];
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return (
          <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', fontSize: 13 }}>
            {min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => (
        <Switch
          checked={status === 'ACTIVE'}
          onChange={(checked) => handleToggleStatus(record, checked)}
          checkedChildren="Bán"
          unCheckedChildren="Ẩn"
          style={{
            backgroundColor: status === 'ACTIVE' ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
          }}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            style={{
              background: '#151d30',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteProduct(record.id)}
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              borderColor: 'rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={3} style={{ margin: 0, color: '#f8fafc', fontWeight: 800, letterSpacing: -0.3 }}>
              Quản lý Sản phẩm & Biến thể
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: 600,
              }}
            >
              Hardware Catalog
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            Danh mục các thiết bị di động, quản lý biến thể dung lượng/màu sắc và đồng bộ tồn kho
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{
            background: '#6366f1',
            borderColor: '#6366f1',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
          }}
          onClick={() => setIsModalOpen(true)}
        >
          Thêm sản phẩm mới
        </Button>
      </div>

      {/* Filter & Metric Pill Bar */}
      <Card
        bordered={false}
        style={{
          background: '#0e1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Input
            placeholder="Tìm theo tên sản phẩm hoặc thương hiệu..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280, borderRadius: 8, background: '#151d30' }}
            allowClear
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Thương hiệu:</Text>
            <Select
              value={selectedBrand}
              onChange={setSelectedBrand}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả thương hiệu' },
                ...mockBrands.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Trạng thái:</Text>
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'ACTIVE', label: 'Đang bán' },
                { value: 'DRAFT', label: 'Tạm ẩn' },
              ]}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Tag
              color="indigo"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                fontWeight: 600,
              }}
            >
              <MobileOutlined style={{ marginRight: 4 }} />
              Tổng: {products.length} sản phẩm
            </Tag>
            <Tag
              color="green"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontWeight: 600,
              }}
            >
              <CheckCircleOutlined style={{ marginRight: 4 }} />
              Đang bán: {activeCount}
            </Tag>
            <Tag
              color="default"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(148, 163, 184, 0.12)',
                borderColor: 'rgba(148, 163, 184, 0.2)',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              <EyeInvisibleOutlined style={{ marginRight: 4 }} />
              Tạm ẩn: {draftCount}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Obsidian Products Table Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          background: '#0e1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          style={{ background: 'transparent' }}
        />
      </Card>

      {/* Modal: Add Product with ImageUploadDragger */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 8px #6366f1',
              }}
            />
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
              Thêm thiết bị mới vào danh mục
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          initialValues={{
            brandId: mockBrands[0].id,
            categoryId: mockCategories[0].id,
            variantColor: 'Titan Tự Nhiên',
            variantStorage: '256GB',
            variantRam: '8GB',
            variantPrice: 28990000,
            inventoryQty: 10,
          }}
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[{ required: true, message: 'Vui lòng nhập tên điện thoại' }]}
            >
              <Input placeholder="Ví dụ: iPhone 16 Pro Max" />
            </Form.Item>

            <Form.Item name="brandId" label="Thương hiệu" rules={[{ required: true }]}>
              <Select>
                {mockBrands.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="categoryId" label="Danh mục sản phẩm" rules={[{ required: true }]}>
              <Select>
                {mockCategories.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Mô tả tóm tắt">
              <Input placeholder="Thông tin nổi bật, chip vi xử lý, camera..." />
            </Form.Item>
          </div>

          <Form.Item
            name="thumbnail"
            label="Ảnh đại diện thiết bị (Tự động nén WebP & lưu Supabase CDN)"
          >
            <ImageUploadDragger folder="products" />
          </Form.Item>

          <Divider
            titlePlacement="start"
            plain
            style={{
              borderColor: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Khởi tạo Biến thể mặc định đầu tiên
          </Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="variantColor" label="Màu sắc" rules={[{ required: true }]}>
              <Input placeholder="Titan Xanh, Đen..." />
            </Form.Item>

            <Form.Item name="variantStorage" label="Bộ nhớ (ROM)" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="128GB">128GB</Select.Option>
                <Select.Option value="256GB">256GB</Select.Option>
                <Select.Option value="512GB">512GB</Select.Option>
                <Select.Option value="1TB">1TB</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="variantRam" label="RAM">
              <Select>
                <Select.Option value="8GB">8GB</Select.Option>
                <Select.Option value="12GB">12GB</Select.Option>
                <Select.Option value="16GB">16GB</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="variantPrice" label="Giá bán (VND)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item name="variantComparePrice" label="Giá gốc niêm yết (VND)">
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item name="inventoryQty" label="Tồn kho ban đầu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 12, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  background: '#6366f1',
                  borderColor: '#6366f1',
                  fontWeight: 600,
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
                }}
              >
                Lưu sản phẩm
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
