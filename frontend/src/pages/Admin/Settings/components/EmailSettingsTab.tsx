import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  message,
  Divider,
  Modal,
  Alert,
  Descriptions,
  Tag,
  Input,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  MailOutlined,
  SendOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { settingsService } from '../../../../services/settingsService';
import { useAuthStore } from '../../../../stores/useAuthStore';

const { Text, Title, Paragraph } = Typography;

interface EmailSettingsTabProps {
  form: FormInstance;
}

export const EmailSettingsTab: React.FC<EmailSettingsTabProps> = ({ form }) => {
  const currentUser = useAuthStore((state) => state.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const handleOpenModal = () => {
    const defaultTarget = currentUser?.email || form.getFieldValue('EMAIL_USER') || '';
    setRecipientEmail(defaultTarget);
    setModalOpen(true);
  };

  const handleSendTestEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      message.warning('Vui lòng nhập địa chỉ email hợp lệ để nhận thử nghiệm');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await settingsService.testEmail({
        toEmail: recipientEmail.trim(),
      });
      const msg = res.message || `Email kiểm tra đã được gửi thành công đến ${recipientEmail}`;
      setTestResult({ status: 'success', message: msg });
      message.success(msg);
      setModalOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Lỗi khi gửi email kiểm tra qua SMTP';
      setTestResult({ status: 'error', message: msg });
      message.error(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const host = form.getFieldValue('EMAIL_HOST') || 'smtp.gmail.com';
  const port = form.getFieldValue('EMAIL_PORT') || '587';
  const secure = form.getFieldValue('EMAIL_SECURE');
  const user = form.getFieldValue('EMAIL_USER') || 'Được nạp từ .env';
  const from = form.getFieldValue('EMAIL_FROM') || 'Phone Shop <no-reply@phoneshop.vn>';
  const provider = form.getFieldValue('EMAIL_PROVIDER') || 'brevo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <Space size={10}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fdf2f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#db2777',
                  fontSize: 18,
                }}
              >
                <MailOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Dịch vụ Gửi thư Điện tử (Email Service)
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Máy chủ SMTP / Brevo API gửi email xác nhận đặt hàng, thông báo mã OTP và biên lai thanh toán
                </Text>
              </div>
            </Space>
            <Tag color="blue">Được cấu hình qua file môi trường .env</Tag>
          </div>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Được cấu hình qua file môi trường .env"
          description="Để đảm bảo an toàn tuyệt đối cho tài khoản gửi thư, toàn bộ thông tin đăng nhập SMTP (mật khẩu ứng dụng, API key) được thiết lập thông qua file môi trường .env trên máy chủ backend."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Phương thức gửi (Provider)">
            <Tag color="purple">{String(provider).toUpperCase()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Máy chủ SMTP (Host)">
            <Text strong>{host}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Cổng kết nối (Port)">
            <Text code>{port}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Phương thức mã hóa">
            <Text>{secure || port === 465 || port === '465' ? 'TLS / SSL (Cổng 465)' : 'STARTTLS (Cổng 587)'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tài khoản gửi (Username)">
            <Text code>{user}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Mật khẩu ứng dụng (Password)">
            <Text type="secondary">•••••••••••• (Ẩn trong .env)</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tiêu đề người gửi (From)" span={2}>
            <Text copyable={{ text: from }}>{from}</Text>
          </Descriptions.Item>
        </Descriptions>

        {testResult.status !== 'idle' && (
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <Alert
              type={testResult.status === 'success' ? 'success' : 'error'}
              showIcon
              icon={testResult.status === 'success' ? <CheckCircleOutlined /> : undefined}
              title={testResult.status === 'success' ? 'Gửi email thành công' : 'Gửi email thất bại'}
              description={testResult.message}
              closable
              onClose={() => setTestResult({ status: 'idle', message: '' })}
            />
          </div>
        )}

        <Divider style={{ margin: '12px 0 16px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 540 }}>
            Kiểm tra thông số cấu hình email trong .env bằng cách gửi một email chẩn đoán thử nghiệm đến hòm thư người nhận.
          </Paragraph>
          <Button
            type="default"
            icon={<SendOutlined />}
            onClick={handleOpenModal}
            style={{
              borderRadius: 8,
              borderColor: '#db2777',
              color: '#db2777',
              fontWeight: 500,
            }}
          >
            Gửi email kiểm tra
          </Button>
        </div>
      </Card>

      {/* Recipient Prompt Modal */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            <SendOutlined style={{ color: '#db2777' }} />
            <span>Gửi Email Kiểm Tra Cấu Hình SMTP</span>
          </Space>
        }
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)} style={{ borderRadius: 8 }}>
            Hủy
          </Button>,
          <Button
            key="send"
            type="primary"
            loading={sendingEmail}
            onClick={handleSendTestEmail}
            style={{ borderRadius: 8, background: '#db2777', borderColor: '#db2777' }}
          >
            Bắt đầu gửi
          </Button>,
        ]}
        centered
        width={460}
      >
        <div style={{ padding: '12px 0' }}>
          <Paragraph style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Nhập địa chỉ email sẽ nhận thư thử nghiệm. Hệ thống sẽ kết nối với máy chủ SMTP (.env) và gửi email xác nhận ngay lập tức:
          </Paragraph>
          <Input
            placeholder="nhap.email.nhan@gmail.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            onPressEnter={handleSendTestEmail}
            style={{ borderRadius: 8 }}
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
          />
        </div>
      </Modal>
    </div>
  );
};

export default EmailSettingsTab;
