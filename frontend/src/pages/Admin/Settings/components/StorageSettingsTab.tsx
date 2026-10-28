import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  message,
  Divider,
  Alert,
  Descriptions,
  Tag,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  CloudServerOutlined,
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
      const res = await settingsService.testStorage({});
      const msg = res.message || 'Kết nối thành công tới dịch vụ lưu trữ R2';
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

  const accountId = form.getFieldValue('CLOUDFLARE_R2_ACCOUNT_ID') || 'Được nạp từ .env';
  const bucket = form.getFieldValue('CLOUDFLARE_R2_BUCKET') || 'Được nạp từ .env';
  const accessKeyId = form.getFieldValue('CLOUDFLARE_R2_ACCESS_KEY_ID') || 'Được nạp từ .env';
  const publicUrl = form.getFieldValue('CLOUDFLARE_R2_PUBLIC_URL') || 'Được nạp từ .env';

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
            <Tag color="blue">Được cấu hình qua file môi trường .env</Tag>
          </div>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Được cấu hình qua file môi trường .env"
          description="Để bảo đảm an toàn dữ liệu và tuân thủ quy tắc bảo mật, toàn bộ khóa truy cập S3 và thông số kết nối Cloudflare R2 được quản lý trực tiếp qua file môi trường (.env) trên máy chủ."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Account ID">
            <Text code>{accountId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tên Bucket">
            <Text strong>{bucket}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Access Key ID">
            <Text code>{accessKeyId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Secret Access Key">
            <Text type="secondary">•••••••••••• (Ẩn trong .env)</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Public URL" span={2}>
            <Text copyable={{ text: publicUrl }}>{publicUrl}</Text>
          </Descriptions.Item>
        </Descriptions>

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
            Kiểm tra quyền truy cập R2 bằng cách gọi S3 ListObjects (MaxKeys=1) tới bucket đang cấu hình trong .env.
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
