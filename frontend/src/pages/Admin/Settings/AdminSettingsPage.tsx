import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Form,
  Button,
  Space,
  Typography,
  Spin,
  Badge,
  notification,
  message,
  Card,
} from 'antd';
import {
  SettingOutlined,
  CreditCardOutlined,
  CloudServerOutlined,
  MailOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { settingsService, type SettingItem } from '../../../services/settingsService';
import { PaymentSettingsTab } from './components/PaymentSettingsTab';
import { StorageSettingsTab } from './components/StorageSettingsTab';
import { EmailSettingsTab } from './components/EmailSettingsTab';
import { GeneralSettingsTab } from './components/GeneralSettingsTab';

const { Title, Paragraph, Text } = Typography;

const BOOLEAN_KEYS = new Set([
  'PAYMENT_VNPAY_ENABLED',
  'PAYMENT_VIETQR_ENABLED',
  'EMAIL_SECURE',
  'MAINTENANCE_MODE',
]);

const SECRET_KEYS = new Set([
  'VNPAY_HASH_SECRET',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'EMAIL_PASS',
]);

const KEY_TO_GROUP: Record<string, string> = {
  PAYMENT_VNPAY_ENABLED: 'payment',
  VNPAY_TMN_CODE: 'payment',
  VNPAY_HASH_SECRET: 'payment',
  VNPAY_URL: 'payment',
  VNPAY_RETURN_URL: 'payment',
  PAYMENT_VIETQR_ENABLED: 'payment',
  VIETQR_BANK_ID: 'payment',
  VIETQR_ACCOUNT_NO: 'payment',
  VIETQR_ACCOUNT_NAME: 'payment',
  VIETQR_TEMPLATE: 'payment',

  CLOUDFLARE_R2_ACCOUNT_ID: 'storage',
  CLOUDFLARE_R2_BUCKET: 'storage',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'storage',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'storage',
  CLOUDFLARE_R2_PUBLIC_URL: 'storage',

  EMAIL_HOST: 'email',
  EMAIL_PORT: 'email',
  EMAIL_SECURE: 'email',
  EMAIL_USER: 'email',
  EMAIL_PASS: 'email',
  EMAIL_FROM: 'email',

  STORE_NAME: 'general',
  STORE_HOTLINE: 'general',
  STORE_EMAIL: 'general',
  STORE_ADDRESS: 'general',
  MAINTENANCE_MODE: 'general',
};

export const AdminSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('payment');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const grouped = await settingsService.getAdminSettings();
      const formValues: Record<string, any> = {};

      if (grouped) {
        for (const groupData of Object.values(grouped)) {
          if (groupData && typeof groupData === 'object') {
            for (const [key, val] of Object.entries(groupData)) {
              if (BOOLEAN_KEYS.has(key)) {
                formValues[key] = val === 'true' || val === true;
              } else {
                formValues[key] = val;
              }
            }
          }
        }
      }

      form.setFieldsValue(formValues);
      setIsDirty(false);
    } catch {
      message.error('Không thể nạp cấu hình hệ thống. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleValuesChange = () => {
    if (!isDirty) {
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const rawValues = form.getFieldsValue(true);

      const itemsToUpdate: SettingItem[] = Object.entries(rawValues).map(([key, val]) => {
        let valueStr = '';
        if (BOOLEAN_KEYS.has(key)) {
          valueStr = val ? 'true' : 'false';
        } else if (val !== undefined && val !== null) {
          valueStr = String(val);
        }

        return {
          key,
          value: valueStr,
          group: KEY_TO_GROUP[key] || 'general',
          isSecret: SECRET_KEYS.has(key),
        };
      });

      await settingsService.updateAdminSettings(itemsToUpdate);

      notification.success({
        title: 'Cập nhật cấu hình thành công',
        message: 'Cập nhật cấu hình thành công',
        description: 'Tất cả tham số đã được lưu vào hệ thống và xóa cache Redis tương ứng.',
        placement: 'topRight',
      });

      setIsDirty(false);
      // Reload to refresh masked secret displays and defaults
      await fetchSettings();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || err?.message || 'Lỗi khi lưu cấu hình hệ thống';
      notification.error({
        title: 'Lưu cấu hình thất bại',
        message: 'Lưu cấu hình thất bại',
        description: errMsg,
        placement: 'topRight',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'payment',
      label: (
        <Space size={6}>
          <CreditCardOutlined />
          <span>Cổng thanh toán</span>
        </Space>
      ),
      children: <PaymentSettingsTab form={form} />,
    },
    {
      key: 'storage',
      label: (
        <Space size={6}>
          <CloudServerOutlined />
          <span>Lưu trữ Cloud</span>
        </Space>
      ),
      children: <StorageSettingsTab form={form} />,
    },
    {
      key: 'email',
      label: (
        <Space size={6}>
          <MailOutlined />
          <span>Dịch vụ Email</span>
        </Space>
      ),
      children: <EmailSettingsTab form={form} />,
    },
    {
      key: 'general',
      label: (
        <Space size={6}>
          <SettingOutlined />
          <span>Cài đặt chung</span>
        </Space>
      ),
      children: <GeneralSettingsTab form={form} />,
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header with Title and Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Cấu hình & Tham số Hệ thống
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Quản trị tập trung các cổng thanh toán, dịch vụ đám mây, email và trạng thái vận hành sàn thương mại.
          </Paragraph>
        </div>

        <Space size={12}>
          {isDirty && (
            <Badge
              status="warning"
              text={
                <Text style={{ fontSize: 12, color: '#d97706', fontWeight: 500 }}>
                  Có thay đổi chưa lưu
                </Text>
              }
            />
          )}

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchSettings}
            disabled={loading || saving}
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!isDirty || loading}
            onClick={handleSave}
            style={{
              borderRadius: 8,
              background: !isDirty || loading ? undefined : '#2563eb',
              boxShadow: !isDirty || loading ? undefined : '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            Lưu thay đổi
          </Button>
        </Space>
      </div>

      {/* Main Settings Card */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#64748b' }}>Đang nạp cấu hình hệ thống...</div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            disabled={saving}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size="large"
              style={{ minHeight: 480 }}
            />
          </Form>
        )}
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
