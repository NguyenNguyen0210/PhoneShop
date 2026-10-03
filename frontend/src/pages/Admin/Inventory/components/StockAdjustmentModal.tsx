import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, InputNumber, Input, Alert, Space, Typography, Tag, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { inventoryService } from '../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

const formatVND = (val?: number) => {
  return Number(val || 0).toLocaleString('vi-VN');
};

interface StockAdjustmentModalProps {
  open: boolean;
  item: (InventoryRecord & { variant?: { costPrice?: number } }) | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const watchedMode = Form.useWatch('mode', form);
  const watchedQty = Form.useWatch('quantity', form);
  const watchedUnitPrice = Form.useWatch('unitPrice', form);

  const activeMode = watchedMode || mode;
  const activeQty = watchedQty !== undefined ? Number(watchedQty) : qty;
  const activeUnitPrice = watchedUnitPrice !== undefined ? Number(watchedUnitPrice) : unitPrice;

  useEffect(() => {
    if (open && item) {
      form.resetFields();
      setMode('ADD');
      setQty(1);
      const cost = (item.variant as any)?.costPrice;
      const initialUnitPrice = cost || item.variant?.price || 0;
      setUnitPrice(initialUnitPrice);
      form.setFieldsValue({
        mode: 'ADD',
        quantity: 1,
        unitPrice: initialUnitPrice,
        note: '',
      });
    }
  }, [open, item, form]);

  if (!item) return null;

  const costPrice = (item.variant as any)?.costPrice;
  const currentQty = item.quantity;
  const currentAvailable = item.availableQty;
  const delta = activeMode === 'ADD' ? activeQty : -activeQty;
  const projectedQty = currentQty + delta;
  const projectedAvailable = Math.min(Math.max(0, currentAvailable + delta), projectedQty);
  const isInvalidSubtract = activeMode === 'SUBTRACT' && projectedQty < 0;
  const totalEstimatedAmount = Math.abs(activeQty) * (activeUnitPrice || 0);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isInvalidSubtract) {
        message.error('Số lượng giảm không thể vượt quá tổng tồn kho thực tế!');
        return;
      }
      setLoading(true);
      await inventoryService.adjustStock(item.variantId, {
        quantity: values.mode === 'ADD' ? values.quantity : -values.quantity,
        unitPrice: values.unitPrice ? Number(values.unitPrice) : undefined,
        note: values.note?.trim() || undefined,
      });
      message.success('Điều chỉnh số lượng kho thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi điều chỉnh tồn kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>Điều chỉnh Tồn kho</span>
          <Tag color="blue">{item.variant.sku}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okButtonProps={{ disabled: isInvalidSubtract }}
      okText="Xác nhận lưu"
      cancelText="Hủy bỏ"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
        <Text strong style={{ fontSize: 15 }}>{item.variant.product.name}</Text>
        <div>
          <Text type="secondary">
            Phân loại: {item.variant.color} - {item.variant.storage} | Tồn vật lý hiện tại: <Text strong>{currentQty}</Text> (Khả dụng: <Text strong type="success">{currentAvailable}</Text>, Giữ: <Text strong type="warning">{item.reservedQty}</Text>)
          </Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if ('mode' in changed) setMode(changed.mode);
          if ('quantity' in changed) setQty(changed.quantity || 1);
          if ('unitPrice' in changed) setUnitPrice(changed.unitPrice ?? 0);
        }}
      >
        <Form.Item name="mode" label="Hình thức điều chỉnh" rules={[{ required: true }]}>
          <Radio.Group
            buttonStyle="solid"
            value={activeMode}
            onChange={(e) => {
              setMode(e.target.value);
              form.setFieldsValue({ mode: e.target.value });
            }}
          >
            <Radio.Button value="ADD">
              <Space>
                <PlusCircleOutlined style={{ color: '#52c41a' }} />
                <span>Nhập thêm (+)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="SUBTRACT">
              <Space>
                <MinusCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>Xuất / Giảm (-)</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="quantity"
          label="Số lượng thay đổi"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng' },
            { type: 'number', min: 1, message: 'Số lượng tối thiểu là 1' },
          ]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            onChange={(val) => {
              const next = val || 1;
              setQty(next);
              form.setFieldsValue({ quantity: next });
            }}
            placeholder="Nhập số lượng máy"
          />
        </Form.Item>

        <Form.Item
          name="unitPrice"
          label="Đơn giá điều chỉnh"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              (Giá vốn hiện tại: {formatVND(costPrice)})
            </Text>
          }
        >
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            placeholder="Nhập đơn giá (VNĐ)"
            formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
            onChange={(val) => {
              const next = val ?? 0;
              setUnitPrice(next);
              form.setFieldsValue({ unitPrice: next });
            }}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          {isInvalidSubtract ? (
            <Alert
              type="error"
              showIcon
              message={`Lỗi: Tồn kho chỉ còn ${currentQty} máy, không thể giảm ${activeQty} máy (âm tồn).`}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message={
                <div>
                  Dự báo sau điều chỉnh:{' '}
                  <Text strong>Tồn thực tế: {currentQty} ➔ {projectedQty} ({delta > 0 ? `+${delta}` : delta})</Text> |{' '}
                  <Text strong>Khả dụng: {currentAvailable} ➔ {projectedAvailable}</Text>
                </div>
              }
            />
          )}

          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: activeMode === 'ADD' ? '#f6ffed' : '#fff2f0',
              borderRadius: 6,
              border: `1px solid ${activeMode === 'ADD' ? '#b7eb8f' : '#ffccc7'}`,
            }}
          >
            <Text
              type={activeMode === 'ADD' ? 'success' : 'danger'}
              style={{
                color: activeMode === 'ADD' ? '#52c41a' : '#ff4d4f',
                fontWeight: 600,
                display: 'block',
              }}
            >
              Thành tiền ước tính: {formatVND(totalEstimatedAmount)} VNĐ
            </Text>
          </div>
        </div>

        <Form.Item name="note" label="Lý do / Ghi chú">
          <TextArea rows={3} placeholder="VD: Nhập lô hàng mới đợt 2, Kiểm kê kho bù trừ, Hàng lỗi xuất trả..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
