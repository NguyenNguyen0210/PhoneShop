import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch } from 'antd';
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../../../types/supplier';

export interface SupplierFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateSupplierDto | UpdateSupplierDto) => Promise<void>;
  loading: boolean;
  editingSupplier: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingSupplier,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingSupplier);

  useEffect(() => {
    if (open) {
      if (editingSupplier) {
        form.setFieldsValue({
          name: editingSupplier.name,
          contactName: editingSupplier.contactName || '',
          email: editingSupplier.email || '',
          phone: editingSupplier.phone || '',
          address: editingSupplier.address || '',
          taxCode: editingSupplier.taxCode || '',
          isActive: editingSupplier.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
        });
      }
    }
  }, [open, editingSupplier, form]);

  const handleFinish = async (values: any) => {
    const payload: CreateSupplierDto | UpdateSupplierDto = {
      name: values.name?.trim(),
      contactName: values.contactName ? values.contactName.trim() : undefined,
      email: values.email ? values.email.trim() : undefined,
      phone: values.phone ? values.phone.trim() : undefined,
      address: values.address ? values.address.trim() : undefined,
      taxCode: values.taxCode ? values.taxCode.trim() : undefined,
      ...(isEditing ? { isActive: values.isActive ?? true } : {}),
    };
    await onSubmit(payload);
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEditing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm mới nhà cung cấp'}
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy bỏ"
      destroyOnHidden
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ isActive: true }}
        className="mt-4"
      >
        <Form.Item
          label="Tên nhà cung cấp"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên nhà cung cấp' },
            { min: 2, message: 'Tên nhà cung cấp tối thiểu 2 ký tự' },
            { max: 200, message: 'Tên nhà cung cấp tối đa 200 ký tự' },
          ]}
        >
          <Input placeholder="Ví dụ: Công ty TNHH Apple Việt Nam" maxLength={200} />
        </Form.Item>

        <Form.Item label="Mã số thuế" name="taxCode">
          <Input placeholder="Ví dụ: 0101234567" maxLength={50} />
        </Form.Item>

        <Form.Item label="Người liên hệ" name="contactName">
          <Input placeholder="Ví dụ: Nguyễn Văn A" maxLength={100} />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                type: 'email',
                message: 'Vui lòng nhập đúng định dạng email',
              },
            ]}
          >
            <Input placeholder="Ví dụ: contact@supplier.vn" maxLength={150} />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Ví dụ: 0912345678" maxLength={30} />
          </Form.Item>
        </div>

        <Form.Item label="Địa chỉ" name="address">
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Tầng 5, Tòa nhà ABC, Hà Nội"
            maxLength={300}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Trạng thái hoạt động"
          name="isActive"
          valuePropName="checked"
          extra="Khi ngừng hoạt động, nhà cung cấp sẽ không thể chọn khi nhập hàng mới."
        >
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng hoạt động" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
