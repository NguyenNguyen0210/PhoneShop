import React, { useState } from 'react';
import { Modal, Input, Typography, message } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface RejectReturnModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (updated: ReturnRequest) => void;
}

export const RejectReturnModal: React.FC<RejectReturnModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!returnRecord) return;
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối yêu cầu đổi trả');
      return;
    }

    setLoading(true);
    try {
      const updated = await returnService.rejectReturn(returnRecord.id, rejectReason.trim());
      message.success('Đã từ chối yêu cầu đổi trả');
      setRejectReason('');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác từ chối thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Từ chối yêu cầu đổi trả (Reject Return)"
      open={visible}
      onOk={handleConfirm}
      confirmLoading={loading}
      onCancel={() => {
        setRejectReason('');
        onClose();
      }}
      okText="Xác nhận từ chối"
      okButtonProps={{ danger: true }}
      cancelText="Quay lại"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Mã yêu cầu: <strong>{returnRecord?.returnNumber}</strong></Text>
        <br />
        <Text type="danger">
          Lý do từ chối là bắt buộc và sẽ được hiển thị cho khách hàng cũng như lưu hồ sơ kiểm tra.
        </Text>
      </div>
      <TextArea
        rows={4}
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="Ví dụ: Thiết bị có dấu hiệu cấn móp, ngấm chất lỏng, từ chối theo điều khoản bảo hành..."
      />
    </Modal>
  );
};
