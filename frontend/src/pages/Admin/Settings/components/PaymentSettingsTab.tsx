import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
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
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CreditCardOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { settingsService } from '../../../../services/settingsService';
import { VietQRTestModal } from './VietQRTestModal';

const { Text, Title, Paragraph } = Typography;

const BANK_OPTIONS = [
  { value: '970422', label: 'MBBank - Ngân hàng Quân Đội (970422)' },
  { value: '970436', label: 'Vietcombank - Ngoại Thương Việt Nam (970436)' },
  { value: '970415', label: 'VietinBank - Công Thương Việt Nam (970415)' },
  { value: '970418', label: 'BIDV - Đầu tư và Phát triển VN (970418)' },
  { value: '970407', label: 'Techcombank - Kỹ Thương Việt Nam (970407)' },
  { value: '970432', label: 'VPBank - Việt Nam Thịnh Vượng (970432)' },
  { value: '970416', label: 'ACB - Á Châu (970416)' },
  { value: '970423', label: 'TPBank - Tiên Phong (970423)' },
  { value: '970403', label: 'Sacombank - Sài Gòn Thương Tín (970403)' },
  { value: '970437', label: 'HDBank - Phát Triển TP.HCM (970437)' },
  { value: '970441', label: 'VIB - Quốc Tế (970441)' },
  { value: '970405', label: 'Agribank - Nông nghiệp và PTNT (970405)' },
];

const TEMPLATE_OPTIONS = [
  { value: 'compact', label: 'compact (Mẫu gọn chuẩn)' },
  { value: 'compact2', label: 'compact2 (Mẫu thẻ hiện đại)' },
  { value: 'qr_only', label: 'qr_only (Chỉ mã QR)' },
  { value: 'print', label: 'print (Mẫu in hóa đơn)' },
];

interface PaymentSettingsTabProps {
  form: FormInstance;
}

export const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({ form }) => {
  const [testingQr, setTestingQr] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [testQrUrl, setTestQrUrl] = useState<string | null>(null);

  const handleTestVietQr = async () => {
    setTestingQr(true);
    try {
      const bankId = form.getFieldValue('VIETQR_BANK_ID');
      const accountNo = form.getFieldValue('VIETQR_ACCOUNT_NO');
      const accountName = form.getFieldValue('VIETQR_ACCOUNT_NAME');

      const res = await settingsService.testVietQr({
        bankId,
        accountNo,
        accountName,
      });

      if (res && res.qrUrl) {
        setTestQrUrl(res.qrUrl);
        setQrModalOpen(true);
        message.success('Đã tạo mã QR kiểm tra thành công!');
      } else {
        message.error('Không nhận được đường dẫn ảnh mã QR');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi tạo mã QR thử nghiệm';
      message.error(msg);
    } finally {
      setTestingQr(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* VNPay Gateway Card */}
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
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  fontSize: 18,
                }}
              >
                <CreditCardOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Cổng thanh toán VNPay
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tích hợp thanh toán thẻ ATM nội địa, QR Pay, Visa/Mastercard qua VNPay Sandbox & Production
                </Text>
              </div>
            </Space>
            <Form.Item
              name="PAYMENT_VNPAY_ENABLED"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>
        }
      >
        <Row gutter={[20, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Mã Merchant (TMN Code)</Text>
                  <Tooltip title="Mã định danh website kết nối cổng thanh toán do VNPay cung cấp">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VNPAY_TMN_CODE"
            >
              <Input placeholder="Ví dụ: SANDBOX1" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Khóa bí mật (Hash Secret)</Text>
                  <Tooltip title="Chuỗi bí mật dùng để mã hóa và đối soát chữ ký SHA512. Giữ nguyên dấu chấm để không đổi mật khẩu cũ.">
                    <SafetyCertificateOutlined style={{ color: '#f59e0b' }} />
                  </Tooltip>
                  <Tag color="orange" style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', margin: 0 }}>Bảo mật</Tag>
                </Space>
              }
              name="VNPAY_HASH_SECRET"
            >
              <Input.Password
                placeholder="Chuỗi khóa bảo mật hash secret"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Cổng thanh toán URL (VNPAY_URL)</Text>
                  <Tooltip title="Endpoint chuyển hướng người dùng sang giao diện thanh toán VNPay">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VNPAY_URL"
            >
              <Input
                placeholder="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Địa chỉ phản hồi (VNPAY_RETURN_URL)</Text>
                  <Tooltip title="URL mà VNPay chuyển hướng người dùng quay lại sau khi hoàn tất giao dịch">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VNPAY_RETURN_URL"
            >
              <Input
                placeholder="http://localhost:5173/order/vnpay-return"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* VietQR Bank Transfer Card */}
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
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                  fontSize: 18,
                }}
              >
                <QrcodeOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Chuyển khoản Ngân hàng VietQR
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tạo mã VietQR động theo đơn hàng với định dạng chuẩn NAPAS 24/7
                </Text>
              </div>
            </Space>
            <Form.Item
              name="PAYMENT_VIETQR_ENABLED"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>
        }
      >
        <Row gutter={[20, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Ngân hàng nhận thụ hưởng</Text>
                  <Tooltip title="Chọn ngân hàng thụ hưởng theo chuẩn VietQR NAPAS">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VIETQR_BANK_ID"
            >
              <Select
                showSearch
                placeholder="Chọn ngân hàng nhận"
                options={BANK_OPTIONS}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Số tài khoản nhận tiền</Text>
                  <Tooltip title="Số tài khoản ngân hàng của cửa hàng dùng để nhận tiền chuyển khoản">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VIETQR_ACCOUNT_NO"
            >
              <Input placeholder="Ví dụ: 0987654321" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Tên chủ tài khoản</Text>
                  <Tooltip title="Tên in hoa không dấu đúng theo hợp đồng mở tài khoản ngân hàng">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VIETQR_ACCOUNT_NAME"
            >
              <Input
                placeholder="Ví dụ: CONG TY TNHH MOBILECOMMERCE"
                style={{ borderRadius: 8, textTransform: 'uppercase' }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Mẫu giao diện VietQR</Text>
                  <Tooltip title="Định dạng hiển thị của hình ảnh mã QR (thẻ ngân hàng, nhỏ gọn hoặc chỉ QR)">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="VIETQR_TEMPLATE"
            >
              <Select
                options={TEMPLATE_OPTIONS}
                style={{ borderRadius: 8 }}
                placeholder="Chọn mẫu hiển thị"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0 16px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 540 }}>
            Kiểm tra thông số tài khoản và mẫu mã QR bằng cách tạo một mã thanh toán thử nghiệm trị giá 10.000 VNĐ.
          </Paragraph>
          <Button
            type="default"
            icon={<ThunderboltOutlined />}
            loading={testingQr}
            onClick={handleTestVietQr}
            style={{
              borderRadius: 8,
              borderColor: '#16a34a',
              color: '#16a34a',
              fontWeight: 500,
            }}
          >
            Tạo QR Test (10.000đ)
          </Button>
        </div>
      </Card>

      {/* Test QR Modal */}
      <VietQRTestModal
        open={qrModalOpen}
        qrUrl={testQrUrl}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};

export default PaymentSettingsTab;
