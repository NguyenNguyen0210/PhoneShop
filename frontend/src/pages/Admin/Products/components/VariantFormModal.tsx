import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  message,
  Row,
  Col,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { productService } from '../../../../services/productService';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type { ProductVariant } from '../../../../types';

export interface VariantFormModalProps {
  open: boolean;
  productId: string;
  productName?: string;
  variant?: ProductVariant | null; // null => Thêm mới, có object => Chỉnh sửa
  onClose: () => void;
  onSuccess: () => void;
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const STORAGE_OPTIONS = [
  { label: '128GB', value: '128GB' },
  { label: '256GB', value: '256GB' },
  { label: '512GB', value: '512GB' },
  { label: '1TB', value: '1TB' },
];

const RAM_OPTIONS = [
  { label: '8GB', value: '8GB' },
  { label: '12GB', value: '12GB' },
  { label: '16GB', value: '16GB' },
];

export const VariantFormModal: React.FC<VariantFormModalProps> = ({
  open,
  productId,
  productName,
  variant,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (variant) {
        form.setFieldsValue({
          name: variant.name || '',
          sku: variant.sku || '',
          color: variant.color || '',
          storage: variant.storage || undefined,
          ram: variant.ram || undefined,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          costPrice: variant.costPrice,
          imageUrl: variant.imageUrl || variant.images?.[0] || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, variant, form]);

  const handleSuggestSku = () => {
    const storage = form.getFieldValue('storage');
    const color = form.getFieldValue('color');
    const pSlug = slugify(productName || 'PROD').toUpperCase();
    const sSlug = storage ? slugify(storage).toUpperCase() : '';
    const cSlug = color ? slugify(color).toUpperCase() : '';

    const parts = [pSlug, sSlug, cSlug].filter(Boolean);
    const suggested = parts.join('-');
    form.setFieldsValue({ sku: suggested });
  };

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (variant?.id) {
        const { initialQuantity, ...updatePayload } = values;
        await productService.updateVariant(productId, variant.id, updatePayload);
        message.success('Cập nhật biến thể thành công!');
      } else {
        const { initialQuantity, ...createPayload } = values;
        const created: any = await productService.addVariant(productId, {
          ...createPayload,
          // Backend tự tạo inventory + movement INITIAL_SETUP nếu > 0
          ...(initialQuantity > 0 ? { initialQuantity: Number(initialQuantity) } : {}),
        });
        // Fallback cho backend cũ chưa hỗ trợ initialQuantity:
        // tự adjustStock sau khi tạo biến thể.
        if (initialQuantity > 0 && created?.id && !('initialQuantity' in (created || {}))) {
          try {
            const { inventoryService } = await import('../../../../services/inventoryService');
            await inventoryService.adjustStock(created.id, {
              quantity: Number(initialQuantity),
              note: 'Tồn kho ban đầu khi tạo biến thể (màu/cấu hình mới)',
            });
          } catch (stockErr: any) {
            // Biến thể đã tạo, chỉ báo tồn kho cần vào Kho nhập bổ sung
            console.warn('Initial stock adjust failed, please add via Inventory:', stockErr);
          }
        }
        message.success(
          initialQuantity > 0
            ? `Thêm biến thể mới + nhập ${initialQuantity} máy thành công!`
            : 'Thêm biến thể mới thành công!'
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={variant ? 'Chỉnh sửa biến thể' : 'Thêm biến thể mới'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={720}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          storage: '128GB',
          ram: '8GB',
        }}
      >
        <Form.Item
          name="name"
          label="Tên biến thể"
          rules={[{ required: true, message: 'Vui lòng nhập tên biến thể' }]}
        >
          <Input placeholder="Ví dụ: iPhone 15 Pro Max 256GB Titan Tự Nhiên" />
        </Form.Item>

        <Form.Item
          name="sku"
          label="Mã SKU"
          rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}
          extra={
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={handleSuggestSku}
              style={{ paddingLeft: 0, marginTop: 4 }}
            >
              Gợi ý SKU
            </Button>
          }
        >
          <Input placeholder="Nhập hoặc nhấn Gợi ý SKU" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="color" label="Màu sắc">
              <Input placeholder="Ví dụ: Titan Tự Nhiên, Đen" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="storage" label="Bộ nhớ ROM">
              <Select
                placeholder="Chọn ROM"
                options={STORAGE_OPTIONS}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="ram" label="RAM">
              <Select
                placeholder="Chọn RAM"
                options={RAM_OPTIONS}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="price"
              label="Giá bán (VND)"
              rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : ('' as any))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="compareAtPrice" label="Giá gốc niêm yết (VND)">
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : ('' as any))}
              />
            </Form.Item>
          </Col>
        </Row>

        {!variant && (
          <Form.Item
            name="initialQuantity"
            label="Số lượng nhập kho ban đầu (đúng màu + cấu hình này)"
            extra="Để 0 nếu chỉ tạo biến thể, nhập số lượng cụ thể sau ở Quản lý Kho."
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 10 máy" />
          </Form.Item>
        )}

        <Form.Item name="imageUrl" label="Ảnh biến thể theo màu">
          <ImageUploadDragger folder={'variants' as any} />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 600,
            }}
          >
            {variant ? 'Cập nhật' : 'Thêm biến thể'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
