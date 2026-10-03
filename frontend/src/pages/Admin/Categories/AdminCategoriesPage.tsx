import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Switch,
  message,
  Typography,
  Card,
  Avatar,
  Popconfirm,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  MobileOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { categoryService } from '../../../services/categoryService';
import { CategoryFormModal } from './components/CategoryFormModal';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../types';

const { Title, Text } = Typography;

export const AdminCategoriesPage: React.FC = () => {
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentForNewChild, setParentForNewChild] = useState<Category | null>(null);

  // Recursively collect all keys for Expand All
  const getAllKeys = useCallback((items: Category[]): string[] => {
    let keys: string[] = [];
    for (const item of items) {
      keys.push(item.id);
      if (item.children && item.children.length > 0) {
        keys = keys.concat(getAllKeys(item.children));
      }
    }
    return keys;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tree = await categoryService.getAdminCategoryTree();
      setCategoriesTree(tree);
      // Auto expand root level
      setExpandedRowKeys(tree.map((c) => c.id));
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute statistics from tree recursively
  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let inactive = 0;
    let totalProducts = 0;

    const traverse = (cats: Category[]) => {
      for (const cat of cats) {
        total++;
        if (cat.isActive) active++;
        else inactive++;
        totalProducts += cat._count?.products || 0;
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      }
    };

    traverse(categoriesTree);
    return { total, active, inactive, totalProducts };
  }, [categoriesTree]);

  // Filter tree based on search and status
  const filteredTree = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const filterNode = (node: Category): Category | null => {
      const matchesSearch =
        !keyword ||
        node.name.toLowerCase().includes(keyword) ||
        node.slug.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && node.isActive) ||
        (statusFilter === 'INACTIVE' && !node.isActive);

      // Filter children first
      const filteredChildren: Category[] = [];
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const matchingChild = filterNode(child);
          if (matchingChild) filteredChildren.push(matchingChild);
        }
      }

      // Keep node if it matches directly or has matching children
      if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }

      return null;
    };

    return categoriesTree.map(filterNode).filter((n): n is Category => n !== null);
  }, [categoriesTree, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateRoot = () => {
    setEditingCategory(null);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleOpenAddChild = (parent: Category) => {
    setEditingCategory(null);
    setParentForNewChild(parent);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setParentForNewChild(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: CreateCategoryInput | UpdateCategoryInput) => {
    setActionLoading(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success('Cập nhật danh mục thành công!');
      } else {
        await categoryService.createCategory(values as CreateCategoryInput);
        message.success('Thêm danh mục mới thành công!');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (record: Category, checked: boolean) => {
    try {
      if (checked) {
        await categoryService.activateCategory(record.id);
        message.success(`Đã kích hoạt danh mục "${record.name}"`);
      } else {
        await categoryService.deactivateCategory(record.id);
        message.info(`Đã tạm ẩn danh mục "${record.name}"`);
      }
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể đổi trạng thái');
    }
  };

  const handleDelete = async (record: Category) => {
    try {
      await categoryService.deleteCategory(record.id);
      message.success(`Đã xóa danh mục "${record.name}"`);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể xóa danh mục');
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => (
        <Space size={10}>
          {record.imageUrl ? (
            <Avatar src={record.imageUrl} shape="square" size={32} />
          ) : (
            <Avatar
              icon={<MobileOutlined />}
              shape="square"
              size={32}
              style={{
                backgroundColor: record.parentId ? '#f0f5ff' : '#1677ff',
                color: record.parentId ? '#2f54eb' : '#fff',
              }}
            />
          )}
          <div>
            <Text strong={!record.parentId} style={{ fontSize: record.parentId ? 13 : 14 }}>
              {name}
            </Text>
            {record.description && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.description}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Đường dẫn (Slug)',
      dataIndex: 'slug',
      key: 'slug',
      width: 200,
      render: (slug: string) => (
        <Text code copyable={{ text: slug }} style={{ fontSize: 12 }}>
          {slug}
        </Text>
      ),
    },
    {
      title: 'Số Smartphone',
      key: 'productCount',
      width: 140,
      align: 'center',
      render: (_: any, record: Category) => {
        const count = record._count?.products || 0;
        return (
          <Tag color={count > 0 ? 'blue' : 'default'} style={{ borderRadius: 10, padding: '0 8px' }}>
            {count} sản phẩm
          </Tag>
        );
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 90,
      align: 'center',
      render: (val: number) => <Text>{val ?? 0}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive: boolean, record: Category) => (
        <Tooltip title={isActive ? 'Nhấn để tạm ẩn danh mục' : 'Nhấn để kích hoạt danh mục'}>
          <Switch
            checked={isActive}
            onChange={(checked) => void handleToggleStatus(record, checked)}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 220,
      align: 'right',
      render: (_: any, record: Category) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleOpenAddChild(record)}
          >
            + Con
          </Button>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Xác nhận xóa danh mục "${record.name}"?`}
            description="Lưu ý: Không thể xóa danh mục nếu đang có sản phẩm hoặc danh mục con."
            onConfirm={() => void handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpenOutlined style={{ color: '#1677ff' }} /> Quản lý Danh mục Smartphone
          </Title>
          <Text type="secondary">
            Cấu hình cây phân cấp danh mục smartphone, quản lý trạng thái hiển thị và liên kết sản phẩm.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateRoot}>
            + Thêm danh mục mới
          </Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng số danh mục
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
            {stats.total}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Đang kích hoạt
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
            {stats.active}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tạm ẩn
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14', marginTop: 4 }}>
            {stats.inactive}
          </div>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng Smartphone
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#722ed1', marginTop: 4 }}>
            {stats.totalProducts} máy
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        styles={{ body: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 } }}
      >
        <Space wrap>
          <Input
            placeholder="Tìm theo tên hoặc slug..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang kích hoạt' },
              { value: 'INACTIVE', label: 'Tạm ẩn' },
            ]}
          />
        </Space>

        <Space wrap>
          <Button size="small" onClick={() => setExpandedRowKeys(getAllKeys(categoriesTree))}>
            Mở rộng tất cả
          </Button>
          <Button size="small" onClick={() => setExpandedRowKeys([])}>
            Thu gọn
          </Button>
        </Space>
      </Card>

      {/* Tree Table */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8, overflow: 'hidden' }}>
        <Table<Category>
          rowKey="id"
          columns={columns}
          dataSource={filteredTree}
          loading={loading}
          pagination={false}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            rowExpandable: (record) => Boolean(record.children && record.children.length > 0),
          }}
          locale={{
            emptyText: (
              <Empty
                description="Chưa có danh mục smartphone nào"
                style={{ padding: '32px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateRoot}>
                  Tạo danh mục đầu tiên
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <CategoryFormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        loading={actionLoading}
        editingCategory={editingCategory}
        parentCategoryForNewChild={parentForNewChild}
        categoriesTree={categoriesTree}
      />
    </div>
  );
};
