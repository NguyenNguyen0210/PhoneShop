import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Space, message } from 'antd';
import { userService } from '../../../../services/userService';
import type { ManagedUser, UpdateUserPayload } from '../../../../types/userManagement';

interface EditUserModalProps {
  open: boolean;
  user: ManagedUser | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  user,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    } else {
      form.resetFields();
    }
  }, [open, user, form]);

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: UpdateUserPayload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone?.trim() || undefined,
      };

      await userService.updateUser(user.id, payload);
      message.success('Cập nhật thông tin người dùng thành công!');
      onSuccess();
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message);
      } else if (!err?.errorFields) {
        message.error('Không thể cập nhật thông tin. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Chỉnh sửa thông tin người dùng"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Lưu thay đổi"
      cancelText="Hủy"
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Space orientation="horizontal" style={{ width: '100%' }} size="middle">
          <Form.Item
            name="firstName"
            label="Họ đệm"
            style={{ width: 220 }}
            rules={[{ required: true, message: 'Vui lòng nhập họ đệm' }]}
          >
            <Input placeholder="Nguyễn Văn" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Tên"
            style={{ width: 220 }}
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="An" />
          </Form.Item>
        </Space>

        <Form.Item name="phone" label="Số điện thoại">
          <Input placeholder="0901234567" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
