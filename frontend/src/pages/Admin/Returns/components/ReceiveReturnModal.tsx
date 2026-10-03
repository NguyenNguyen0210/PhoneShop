import React, { useState } from 'react';
import { Modal, Input, Typography, message } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface ReceiveReturnModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (updated: ReturnRequest) => void;
}

export const ReceiveReturnModal: React.FC<ReceiveReturnModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!returnRecord) return;
    setLoading(true);
    try {
      const updated = await returnService.receiveReturn(returnRecord.id, note.trim() || undefined);
      message.success('Đã xác nhận nhận kiện hàng thành công');
      setNote('');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Xác nhận nhận hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Xác nhận nhận hàng đổi trả (Receive Return)"
      open={visible}
      onOk={handleConfirm}
      confirmLoading={loading}
      onCancel={() => {
        setNote('');
        onClose();
      }}
      okText="Xác nhận đã nhận"
      cancelText="Hủy"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Mã yêu cầu: <strong>{returnRecord?.returnNumber}</strong></Text>
        <br />
        <Text type="secondary">
          Vui lòng ghi chú hiện trạng kiện hàng khi khui hộp (ngoại quan, tem niêm phong, phụ kiện kèm theo).
        </Text>
      </div>
      <TextArea
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ví dụ: Đã nhận kiện hàng từ bưu tá, hộp còn nguyên vẹn, phụ kiện đủ cáp sạc, máy có vết trầy viền..."
      />
    </Modal>
  );
};
