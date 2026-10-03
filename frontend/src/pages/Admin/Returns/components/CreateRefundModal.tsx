import React, { useState, useEffect } from 'react';
import { Modal, Input, InputNumber, Typography, message, Alert } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest, RefundItem } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface CreateRefundModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (newRefund: RefundItem) => void;
}

export const CreateRefundModal: React.FC<CreateRefundModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const orderTotal = Number(returnRecord?.order?.totalAmount ?? 0);
  const alreadyRefunded = (returnRecord?.refunds ?? [])
    .filter((r) => r.status !== 'FAILED' && r.status !== 'CANCELLED')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const maxRefundable = Math.max(0, orderTotal - alreadyRefunded);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  useEffect(() => {
    if (visible && returnRecord) {
      setAmount(maxRefundable);
      setReason(`Hoàn tiền đổi trả thiết bị cho yêu cầu ${returnRecord.returnNumber}`);
    }
  }, [visible, returnRecord, maxRefundable]);

  const handleCreate = async () => {
    if (!returnRecord) return;
    if (!amount || amount <= 0) {
      message.warning('Số tiền hoàn phải lớn hơn 0 ₫');
      return;
    }
    if (amount > maxRefundable) {
      message.error(`Số tiền hoàn không được vượt quá số tiền tối đa còn lại (${formatPrice(maxRefundable)})`);
      return;
    }

    setLoading(true);
    try {
      const res = await returnService.createRefund({
        returnId: returnRecord.id,
        amount,
        reason: reason.trim() || undefined,
      });
      message.success('Đã lập lệnh hoàn tiền thành công (Trạng thái: PENDING)');
      onSuccess(res);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lập lệnh hoàn tiền thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Lập lệnh hoàn tiền (Manager/Admin)"
      open={visible}
      onOk={handleCreate}
      confirmLoading={loading}
      onCancel={onClose}
      okText="Tạo lệnh hoàn tiền"
      cancelText="Hủy"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          message="Chính sách hoàn tiền an toàn"
          description={
            <div>
              <div>Tổng giá trị đơn hàng: <strong>{formatPrice(orderTotal)}</strong></div>
              <div>Đã tạo hoàn tiền trước đó: <strong>{formatPrice(alreadyRefunded)}</strong></div>
              <div>Số tiền tối đa có thể hoàn: <strong style={{ color: '#2563eb' }}>{formatPrice(maxRefundable)}</strong></div>
            </div>
          }
          style={{ marginBottom: 12 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Số tiền hoàn trả (VNĐ):</Text>
        <InputNumber
          style={{ width: '100%', marginTop: 4 }}
          value={amount}
          min={1000}
          max={maxRefundable}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
          onChange={(val) => setAmount(Number(val || 0))}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Lý do hoàn tiền:</Text>
        <TextArea
          rows={3}
          style={{ marginTop: 4 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do hoàn tiền..."
        />
      </div>
    </Modal>
  );
};
