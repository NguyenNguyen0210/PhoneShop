import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Tree,
  Table,
  Button,
  Input,
  Tag,
  Switch,
  Breadcrumb,
  Popconfirm,
  Tooltip,
  message,
  Spin,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  HomeOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  categoryService,
  type CategoryTreeNode,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '../../../services/categoryService';
import { CategoryFormModal } from './components/CategoryFormModal';
import type { Category } from '../../../types';

interface AntTreeNode {
  key: string;
  title: React.ReactNode;
  children?: AntTreeNode[];
}

const findNodePath = (
  nodes: CategoryTreeNode[],
  targetId: string,
  currentPath: CategoryTreeNode[] = [],
): CategoryTreeNode[] | null => {
  for (const node of nodes) {
    const nextPath = [...currentPath, node];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodePath(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
};

const findNodeById = (
  nodes: CategoryTreeNode[],
  targetId: string,
): CategoryTreeNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

const getParentKey = (key: React.Key, tree: CategoryTreeNode[]): React.Key | null => {
  let parentKey: React.Key | null = null;
  for (const node of tree) {
    if (node.children) {
      if (node.children.some((item) => item.id === key)) {
        parentKey = node.id;
      } else {
        const found = getParentKey(key, node.children);
        if (found) parentKey = found;
      }
    }
  }
  return parentKey;
};

const getAllKeys = (nodes: CategoryTreeNode[]): React.Key[] => {
  const keys: React.Key[] = [];
  const traverse = (items: CategoryTreeNode[]) => {
    for (const item of items) {
      keys.push(item.id);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };
  traverse(nodes);
  return keys;
};

export const AdminCategoriesPage: React.FC = () => {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryNode, setSelectedCategoryNode] = useState<CategoryTreeNode | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryTreeNode | Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTree = useCallback(async (keepSelectedId?: string) => {
    setLoading(true);
    try {
      const data = await categoryService.getCategoryTree();
      setTreeData(data);

      const targetId = keepSelectedId ?? selectedCategoryNode?.id;
      if (targetId) {
        const updatedNode = findNodeById(data, targetId);
        if (updatedNode) {
          setSelectedCategoryNode(updatedNode);
          setSelectedKeys([updatedNode.id]);
        } else {
          setSelectedCategoryNode(null);
          setSelectedKeys([]);
        }
      }
    } catch {
      message.error('Không thể tải cấu trúc cây danh mục. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryNode]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Initial expand first level keys
  useEffect(() => {
    if (treeData.length > 0 && expandedKeys.length === 0) {
      const rootKeys = treeData.map((node) => node.id);
      setExpandedKeys(rootKeys);
    }
  }, [treeData, expandedKeys.length]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim()) {
      setAutoExpandParent(false);
      return;
    }

    const lower = value.toLowerCase().trim();
    const expanded: React.Key[] = [];
    const traverse = (items: CategoryTreeNode[]) => {
      for (const item of items) {
        if (item.name.toLowerCase().includes(lower) || item.slug.toLowerCase().includes(lower)) {
          const parent = getParentKey(item.id, treeData);
          if (parent && !expanded.includes(parent)) {
            expanded.push(parent);
          }
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(treeData);

    setExpandedKeys(expanded);
    setAutoExpandParent(true);
  };

  const handleSelectCategory = useCallback((node: CategoryTreeNode) => {
    setSelectedCategoryNode(node);
    setSelectedKeys([node.id]);

    // Ensure parents are expanded
    const path = findNodePath(treeData, node.id);
    if (path) {
      const parentKeys = path.slice(0, -1).map((p) => p.id);
      setExpandedKeys((prev) => Array.from(new Set([...prev, ...parentKeys])));
    }
  }, [treeData]);

  const handleSelectRoot = useCallback(() => {
    setSelectedCategoryNode(null);
    setSelectedKeys([]);
  }, []);

  const handleOpenCreateRootModal = () => {
    setEditingCategory(null);
    setDefaultParentId(null);
    setIsModalOpen(true);
  };

  const handleOpenCreateChildModal = () => {
    if (!selectedCategoryNode) return;
    setEditingCategory(null);
    setDefaultParentId(selectedCategoryNode.id);
    setIsModalOpen(true);
  };

  const handleEditCategory = (cat: CategoryTreeNode | Category) => {
    setEditingCategory(cat);
    setDefaultParentId(cat.parentId || null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      await categoryService.toggleCategoryStatus(id, newStatus);
      message.success(newStatus ? 'Đã kích hoạt danh mục!' : 'Đã tạm ẩn danh mục!');
      await fetchTree();
    } catch {
      message.error('Không thể thay đổi trạng thái danh mục. Vui lòng thử lại!');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      message.success('Đã xóa danh mục thành công!');
      if (selectedCategoryNode?.id === id) {
        setSelectedCategoryNode(null);
        setSelectedKeys([]);
      }
      await fetchTree();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa danh mục này!');
    }
  };

  const handleModalSubmit = async (values: CreateCategoryPayload | UpdateCategoryPayload) => {
    setModalLoading(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success('Cập nhật thông tin danh mục thành công!');
        setIsModalOpen(false);
        await fetchTree(editingCategory.id);
      } else {
        const created = await categoryService.createCategory(values as CreateCategoryPayload);
        message.success('Thêm danh mục mới thành công!');
        setIsModalOpen(false);
        await fetchTree(created.id);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Thao tác lưu danh mục thất bại!');
    } finally {
      setModalLoading(false);
    }
  };

  // Convert treeData for Ant Tree with search highlighting
  const antTreeData = useMemo(() => {
    const renderNodes = (nodes: CategoryTreeNode[]): AntTreeNode[] => {
      return nodes.map((node) => {
        const prodCount = node._count?.products ?? node.productCount ?? 0;
        const lowerName = node.name.toLowerCase();
        const lowerSearch = searchQuery.toLowerCase().trim();

        let titleNode: React.ReactNode = node.name;
        if (lowerSearch && lowerName.includes(lowerSearch)) {
          const index = lowerName.indexOf(lowerSearch);
          const beforeStr = node.name.substring(0, index);
          const matchStr = node.name.substring(index, index + lowerSearch.length);
          const afterStr = node.name.substring(index + lowerSearch.length);
          titleNode = (
            <span>
              {beforeStr}
              <span className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded">
                {matchStr}
              </span>
              {afterStr}
            </span>
          );
        }

        return {
          key: node.id,
          title: (
            <div className="flex items-center justify-between gap-2 py-1 pr-1 group">
              <span className={`text-sm ${!node.isActive ? 'text-slate-400' : 'text-slate-800'}`}>
                {titleNode}
              </span>
              <div className="flex items-center gap-1">
                {!node.isActive && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200">
                    Ẩn
                  </span>
                )}
                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">
                  {prodCount}
                </span>
              </div>
            </div>
          ),
          children:
            node.children && node.children.length > 0 ? renderNodes(node.children) : undefined,
        };
      });
    };

    return renderNodes(treeData);
  }, [treeData, searchQuery]);

  // Table Data Source: If a category is selected, show its children; otherwise show root categories
  const tableDataSource = useMemo(() => {
    if (selectedCategoryNode) {
      return selectedCategoryNode.children ?? [];
    }
    return treeData;
  }, [selectedCategoryNode, treeData]);

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: (
          <button
            type="button"
            onClick={handleSelectRoot}
            className="flex items-center gap-1 text-slate-600 hover:text-blue-600 cursor-pointer font-medium"
          >
            <HomeOutlined />
            <span>Tất cả danh mục gốc</span>
          </button>
        ),
      },
    ];

    if (selectedCategoryNode) {
      const path = findNodePath(treeData, selectedCategoryNode.id) || [selectedCategoryNode];
      path.forEach((node, idx) => {
        const isLast = idx === path.length - 1;
        items.push({
          title: isLast ? (
            <span className="font-semibold text-slate-900">{node.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectCategory(node)}
              className="text-slate-600 hover:text-blue-600 cursor-pointer"
            >
              {node.name}
            </button>
          ),
        });
      });
    }

    return items;
  }, [treeData, selectedCategoryNode, handleSelectCategory, handleSelectRoot]);

  // Table Columns
  const columns: ColumnsType<CategoryTreeNode> = [
    {
      title: 'Danh mục',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt={record.name}
              className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FolderOutlined className="text-lg" />
            </div>
          )}
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => handleSelectCategory(record)}
              className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left block truncate cursor-pointer hover:underline"
            >
              {record.name}
            </button>
            <div className="text-xs text-slate-400 truncate max-w-xs">
              {record.description || (
                record.children && record.children.length > 0
                  ? `${record.children.length} danh mục con`
                  : 'Chưa có mô tả'
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono border border-slate-200/60">
          {slug}
        </code>
      ),
    },
    {
      title: 'Thứ tự',
      key: 'order',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const orderVal = record.sortOrder ?? record.order ?? 0;
        return (
          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-xs">
            {orderVal}
          </span>
        );
      },
    },
    {
      title: 'Sản phẩm',
      key: 'productCount',
      width: 130,
      render: (_, record) => {
        const count = record._count?.products ?? record.productCount ?? 0;
        return <Tag color="blue">{count} sản phẩm</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 140,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tag color={record.isActive ? 'success' : 'default'}>
            {record.isActive ? 'Hoạt động' : 'Tạm ẩn'}
          </Tag>
          <Switch
            size="small"
            checked={record.isActive}
            onChange={() => handleToggleStatus(record.id, record.isActive)}
          />
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          {record.children && record.children.length > 0 && (
            <Tooltip title={`Xem ${record.children.length} danh mục con`}>
              <Button
                size="small"
                type="text"
                icon={<FolderOpenOutlined className="text-blue-600" />}
                onClick={() => handleSelectCategory(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Chỉnh sửa danh mục">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined className="text-amber-600" />}
              onClick={() => handleEditCategory(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa danh mục"
            description={`Bạn có chắc muốn xóa "${record.name}" không?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteCategory(record.id)}
          >
            <Tooltip title="Xóa danh mục">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ApartmentOutlined className="text-blue-600" /> Quản lý Danh mục
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Quản trị phân cấp danh mục sản phẩm đa cấp, kiểm soát cây hiển thị và thứ tự trên storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchTree()}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateRootModal}
          >
            Thêm danh mục gốc
          </Button>
        </div>
      </div>

      {/* Split View Layout (Master-Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (35% -> lg:col-span-4 / xl:col-span-4): Hierarchy Tree */}
        <div className="lg:col-span-4 space-y-4">
          <Card
            className="border border-slate-200/80 shadow-xs rounded-xl"
            title={
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                  <FolderOpenOutlined className="text-blue-500" /> Cây danh mục
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {treeData.length} danh mục gốc
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              <Input
                placeholder="Tìm kiếm danh mục..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={handleSearchChange}
                allowClear
              />

              <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={handleSelectRoot}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                    !selectedCategoryNode
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <AppstoreOutlined className="mr-1" />
                  Xem tất cả gốc
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedKeys(getAllKeys(treeData))}
                  className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Mở rộng tất cả
                </button>
              </div>

              <div className="min-h-[350px] max-h-[600px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <Spin tip="Đang tải dữ liệu cây..." />
                  </div>
                ) : antTreeData.length === 0 ? (
                  <Empty description="Không có danh mục nào" className="py-12" />
                ) : (
                  <Tree
                    showLine={{ showLeafIcon: false }}
                    selectedKeys={selectedKeys}
                    expandedKeys={expandedKeys}
                    autoExpandParent={autoExpandParent}
                    onExpand={(keys) => {
                      setExpandedKeys(keys);
                      setAutoExpandParent(false);
                    }}
                    onSelect={(_, info) => {
                      if (info.selected && info.node) {
                        const target = findNodeById(treeData, String(info.node.key));
                        if (target) handleSelectCategory(target);
                      }
                    }}
                    treeData={antTreeData}
                  />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (65% -> lg:col-span-8 / xl:col-span-8): Detail View & Table */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border border-slate-200/80 shadow-xs rounded-xl">
            {/* Breadcrumb Path */}
            <div className="pb-4 mb-4 border-b border-slate-100">
              <Breadcrumb items={breadcrumbItems} />
            </div>

            {/* Header info of current focus */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedCategoryNode ? selectedCategoryNode.name : 'Danh mục cấp cao nhất (Gốc)'}
                  </h2>
                  {selectedCategoryNode && (
                    <Tag color={selectedCategoryNode.isActive ? 'success' : 'default'}>
                      {selectedCategoryNode.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                    </Tag>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedCategoryNode
                    ? selectedCategoryNode.description ||
                      `Chứa ${selectedCategoryNode.children?.length ?? 0} danh mục con và ${
                        selectedCategoryNode._count?.products ?? selectedCategoryNode.productCount ?? 0
                      } sản phẩm.`
                    : 'Hiển thị các danh mục gốc không phụ thuộc vào danh mục nào.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedCategoryNode ? (
                  <>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => handleEditCategory(selectedCategoryNode)}
                    >
                      Sửa danh mục này
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenCreateChildModal}
                    >
                      Thêm danh mục con
                    </Button>
                  </>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateRootModal}
                  >
                    Thêm danh mục gốc
                  </Button>
                )}
              </div>
            </div>

            {/* Table of Subcategories or Root Categories */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-700 text-sm">
                  {selectedCategoryNode
                    ? `Danh mục con trực thuộc (${tableDataSource.length})`
                    : `Danh sách danh mục gốc (${tableDataSource.length})`}
                </span>
              </div>

              <Table
                columns={columns}
                dataSource={tableDataSource}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Tổng cộng ${total} danh mục`,
                }}
                locale={{
                  emptyText: selectedCategoryNode ? (
                    <Empty
                      description="Chưa có danh mục con trực thuộc."
                      className="py-8"
                    >
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreateChildModal}
                      >
                        Thêm danh mục con ngay
                      </Button>
                    </Empty>
                  ) : (
                    <Empty description="Chưa có danh mục nào." className="py-8" />
                  ),
                }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Add / Edit Category */}
      <CategoryFormModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        loading={modalLoading}
        editingCategory={editingCategory}
        treeData={treeData}
        defaultParentId={defaultParentId}
      />
    </div>
  );
};

export default AdminCategoriesPage;
