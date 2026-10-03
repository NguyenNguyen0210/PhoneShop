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
import { productService } from '../../../services/productService';
import { ImageUploadDragger } from '../../../components/admin/ImageUploadDragger';
import { ProductEditModal } from './components/ProductEditModal';
import type { Product, Brand, Category } from '../../../types';

const { Title, Text } = Typography;

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, brandsRes, catRes] = await Promise.all([
        productService.getAllProductsAdmin(),
        productService.getBrands(),
        productService.getCategories(),
      ]);
      if (prodRes.items) {
        setProducts(prodRes.items);
      }
      if (Array.isArray(brandsRes)) {
        setBrands(brandsRes);
      }
      if (Array.isArray(catRes)) {
        setCategories(catRes);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
      await loadData();
      if (created?.id) {
        setEditingProductId(created.id);
        setIsEditModalOpen(true);
      }
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
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
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
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{name}</div>
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
            background: '#eff6ff',
            borderColor: '#bfdbfe',
            color: '#2563eb',
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
            background: '#f0fdf4',
            borderColor: '#bbf7d0',
            color: '#16a34a',
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
          <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: 13 }}>
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
            backgroundColor: status === 'ACTIVE' ? '#2563eb' : '#cbd5e1',
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
            onClick={() => {
              setEditingProductId(record.id);
              setIsEditModalOpen(true);
            }}
            style={{
              background: '#f8fafc',
              borderColor: '#e2e8f0',
              color: '#475569',
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
              background: '#fff1f2',
              borderColor: '#fecdd3',
              color: '#e11d48',
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
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: -0.3 }}>
              Quản lý Sản phẩm & Biến thể
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
              }}
            >
              Hardware Catalog
            </span>
          </div>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'block' }}>
            Danh mục các thiết bị di động, quản lý biến thể dung lượng/màu sắc và đồng bộ tồn kho
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{
            background: '#2563eb',
            borderColor: '#2563eb',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Input
            placeholder="Tìm theo tên sản phẩm hoặc thương hiệu..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280, borderRadius: 8, background: '#ffffff', borderColor: '#e2e8f0' }}
            allowClear
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#475569' }}>Thương hiệu:</Text>
            <Select
              value={selectedBrand}
              onChange={setSelectedBrand}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả thương hiệu' },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#475569' }}>Trạng thái:</Text>
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
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#2563eb',
                fontWeight: 600,
              }}
            >
              <MobileOutlined style={{ marginRight: 4 }} />
              Tổng: {products.length} sản phẩm
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#ecfdf5',
                borderColor: '#a7f3d0',
                color: '#059669',
                fontWeight: 600,
              }}
            >
              <CheckCircleOutlined style={{ marginRight: 4 }} />
              Đang bán: {activeCount}
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#f1f5f9',
                borderColor: '#e2e8f0',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              <EyeInvisibleOutlined style={{ marginRight: 4 }} />
              Tạm ẩn: {draftCount}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Products Table Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
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
                background: '#2563eb',
                boxShadow: '0 0 6px rgba(37, 99, 235, 0.4)',
              }}
            />
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 16 }}>
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
            brandId: brands[0]?.id,
            categoryId: categories[0]?.id,
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
              <Select placeholder="Chọn thương hiệu">
                {brands.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="categoryId" label="Danh mục sản phẩm" rules={[{ required: true }]}>
              <Select placeholder="Chọn danh mục">
                {categories.map((c) => (
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
            label="Ảnh đại diện thiết bị (Tự động nén WebP & lưu Cloudflare R2)"
          >
            <ImageUploadDragger folder="products" />
          </Form.Item>

          <Divider
            titlePlacement="start"
            plain
            style={{
              borderColor: '#e2e8f0',
              color: '#475569',
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
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                }}
              >
                Lưu sản phẩm
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      {/* Modal: Edit Product with 3 tabs */}
      <ProductEditModal
        open={isEditModalOpen}
        productId={editingProductId}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProductId(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
};
