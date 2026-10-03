import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Alert, Space, Typography, Tag, message } from 'antd';
import { inventoryService } from '../../../../services/inventoryService';
import type { InventoryRecord } from '../../../../types';

const { Text } = Typography;

interface ReorderLevelModalProps {
  open: boolean;
  item: InventoryRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReorderLevelModal: React.FC<ReorderLevelModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      form.setFieldsValue({ reorderLevel: item.reorderLevel ?? 5 });
    }
  }, [open, item, form]);

  if (!item) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await inventoryService.setReorderLevel(item.variantId, {
        reorderLevel: values.reorderLevel,
      });
      message.success('Cập nhật định mức cảnh báo thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Có lỗi khi cập nhật định mức cảnh báo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>Thiết lập Định mức Báo động (Reorder Level)</span>
          <Tag color="orange">{item.variant.sku}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Lưu định mức"
      cancelText="Hủy"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
        <Text strong>{item.variant.product.name}</Text>
        <div>
          <Text type="secondary">
            {item.variant.color} - {item.variant.storage} | Tồn khả dụng hiện tại: <Text strong>{item.availableQty}</Text>
          </Text>
        </div>
      </div>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Hệ thống sẽ kích hoạt cảnh báo 'Sắp hết hàng' khi lượng tồn khả dụng (availableQty) giảm bằng hoặc thấp hơn định mức này."
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="reorderLevel"
          label="Mức tồn cảnh báo tối thiểu"
          rules={[
            { required: true, message: 'Vui lòng nhập định mức' },
            { type: 'number', min: 0, message: 'Định mức tối thiểu là 0' },
          ]}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 5" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
