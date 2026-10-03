import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Switch, TreeSelect } from 'antd';
import { ImageUploadDragger } from '../../../../components/admin/ImageUploadDragger';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../../types';

export interface CategoryFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
  loading: boolean;
  editingCategory: Category | null;
  parentCategoryForNewChild: Category | null;
  categoriesTree: Category[];
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

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  editingCategory,
  parentCategoryForNewChild,
  categoriesTree,
}) => {
  const [form] = Form.useForm();
  const isEditing = Boolean(editingCategory);

  // Build disabled IDs list (self + all descendants)
  const disabledIds = useMemo(() => {
    if (!editingCategory) return new Set<string>();
    const ids = new Set<string>([editingCategory.id]);

    const addDescendants = (cat: Category) => {
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          ids.add(child.id);
          addDescendants(child);
        }
      }
    };

    const findAndAdd = (cats: Category[]) => {
      for (const cat of cats) {
        if (cat.id === editingCategory.id) {
          addDescendants(cat);
        } else if (cat.children && cat.children.length > 0) {
          findAndAdd(cat.children);
        }
      }
    };

    findAndAdd(categoriesTree);
    return ids;
  }, [editingCategory, categoriesTree]);

  // Transform tree into TreeSelect data structure
  const treeData = useMemo(() => {
    const mapNode = (cat: Category): any => ({
      title: cat.name,
      value: cat.id,
      key: cat.id,
      disabled: disabledIds.has(cat.id),
      children: cat.children && cat.children.length > 0 ? cat.children.map(mapNode) : undefined,
    });

    return [
      {
        title: '📂 [Danh mục gốc - Không có cha]',
        value: 'ROOT',
        key: 'ROOT',
      },
      ...categoriesTree.map(mapNode),
    ];
  }, [categoriesTree, disabledIds]);

  useEffect(() => {
    if (open) {
      if (editingCategory) {
        form.setFieldsValue({
          name: editingCategory.name,
          slug: editingCategory.slug,
          parentId: editingCategory.parentId || 'ROOT',
          imageUrl: editingCategory.imageUrl || '',
          sortOrder: editingCategory.sortOrder ?? 0,
          isActive: editingCategory.isActive ?? true,
          description: editingCategory.description || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          parentId: parentCategoryForNewChild ? parentCategoryForNewChild.id : 'ROOT',
          sortOrder: 0,
          isActive: true,
        });
      }
    }
  }, [open, editingCategory, parentCategoryForNewChild, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!isEditing) {
      form.setFieldsValue({ slug: slugify(name) });
    }
  };

  const handleFinish = async (values: any) => {
    const payload: any = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      parentId: values.parentId === 'ROOT' ? null : values.parentId,
      imageUrl: values.imageUrl || null,
      sortOrder: Number(values.sortOrder) || 0,
      isActive: Boolean(values.isActive),
      description: values.description?.trim() || null,
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      title={
        isEditing
          ? `Chỉnh sửa danh mục: ${editingCategory?.name}`
          : parentCategoryForNewChild
          ? `Thêm danh mục con cho "${parentCategoryForNewChild.name}"`
          : 'Thêm danh mục Smartphone mới'
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo danh mục'}
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
        <Form.Item
          label="Tên danh mục"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
        >
          <Input
            placeholder="Ví dụ: iPhone 16 Series, Smartphone Gaming..."
            onChange={handleNameChange}
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Đường dẫn (Slug SEO)"
          name="slug"
          rules={[{ required: true, message: 'Vui lòng nhập đường dẫn slug!' }]}
          extra="Được tự động tạo từ tên, bạn có thể chỉnh sửa thủ công nếu muốn."
        >
          <Input placeholder="iphone-16-series" maxLength={120} />
        </Form.Item>

        <Form.Item label="Danh mục cha (Phân cấp)" name="parentId">
          <TreeSelect
            showSearch
            style={{ width: '100%' }}
            styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
            placeholder="Chọn danh mục cha"
            allowClear={false}
            treeDefaultExpandAll
            treeData={treeData}
          />
        </Form.Item>

        <Form.Item label="Ảnh đại diện / Icon danh mục" name="imageUrl">
          <ImageUploadDragger folder="categories" />
        </Form.Item>

        <Form.Item label="Thứ tự hiển thị" name="sortOrder">
          <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>

        <Form.Item label="Trạng thái kích hoạt" name="isActive" valuePropName="checked">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>

        <Form.Item label="Mô tả danh mục" name="description">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn về nhóm smartphone này..." maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
