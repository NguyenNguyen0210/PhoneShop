import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Tag,
  Space,
  DatePicker,
  message,
  Descriptions,
  Card,
  Typography,
  Divider,
} from 'antd';
import {
  CarOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CARRIER_PRESETS, shippingService } from '../../../../services/shippingService';
import type { Order, ShippingStatus } from '../../../../types';

const { Text } = Typography;

export interface ShippingDispatchModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShippingFormValues {
  providerName: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: dayjs.Dayjs | null;
}

const TRANSITION_ACTIONS: Partial<
  Record<
    ShippingStatus,
    Array<{
      target: ShippingStatus;
      label: string;
      danger?: boolean;
      color?: string;
      icon?: React.ReactNode;
    }>
  >
> = {
  PENDING: [
    {
      target: 'READY_TO_SHIP',
      label: 'Bàn giao vận chuyển (READY_TO_SHIP)',
      icon: <SendOutlined />,
    },
  ],
  READY_TO_SHIP: [
    {
      target: 'PICKED_UP',
      label: 'Bưu tá đã lấy hàng (PICKED_UP)',
      icon: <CheckCircleOutlined />,
    },
  ],
  PICKED_UP: [
    {
      target: 'IN_TRANSIT',
      label: 'Bắt đầu giao hàng (IN_TRANSIT)',
      icon: <CarOutlined />,
    },
  ],
  IN_TRANSIT: [
    {
      target: 'DELIVERED',
      label: 'Xác nhận giao thành công (DELIVERED)',
      color: '#16a34a',
      icon: <CheckCircleOutlined />,
    },
    {
      target: 'FAILED',
      label: 'Báo giao thất bại (FAILED)',
      danger: true,
      icon: <CloseCircleOutlined />,
    },
  ],
  FAILED: [
    {
      target: 'IN_TRANSIT',
      label: 'Giao lại bưu kiện (IN_TRANSIT)',
      icon: <SyncOutlined />,
    },
    {
      target: 'RETURNED',
      label: 'Xác nhận hoàn hàng về kho (RETURNED)',
      danger: true,
      icon: <RollbackOutlined />,
    },
  ],
};

const getShippingStatusTag = (status?: ShippingStatus) => {
  switch (status) {
    case 'PENDING':
      return <Tag color="gold">Chờ xử lý (PENDING)</Tag>;
    case 'READY_TO_SHIP':
      return <Tag color="blue">Sẵn sàng bàn giao (READY_TO_SHIP)</Tag>;
    case 'PICKED_UP':
      return <Tag color="cyan">Bưu tá đã lấy (PICKED_UP)</Tag>;
    case 'IN_TRANSIT':
      return <Tag color="orange">Đang giao hàng (IN_TRANSIT)</Tag>;
    case 'DELIVERED':
      return <Tag color="green">Giao thành công (DELIVERED)</Tag>;
    case 'FAILED':
      return <Tag color="red">Giao thất bại (FAILED)</Tag>;
    case 'RETURNED':
      return <Tag color="purple">Đã hoàn hàng (RETURNED)</Tag>;
    default:
      return <Tag color="default">Chưa khởi tạo</Tag>;
  }
};

