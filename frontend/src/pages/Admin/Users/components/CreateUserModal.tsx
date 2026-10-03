import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Alert, Typography } from 'antd';
import { KeyOutlined, CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { userService } from '../../../../services/userService';
import type { CreateUserPayload, UserRoleName, UserStatus } from '../../../../types/userManagement';

const { Text } = Typography;

interface CreateUserModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const generateRandomPassword = (length = 12): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + numbers + special;

  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string } | null>(null);

  const handleGeneratePassword = () => {
    const randomPass = generateRandomPassword(12);
    form.setFieldsValue({ password: randomPass });
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const textToCopy = `Tài khoản: ${createdCredentials.email}\nMật khẩu: ${createdCredentials.password || '(Không đặt)'}`;
    navigator.clipboard.writeText(textToCopy);
    message.success('Đã sao chép thông tin tài khoản vào bộ nhớ tạm!');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateUserPayload = {
        email: values.email.trim(),
        password: values.password || undefined,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone?.trim() || undefined,
        roles: values.role ? [values.role as UserRoleName] : ['USER'],
        status: (values.status as UserStatus) || 'ACTIVE',
      };

      await userService.createUser(payload);
      message.success('Tạo người dùng mới thành công!');

      setCreatedCredentials({
        email: payload.email,
        password: payload.password,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        message.error('Email hoặc số điện thoại đã tồn tại trong hệ thống.');
      } else if (err?.response?.data?.message) {
        message.error(err.response.data.message);
      } else if (err?.errorFields) {
        // Validation errors
      } else {
        message.error('Không thể tạo người dùng. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCreatedCredentials(null);
    onCancel();
  };

  return (
    <>
      <Modal
        title="Thêm người dùng mới"
        open={open && !createdCredentials}
        onCancel={handleClose}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'USER',
            status: 'ACTIVE',
          }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không đúng định dạng' },
            ]}
          >
            <Input placeholder="example@cellphones.com" />
          </Form.Item>

          <Form.Item label="Mật khẩu" htmlFor="password" required>
            <Space.Compact orientation="horizontal" style={{ width: '100%' }}>
              <Form.Item
                name="password"
                noStyle
                rules={[
                  { required: true, message: 'Vui lòng nhập hoặc tạo mật khẩu' },
                  { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
                ]}
              >
                <Input.Password id="password" aria-label="Mật khẩu" placeholder="Nhập hoặc tạo mật khẩu ngẫu nhiên" />
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

          <Space orientation="horizontal" style={{ width: '100%' }} size="middle">
            <Form.Item
              name="firstName"
              label="Họ đệm"
              style={{ width: 250 }}
              rules={[{ required: true, message: 'Vui lòng nhập họ đệm' }]}
            >
              <Input placeholder="Nguyễn Văn" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Tên"
              style={{ width: 250 }}
              rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
            >
              <Input placeholder="An" />
            </Form.Item>
          </Space>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0901234567" />
          </Form.Item>

          <Space orientation="horizontal" style={{ width: '100%' }} size="middle">
            <Form.Item
              name="role"
              label="Vai trò"
              style={{ width: 250 }}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Người dùng (USER)', value: 'USER' },
                  { label: 'Nhân viên (STAFF)', value: 'STAFF' },
                  { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
                  { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
              style={{ width: 250 }}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                  { label: 'Tạm khóa (INACTIVE)', value: 'INACTIVE' },
                  { label: 'Bị cấm (BANNED)', value: 'BANNED' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Success Modal with Credentials */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <span>Tạo tài khoản thành công!</span>
          </Space>
        }
        open={!!createdCredentials}
        onCancel={handleClose}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyCredentials}>
            Sao chép thông tin
          </Button>,
          <Button key="close" onClick={handleClose}>
            Đóng
          </Button>,
        ]}
      >
        <Alert
          type="success"
          message="Vui lòng lưu lại thông tin tài khoản và gửi cho người dùng:"
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 6 }}>
          <p style={{ margin: '0 0 8px' }}>
            <Text strong>Tài khoản: </Text>
            <Text copyable>{createdCredentials?.email}</Text>
          </p>
          <p style={{ margin: 0 }}>
            <Text strong>Mật khẩu: </Text>
            <Text copyable>{createdCredentials?.password || '(Mật khẩu đã nhập)'}</Text>
          </p>
        </div>
      </Modal>
    </>
  );
};
