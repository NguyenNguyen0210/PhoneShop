import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  message,
  Typography,
  Card,
  Popconfirm,
  Tooltip,
  Empty,
  Row,
  Col,
  Statistic,
  Skeleton,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { supplierService } from '../../../services/supplierService';
import { SupplierFormModal } from './components/SupplierFormModal';
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../../types/supplier';

const { Title, Text } = Typography;

export const AdminSuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute KPI stats
  const stats = useMemo(() => {
    let total = suppliers.length;
    let active = 0;
    let inactive = 0;

    for (const s of suppliers) {
      if (s.isActive) {
        active++;
      } else {
        inactive++;
      }
    }

    return { total, active, inactive };
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch =
        !keyword ||
        (supplier.name && supplier.name.toLowerCase().includes(keyword)) ||
        (supplier.contactName && supplier.contactName.toLowerCase().includes(keyword)) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(keyword)) ||
        (supplier.email && supplier.email.toLowerCase().includes(keyword)) ||
        (supplier.taxCode && supplier.taxCode.toLowerCase().includes(keyword));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && supplier.isActive) ||
        (statusFilter === 'INACTIVE' && !supplier.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (values: CreateSupplierDto | UpdateSupplierDto) => {
    setActionLoading(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, values);
        message.success(`Cập nhật nhà cung cấp "${values.name}" thành công!`);
      } else {
        await supplierService.createSupplier(values as CreateSupplierDto);
        message.success(`Thêm mới nhà cung cấp "${values.name}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      await loadData();
    } catch (err: any) {
      console.error('Save supplier error:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể lưu nhà cung cấp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await supplierService.deleteSupplier(id);
      message.success('Đã xóa nhà cung cấp thành công!');
      await loadData();
    } catch (err: any) {
      console.error('Delete supplier error:', err);
      message.error(err.response?.data?.message || err.message || 'Xóa nhà cung cấp thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<Supplier> = [
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Supplier) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm">{name}</div>
          {record.taxCode && (
            <div className="mt-1">
              <Tag color="blue" className="text-xs font-mono">
                MST: {record.taxCode}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Người liên hệ',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 180,
      render: (contactName?: string | null) => (
        <span className={contactName ? 'text-slate-800' : 'text-slate-400'}>
          {contactName || '—'}
        </span>
      ),
    },
    {
      title: 'Thông tin liên hệ',
      key: 'contactInfo',
      width: 220,
      render: (_, record: Supplier) => {
        if (!record.phone && !record.email) {
          return <span className="text-slate-400">—</span>;
        }
        return (
          <div className="space-y-1 text-xs">
            {record.phone && (
              <div className="flex items-center gap-1.5 text-slate-700">
                <PhoneOutlined className="text-slate-400" />
                <span>{record.phone}</span>
              </div>
            )}
            {record.email && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <MailOutlined className="text-slate-400" />
                <span>{record.email}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address?: string | null) => (
        <span className={address ? 'text-slate-700 text-sm' : 'text-slate-400'}>
          {address || '—'}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 140,
      align: 'center',
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="green">Đang hoạt động</Tag>
        ) : (
          <Tag color="default">Ngừng hoạt động</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_, record: Supplier) => (
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

          <Popconfirm
            title="Xóa nhà cung cấp"
            description={`Bạn có chắc chắn muốn xóa "${record.name}"?`}
            onConfirm={() => void handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: actionLoading }}
          >
            <Tooltip title="Xóa nhà cung cấp">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                aria-label="Xóa nhà cung cấp"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            <ShopOutlined className="mr-2 text-blue-600" />
            Quản lý Nhà cung cấp
          </Title>
          <Text className="text-slate-500 text-sm">
            Quản trị danh sách đối tác cung ứng thiết bị, thông tin liên hệ và thuế
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          className="bg-blue-600 hover:bg-blue-500 font-medium rounded-lg"
        >
          + Thêm nhà cung cấp mới
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Tổng nhà cung cấp</span>}
                value={stats.total}
                prefix={<ShopOutlined className="text-blue-600 bg-blue-50 p-2 rounded-lg text-lg mr-2" />}
                styles={{ content: { fontWeight: 700, color: '#0f172a' } }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Đang hoạt động</span>}
                value={stats.active}
                prefix={<CheckCircleOutlined className="text-emerald-600 bg-emerald-50 p-2 rounded-lg text-lg mr-2" />}
                styles={{ content: { fontWeight: 700, color: '#10b981' } }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Ngừng hoạt động</span>}
                value={stats.inactive}
                prefix={<StopOutlined className="text-amber-600 bg-amber-50 p-2 rounded-lg text-lg mr-2" />}
                styles={{ content: { fontWeight: 700, color: '#f59e0b' } }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card className="rounded-xl border border-slate-200 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm theo tên, người liên hệ, SĐT, email, mã số thuế..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-full sm:w-80"
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-44"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng hoạt động' },
              ]}
            />
          </div>

          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Ant Design Table */}
        <Table<Supplier>
          columns={columns}
          dataSource={filteredSuppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhà cung cấp`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchKeyword || statusFilter !== 'ALL'
                    ? 'Không tìm thấy nhà cung cấp phù hợp với bộ lọc'
                    : 'Chưa có nhà cung cấp nào trong hệ thống'
                }
              >
                {!searchKeyword && statusFilter === 'ALL' && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                    Tạo nhà cung cấp đầu tiên
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Form Modal */}
      <SupplierFormModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        onSubmit={handleModalSubmit}
        loading={actionLoading}
        editingSupplier={editingSupplier}
      />
    </div>
  );
};
