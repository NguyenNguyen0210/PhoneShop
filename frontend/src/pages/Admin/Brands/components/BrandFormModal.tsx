import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch } from 'antd';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../../../../types';

export interface BrandFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateBrandInput | UpdateBrandInput) => Promise<void>;
  loading: boolean;
  editingBrand: Brand | null;
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const BrandFormModal: React.FC<BrandFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingBrand,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingBrand);

  useEffect(() => {
    if (open) {
      if (editingBrand) {
        form.setFieldsValue({
          name: editingBrand.name,
          slug: editingBrand.slug,
          logoUrl: editingBrand.logoUrl || editingBrand.logo || '',
          websiteUrl: editingBrand.websiteUrl || '',
          description: editingBrand.description || '',
          isActive: editingBrand.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
        });
      }
    }
  }, [open, editingBrand, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing) {
      form.setFieldsValue({ slug: slugify(name) });
    }
  };

  const handleFinish = async (values: any) => {
    const payload: CreateBrandInput = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description ? values.description.trim() : undefined,
      logoUrl: values.logoUrl ? values.logoUrl.trim() : undefined,
      websiteUrl: values.websiteUrl ? values.websiteUrl.trim() : undefined,
      isActive: values.isActive ?? true,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      title={isEditing ? 'Chỉnh sửa Thương hiệu' : 'Thêm mới Thương hiệu'}
      open={open}
      onCancel={onCancel}
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
          label="Tên thương hiệu"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên thương hiệu' },
            { min: 2, message: 'Tên thương hiệu tối thiểu 2 ký tự' },
            { max: 100, message: 'Tên thương hiệu tối đa 100 ký tự' },
          ]}
        >
          <Input
            placeholder="Ví dụ: Apple, Samsung, Xiaomi..."
            onChange={handleNameChange}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Đường dẫn tĩnh (Slug)"
          name="slug"
          tooltip="Chuẩn hóa theo định dạng URL thân thiện SEO (chỉ gồm chữ thường, số và dấu gạch nối)"
          rules={[
            { required: true, message: 'Vui lòng nhập slug thương hiệu' },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang (ví dụ: apple, samsung)',
            },
          ]}
        >
          <Input placeholder="ví-du: apple, samsung-galaxy" maxLength={120} />
        </Form.Item>

        <Form.Item label="Logo thương hiệu" name="logoUrl">
          <ImageUploadDragger
            folder="brands"
            value={form.getFieldValue('logoUrl')}
            onChange={(url) => form.setFieldsValue({ logoUrl: url })}
          />
        </Form.Item>

        <Form.Item
          label="Website chính thức"
          name="websiteUrl"
          rules={[
            {
              type: 'url',
              message: 'Vui lòng nhập đúng định dạng URL (ví dụ: https://www.apple.com)',
            },
          ]}
        >
          <Input placeholder="https://www.example.com" maxLength={255} />
        </Form.Item>

        <Form.Item label="Mô tả thương hiệu" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Thông tin giới thiệu ngắn gọn về thương hiệu..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Trạng thái kinh doanh"
          name="isActive"
          valuePropName="checked"
          extra="Khi vô hiệu hóa, sản phẩm thuộc thương hiệu này có thể bị hạn chế hiển thị."
        >
          <Switch checkedChildren="Kích hoạt" unCheckedChildren="Tạm ẩn" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
