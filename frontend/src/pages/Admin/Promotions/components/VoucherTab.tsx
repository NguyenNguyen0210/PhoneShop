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

const getVoucherScope = (record: Voucher): string => {
  const code = (record.code || '').toUpperCase();
  const desc = (record.description || '').toLowerCase();
  const name = (record.name || '').toLowerCase();

  if (code.includes('APP') || desc.includes('app') || name.includes('app')) {
    return 'Kênh: Mobile App';
  }
  if (code.includes('FLAGSHIP') || desc.includes('flagship') || name.includes('flagship')) {
    return 'Danh mục: Flagship';
  }
  if (code.includes('VIP') || desc.includes('vip') || name.includes('vip')) {
    return 'Khách hàng VIP';
  }
  return 'Toàn sàn';
};

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
      render: (_, record) => {
        const scope = getVoucherScope(record);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#2563eb',
                  fontSize: 14,
                  letterSpacing: '0.02em',
                }}
              >
                {record.code}
              </span>
              <Tooltip title="Sao chép mã voucher">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ fontSize: 13, color: '#94a3b8' }} />}
                  onClick={() => handleCopyCode(record.code)}
                  style={{ width: 22, height: 22, padding: 0 }}
                />
              </Tooltip>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              {record.name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              <span>Phạm vi: {scope}</span>
              {record.minOrderValue ? (
                <span> • Đơn từ {Number(record.minOrderValue).toLocaleString('vi-VN')}₫</span>
              ) : null}
            </div>
            {record.description && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {record.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Mức giảm',
      key: 'discount',
      render: (_, record) => {
        if (record.type === VoucherType.PERCENTAGE) {
          return (
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                }}
              >
                Giảm {record.value}%
              </span>
              {record.maxDiscountAmount && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  Tối đa: {Number(record.maxDiscountAmount).toLocaleString('vi-VN')} ₫
                </div>
              )}
            </div>
          );
        }
        if (record.type === VoucherType.FIXED_AMOUNT) {
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: '#faf5ff',
                color: '#7e22ce',
                border: '1px solid #e9d5ff',
              }}
            >
              Giảm {Number(record.value).toLocaleString('vi-VN')} ₫
            </span>
          );
        }
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            🚚 {Number(record.value) > 0 ? `Hỗ trợ ship ${Number(record.value).toLocaleString('vi-VN')} ₫` : 'Miễn phí ship 100%'}
          </span>
        );
      },
    },
    {
      title: 'Đơn tối thiểu',
      dataIndex: 'minOrderValue',
      key: 'minOrderValue',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
          {val ? `${Number(val).toLocaleString('vi-VN')} ₫` : '0 ₫'}
        </span>
      ),
    },
    {
      title: 'Tiến độ sử dụng',
      key: 'usage',
      width: 180,
      render: (_, record) => {
        const hasLimit = record.usageLimit != null && record.usageLimit > 0;
        if (!hasLimit) {
          return (
            <div style={{ minWidth: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                {(record.usageCount || 0).toLocaleString('vi-VN')} / ∞
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Không giới hạn</div>
            </div>
          );
        }

        const count = record.usageCount || 0;
        const limit = record.usageLimit!;
        const rawPct = (count / limit) * 100;
        const pctFormatted = rawPct % 1 === 0 ? rawPct.toFixed(0) : rawPct.toFixed(1);
        const clampedPct = Math.min(100, Math.max(0, rawPct));

        let barBg = '#3b82f6'; // < 70% blue
        let isNearExhausted = false;
        const isExhausted = count >= limit;

        if (rawPct >= 90) {
          barBg = '#ef4444'; // > 90% red
          isNearExhausted = true;
        } else if (rawPct >= 70) {
          barBg = '#f59e0b'; // 70-90% amber
        }

        return (
          <div style={{ minWidth: 150 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                marginBottom: 5,
              }}
            >
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {count.toLocaleString('vi-VN')} / {limit.toLocaleString('vi-VN')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: isNearExhausted ? '#dc2626' : '#64748b',
                  fontWeight: isNearExhausted ? 600 : 400,
                }}
              >
                {pctFormatted}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 7,
                backgroundColor: '#f1f5f9',
                borderRadius: 9999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${clampedPct}%`,
                  height: '100%',
                  backgroundColor: barBg,
                  borderRadius: 9999,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {isExhausted ? (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                }}
              >
                Hết lượt
              </span>
            ) : isNearExhausted ? (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                }}
              >
                Sắp hết lượt
              </span>
            ) : null}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#334155' }}>
              {start} – {end}
            </span>
            {isExpired ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  width: 'fit-content',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                  }}
                />
                Đã hết hạn
              </span>
            ) : isUpcoming ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  width: 'fit-content',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                  }}
                />
                Sắp diễn ra
              </span>
            ) : !record.isActive ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  width: 'fit-content',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                  }}
                />
                Tạm dừng
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  width: 'fit-content',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                Đang diễn ra
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Kích hoạt',
      key: 'isActive',
      align: 'center',
      render: (_, record) => {
        const isExpired = new Date(record.endAt) < new Date();

        if (isExpired) {
          return (
            <Tooltip title="Voucher đã hết hạn sử dụng (tự động khóa)">
              <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
                <Switch checked={false} disabled size="small" />
              </span>
            </Tooltip>
          );
        }

        return (
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
                size="small"
              />
            </span>
          </Popconfirm>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Tooltip title="Lịch sử dùng mã">
            <Button
              type="text"
              size="small"
              aria-label="Lịch sử"
              icon={<HistoryOutlined style={{ fontSize: 15, color: '#64748b' }} />}
              onClick={() => handleOpenUsageDrawer(record)}
              style={{
                borderRadius: 6,
                width: 30,
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa thông tin mã">
            <Button
              type="text"
              size="small"
              aria-label="Sửa"
              icon={<EditOutlined style={{ fontSize: 15, color: '#2563eb' }} />}
              onClick={() => handleOpenEditModal(record)}
              style={{
                borderRadius: 6,
                width: 30,
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa mã giảm giá?"
            description={`Bạn có chắc muốn xóa vĩnh viễn voucher "${record.code}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa voucher">
              <Button
                type="text"
                danger
                size="small"
                aria-label="Xóa"
                icon={<DeleteOutlined style={{ fontSize: 15 }} />}
                style={{
                  borderRadius: 6,
                  width: 30,
                  height: 30,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Tooltip>
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
          Tạo mã voucher
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
