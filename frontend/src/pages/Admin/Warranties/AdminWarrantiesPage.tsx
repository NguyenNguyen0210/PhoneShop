import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Segmented,
  Tag,
  Typography,
  Space,
  Modal,
  Descriptions,
  Popconfirm,
  Tooltip,
  Alert,
  message,
  Empty,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  StopOutlined,
  MobileOutlined,
  UserOutlined,
  CalendarOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { warrantyService } from '../../../services/warrantyService';

const { Title, Text } = Typography;

export interface AdminWarrantyItem {
  id: string;
  warrantyCode: string;
  userId?: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  imeiDeviceId?: string;
  imeiDevice?: {
    id?: string;
    imei?: string;
    serialNumber?: string;
    imeiNumber?: string;
  };
  productVariant?: {
    id?: string;
    color?: string;
    storage?: string;
    product?: {
      id?: string;
      name?: string;
      warrantyMonths?: number;
    };
  };
  deviceInfo?: {
    productName?: string;
    color?: string;
    storage?: string;
    imeiNumber?: string;
  };
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOIDED';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type StatusFilterType = 'ALL' | 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'VOIDED';

export const AdminWarrantiesPage: React.FC = () => {
  const [warranties, setWarranties] = useState<AdminWarrantyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detail Modal / Drawer state
  const [selectedWarranty, setSelectedWarranty] = useState<AdminWarrantyItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const fetchWarranties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await warrantyService.getAllWarrantiesAdmin();
      setWarranties(data as AdminWarrantyItem[]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Không thể tải danh sách bảo hành hệ thống';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  const handleVoidWarranty = async (id: string) => {
    try {
      setVoidingId(id);
      await warrantyService.voidWarrantyAdmin(id);
      message.success('Đã hủy bảo hành thiết bị thành công!');
      if (selectedWarranty?.id === id) {
        setSelectedWarranty((prev) => (prev ? { ...prev, status: 'VOIDED' } : null));
      }
      await fetchWarranties();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Hủy bảo hành thất bại. Vui lòng thử lại!';
      message.error(errMsg);
    } finally {
      setVoidingId(null);
    }
  };

  const getStatusTag = (status: string, endDateStr: string) => {
    const isExpired = new Date(endDateStr) < new Date();
    const effectiveStatus = isExpired && status === 'ACTIVE' ? 'EXPIRED' : status;

    switch (effectiveStatus) {
      case 'ACTIVE':
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Đang bảo hành
          </Tag>
        );
      case 'CLAIMED':
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />}>
            Chờ xử lý (Claimed)
          </Tag>
        );
      case 'EXPIRED':
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Đã hết hạn
          </Tag>
        );
      case 'VOIDED':
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Đã hủy (Voided)
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Filtered warranties list
  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const isExpired = new Date(w.endDate) < new Date();
      const effectiveStatus = isExpired && w.status === 'ACTIVE' ? 'EXPIRED' : w.status;

      // Status filter
      if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (w.warrantyCode || '').toLowerCase();
        const imei = (
          w.imeiDevice?.imei ||
          w.imeiDevice?.imeiNumber ||
          w.deviceInfo?.imeiNumber ||
          ''
        ).toLowerCase();
        const prodName = (
          w.deviceInfo?.productName ||
          w.productVariant?.product?.name ||
          ''
        ).toLowerCase();
        const customerName = (
          w.user?.fullName ||
          [w.user?.lastName, w.user?.firstName].filter(Boolean).join(' ') ||
          w.user?.email ||
          ''
        ).toLowerCase();
        const customerPhone = (w.user?.phone || '').toLowerCase();

        return (
          code.includes(q) ||
          imei.includes(q) ||
          prodName.includes(q) ||
          customerName.includes(q) ||
          customerPhone.includes(q)
        );
      }

      return true;
    });
  }, [warranties, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let active = 0;
    let claimed = 0;
    let expired = 0;
    let voided = 0;
    const now = new Date();

    warranties.forEach((w) => {
      const isExpired = new Date(w.endDate) < now;
      const effectiveStatus = isExpired && w.status === 'ACTIVE' ? 'EXPIRED' : w.status;

      if (effectiveStatus === 'ACTIVE') active++;
      else if (effectiveStatus === 'CLAIMED') claimed++;
      else if (effectiveStatus === 'EXPIRED') expired++;
      else if (effectiveStatus === 'VOIDED') voided++;
    });

    return { total: warranties.length, active, claimed, expired, voided };
  }, [warranties]);

  const columns: ColumnsType<AdminWarrantyItem> = [
    {
      title: 'Mã bảo hành',
      dataIndex: 'warrantyCode',
      key: 'warrantyCode',
      width: 150,
      render: (code: string) => (
        <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">{code}</span>
      ),
    },
    {
      title: 'Thiết bị & IMEI',
      key: 'device',
      render: (_, record) => {
        const productName =
          record.deviceInfo?.productName ||
          record.productVariant?.product?.name ||
          'Thiết bị di động';
        const variant =
          record.productVariant
            ? [record.productVariant.color, record.productVariant.storage].filter(Boolean).join(' - ')
            : record.deviceInfo?.color
            ? [record.deviceInfo.color, record.deviceInfo.storage].filter(Boolean).join(' - ')
            : '';
        const imei =
          record.imeiDevice?.imei ||
          record.imeiDevice?.imeiNumber ||
          record.deviceInfo?.imeiNumber ||
          'Chưa gán IMEI';

        return (
          <div className="space-y-0.5">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <MobileOutlined className="text-blue-600" />
              <span>{productName}</span>
            </div>
            {variant && <div className="text-xs text-slate-500">{variant}</div>}
            <div className="flex items-center gap-1 text-xs text-slate-600 font-mono">
              <BarcodeOutlined className="text-slate-400" />
              <span>IMEI: {imei}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_, record) => {
        const customerName =
          record.user?.fullName ||
          [record.user?.lastName, record.user?.firstName].filter(Boolean).join(' ') ||
          'Khách mua lẻ';
        const phone = record.user?.phone;
        const email = record.user?.email;

        return (
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <UserOutlined className="text-slate-400" />
              <span>{customerName}</span>
            </div>
            {phone && <div className="text-slate-600 font-mono">{phone}</div>}
            {email && <div className="text-slate-400 truncate max-w-[180px]">{email}</div>}
          </div>
        );
      },
    },
    {
      title: 'Thời gian bảo hành',
      key: 'period',
      width: 200,
      render: (_, record) => {
        const startDate = new Date(record.startDate).toLocaleDateString('vi-VN');
        const endDate = new Date(record.endDate).toLocaleDateString('vi-VN');
        const now = new Date();
        const end = new Date(record.endDate);
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);

        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1 text-slate-700">
              <CalendarOutlined className="text-slate-400" />
              <span>{startDate} – {endDate}</span>
            </div>
            {daysLeft > 0 && record.status === 'ACTIVE' && (
              <span className="text-emerald-600 font-semibold text-[11px]">
                Còn lại {daysLeft} ngày
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 170,
      render: (_, record) => getStatusTag(record.status, record.endDate),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      align: 'right',
      render: (_, record) => {
        const canVoid = record.status === 'ACTIVE' || record.status === 'CLAIMED';

        return (
          <Space size="small">
            <Tooltip title="Xem thông tin chi tiết">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedWarranty(record);
                  setIsDetailModalOpen(true);
                }}
              />
            </Tooltip>

            {canVoid && (
              <Popconfirm
                title="Hủy bảo hành (Void)?"
                description={
                  <div className="max-w-xs text-xs space-y-1">
                    <p className="font-semibold text-rose-600">
                      Hành động này sẽ vô hiệu hóa bảo hành vĩnh viễn!
                    </p>
                    <p className="text-slate-500">
                      Chỉ áp dụng khi máy vi phạm điều khoản bảo hành (rơi vỡ, vô nước, can thiệp phần cứng trái phép).
                    </p>
                  </div>
                }
                onConfirm={() => handleVoidWarranty(record.id)}
                okText="Xác nhận hủy"
                cancelText="Đóng"
                okButtonProps={{ danger: true, loading: voidingId === record.id }}
              >
                <Tooltip title="Hủy bảo hành do vi phạm điều khoản">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    loading={voidingId === record.id}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <SafetyCertificateOutlined className="text-blue-600" />
            <span>Quản lý Bảo hành Thiết bị</span>
          </Title>
          <Text type="secondary" className="text-xs sm:text-sm">
            Theo dõi vòng đời bảo hành, thẩm định yêu cầu bảo hành từ khách và quản lý hiệu lực thiết bị
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchWarranties}
            loading={loading}
            className="rounded-xl text-xs"
          >
            Tải lại dữ liệu
          </Button>
        </Space>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="shadow-2xs rounded-2xl border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Tổng phiếu</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </Card>
        <Card className="shadow-2xs rounded-2xl border-emerald-100 bg-emerald-50/40">
          <div className="text-xs text-emerald-700 font-medium">Đang bảo hành</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{stats.active}</div>
        </Card>
        <Card className="shadow-2xs rounded-2xl border-amber-200 bg-amber-50/40">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <span>Chờ xử lý</span>
            {stats.claimed > 0 && <Badge count={stats.claimed} />}
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 mt-1">{stats.claimed}</div>
        </Card>
        <Card className="shadow-2xs rounded-2xl border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Đã hết hạn</div>
          <div className="text-xl sm:text-2xl font-black text-slate-600 mt-1">{stats.expired}</div>
        </Card>
        <Card className="shadow-2xs rounded-2xl border-rose-100 bg-rose-50/30">
          <div className="text-xs text-rose-700 font-medium">Bị hủy (Void)</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{stats.voided}</div>
        </Card>
      </div>

      {/* Filters & Table Card */}
      <Card className="shadow-xs rounded-3xl border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          {/* Segmented Filter */}
          <div className="overflow-x-auto">
            <Segmented<StatusFilterType>
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: `Tất cả (${stats.total})`, value: 'ALL' },
                { label: `Đang bảo hành (${stats.active})`, value: 'ACTIVE' },
                { label: `Chờ xử lý (${stats.claimed})`, value: 'CLAIMED' },
                { label: `Hết hạn (${stats.expired})`, value: 'EXPIRED' },
                { label: `Đã hủy (${stats.voided})`, value: 'VOIDED' },
              ]}
              className="p-1 bg-slate-100 rounded-xl"
            />
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <Input
              placeholder="Tìm theo IMEI, mã bảo hành, tên KH, SĐT..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-xl"
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredWarranties}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} trong số ${total} phiếu`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không tìm thấy phiếu bảo hành phù hợp"
              />
            ),
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Warranty Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-blue-600 text-lg" />
            <span className="font-bold">Chi tiết Phiếu bảo hành</span>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedWarranty(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedWarranty(null);
            }}
          >
            Đóng
          </Button>,
          selectedWarranty &&
            (selectedWarranty.status === 'ACTIVE' || selectedWarranty.status === 'CLAIMED') && (
              <Popconfirm
                key="void"
                title="Hủy bảo hành thiết bị này?"
                description="Bạn có chắc chắn muốn thu hồi bảo hành cho thiết bị này vĩnh viễn?"
                onConfirm={() => selectedWarranty && handleVoidWarranty(selectedWarranty.id)}
                okText="Xác nhận hủy"
                cancelText="Hủy bỏ"
                okButtonProps={{ danger: true, loading: voidingId === selectedWarranty.id }}
              >
                <Button danger icon={<StopOutlined />} loading={voidingId === selectedWarranty.id}>
                  Hủy bảo hành (Void)
                </Button>
              </Popconfirm>
            ),
        ]}
        width={700}
      >
        {selectedWarranty && (
          <div className="py-2 space-y-4">
            {/* Status & Alerts */}
            {selectedWarranty.status === 'CLAIMED' && (
              <Alert
                type="warning"
                showIcon
                icon={<ClockCircleOutlined />}
                message="Khách hàng đang yêu cầu bảo hành"
                description={
                  <div className="text-xs space-y-1 mt-1">
                    <p className="font-semibold text-slate-800">
                      Lý do / Mô tả lỗi: {selectedWarranty.notes || 'Khách không để lại mô tả cụ thể'}
                    </p>
                    <p className="text-slate-500">
                      Vui lòng liên hệ khách hàng theo số điện thoại bên dưới để hướng dẫn gửi máy về trung tâm.
                    </p>
                  </div>
                }
                className="rounded-2xl"
              />
            )}

            {selectedWarranty.status === 'VOIDED' && (
              <Alert
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
                message="Phiếu bảo hành đã bị hủy"
                description="Thiết bị này đã bị tước quyền bảo hành do vi phạm chính sách bảo hành của PhoneShop."
                className="rounded-2xl"
              />
            )}

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              className="rounded-xl overflow-hidden"
            >
              <Descriptions.Item label="Mã bảo hành">
                <span className="font-mono font-bold text-blue-600">
                  {selectedWarranty.warrantyCode}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái">
                {getStatusTag(selectedWarranty.status, selectedWarranty.endDate)}
              </Descriptions.Item>

              <Descriptions.Item label="Tên thiết bị">
                <span className="font-semibold text-slate-800">
                  {selectedWarranty.deviceInfo?.productName ||
                    selectedWarranty.productVariant?.product?.name ||
                    'Thiết bị di động'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Biến thể">
                {selectedWarranty.productVariant
                  ? [
                      selectedWarranty.productVariant.color,
                      selectedWarranty.productVariant.storage,
                    ]
                      .filter(Boolean)
                      .join(' - ')
                  : selectedWarranty.deviceInfo?.color
                  ? [
                      selectedWarranty.deviceInfo.color,
                      selectedWarranty.deviceInfo.storage,
                    ]
                      .filter(Boolean)
                      .join(' - ')
                  : 'Tiêu chuẩn'}
              </Descriptions.Item>

              <Descriptions.Item label="Số IMEI">
                <span className="font-mono font-bold text-slate-900">
                  {selectedWarranty.imeiDevice?.imei ||
                    selectedWarranty.imeiDevice?.imeiNumber ||
                    selectedWarranty.deviceInfo?.imeiNumber ||
                    'Chưa gán IMEI'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Số Sê-ri (Serial)">
                <span className="font-mono text-slate-700">
                  {selectedWarranty.imeiDevice?.serialNumber || 'N/A'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Khách hàng">
                <span className="font-semibold text-slate-800">
                  {selectedWarranty.user?.fullName ||
                    [selectedWarranty.user?.lastName, selectedWarranty.user?.firstName]
                      .filter(Boolean)
                      .join(' ') ||
                    'Khách mua lẻ'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Số điện thoại">
                <span className="font-mono text-slate-800">
                  {selectedWarranty.user?.phone || 'Chưa cập nhật'}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Email liên hệ">
                {selectedWarranty.user?.email || 'Chưa cập nhật'}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày bắt đầu">
                {new Date(selectedWarranty.startDate).toLocaleDateString('vi-VN')}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày hết hạn">
                {new Date(selectedWarranty.endDate).toLocaleDateString('vi-VN')}
              </Descriptions.Item>

              <Descriptions.Item label="Thời gian còn lại">
                {(() => {
                  const end = new Date(selectedWarranty.endDate);
                  const daysLeft = Math.ceil((end.getTime() - new Date().getTime()) / 86400000);
                  return daysLeft > 0 ? (
                    <span className="text-emerald-600 font-bold">{daysLeft} ngày</span>
                  ) : (
                    <span className="text-slate-400">Đã hết hạn</span>
                  );
                })()}
              </Descriptions.Item>

              {selectedWarranty.notes && (
                <Descriptions.Item label="Ghi chú / Yêu cầu" span={2}>
                  <p className="text-slate-700 text-xs italic">{selectedWarranty.notes}</p>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminWarrantiesPage;
