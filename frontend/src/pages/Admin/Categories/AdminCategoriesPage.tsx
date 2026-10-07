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
  FolderFilled,
  FolderOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  HolderOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CopyOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
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

  // Drag-and-drop state
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

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

  // Rollup count helper (Sản phẩm trực tiếp + toàn bộ con cháu)
  const getCategoryProductStats = useCallback((category: Category) => {
    const directCount = category._count?.products || 0;
    let descendantsCount = 0;

    const countChildren = (children?: Category[]) => {
      if (!children || children.length === 0) return;
      for (const child of children) {
        descendantsCount += child._count?.products || 0;
        countChildren(child.children);
      }
    };

    countChildren(category.children);
    const totalRollup = directCount + descendantsCount;
    return {
      directCount,
      descendantsCount,
      totalRollup,
      hasChildren: Boolean(category.children && category.children.length > 0),
    };
  }, []);

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
    const { totalRollup, hasChildren } = getCategoryProductStats(record);
    if (totalRollup > 0 || hasChildren) {
      message.warning('Không thể xóa danh mục đang có sản phẩm hoặc danh mục con.');
      return;
    }

    try {
      await categoryService.deleteCategory(record.id);
      message.success(`Đã xóa danh mục "${record.name}"`);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể xóa danh mục');
    }
  };

  // Helper tìm mảng sibling cùng cấp cha
  const findSiblings = useCallback(
    (targetParentId: string | null | undefined, tree: Category[]): Category[] => {
      if (!targetParentId) {
        return tree;
      }
      for (const node of tree) {
        if (node.id === targetParentId) {
          return node.children || [];
        }
        if (node.children && node.children.length > 0) {
          const found = findSiblings(targetParentId, node.children);
          if (found.length > 0) return found;
        }
      }
      return [];
    },
    []
  );

  // Đổi thứ tự lên / xuống giữa các mục cùng cấp cha
  const handleMoveSibling = async (record: Category, direction: 'UP' | 'DOWN') => {
    const siblings = findSiblings(record.parentId, categoriesTree);
    if (siblings.length <= 1) return;

    const currentIndex = siblings.findIndex((s) => s.id === record.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const currentItem = siblings[currentIndex];
    const targetItem = siblings[targetIndex];

    const currentOrder = currentItem.sortOrder ?? currentIndex;
    const targetOrder = targetItem.sortOrder ?? targetIndex;

    const newCurrentOrder = targetOrder === currentOrder
      ? (direction === 'UP' ? currentOrder - 1 : currentOrder + 1)
      : targetOrder;
    const newTargetOrder = currentOrder;

    try {
      await categoryService.reorderCategories([
        { id: currentItem.id, sortOrder: newCurrentOrder },
        { id: targetItem.id, sortOrder: newTargetOrder },
      ]);
      message.success(`Đã đổi thứ tự danh mục "${record.name}"`);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật thứ tự');
    }
  };

  // Kéo thả đổi vị trí giữa 2 mục cùng cấp
  const handleDropOnSibling = async (targetCategory: Category) => {
    if (!draggedCategoryId || draggedCategoryId === targetCategory.id) {
      setDraggedCategoryId(null);
      return;
    }

    // Tìm node nguồn
    const findNode = (id: string, list: Category[]): Category | null => {
      for (const item of list) {
        if (item.id === id) return item;
        if (item.children) {
          const res = findNode(id, item.children);
          if (res) return res;
        }
      }
      return null;
    };

    const sourceCategory = findNode(draggedCategoryId, categoriesTree);
    setDraggedCategoryId(null);

    if (!sourceCategory) return;
    if (sourceCategory.parentId !== targetCategory.parentId) {
      message.info('Chỉ hỗ trợ sắp xếp thứ tự giữa các danh mục cùng cấp cha');
      return;
    }

    const siblings = findSiblings(sourceCategory.parentId, categoriesTree);
    const sourceIdx = siblings.findIndex((s) => s.id === sourceCategory.id);
    const targetIdx = siblings.findIndex((s) => s.id === targetCategory.id);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const targetOrder = targetCategory.sortOrder ?? targetIdx;
    const sourceOrder = sourceCategory.sortOrder ?? sourceIdx;

    try {
      await categoryService.reorderCategories([
        { id: sourceCategory.id, sortOrder: targetOrder },
        { id: targetCategory.id, sortOrder: sourceOrder },
      ]);
      message.success(`Đã kéo thả đổi thứ tự "${sourceCategory.name}" với "${targetCategory.name}"`);
      await loadData();
    } catch {
      message.error('Không thể cập nhật thứ tự qua kéo thả');
    }
  };

  const handleCopySlug = (slug: string) => {
    void navigator.clipboard.writeText(slug);
    message.success(`Đã sao chép: /${slug}`);
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Category) => {
        const isChild = Boolean(record.parentId);
        return (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', record.id);
              setDraggedCategoryId(record.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleDropOnSibling(record);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'grab',
              padding: '2px 0',
            }}
          >
            {/* Grip handle kéo thả */}
            <span
              style={{
                color: '#94a3b8',
                fontSize: 14,
                cursor: 'grab',
                userSelect: 'none',
              }}
              title="Kéo thả để đổi thứ tự hiển thị"
            >
              <HolderOutlined />
            </span>

            {/* Đường nối cây phân cấp thư mục */}
            {isChild && (
              <span
                style={{
                  color: '#cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  userSelect: 'none',
                  marginRight: 2,
                }}
              >
                └──
              </span>
            )}

            {/* Icon thư mục theo cấp */}
            {record.imageUrl ? (
              <Avatar src={record.imageUrl} shape="square" size={32} style={{ borderRadius: 6 }} />
            ) : isChild ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: '#f1f5f9',
                  color: '#3b82f6',
                  fontSize: 15,
                }}
              >
                <FolderOutlined />
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: 17,
                }}
              >
                <FolderFilled />
              </span>
            )}

            {/* Tên & mô tả */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text
                  strong={!isChild}
                  style={{
                    fontSize: isChild ? 13 : 14,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenEdit(record)}
                >
                  {name}
                </Text>
                {!isChild && (
                  <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                    Cấp 1
                  </Tag>
                )}
              </div>
              {record.description && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                  {record.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Đường dẫn (Slug)',
      dataIndex: 'slug',
      key: 'slug',
      width: 190,
      render: (slug: string) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'monospace',
            fontSize: 12,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '2px 8px',
            borderRadius: 6,
            color: '#334155',
          }}
        >
          /{slug}
          <Tooltip title="Sao chép slug">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 11, color: '#94a3b8' }} />}
              style={{ width: 18, height: 18, padding: 0 }}
              onClick={() => handleCopySlug(slug)}
            />
          </Tooltip>
        </span>
      ),
    },
    {
      title: 'Số sản phẩm',
      key: 'productCount',
      width: 180,
      align: 'center',
      render: (_: any, record: Category) => {
        const { directCount, descendantsCount, totalRollup, hasChildren } =
          getCategoryProductStats(record);

        if (!hasChildren) {
          return (
            <Tag
              color={directCount > 0 ? 'blue' : 'default'}
              style={{
                borderRadius: 12,
                padding: '1px 10px',
                fontWeight: 600,
                fontSize: 12,
                margin: 0,
              }}
            >
              {directCount} máy
            </Tag>
          );
        }

        return (
          <Tooltip
            title={`Tổng hợp ${totalRollup} sản phẩm (${directCount} sản phẩm trực tiếp, ${descendantsCount} sản phẩm từ các danh mục con)`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Tag
                color="blue"
                style={{
                  borderRadius: 12,
                  padding: '2px 10px',
                  fontWeight: 700,
                  fontSize: 12,
                  margin: 0,
                }}
              >
                {totalRollup} máy
              </Tag>
              <Text type="secondary" style={{ fontSize: 10, marginTop: 2 }}>
                ({directCount} trực tiếp, {descendantsCount} con)
              </Text>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 120,
      align: 'center',
      render: (val: number, record: Category) => {
        const orderVal = val ?? 0;
        return (
          <Space size={4}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#475569',
                backgroundColor: '#f1f5f9',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              #{orderVal}
            </span>
            <Tooltip title="Chuyển lên trên">
              <Button
                type="text"
                size="small"
                title="Chuyển lên trên"
                aria-label="Chuyển lên trên"
                icon={<ArrowUpOutlined style={{ fontSize: 10 }} />}
                style={{ width: 20, height: 20, padding: 0 }}
                onClick={() => void handleMoveSibling(record, 'UP')}
              />
            </Tooltip>
            <Tooltip title="Chuyển xuống dưới">
              <Button
                type="text"
                size="small"
                title="Chuyển xuống dưới"
                aria-label="Chuyển xuống dưới"
                icon={<ArrowDownOutlined style={{ fontSize: 10 }} />}
                style={{ width: 20, height: 20, padding: 0 }}
                onClick={() => void handleMoveSibling(record, 'DOWN')}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      align: 'center',
      render: (isActive: boolean, record: Category) => (
        <Tooltip title={isActive ? 'Đang kích hoạt — Nhấn để tạm ẩn' : 'Đang tạm ẩn — Nhấn để kích hoạt'}>
          <Switch
            checked={isActive}
            size="small"
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
      width: 170,
      align: 'right',
      render: (_: any, record: Category) => {
        const { totalRollup, hasChildren } = getCategoryProductStats(record);
        const canDelete = totalRollup === 0 && !hasChildren;

        return (
          <Space size={4}>
            <Tooltip title="Thêm mục con">
              <Button
                size="small"
                type="text"
                aria-label="Thêm mục con"
                icon={<PlusOutlined style={{ color: '#2563eb' }} />}
                style={{ borderRadius: 6, backgroundColor: '#eff6ff' }}
                onClick={() => handleOpenAddChild(record)}
              />
            </Tooltip>

            <Tooltip title="Chỉnh sửa danh mục">
              <Button
                size="small"
                type="text"
                aria-label="Sửa"
                icon={<EditOutlined style={{ color: '#475569' }} />}
                style={{ borderRadius: 6, backgroundColor: '#f8fafc' }}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>

            <Tooltip title="Xem trang danh mục trên Storefront">
              <Button
                size="small"
                type="text"
                aria-label="Xem trên web"
                icon={<GlobalOutlined style={{ color: '#0284c7' }} />}
                style={{ borderRadius: 6 }}
                onClick={() => window.open(`/collections/${record.slug}`, '_blank')}
              />
            </Tooltip>

            <Popconfirm
              title={`Xác nhận xóa danh mục "${record.name}"?`}
              description={
                canDelete
                  ? 'Hành động này không thể hoàn tác.'
                  : 'Lưu ý: Không thể xóa danh mục đang có sản phẩm hoặc danh mục con.'
              }
              onConfirm={() => void handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, disabled: !canDelete }}
            >
              <Tooltip title={canDelete ? 'Xóa danh mục' : 'Chỉ được xóa khi không có sản phẩm và mục con'}>
                <Button
                  size="small"
                  type="text"
                  danger
                  aria-label="Xóa"
                  disabled={!canDelete}
                  icon={<DeleteOutlined />}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpenOutlined style={{ color: '#2563eb' }} /> Quản lý Cây Danh Mục Sản Phẩm
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Cấu hình cây phân cấp danh mục sản phẩm, quản lý trạng thái hiển thị và liên kết sản phẩm.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateRoot}
            style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}
          >
            Thêm danh mục mới
          </Button>
        </Space>
      </div>

      {/* Metric Cards — thu gọn 50% chiều cao, nền trắng, icon phong cách SaaS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card
          size="small"
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tổng số danh mục
              </Text>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                {stats.total}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: 18,
              }}
            >
              <FolderFilled />
            </span>
          </div>
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Đang kích hoạt
              </Text>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                {stats.active}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                fontSize: 18,
              }}
            >
              <CheckCircleOutlined />
            </span>
          </div>
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tạm ẩn
              </Text>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 2 }}>
                {stats.inactive}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#fffbeb',
                color: '#d97706',
                fontSize: 18,
              }}
            >
              <EyeInvisibleOutlined />
            </span>
          </div>
        </Card>

        <Card
          size="small"
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tổng sản phẩm
              </Text>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed', marginTop: 2 }}>
                {stats.totalProducts} máy
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#faf5ff',
                color: '#7c3aed',
                fontSize: 18,
              }}
            >
              <AppstoreOutlined />
            </span>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        }}
        styles={{
          body: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '10px 14px',
          },
        }}
      >
        <Space wrap>
          <Input
            placeholder="Tìm theo tên hoặc slug..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 280, borderRadius: 8 }}
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
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
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
                description="Chưa có danh mục sản phẩm nào"
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
