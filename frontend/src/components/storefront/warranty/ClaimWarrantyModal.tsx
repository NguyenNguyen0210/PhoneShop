import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import {
  SafetyCertificateOutlined,
  MobileOutlined,
  CalendarOutlined,
  BarcodeOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { warrantyService } from '../../../services/warrantyService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { Warranty } from '../../../types';

const { TextArea } = Input;

export interface ClaimWarrantyModalProps {
  visible?: boolean;
  open?: boolean;
  onClose: () => void;
  warranty: Warranty | any | null;
  onSuccess: () => void;
}

export const ClaimWarrantyModal: React.FC<ClaimWarrantyModalProps> = ({
  visible,
  open,
  onClose,
  warranty,
  onSuccess,
}) => {
  const isModalOpen = open ?? visible ?? false;
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (isModalOpen && warranty) {
      form.resetFields();
      form.setFieldsValue({
        customerPhone: user?.phone || '',
        returnAddress: (user as any)?.address || (user as any)?.shippingAddress || '',
      });
    }
  }, [isModalOpen, warranty, user, form]);

  const handleSubmit = async () => {
    if (!warranty?.id) {
      message.error('Không tìm thấy mã định danh bảo hành!');
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await warrantyService.claimWarranty(warranty.id, {
        reason: values.reason,
        customerPhone: values.customerPhone?.trim() || undefined,
        returnAddress: values.returnAddress?.trim() || undefined,
      });

      message.success('Đã gửi yêu cầu bảo hành thành công!');
      form.resetFields();
      onClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) {
        return;
      }
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Gửi yêu cầu bảo hành thất bại. Vui lòng thử lại sau!';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const productName =
    warranty?.deviceInfo?.productName ||
    warranty?.productVariant?.product?.name ||
    warranty?.productName ||
    'Thiết bị di động chính hãng';

  const variantInfo =
    warranty?.variantInfo ||
    warranty?.variantName ||
    (warranty?.productVariant
      ? [warranty.productVariant.color, warranty.productVariant.storage].filter(Boolean).join(' - ')
      : warranty?.deviceInfo?.color
      ? [warranty.deviceInfo.color, warranty.deviceInfo.storage].filter(Boolean).join(' - ')
      : '');

  const imeiNumber =
    warranty?.imeiNumber ||
    warranty?.imei ||
    warranty?.imeiDevice?.imei ||
    warranty?.imeiDevice?.imeiNumber ||
    warranty?.deviceInfo?.imeiNumber ||
    'N/A';

  const endDateStr = warranty?.endDate
    ? new Date(warranty.endDate).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Không xác định';

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <SafetyCertificateOutlined className="text-blue-600 text-lg" />
          <span className="font-bold">Gửi yêu cầu bảo hành thiết bị</span>
        </div>
      }
      open={isModalOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Xác nhận gửi yêu cầu
        </Button>,
      ]}
      destroyOnClose
      width={600}
    >
      <div className="py-2 space-y-4">
        {/* Device Info Summary Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MobileOutlined className="text-blue-600" />
                <span>Thiết bị bảo hành</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{productName}</h4>
              {variantInfo && <p className="text-xs text-slate-500">{variantInfo}</p>}
            </div>
            {warranty?.warrantyCode && (
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">Mã bảo hành</span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {warranty.warrantyCode}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <BarcodeOutlined className="text-slate-400" />
              <span>IMEI:</span>
              <span className="font-mono font-bold text-slate-800">{imeiNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarOutlined className="text-slate-400" />
              <span>Hạn bảo hành:</span>
              <span className="font-semibold text-slate-800">{endDateStr}</span>
            </div>
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="Hướng dẫn gửi yêu cầu"
          description="Vui lòng cung cấp chi tiết triệu chứng lỗi của máy để kỹ thuật viên PhoneShop tiến hành thẩm định và hướng dẫn tiếp nhận nhanh nhất."
          className="text-xs rounded-xl"
        />

        {/* Claim Form */}
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="reason"
            label={<span className="font-semibold text-slate-800">Mô tả lỗi / Lý do bảo hành</span>}
            rules={[
              { required: true, message: 'Vui lòng mô tả cụ thể sự cố hoặc lỗi của thiết bị' },
              { min: 5, message: 'Nội dung mô tả cần ít nhất 5 ký tự' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Mô tả cụ thể triệu chứng lỗi (Ví dụ: Máy không nhận sạc, màn hình sọc xanh sau khi rơi nhẹ, camera bị đốm đen, loa thoại bị nhỏ...)"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="customerPhone"
            label={<span className="font-semibold text-slate-800">Số điện thoại liên hệ</span>}
            rules={[
              {
                pattern: /^(0|\+84)(3|5|7|8|9)\d{8}$/,
                message: 'Số điện thoại không hợp lệ (gồm 10 chữ số, ví dụ 0901234567)',
              },
            ]}
          >
            <Input placeholder="Nhập số điện thoại để kỹ thuật viên liên hệ lại..." />
          </Form.Item>

          <Form.Item
            name="returnAddress"
            label={<span className="font-semibold text-slate-800">Địa chỉ nhận máy sau bảo hành</span>}
          >
            <TextArea
              rows={2}
              placeholder="Nhập địa chỉ nhận máy sau khi hoàn tất sửa chữa / bảo hành (Tùy chọn)..."
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ClaimWarrantyModal;
