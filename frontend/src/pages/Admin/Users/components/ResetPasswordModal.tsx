import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Alert, Typography, message } from 'antd';
import { KeyOutlined, CopyOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import { userService } from '../../../../services/userService';
import { generateRandomPassword } from './CreateUserModal';
import type { ManagedUser } from '../../../../types/userManagement';

const { Text } = Typography;

interface ResetPasswordModalProps {
  open: boolean;
  user: ManagedUser | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  user,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resetSuccessPass, setResetSuccessPass] = useState<string | null>(null);

  const handleGeneratePassword = () => {
    const randomPass = generateRandomPassword(12);
    form.setFieldsValue({ password: randomPass });
  };

  const handleCopyNewPassword = () => {
    if (!resetSuccessPass || !user) return;
    const textToCopy = `Tài khoản: ${user.email}\nMật khẩu mới: ${resetSuccessPass}`;
    navigator.clipboard.writeText(textToCopy);
    message.success('Đã sao chép mật khẩu mới vào bộ nhớ tạm!');
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await userService.resetPassword(user.id, values.password);
      message.success('Đặt lại mật khẩu thành công!');
      setResetSuccessPass(values.password);
      onSuccess();
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message);
      } else if (!err?.errorFields) {
        message.error('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setResetSuccessPass(null);
    onCancel();
  };

  const userDisplayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <>
      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: '#ff4d4f' }} />
            <span>{`Đặt lại mật khẩu cho: ${userDisplayName}`}</span>
          </Space>
        }
        open={open && !resetSuccessPass}
        onCancel={handleClose}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText="Đặt lại mật khẩu"
        cancelText="Hủy"
        width={520}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          message="Lưu ý an toàn"
          description="Tất cả phiên đăng nhập trên các thiết bị khác sẽ bị hủy bỏ ngay khi mật khẩu mới được áp dụng. Người dùng sẽ phải đăng nhập lại với mật khẩu mới."
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical">
          <Form.Item label="Mật khẩu mới" htmlFor="reset-password" required>
            <Space.Compact orientation="horizontal" style={{ width: '100%' }}>
              <Form.Item
                name="password"
                noStyle
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
                ]}
              >
                <Input.Password id="reset-password" aria-label="Mật khẩu mới" placeholder="Nhập hoặc tạo mật khẩu ngẫu nhiên" />
              </Form.Item>
              <Button
                icon={<KeyOutlined />}
                onClick={handleGeneratePassword}
                type="dashed"
              >
                Tạo mật khẩu
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>

      {/* Success Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <span>Đặt lại mật khẩu thành công!</span>
          </Space>
        }
        open={!!resetSuccessPass}
        onCancel={handleClose}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyNewPassword}>
            Sao chép thông tin
          </Button>,
          <Button key="close" onClick={handleClose}>
            Đóng
          </Button>,
        ]}
      >
        <Alert
          type="success"
          message="Mật khẩu mới đã được cập nhật:"
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 6 }}>
          <p style={{ margin: '0 0 8px' }}>
            <Text strong>Tài khoản: </Text>
            <Text copyable>{user?.email}</Text>
          </p>
          <p style={{ margin: 0 }}>
            <Text strong>Mật khẩu mới: </Text>
            <Text copyable>{resetSuccessPass}</Text>
          </p>
        </div>
      </Modal>
    </>
  );
};
