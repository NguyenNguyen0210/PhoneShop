import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Space,
  Typography,
  Tooltip,
  message,
  Divider,
  Tag,
  Alert,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CloudServerOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
} from '@ant-design/icons';
import { settingsService } from '../../../../services/settingsService';

const { Text, Title, Paragraph } = Typography;

interface StorageSettingsTabProps {
  form: FormInstance;
}

export const StorageSettingsTab: React.FC<StorageSettingsTabProps> = ({ form }) => {
  const [testingStorage, setTestingStorage] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const handleTestStorage = async () => {
    setTestingStorage(true);
    setTestResult({ status: 'idle', message: '' });
    try {
      const accountId = form.getFieldValue('CLOUDFLARE_R2_ACCOUNT_ID');
      const bucket = form.getFieldValue('CLOUDFLARE_R2_BUCKET');
      const accessKeyId = form.getFieldValue('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const secretAccessKey = form.getFieldValue('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

      const res = await settingsService.testStorage({
        accountId,
        bucket,
        accessKeyId,
        secretAccessKey,
      });

      const msg = res.message || `Kết nối thành công tới bucket "${bucket}"`;
      setTestResult({ status: 'success', message: msg });
      message.success(msg);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Không thể kết nối đến máy chủ Cloudflare R2';
      setTestResult({ status: 'error', message: msg });
      message.error(msg);
    } finally {
      setTestingStorage(false);
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
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  fontSize: 18,
                }}
              >
                <CloudServerOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Lưu trữ Đám mây Cloudflare R2
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Kho lưu trữ tương thích S3 API với chi phí egress 0đ cho hình ảnh sản phẩm, tài liệu và avatar
                </Text>
              </div>
            </Space>
          </div>
        }
      >
        <Row gutter={[20, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Account ID (ID Tài khoản Cloudflare)</Text>
                  <Tooltip title="Chuỗi 32 ký tự định danh tài khoản Cloudflare của bạn">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="CLOUDFLARE_R2_ACCOUNT_ID"
            >
              <Input placeholder="Ví dụ: 8a4f91b7d5904ac123e456789abcdef0" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Tên Bucket (Bucket Name)</Text>
                  <Tooltip title="Tên bucket R2 dùng để lưu file media">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="CLOUDFLARE_R2_BUCKET"
            >
              <Input placeholder="Ví dụ: phoneshop-assets" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Access Key ID (S3 API Token)</Text>
                  <Tooltip title="Mã Access Key ID tạo từ mục R2 API Tokens trên Cloudflare Dashboard">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="CLOUDFLARE_R2_ACCESS_KEY_ID"
            >
              <Input placeholder="Ví dụ: 03ad0132b9c78d..." style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Secret Access Key</Text>
                  <Tooltip title="Mật khẩu truy cập S3 API. Giữ nguyên dấu chấm để không thay đổi giá trị hiện tại.">
                    <SafetyCertificateOutlined style={{ color: '#f59e0b' }} />
                  </Tooltip>
                  <Tag color="orange" style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', margin: 0 }}>Bảo mật</Tag>
                </Space>
              }
              name="CLOUDFLARE_R2_SECRET_ACCESS_KEY"
            >
              <Input.Password
                placeholder="Chuỗi Secret Access Key bí mật"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Tên miền truy cập công khai (Public URL / Custom Domain)</Text>
                  <Tooltip title="Tên miền phụ hoặc Public R2 dev domain để khách hàng xem được ảnh sản phẩm">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="CLOUDFLARE_R2_PUBLIC_URL"
            >
              <Input
                placeholder="https://pub-xxxxxx.r2.dev hoặc https://media.phoneshop.vn"
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
              title={testResult.status === 'success' ? 'Kết nối thành công' : 'Kiểm tra thất bại'}
              description={testResult.message}
              closable
              onClose={() => setTestResult({ status: 'idle', message: '' })}
            />
          </div>
        )}

        <Divider style={{ margin: '12px 0 16px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, maxWidth: 540 }}>
            Kiểm tra quyền truy cập R2 bằng cách gọi S3 ListObjects (MaxKeys=1) đến bucket đã cấu hình.
          </Paragraph>
          <Button
            type="default"
            icon={<CloudSyncOutlined />}
            loading={testingStorage}
            onClick={handleTestStorage}
            style={{
              borderRadius: 8,
              borderColor: '#d97706',
              color: '#d97706',
              fontWeight: 500,
            }}
          >
            Kiểm tra kết nối R2
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StorageSettingsTab;
