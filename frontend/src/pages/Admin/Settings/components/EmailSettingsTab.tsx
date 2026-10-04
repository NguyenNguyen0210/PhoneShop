import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Row,
  Col,
  Space,
  Typography,
  Tooltip,
  message,
  Divider,
  Tag,
  Modal,
  Alert,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  MailOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
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
        host: form.getFieldValue('EMAIL_HOST'),
        port: form.getFieldValue('EMAIL_PORT'),
        secure: form.getFieldValue('EMAIL_SECURE'),
        user: form.getFieldValue('EMAIL_USER'),
        pass: form.getFieldValue('EMAIL_PASS'),
        from: form.getFieldValue('EMAIL_FROM'),
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
                  Dịch vụ Gửi thư Điện tử SMTP
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Máy chủ SMTP dùng để gửi email xác nhận đặt hàng, thông báo mã OTP và biên lai thanh toán
                </Text>
              </div>
            </Space>
          </div>
        }
      >
        <Row gutter={[20, 16]}>
          <Col xs={24} md={14}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Địa chỉ máy chủ SMTP (SMTP Host)</Text>
                  <Tooltip title="Tên miền máy chủ gửi thư SMTP (Ví dụ: smtp.gmail.com, smtp.mailgun.org)">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="EMAIL_HOST"
            >
              <Input placeholder="Ví dụ: smtp.gmail.com" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Cổng (Port)</Text>
                  <Tooltip title="Cổng kết nối SMTP tiêu chuẩn (587 cho TLS/STARTTLS, 465 cho SSL)">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="EMAIL_PORT"
            >
              <InputNumber
                style={{ width: '100%', borderRadius: 8 }}
                placeholder="587"
                min={1}
                max={65535}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>SSL/TLS trực tiếp</Text>
                  <Tooltip title="Bật nếu dùng cổng 465 SSL chuyên dụng, tắt nếu dùng STARTTLS trên cổng 587">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="EMAIL_SECURE"
              valuePropName="checked"
            >
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Tên đăng nhập SMTP (Username / Email)</Text>
                  <Tooltip title="Địa chỉ email hoặc tài khoản đăng nhập máy chủ gửi thư">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="EMAIL_USER"
            >
              <Input placeholder="Ví dụ: no-reply@phoneshop.vn" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Mật khẩu ứng dụng SMTP (Password / Secret)</Text>
                  <Tooltip title="Mật khẩu ứng dụng (App Password) hoặc API key. Giữ nguyên dấu chấm để không thay đổi giá trị.">
                    <SafetyCertificateOutlined style={{ color: '#f59e0b' }} />
                  </Tooltip>
                  <Tag color="orange" style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', margin: 0 }}>Bảo mật</Tag>
                </Space>
              }
              name="EMAIL_PASS"
            >
              <Input.Password
                placeholder="Mật khẩu ứng dụng SMTP"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Tiêu đề người gửi (From Header)</Text>
                  <Tooltip title="Định dạng hiển thị tên người gửi trong hòm thư khách hàng">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="EMAIL_FROM"
            >
              <Input
                placeholder='Ví dụ: Phone Shop <no-reply@phoneshop.vn>'
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>
        </Row>

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
            Kiểm tra thông số máy chủ SMTP bằng cách gửi một email thông báo kiểm thử đến hòm thư người nhận.
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
            Nhập địa chỉ email sẽ nhận thư thử nghiệm. Hệ thống sẽ kết nối với máy chủ SMTP và gửi email xác nhận ngay lập tức:
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
