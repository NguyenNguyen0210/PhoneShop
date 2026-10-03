import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Alert, Typography, Space, message, Tag } from 'antd';
import { WarningOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { userService } from '../../../../services/userService';
import type { ManagedUser, UserRoleName } from '../../../../types/userManagement';

const { Text } = Typography;

interface ChangeRoleModalProps {
  open: boolean;
  user: ManagedUser | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  open,
  user,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRoleName>('USER');

  useEffect(() => {
    if (open && user) {
      const currentRole = user.roles?.[0]?.role?.name || 'USER';
      setSelectedRole(currentRole);
      form.setFieldsValue({ role: currentRole });
    } else {
      form.resetFields();
    }
  }, [open, user, form]);

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await userService.changeRole(user.id, [values.role]);
      message.success('Thay đổi vai trò người dùng thành công!');
      onSuccess();
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message);
      } else if (!err?.errorFields) {
        message.error('Không thể thay đổi vai trò. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleTagColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'volcano';
      case 'MANAGER':
        return 'purple';
      case 'STAFF':
        return 'geekblue';
      default:
        return 'default';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          <span>Thay đổi vai trò người dùng</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Xác nhận đổi quyền"
      cancelText="Hủy"
      width={520}
      destroyOnClose
    >
      {user && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
          <p style={{ margin: '0 0 6px' }}>
            <Text strong>Người dùng: </Text>
            <Text>{`${user.firstName} ${user.lastName}`}</Text> ({user.email})
          </p>
          <p style={{ margin: 0 }}>
            <Text strong>Vai trò hiện tại: </Text>
            {user.roles?.map((r, idx) => (
              <Tag color={getRoleTagColor(r.role.name)} key={idx}>
                {r.role.name}
              </Tag>
            )) || <Tag>USER</Tag>}
          </p>
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="role"
          label="Vai trò mới"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
        >
          <Select
            onChange={(val) => setSelectedRole(val as UserRoleName)}
            options={[
              { label: 'Người dùng (USER) - Khách hàng thông thường', value: 'USER' },
              { label: 'Nhân viên (STAFF) - Quản lý đơn hàng, kho & hỗ trợ', value: 'STAFF' },
              { label: 'Quản lý (MANAGER) - Quản lý sản phẩm, báo cáo & nhân sự', value: 'MANAGER' },
              { label: 'Quản trị viên (ADMIN) - Toàn quyền quản trị hệ thống', value: 'ADMIN' },
            ]}
          />
        </Form.Item>

        {selectedRole === 'ADMIN' && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Cảnh báo an toàn phân quyền"
            description="Vai trò Quản trị viên (ADMIN) có toàn quyền truy cập, chỉnh sửa dữ liệu, phân quyền và cấu hình hệ thống. Hãy cân nhắc kỹ trước khi gán vai trò này."
            style={{ marginTop: 8 }}
          />
        )}
      </Form>
    </Modal>
  );
};
