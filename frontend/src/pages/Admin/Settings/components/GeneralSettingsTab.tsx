import React from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Row,
  Col,
  Space,
  Typography,
  Tooltip,
  Alert,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  ShopOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface GeneralSettingsTabProps {
  form: FormInstance;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ form }) => {
  // Watch maintenance mode to toggle warning banner
  const isMaintenance = Form.useWatch('MAINTENANCE_MODE', form);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Store Information Card */}
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
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  fontSize: 18,
                }}
              >
                <ShopOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Thông tin Cửa hàng & Sàn Thương mại
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Thông tin thương hiệu, đường dây nóng và địa chỉ hiển thị trên hóa đơn, email và chân trang Storefront
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
                  <Text strong>Tên Cửa hàng / Thương hiệu (Store Name)</Text>
                  <Tooltip title="Tên hiển thị trên tiêu đề website, email thông báo và biên lai khách hàng">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="STORE_NAME"
            >
              <Input
                placeholder="Ví dụ: Phone Shop"
                style={{ borderRadius: 8 }}
                prefix={<ShopOutlined style={{ color: '#94a3b8' }} />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Hotline Hỗ trợ Khách hàng</Text>
                  <Tooltip title="Số điện thoại tổng đài tư vấn bán hàng và khiếu nại">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="STORE_HOTLINE"
            >
              <Input
                placeholder="Ví dụ: 1900 6868"
                style={{ borderRadius: 8 }}
                prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Email Chăm sóc Khách hàng</Text>
                  <Tooltip title="Hòm thư nhận phản hồi, tư vấn và xử lý khiếu nại">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="STORE_EMAIL"
            >
              <Input
                placeholder="Ví dụ: support@phoneshop.vn"
                style={{ borderRadius: 8 }}
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Space size={4}>
                  <Text strong>Địa chỉ Văn phòng & Trung tâm Bảo hành</Text>
                  <Tooltip title="Địa chỉ cửa hàng chính và địa điểm tiếp nhận đổi trả bảo hành">
                    <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                  </Tooltip>
                </Space>
              }
              name="STORE_ADDRESS"
            >
              <Input
                placeholder="Ví dụ: 123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh"
                style={{ borderRadius: 8 }}
                prefix={<EnvironmentOutlined style={{ color: '#94a3b8' }} />}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Maintenance Mode Card */}
      <Card
        style={{
          borderRadius: 12,
          border: isMaintenance ? '1px solid #fca5a5' : '1px solid #e2e8f0',
          background: isMaintenance ? '#fff5f5' : '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          transition: 'all 0.2s ease',
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <Space size={10}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: isMaintenance ? '#fee2e2' : '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  fontSize: 18,
                }}
              >
                <AlertOutlined />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Chế độ Vận hành & Bảo trì Hệ thống
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tạm ngừng các dịch vụ đặt hàng và thanh toán trên Storefront khi cần nâng cấp kỹ thuật
                </Text>
              </div>
            </Space>
            <Form.Item
              name="MAINTENANCE_MODE"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch
                checkedChildren="Bảo trì"
                unCheckedChildren="Bình thường"
                style={{
                  backgroundColor: isMaintenance ? '#dc2626' : undefined,
                }}
              />
            </Form.Item>
          </div>
        }
      >
        {isMaintenance ? (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined style={{ fontSize: 20 }} />}
            title="HỆ THỐNG ĐANG Ở CHẾ ĐỘ BẢO TRÌ"
            description="Khách hàng khi truy cập Storefront sẽ nhận được thông báo bảo trì định kỳ. Các API thanh toán, tạo đơn hàng và giỏ hàng bị tạm khóa. Quản trị viên vẫn truy cập Admin bình thường."
            style={{ borderRadius: 8 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            title="Hệ thống đang hoạt động bình thường"
            description="Bật công tắc phía trên nếu bạn chuẩn bị triển khai bảo trì hạ tầng, sao lưu dữ liệu hoặc nâng cấp phiên bản ứng dụng."
            style={{ borderRadius: 8 }}
          />
        )}
      </Card>
    </div>
  );
};

export default GeneralSettingsTab;