const ShippingDispatchModalContent: React.FC<{
  open: boolean;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, order, onClose, onSuccess }) => {
  const [form] = Form.useForm<ShippingFormValues>();
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    () => order.shipping?.providerName || '',
  );

  useEffect(() => {
    if (open && order) {
      form.setFieldsValue({
        providerName: order.shipping?.providerName || '',
        trackingNumber: order.shipping?.trackingNumber || '',
        estimatedDeliveryDate: order.shipping?.estimatedDeliveryDate
          ? dayjs(order.shipping.estimatedDeliveryDate)
          : null,
      });
    } else {
      form.resetFields();
    }
  }, [open, order, form]);

  const currentShippingStatus = order.shipping?.status;
  const availableTransitions = currentShippingStatus
    ? TRANSITION_ACTIONS[currentShippingStatus] || []
    : [];

  const handleCarrierChipClick = (carrierName: string) => {
    setSelectedProvider(carrierName);
    form.setFieldsValue({ providerName: carrierName });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        providerName: values.providerName.trim(),
        trackingNumber: values.trackingNumber ? values.trackingNumber.trim() : undefined,
        estimatedDeliveryDate: values.estimatedDeliveryDate
          ? values.estimatedDeliveryDate.toISOString()
          : undefined,
      };

      if (order.shipping?.id) {
        await shippingService.updateShipping(order.shipping.id, payload);
        message.success('Cập nhật thông tin vận chuyển thành công');
      } else {
        await shippingService.assignShipping({
          orderId: order.id,
          providerName: payload.providerName,
          trackingNumber: payload.trackingNumber,
          estimatedDeliveryDate: payload.estimatedDeliveryDate,
        });
        message.success('Gán đơn vị vận chuyển thành công');
      }

      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || err.message || 'Lưu thông tin thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleTransitionClick = async (targetStatus: ShippingStatus) => {
    if (!order.shipping?.id) {
      message.warning('Vui lòng lưu thông tin vận chuyển trước khi chuyển trạng thái');
      return;
    }

    setUpdatingStatus(targetStatus);
    try {
      await shippingService.updateShippingStatus(order.shipping.id, {
        status: targetStatus,
      });
      message.success(`Đã cập nhật trạng thái bưu kiện sang ${targetStatus}`);
      onSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Chuyển trạng thái thất bại');
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CarOutlined style={{ color: '#2563eb' }} />
          <span>Điều phối & Quản lý Vận chuyển</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving || !!updatingStatus}>
          Đóng
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!!updatingStatus}
        >
          {order.shipping?.id ? 'Lưu thông tin vận chuyển' : 'Khởi tạo & Bàn giao'}
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Order Summary Header */}
        <Card size="small" style={{ background: '#f8fafc', borderRadius: 10 }}>
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered={false}>
            <Descriptions.Item label={<Text strong>Mã đơn hàng</Text>}>
              <Text code strong style={{ fontSize: 13, color: '#1e40af' }}>
                {order.orderNumber}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>Người nhận</Text>}>
              <Text strong>{order.customerName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>Số điện thoại</Text>}>
              {order.shippingPhone}
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>Trạng thái đơn hàng</Text>}>
              <Tag color="geekblue">{order.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>Địa chỉ giao nhận</Text>} span={2}>
              {order.shippingAddress}
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>Trạng thái vận chuyển</Text>} span={2}>
              {getShippingStatusTag(order.shipping?.status)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Carrier quick selection chips */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Chọn nhanh đơn vị vận chuyển:
          </Text>
          <Space wrap size={[8, 8]}>
            {CARRIER_PRESETS.map((preset) => {
              const isChecked = selectedProvider === preset.name;
              return (
                <Tag.CheckableTag
                  key={preset.key}
                  checked={isChecked}
                  onChange={() => handleCarrierChipClick(preset.name)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    border: isChecked ? '1px solid #2563eb' : '1px solid #d9d9d9',
                    background: isChecked ? '#eff6ff' : '#ffffff',
                    color: isChecked ? '#1d4ed8' : '#334155',
                  }}
                >
                  {preset.name}
                </Tag.CheckableTag>
              );
            })}
          </Space>
        </div>

        {/* Shipping Form */}
        <Form form={form} layout="vertical">
          <Form.Item
            name="providerName"
            label="Đơn vị vận chuyển (Carrier)"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đơn vị vận chuyển' }]}
          >
            <Input
              placeholder="VD: Giao Hàng Nhanh (GHN) hoặc nhập đối tác khác"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            />
          </Form.Item>

          <Form.Item
            name="trackingNumber"
            label="Mã vận đơn (Tracking Number)"
            normalize={(v) => (v ? v.trim() : '')}
          >
            <Input
              placeholder="VD: GHN123456789"
              style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
            />
          </Form.Item>

          <Form.Item name="estimatedDeliveryDate" label="Ngày dự kiến giao hàng">
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="Chọn ngày dự kiến giao"
            />
          </Form.Item>
        </Form>

        {/* Status Progression Buttons */}
        {availableTransitions.length > 0 && (
          <div>
            <Divider titlePlacement="start" plain style={{ margin: '8px 0 12px 0' }}>
              Chuyển tiếp trạng thái vận chuyển
            </Divider>
            <Space wrap size={10}>
              {availableTransitions.map((action) => (
                <Button
                  key={action.target}
                  icon={action.icon}
                  danger={action.danger}
                  style={
                    action.color
                      ? {
                          backgroundColor: action.color,
                          borderColor: action.color,
                          color: '#fff',
                        }
                      : action.danger
                        ? undefined
                        : { borderColor: '#2563eb', color: '#2563eb' }
                  }
                  loading={updatingStatus === action.target}
                  disabled={saving || (!!updatingStatus && updatingStatus !== action.target)}
                  onClick={() => handleTransitionClick(action.target)}
                >
                  {action.label}
                </Button>
              ))}
            </Space>
          </div>
        )}

        {(currentShippingStatus === 'DELIVERED' || currentShippingStatus === 'RETURNED') && (
          <Card
            size="small"
            style={{
              background: currentShippingStatus === 'DELIVERED' ? '#f0fdf4' : '#faf5ff',
              border: `1px solid ${currentShippingStatus === 'DELIVERED' ? '#bbf7d0' : '#e9d5ff'}`,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: currentShippingStatus === 'DELIVERED' ? '#166534' : '#6b21a8',
                fontWeight: 600,
              }}
            >
              Bưu kiện đã ở trạng thái kết thúc ({currentShippingStatus}). Không thể chuyển tiếp thêm.
            </Text>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export const ShippingDispatchModal: React.FC<ShippingDispatchModalProps> = (props) => {
  if (!props.order) return null;
  return (
    <ShippingDispatchModalContent
      key={`${props.order.id}-${props.order.shipping?.id || 'new'}-${props.order.shipping?.status || 'none'}`}
      {...props}
      order={props.order}
    />
  );
};
