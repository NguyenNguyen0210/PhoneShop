import React from 'react';
import { Modal, Image, Typography, Space, Button } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export interface VietQRTestModalProps {
  open: boolean;
  qrUrl: string | null;
  onClose: () => void;
}

export const VietQRTestModal: React.FC<VietQRTestModalProps> = ({ open, qrUrl, onClose }) => {
  return (
    <Modal
      open={open}
      title={
        <Space>
          <QrcodeOutlined style={{ color: '#2563eb', fontSize: 18 }} />
          <span style={{ fontWeight: 600 }}>Kiểm tra Mã VietQR Thử nghiệm</span>
        </Space>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} style={{ borderRadius: 8 }}>
          Đóng
        </Button>,
      ]}
      centered
      width={420}
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Mã QR mẫu với số tiền <strong>10.000 VNĐ</strong> và nội dung chuyển khoản thử nghiệm. Quét thử bằng ứng dụng Mobile Banking để kiểm tra tên chủ tài khoản và số tài khoản nhận tiền.
        </Paragraph>
        {qrUrl ? (
          <div style={{ display: 'inline-block', padding: 8, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Image
              src={qrUrl}
              alt="VietQR Test"
              style={{
                maxWidth: 280,
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <Text type="danger">Không tạo được ảnh mã QR</Text>
        )}
      </div>
    </Modal>
  );
};

export default VietQRTestModal;
