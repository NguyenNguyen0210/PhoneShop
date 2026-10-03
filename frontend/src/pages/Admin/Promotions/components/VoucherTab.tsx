import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Progress,
  Switch,
  Popconfirm,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { promotionService } from '../../../../services/promotionService';
import { VoucherType, type Voucher } from '../../../../types';
import { VoucherFormModal } from './VoucherFormModal';
import { VoucherUsageDrawer } from './VoucherUsageDrawer';

const { Text } = Typography;

export interface VoucherTabProps {
  onDataChanged?: () => void;
}

export const VoucherTab: React.FC<VoucherTabProps> = ({ onDataChanged }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals / Drawers
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [usageDrawerOpen, setUsageDrawerOpen] = useState(false);
  const [selectedVoucherForUsage, setSelectedVoucherForUsage] = useState<Voucher | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await promotionService.getAllVouchers();
      setVouchers(Array.isArray(data) ? data : []);
    } catch {
      message.error('Không thể tải danh sách mã giảm giá');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      message.success(`Đã sao chép mã: ${code}`);
    } catch {
      message.success(`Đã sao chép mã: ${code}`);
    }
  };

  const handleToggleStatus = async (record: Voucher) => {
    setTogglingId(record.id);
    try {
      await promotionService.toggleVoucherStatus(record.id, !record.isActive);
      message.success(
        record.isActive ? `Đã tạm dừng voucher ${record.code}` : `Đã kích hoạt voucher ${record.code}`
      );
      await fetchVouchers();
      onDataChanged?.();
    } catch {
      message.error('Không thể thay đổi trạng thái voucher');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await promotionService.deleteVoucher(id);
      message.success('Đã xóa mã giảm giá thành công');
      await fetchVouchers();
      onDataChanged?.();
    } catch {
      message.error('Không thể xóa mã giảm giá');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingVoucher(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setFormModalOpen(true);
  };

  const handleOpenUsageDrawer = (voucher: Voucher) => {
    setSelectedVoucherForUsage(voucher);
    setUsageDrawerOpen(true);
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Text search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const codeMatch = v.code.toLowerCase().includes(q);
        const nameMatch = v.name.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && v.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const now = new Date();
        const isExpired = new Date(v.endAt) < now;
        const isScheduled = new Date(v.startAt) > now;

        if (statusFilter === 'ACTIVE') {
          if (!v.isActive || isExpired || isScheduled) return false;
        } else if (statusFilter === 'INACTIVE') {
          if (v.isActive) return false;
        } else if (statusFilter === 'EXPIRED') {
          if (!isExpired) return false;
        } else if (statusFilter === 'SCHEDULED') {
          if (!isScheduled) return false;
        }
      }

      return true;
    });
  }, [vouchers, debouncedSearch, typeFilter, statusFilter]);

  const columns: ColumnsType<Voucher> = [
    {
      title: 'Mã & Tên voucher',
      key: 'code',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Space>
            <Text strong copyable={false} style={{ color: '#2563eb', fontSize: 15 }}>
              {record.code}
            </Text>
            <Tooltip title="Sao chép mã">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined style={{ fontSize: 13 }} />}
                onClick={() => handleCopyCode(record.code)}
              />
            </Tooltip>
          </Space>
          <Text style={{ fontSize: 13 }}>{record.name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Mức giảm',
      key: 'discount',
      render: (_, record) => {
        if (record.type === VoucherType.PERCENTAGE) {
          return (
            <div>
              <Tag color="green" style={{ fontSize: 13, padding: '2px 8px' }}>
                Giảm {record.value}%
              </Tag>
              {record.maxDiscountAmount && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Tối đa: {record.maxDiscountAmount.toLocaleString('vi-VN')} ₫
                </div>
              )}
            </div>
          );
        }
        if (record.type === VoucherType.FIXED_AMOUNT) {
          return (
            <Tag color="purple" style={{ fontSize: 13, padding: '2px 8px' }}>
              Giảm {Number(record.value).toLocaleString('vi-VN')} ₫
            </Tag>
          );
        }
        return (
          <Tag color="orange" style={{ fontSize: 13, padding: '2px 8px' }}>
            {record.value > 0
              ? `Hỗ trợ ship ${Number(record.value).toLocaleString('vi-VN')} ₫`
              : 'Miễn phí ship 100%'}
          </Tag>
        );
      },
    },
    {
      title: 'Đơn tối thiểu',
      dataIndex: 'minOrderValue',
      key: 'minOrderValue',
      render: (val) =>
        val ? (
          <Text>{Number(val).toLocaleString('vi-VN')} ₫</Text>
        ) : (
          <Text type="secondary">0 ₫</Text>
        ),
    },
    {
      title: 'Tiến độ sử dụng',
      key: 'usage',
      width: 170,
      render: (_, record) => {
        const hasLimit = record.usageLimit != null && record.usageLimit > 0;
        const percent = hasLimit
          ? Math.min(100, Math.round(((record.usageCount || 0) / record.usageLimit!) * 100))
          : 0;

        return (
          <div style={{ minWidth: 130 }}>
            {hasLimit ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{record.usageCount || 0}</span>
                  <span style={{ color: '#64748b' }}>/ {record.usageLimit}</span>
                </div>
                <Progress
                  percent={percent}
                  size="small"
                  status={percent >= 100 ? 'exception' : 'active'}
                  showInfo={false}
                />
              </>
            ) : (
              <Text>{record.usageCount || 0} / ∞</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thời gian hiệu lực',
      key: 'validity',
      render: (_, record) => {
        const start = new Date(record.startAt).toLocaleDateString('vi-VN');
        const end = new Date(record.endAt).toLocaleDateString('vi-VN');
        const now = new Date();
        const isExpired = new Date(record.endAt) < now;
        const isUpcoming = new Date(record.startAt) > now;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 12 }}>{start} - {end}</Text>
            {isExpired ? (
              <Tag color="default">Đã hết hạn</Tag>
            ) : isUpcoming ? (
              <Tag color="blue">Sắp diễn ra</Tag>
            ) : (
              <Tag color="success">Đang hiệu lực</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Kích hoạt',
      key: 'isActive',
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title={record.isActive ? 'Tạm dừng mã giảm giá?' : 'Kích hoạt mã giảm giá?'}
          description={`Bạn có chắc muốn ${record.isActive ? 'tạm dừng' : 'kích hoạt'} voucher "${record.code}"?`}
          onConfirm={() => handleToggleStatus(record)}
          okText="Đồng ý"
          cancelText="Hủy"
        >
          <span style={{ display: 'inline-block' }}>
            <Switch
              checked={record.isActive}
              loading={togglingId === record.id}
            />
          </span>
        </Popconfirm>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem lịch sử sử dụng">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleOpenUsageDrawer(record)}
            >
              Lịch sử
            </Button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa voucher">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            >
              Sửa
            </Button>
          </Tooltip>
          <Popconfirm
            title="Xóa mã giảm giá?"
            description={`Bạn có chắc muốn xóa vĩnh viễn voucher "${record.code}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo mã hoặc tên voucher..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả loại voucher' },
              { value: VoucherType.PERCENTAGE, label: 'Phần trăm (%)' },
              { value: VoucherType.FIXED_AMOUNT, label: 'Số tiền cố định' },
              { value: VoucherType.FREE_SHIPPING, label: 'Freeship' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'SCHEDULED', label: 'Sắp diễn ra' },
              { value: 'EXPIRED', label: 'Đã hết hạn' },
              { value: 'INACTIVE', label: 'Đã tạm dừng' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchVouchers} loading={loading}>
            Làm mới
          </Button>
        </Space>

        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          + Tạo mã giảm giá mới
        </Button>
      </div>

      {/* Table */}
      <Table
        dataSource={filteredVouchers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* Modal create/edit */}
      <VoucherFormModal
        open={formModalOpen}
        voucher={editingVoucher}
        onClose={() => {
          setFormModalOpen(false);
          setEditingVoucher(null);
        }}
        onSuccess={() => {
          fetchVouchers();
          onDataChanged?.();
        }}
      />

      {/* Drawer usage history */}
      <VoucherUsageDrawer
        open={usageDrawerOpen}
        voucher={selectedVoucherForUsage}
        onClose={() => {
          setUsageDrawerOpen(false);
          setSelectedVoucherForUsage(null);
        }}
      />
    </div>
  );
};
