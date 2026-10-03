import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, InputNumber, Input, Alert, Space, Typography, Tag, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { inventoryService } from '../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface StockAdjustmentModalProps {
  open: boolean;
  item: InventoryRecord | null;
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

  useEffect(() => {
    if (open) {
      form.resetFields();
      setMode('ADD');
      setQty(1);
      form.setFieldsValue({ mode: 'ADD', quantity: 1, note: '' });
    }
  }, [open, form]);

  if (!item) return null;

  const currentQty = item.quantity;
  const currentAvailable = item.availableQty;
  const delta = mode === 'ADD' ? qty : -qty;
  const projectedQty = currentQty + delta;
  const projectedAvailable = Math.min(Math.max(0, currentAvailable + delta), projectedQty);
  const isInvalidSubtract = mode === 'SUBTRACT' && projectedQty < 0;

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

      <Form form={form} layout="vertical">
        <Form.Item name="mode" label="Hình thức điều chỉnh" rules={[{ required: true }]}>
          <Radio.Group
            buttonStyle="solid"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
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
            value={qty}
            onChange={(val) => setQty(val || 1)}
            placeholder="Nhập số lượng máy"
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          {isInvalidSubtract ? (
            <Alert
              type="error"
              showIcon
              message={`Lỗi: Tồn kho chỉ còn ${currentQty} máy, không thể giảm ${qty} máy (âm tồn).`}
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
        </div>

        <Form.Item name="note" label="Lý do / Ghi chú">
          <TextArea rows={3} placeholder="VD: Nhập lô hàng mới đợt 2, Kiểm kê kho bù trừ, Hàng lỗi xuất trả..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
