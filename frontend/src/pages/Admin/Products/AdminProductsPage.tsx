import React, { useState, useEffect, useCallback } from 'react';
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { mockProducts, mockBrands, mockCategories } from '../../../data/mockProducts';
import { productService } from '../../../services/productService';
import { ImageUploadDragger } from '../../../components/admin/ImageUploadDragger';
import type { Product } from '../../../types';

const { Title, Text } = Typography;

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const columns: ColumnsType<Product> = [
    {
      title: 'Hình ảnh',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 80,
      render: (src: string) => (
        <Image
          src={src || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5'}
          width={50}
          height={50}
          style={{ objectFit: 'contain', borderRadius: 8 }}
          fallback="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5"
        />
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            ID: {record.id}
          </div>
        </div>
      ),
    },
    {
      title: 'Hãng',
      dataIndex: 'brand',
      key: 'brand',
      render: (brand, record) => (
        <Tag color="blue">{brand?.name || record.brandId || 'Chính hãng'}</Tag>
      ),
    },
    {
      title: 'Số biến thể',
      dataIndex: 'variants',
      key: 'variants',
      render: (variants: any[]) => (
        <Tag color="purple">{variants?.length || 0} biến thể</Tag>
      ),
    },
    {
      title: 'Khoảng giá',
      key: 'priceRange',
      render: (_, record) => {
        const prices = record.variants?.map((v) => v.price) || [0];
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return (
          <Text strong style={{ color: '#dc2626' }}>
            {min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`}
          </Text>
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
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button size="small" icon={<EditOutlined />}>
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteProduct(record.id)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Sản phẩm & Biến thể
          </Title>
          <Text type="secondary">
            Danh mục các thiết bị di động, quản lý biến thể dung lượng/màu sắc và đồng bộ tồn kho
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{ background: '#2563eb' }}
          onClick={() => setIsModalOpen(true)}
        >
          Thêm sản phẩm mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* Modal: Add Product */}
      <Modal
        title="Thêm thiết bị mới vào danh mục"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
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

          <Divider titlePlacement="start" plain>
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

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#2563eb' }}>
                Lưu sản phẩm
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
