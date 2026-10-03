import React, { useState } from 'react';
import { Modal, Form, Input, Typography, Alert, Descriptions, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { paymentService } from '../../../../services/paymentService';
import type { Payment } from '../../../../types';

const { Text } = Typography;

export interface ReconciliationModalProps {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  open,
  payment,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  if (!payment) return null;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await paymentService.confirmPaymentAdmin(payment.id, values.providerRef.trim());
      message.success('Đối soát thành công! Đơn hàng đã chuyển CONFIRMED và kích hoạt bảo hành.');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || err.message || 'Xác nhận đối soát thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#16a34a' }} />
          <span>Xác nhận Đối soát Giao dịch Chuyển khoản</span>
        </div>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleSubmit}
      okText="Xác nhận khớp tiền & Chốt đơn"
      cancelText="Đóng"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Alert
        title="Hệ thống sẽ cập nhật tự động"
        description="Khi bấm xác nhận: Payment chuyển PAID, Order chuyển CONFIRMED, thiết bị IMEI gắn với đơn chuyển SOLD và kích hoạt bảo hành điện tử."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã đơn hàng">
          <Text strong style={{ color: '#2563eb' }}>
            #{payment.order?.orderNumber || payment.orderId}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Khách hàng">
          {payment.order?.user?.firstName || payment.order?.user?.lastName
            ? `${payment.order.user.lastName || ''} ${payment.order.user.firstName || ''} (${payment.order.user.email})`
            : payment.order?.user?.email || 'Khách vãng lai'}
        </Descriptions.Item>
        <Descriptions.Item label="Số tiền cần khớp">
          <Text strong style={{ color: '#16a34a', fontSize: 16 }}>
            {formatPrice(Number(payment.amount))}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Form.Item
          name="providerRef"
          label="Mã bút toán / Mã tham chiếu ngân hàng (providerRef)"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập mã giao dịch ngân hàng' },
            { min: 4, message: 'Mã tham chiếu tối thiểu 4 ký tự' },
          ]}
        >
          <Input placeholder="VD: FT261004998877 hoặc MB-123456" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
