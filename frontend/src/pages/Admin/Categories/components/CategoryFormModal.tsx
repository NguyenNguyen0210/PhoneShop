import React, { useEffect, useRef, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Switch, TreeSelect } from 'antd';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type {
  CategoryTreeNode,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../../../services/categoryService';
import type { Category } from '../../../../types';

export interface CategoryFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
  loading: boolean;
  editingCategory: CategoryTreeNode | Category | null;
  treeData: CategoryTreeNode[];
  defaultParentId?: string | null;
}

const slugify = (text: string): string => {
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

interface TreeSelectOption {
  title: string;
  value: string;
  key: string;
  disabled?: boolean;
  children?: TreeSelectOption[];
}

const buildTreeSelectData = (
  nodes: CategoryTreeNode[],
  editingId?: string,
  isUnderEditing = false,
): TreeSelectOption[] => {
  return nodes.map((node) => {
    const isThisNodeEditing = Boolean(editingId && node.id === editingId);
    const shouldDisable = isUnderEditing || isThisNodeEditing;
    const prodCount = node._count?.products ?? node.productCount ?? 0;
    const label = `${node.name} (${prodCount} SP)`;

    return {
      title: label,
      value: node.id,
      key: node.id,
      disabled: shouldDisable,
      children:
        node.children && node.children.length > 0
          ? buildTreeSelectData(node.children, editingId, shouldDisable)
          : undefined,
    };
  });
};

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingCategory,
  treeData,
  defaultParentId,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingCategory);
  const isSlugManuallyEditedRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (editingCategory) {
        form.setFieldsValue({
          name: editingCategory.name,
          slug: editingCategory.slug,
          parentId: editingCategory.parentId || undefined,
          imageUrl: editingCategory.imageUrl || (editingCategory as any).icon || '',
          order: editingCategory.sortOrder ?? (editingCategory as any).order ?? 0,
          description: editingCategory.description || '',
          isActive: editingCategory.isActive ?? true,
        });
        isSlugManuallyEditedRef.current = true;
      } else {
        form.resetFields();
        form.setFieldsValue({
          parentId: defaultParentId || undefined,
          order: 0,
          isActive: true,
          imageUrl: '',
        });
        isSlugManuallyEditedRef.current = false;
      }
    }
  }, [open, editingCategory, defaultParentId, form]);

  const treeSelectOptions = useMemo(() => {
    return buildTreeSelectData(treeData, editingCategory?.id);
  }, [treeData, editingCategory?.id]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing && !isSlugManuallyEditedRef.current) {
      form.setFieldsValue({ slug: slugify(name) });
    }
  };

  const handleFinish = async (values: any) => {
    const payload: CreateCategoryPayload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      parentId: values.parentId || null,
      imageUrl: values.imageUrl ? values.imageUrl.trim() : undefined,
      icon: values.imageUrl ? values.imageUrl.trim() : undefined,
      order: values.order ?? 0,
      sortOrder: values.order ?? 0,
      description: values.description ? values.description.trim() : undefined,
      isActive: values.isActive ?? true,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      title={
        isEditing
          ? `Chỉnh sửa Danh mục: ${editingCategory?.name}`
          : defaultParentId
          ? 'Thêm mới Danh mục con'
          : 'Thêm mới Danh mục'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy bỏ"
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ isActive: true, order: 0 }}
        className="mt-4"
      >
        <Form.Item
          label="Tên danh mục"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên danh mục' },
            { min: 2, message: 'Tên danh mục tối thiểu 2 ký tự' },
            { max: 100, message: 'Tên danh mục tối đa 100 ký tự' },
          ]}
        >
          <Input
            placeholder="Ví dụ: Điện thoại, iPhone, Phụ kiện..."
            onChange={handleNameChange}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Đường dẫn tĩnh (Slug)"
          name="slug"
          tooltip="Chuẩn hóa theo định dạng URL thân thiện SEO (ví dụ: dien-thoai, iphone-15)"
          rules={[
            { required: true, message: 'Vui lòng nhập slug danh mục' },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
            },
          ]}
        >
          <Input
            placeholder="dien-thoai, iphone..."
            maxLength={120}
            onChange={() => {
              isSlugManuallyEditedRef.current = true;
            }}
          />
        </Form.Item>

        <Form.Item
          label="Danh mục cha"
          name="parentId"
          tooltip="Để trống nếu đây là danh mục gốc cao nhất"
        >
          <TreeSelect
            showSearch
            allowClear
            treeDefaultExpandAll
            placeholder="Chọn danh mục cha (để trống nếu là danh mục gốc)"
            treeData={treeSelectOptions}
            filterTreeNode={(search, item) => {
              const title = String(item.title || '');
              return title.toLowerCase().includes(search.toLowerCase());
            }}
          />
        </Form.Item>

        <Form.Item label="Hình ảnh / Icon đại diện">
          <Form.Item name="imageUrl" noStyle>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl !== currentValues.imageUrl}
          >
            {() => (
              <ImageUploadDragger
                folder="categories"
                value={form.getFieldValue('imageUrl')}
                onChange={(url) => form.setFieldsValue({ imageUrl: url })}
              />
            )}
          </Form.Item>
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Form.Item
            label="Thứ tự hiển thị (Order)"
            name="order"
            tooltip="Số càng nhỏ sẽ được ưu tiên hiển thị trước"
            rules={[{ required: true, message: 'Vui lòng nhập thứ tự hiển thị' }]}
          >
            <InputNumber min={0} max={9999} className="w-full" placeholder="0" />
          </Form.Item>

          <Form.Item
            label="Trạng thái kinh doanh"
            name="isActive"
            valuePropName="checked"
            extra="Danh mục bị ẩn sẽ không hiển thị trên Storefront."
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm ẩn" />
          </Form.Item>
        </div>

        <Form.Item label="Mô tả danh mục" name="description">
          <Input.TextArea
            rows={3}
            placeholder="Thông tin giới thiệu ngắn về danh mục sản phẩm..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryFormModal;
