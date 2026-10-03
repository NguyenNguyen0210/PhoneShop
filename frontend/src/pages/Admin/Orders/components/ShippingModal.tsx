import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  Button,
  message,
  Typography,
  Divider,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { Order } from '../../../../types';
import { orderService } from '../../../../services/orderService';

const { Text } = Typography;

export interface ShippingModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
  isShippingAction?: boolean; // true when transitioning to SHIPPING, false when just editing shipping info
}

const CARRIER_OPTIONS = [
  { value: 'Giao Hàng Nhanh (GHN)', label: 'Giao Hàng Nhanh (GHN)' },
  { value: 'Giao Hàng Tiết Kiệm (GHTK)', label: 'Giao Hàng Tiết Kiệm (GHTK)' },
  { value: 'Viettel Post', label: 'Viettel Post' },
  { value: 'VNPost (Bưu điện VN)', label: 'VNPost (Bưu điện VN)' },
  { value: 'J&T Express', label: 'J&T Express' },
  { value: 'OTHER', label: 'Khác (Tự nhập)' },
];

const KNOWN_CARRIERS = CARRIER_OPTIONS.filter((c) => c.value !== 'OTHER').map((c) => c.value);

interface FormValues {
  carrier: string;
  customCarrierName?: string;
  trackingNumber: string;
  estimatedDeliveryDate?: Dayjs | null;
}

export const ShippingModal: React.FC<ShippingModalProps> = ({
  open,
  order,
  onClose,
  onSuccess,
  isShippingAction = false,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const selectedCarrier = Form.useWatch('carrier', form);

  useEffect(() => {
    if (!open || !order) {
      form.resetFields();
      return;
    }

    const currentProvider = order.shipping?.providerName;
    const isKnown = currentProvider && KNOWN_CARRIERS.includes(currentProvider);

    let initialCarrier = 'Giao Hàng Nhanh (GHN)';
    let initialCustom = '';

    if (currentProvider) {
      if (isKnown) {
        initialCarrier = currentProvider;
      } else {
        initialCarrier = 'OTHER';
        initialCustom = currentProvider;
      }
    }

    form.setFieldsValue({
      carrier: initialCarrier,
      customCarrierName: initialCustom,
      trackingNumber: order.shipping?.trackingNumber || '',
      estimatedDeliveryDate: order.shipping?.estimatedDeliveryDate
        ? dayjs(order.shipping.estimatedDeliveryDate)
        : null,
    });
  }, [open, order, form]);

  const handleSubmit = async () => {
    if (!order) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const providerName =
        values.carrier === 'OTHER'
          ? (values.customCarrierName || '').trim()
          : values.carrier;

      const trackingNumber = (values.trackingNumber || '').trim();
      const estimatedDeliveryDate = values.estimatedDeliveryDate
        ? values.estimatedDeliveryDate.toISOString()
        : undefined;

      const payload = {
        providerName,
        trackingNumber: trackingNumber || undefined,
        estimatedDeliveryDate,
      };

      if (isShippingAction) {
        await orderService.updateOrderStatus(order.id, 'ship', payload);
        message.success('Đã xuất kho và chuyển đơn hàng sang trạng thái Đang giao hàng');
      } else {
        await orderService.updateOrderShipping(order.id, payload);
        message.success('Đã cập nhật thông tin vận đơn thành công');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) {
        // Form validation error, no message needed
        return;
      }
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        isShippingAction
          ? 'Xác nhận giao hàng & Nhập thông tin vận đơn'
          : 'Cập nhật thông tin vận chuyển & Vận đơn'
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          {isShippingAction ? 'Xác nhận & Bắt đầu giao' : 'Lưu thông tin'}
        </Button>,
      ]}
      destroyOnClose
      width={560}
    >
      {order && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            <div>
              <Text type="secondary">Mã đơn hàng: </Text>
              <Text strong>{order.orderNumber}</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">Khách nhận: </Text>
              <Text strong>{order.customerName}</Text> ({order.shippingPhone})
            </div>
            <div style={{ marginTop: 4, color: '#64748b' }}>
              <Text type="secondary">Địa chỉ: </Text>
              {order.shippingAddress}
            </div>
          </div>
          <Divider style={{ margin: '14px 0' }} />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          carrier: 'Giao Hàng Nhanh (GHN)',
        }}
      >
        <Form.Item
          name="carrier"
          label="Đơn vị vận chuyển"
          rules={[{ required: true, message: 'Vui lòng chọn đơn vị vận chuyển' }]}
        >
          <Select options={CARRIER_OPTIONS} placeholder="Chọn đơn vị vận chuyển" />
        </Form.Item>

        {selectedCarrier === 'OTHER' && (
          <Form.Item
            name="customCarrierName"
            label="Tên đơn vị vận chuyển khác"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đơn vị vận chuyển' },
              { whitespace: true, message: 'Tên đơn vị vận chuyển không được để trống' },
            ]}
          >
            <Input placeholder="Ví dụ: Ahamove, Lalamove, Giao nội bộ..." />
          </Form.Item>
        )}

        <Form.Item
          name="trackingNumber"
          label="Mã vận đơn (Tracking Number)"
          rules={[
            {
              required: isShippingAction,
              message: 'Vui lòng nhập mã vận đơn để khách hàng tiện theo dõi',
            },
            ...(isShippingAction
              ? [{ whitespace: true, message: 'Mã vận đơn không được để trống khoảng trắng' }]
              : []),
          ]}
        >
          <Input placeholder="Nhập mã vận đơn từ nhà xe / đơn vị vận chuyển..." allowClear />
        </Form.Item>

        <Form.Item
          name="estimatedDeliveryDate"
          label="Ngày giao dự kiến"
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày dự kiến giao (không bắt buộc)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
