import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Select, InputNumber, Input, Alert, Typography, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { inventoryService } from '../../../../services/inventoryService';
import { productService } from '../../../../services/productService';
import { supplierService } from '../../../../services/supplierService';
import type { Product, ProductVariant } from '../../../../types';
import type { Supplier } from '../../../../types/supplier';

const { Text } = Typography;
const { TextArea } = Input;

interface StockInboundModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVariantId?: string;
}

const variantLabel = (v: ProductVariant): string => {
  const parts = [v.color, v.storage, v.ram ? `RAM ${v.ram}` : '']
    .filter(Boolean)
    .join(' • ');
  return `${v.sku} — ${parts || v.name || 'Biến thể'}`;
};

export const StockInboundModal: React.FC<StockInboundModalProps> = ({
  open,
  onClose,
  onSuccess,
  preselectedVariantId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setSelectedProductId(undefined);
    setSelectedVariantId(undefined);
    form.setFieldsValue({ quantity: 1 });
    setProductsLoading(true);
    productService
      .getAllProductsAdmin({ limit: 100 } as any)
      .then((res) => setProducts(res.items || []))
      .catch((err) => {
        console.error('Failed to load products for inbound:', err);
        message.error('Không tải được danh sách sản phẩm');
      })
      .finally(() => setProductsLoading(false));
    supplierService
      .getSuppliers(true)
      .then((data) => setSuppliers(data || []))
      .catch(() => {});
  }, [open, form]);

  // Preselect when opened from a known variant (future use)
  useEffect(() => {
    if (open && preselectedVariantId && products.length > 0) {
      for (const p of products) {
        if (p.variants?.some((v) => v.id === preselectedVariantId)) {
          setSelectedProductId(p.id);
          setSelectedVariantId(preselectedVariantId);
          form.setFieldsValue({ productId: p.id, variantId: preselectedVariantId });
          break;
        }
      }
    }
  }, [open, preselectedVariantId, products, form]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const selectedVariant: ProductVariant | undefined = useMemo(
    () => selectedProduct?.variants?.find((v) => v.id === selectedVariantId),
    [selectedProduct, selectedVariantId]
  );

  const currentStock =
    (selectedVariant?.inventory?.availableQty ??
      (selectedVariant as any)?.stock ??
      0) as number;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.variantId) {
        message.error('Vui lòng chọn đúng biến thể (màu + cấu hình)');
        return;
      }
      setLoading(true);
      let note = values.note?.trim() || undefined;
      let referenceType: string | undefined = undefined;
      let referenceId: string | undefined = undefined;
      if (values.supplierId) {
        const found = suppliers.find((s) => s.id === values.supplierId);
        const name = found ? found.name : values.supplierId;
        note = note ? `[NCC: ${name}] ${note}` : `[NCC: ${name}]`;
        referenceType = 'SUPPLIER';
        referenceId = values.supplierId;
      }
      await inventoryService.adjustStock(values.variantId, {
        quantity: Number(values.quantity),
        unitPrice: values.unitPrice ? Number(values.unitPrice) : undefined,
        note,
        ...(referenceType && { referenceType }),
        ...(referenceId && { referenceId }),
      });
      message.success(`Đã nhập ${values.quantity} máy cho ${selectedVariant?.sku || 'biến thể'}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Nhập kho thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined style={{ color: '#52c41a' }} />
          <span>Nhập kho theo biến thể (màu + cấu hình)</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Xác nhận nhập kho"
      cancelText="Hủy"
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" initialValues={{ quantity: 1 }}>
        <Form.Item
          name="productId"
          label="Điện thoại (Sản phẩm X)"
          rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={productsLoading}
            placeholder="Tìm iPhone 15, Galaxy S24..."
            options={products.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.variants?.length || 0} biến thể)`,
            }))}
            onChange={(pid) => {
              setSelectedProductId(pid);
              setSelectedVariantId(undefined);
              form.setFieldsValue({ variantId: undefined });
            }}
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="variantId"
          label="Màu + Cấu hình (Biến thể Y-Z)"
          rules={[{ required: true, message: 'Vui lòng chọn đúng màu và cấu hình' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={selectedProduct ? 'Chọn màu + ROM/RAM...' : 'Chọn sản phẩm trước'}
            disabled={!selectedProduct}
            options={(selectedProduct?.variants || []).map((v) => {
              const stock =
                (v.inventory?.availableQty ?? (v as any)?.stock ?? 0) as number;
              return {
                value: v.id,
                label: `${variantLabel(v)} | Tồn: ${stock}`,
              };
            })}
            onChange={(vid) => {
              setSelectedVariantId(vid);
              const v = selectedProduct?.variants?.find((x) => x.id === vid);
              const cost = (v as any)?.costPrice;
              if (cost || v?.price) form.setFieldsValue({ unitPrice: cost || v?.price });
            }}
            allowClear
          />
        </Form.Item>

        {selectedVariant && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <div>
                Đã chọn: <Text strong>{selectedProduct?.name}</Text>{' '}
                <Tag color="cyan">{selectedVariant.color || '—'}</Tag>
                <Tag color="blue">{selectedVariant.storage || '—'}</Tag>
                {selectedVariant.ram && <Tag color="purple">RAM {selectedVariant.ram}</Tag>}
                <Tag color="geekblue">{selectedVariant.sku}</Tag>
                <div style={{ marginTop: 4 }}>
                  Tồn khả dụng hiện tại: <Text strong>{currentStock}</Text> máy
                </div>
              </div>
            }
          />
        )}

        <Form.Item
          name="quantity"
          label="Số lượng nhập cụ thể"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng' },
            { type: 'number', min: 1, message: 'Số lượng tối thiểu là 1' },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 10 máy" />
        </Form.Item>

        <Form.Item name="unitPrice" label="Đơn giá nhập (VNĐ)">
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            placeholder="Giá vốn / đơn giá"
            formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
          />
        </Form.Item>

        <Form.Item name="supplierId" label="Nhà cung cấp (Tùy chọn)">
          <Select
            showSearch
            optionFilterProp="label"
            allowClear
            placeholder="Chọn NCC"
            options={suppliers.map((s) => ({
              value: s.id,
              label: s.name + (s.contactName ? ` (${s.contactName})` : ''),
            }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={2} placeholder="VD: Nhập lô 20 máy iPhone 15 Đen 256GB..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
