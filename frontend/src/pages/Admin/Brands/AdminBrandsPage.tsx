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
  ReloadOutlined,
  ExportOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { brandService } from '../../../services/brandService';
import { BrandStatsCards } from './components/BrandStatsCards';
import { BrandFormModal } from './components/BrandFormModal';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../../../types';

const { Title, Text, Link } = Typography;

export const AdminBrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandService.getAllAdmin();
      setBrands(data);
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách thương hiệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute statistics
  const stats = useMemo(() => {
    let total = brands.length;
    let active = 0;
    let inactive = 0;
    let totalProducts = 0;

    for (const b of brands) {
      if (b.isActive) active++;
      else inactive++;
      totalProducts += b._count?.products || 0;
    }

    return { total, active, inactive, totalProducts };
  }, [brands]);

  // Filtered list
  const filteredBrands = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesSearch =
        !keyword ||
        brand.name.toLowerCase().includes(keyword) ||
        brand.slug.toLowerCase().includes(keyword) ||
        (brand.description && brand.description.toLowerCase().includes(keyword));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && brand.isActive) ||
        (statusFilter === 'INACTIVE' && !brand.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [brands, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (values: CreateBrandInput | UpdateBrandInput) => {
    setActionLoading(true);
    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, values);
        message.success(`Cập nhật thương hiệu "${values.name}" thành công!`);
      } else {
        await brandService.create(values as CreateBrandInput);
        message.success(`Thêm mới thương hiệu "${values.name}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingBrand(null);
      await loadData();
    } catch (err: any) {
      console.error('Save brand error:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể lưu thương hiệu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    setToggleLoadingId(brand.id);
    try {
      if (brand.isActive) {
        await brandService.deactivate(brand.id);
        message.success(`Đã tạm ẩn thương hiệu "${brand.name}"`);
      } else {
        await brandService.activate(brand.id);
        message.success(`Đã kích hoạt thương hiệu "${brand.name}"`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDelete = async (brand: Brand) => {
    setActionLoading(true);
    try {
      await brandService.delete(brand.id);
      message.success(`Đã xóa thương hiệu "${brand.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      console.error('Delete brand error:', err);
      message.error(err.response?.data?.message || 'Xóa thương hiệu thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      width: 70,
      align: 'center',
      render: (logoUrl: string | undefined, record: Brand) => {
        const url = logoUrl || record.logo;
        if (url) {
          return (
            <Avatar
              shape="square"
              size={42}
              src={url}
              className="border border-slate-200 bg-white object-contain p-1"
            />
          );
        }
        return (
          <Avatar shape="square" size={42} className="bg-blue-100 text-blue-600 font-bold border border-blue-200">
            {record.name.substring(0, 2).toUpperCase()}
          </Avatar>
        );
      },
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Brand) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{name}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Website',
      dataIndex: 'websiteUrl',
      key: 'websiteUrl',
      width: 180,
      render: (url?: string) => {
        if (!url) return <span className="text-slate-300">—</span>;
        return (
          <Link href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs">
            Trang chủ <ExportOutlined />
          </Link>
        );
      },
    },
    {
      title: 'Sản phẩm',
      dataIndex: '_count',
      key: 'productsCount',
      width: 110,
      align: 'center',
      render: (count?: { products: number }) => {
        const num = count?.products || 0;
        return <Tag color={num > 0 ? 'blue' : 'default'}>{num} SP</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive: boolean, record: Brand) => (
        <Switch
          checked={isActive}
          loading={toggleLoadingId === record.id}
          onChange={() => void handleToggleStatus(record)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, record: Brand) => {
        const hasProducts = (record._count?.products || 0) > 0;
        return (
          <Space size="small">
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                type="text"
                icon={<EditOutlined className="text-blue-600" />}
                onClick={() => handleOpenEditModal(record)}
                size="small"
                aria-label="Chỉnh sửa"
              />
            </Tooltip>

            {hasProducts ? (
              <Tooltip title={`Không thể xóa: Có ${record._count?.products} sản phẩm liên kết`}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled size="small" aria-label="Xóa thương hiệu" />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Xóa thương hiệu"
                description={`Bạn có chắc chắn muốn xóa vĩnh viễn "${record.name}"?`}
                onConfirm={() => void handleDelete(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: actionLoading }}
              >
                <Tooltip title="Xóa thương hiệu">
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" aria-label="Xóa thương hiệu" />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            <TagsOutlined className="mr-2 text-blue-600" />
            Quản lý Thương hiệu
          </Title>
          <Text className="text-slate-500 text-sm">
            Quản trị các hãng sản xuất điện thoại thông minh, nhận diện thương hiệu và phân phối
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          className="bg-blue-600 hover:bg-blue-500 font-medium rounded-lg"
        >
          Thêm Thương hiệu
        </Button>
      </div>

      {/* KPI Stats */}
      <BrandStatsCards
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        totalProducts={stats.totalProducts}
        loading={loading}
      />

      {/* Main Table Card */}
      <Card className="rounded-xl border border-slate-200 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm theo tên hoặc slug..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-full sm:w-64"
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-44"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng kinh doanh' },
              ]}
            />
          </div>

          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Ant Design Table */}
        <Table<Brand>
          columns={columns}
          dataSource={filteredBrands}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thương hiệu`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchKeyword || statusFilter !== 'ALL'
                    ? 'Không tìm thấy thương hiệu phù hợp với bộ lọc'
                    : 'Chưa có thương hiệu nào trong hệ thống'
                }
              >
                {!searchKeyword && statusFilter === 'ALL' && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                    Tạo thương hiệu đầu tiên
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Form Modal */}
      <BrandFormModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingBrand(null);
        }}
        onSubmit={handleModalSubmit}
        loading={actionLoading}
        editingBrand={editingBrand}
      />
    </div>
  );
};
