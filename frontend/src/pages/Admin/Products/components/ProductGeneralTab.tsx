import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  Radio,
  Switch,
  InputNumber,
  Button,
  Row,
  Col,
  Space,
  message,
  Divider,
} from 'antd';
import { SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import { slugify } from './VariantFormModal';
import type { Product, Brand, Category } from '../../../../types';

export interface ProductGeneralTabProps {
  product: Product;
  brands: Brand[];
  categories: Category[];
  onSaveSuccess: () => void;
}

export const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
  product,
  brands,
  categories,
  onSaveSuccess,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      name: product.name || '',
      slug: product.slug || '',
      brandId: product.brandId || brands[0]?.id,
      categoryId: product.categoryId || categories[0]?.id,
      condition: (product as any).condition || 'NEW',
      status: product.status === 'ACTIVE',
      warrantyMonths: (product as any).warrantyMonths ?? 12,
      description: product.description || '',
      thumbnailUrl: product.thumbnailUrl || product.thumbnail || '',
    });
  }, [product, brands, categories, form]);

  const handleGenerateSlug = () => {
    const nameVal = form.getFieldValue('name');
    if (!nameVal) {
      message.warning('Vui lòng nhập tên sản phẩm trước khi tạo slug');
      return;
    }
    const generated = slugify(nameVal);
    form.setFieldsValue({ slug: generated });
    message.info('Đã tạo slug tự động');
  };

  const handleFinish = async (values: any) => {
    try {
      setSaving(true);
      const payload: Partial<Product> = {
        name: values.name,
        slug: values.slug,
        brandId: values.brandId,
        categoryId: values.categoryId,
        description: values.description,
        thumbnailUrl: values.thumbnailUrl,
        status: values.status ? 'ACTIVE' : 'DRAFT',
      };
      // Include condition & warrantyMonths
      (payload as any).condition = values.condition;
      (payload as any).warrantyMonths = values.warrantyMonths;

      await productService.updateProduct(product.id, payload);
      message.success('Đã lưu thông tin chung sản phẩm thành công!');
      onSaveSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Cập nhật sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ marginTop: 8 }}
    >
      <Row gutter={16}>
        <Col span={14}>
          <Form.Item
            name="name"
            label="Tên sản phẩm thiết bị"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="Ví dụ: iPhone 16 Pro Max" size="large" />
          </Form.Item>
        </Col>

        <Col span={10}>
          <Form.Item
            name="slug"
            label="Slug đường dẫn (URL)"
            rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
            extra={
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateSlug}
                style={{ padding: 0, height: 'auto', fontSize: 11 }}
              >
                Tự tạo slug từ tên
              </Button>
            }
          >
            <Input placeholder="iphone-16-pro-max" size="large" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="brandId"
            label="Thương hiệu"
            rules={[{ required: true, message: 'Vui lòng chọn thương hiệu' }]}
          >
            <Select placeholder="Chọn thương hiệu" size="large">
              {brands.map((b) => (
                <Select.Option key={b.id} value={b.id}>
                  {b.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            name="categoryId"
            label="Danh mục sản phẩm"
            rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
          >
            <Select placeholder="Chọn danh mục" size="large">
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16} align="middle">
        <Col span={8}>
          <Form.Item name="condition" label="Tình trạng thiết bị">
            <Radio.Group>
              <Radio value="NEW">Mới 100% (New)</Radio>
              <Radio value="LIKE_NEW">Like New 99%</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item name="warrantyMonths" label="Thời hạn bảo hành (Tháng)">
            <InputNumber min={0} max={60} style={{ width: '100%' }} />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item
            name="status"
            label="Trạng thái kinh doanh"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="ĐANG BÁN"
              unCheckedChildren="TẠM ẨN"
              style={{ minWidth: 100 }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Mô tả chi tiết / điểm nổi bật">
        <Input.TextArea
          rows={4}
          placeholder="Mô tả ngắn gọn về thiết kế, tính năng, camera, thời lượng pin..."
        />
      </Form.Item>

      <Divider style={{ margin: '16px 0' }} />

      <Form.Item
        name="thumbnailUrl"
        label="Ảnh đại diện chính của sản phẩm (WebP, tối ưu CDN Cloudflare)"
      >
        <ImageUploadDragger folder="products" />
      </Form.Item>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={saving}
          size="large"
          style={{
            background: '#2563eb',
            borderColor: '#2563eb',
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          Lưu thông tin chung
        </Button>
      </div>
    </Form>
  );
};
