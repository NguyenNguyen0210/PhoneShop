import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Empty,
  message,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SafetyCertificateOutlined,
  ReloadOutlined,
  MobileOutlined,
  CalendarOutlined,
  BarcodeOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { warrantyService } from '../../../../services/warrantyService';
import type { Warranty } from '../../../../types';
import { ClaimWarrantyModal } from '../../../../components/storefront/warranty/ClaimWarrantyModal';

const { Title, Text } = Typography;

interface UserWarrantyItem extends Warranty {
  productVariant?: {
    color?: string;
    storage?: string;
    product?: {
      name?: string;
    };
  };
  notes?: string;
  productName?: string;
  imei?: string;
}

export const WarrantiesTab: React.FC = () => {
  const [warranties, setWarranties] = useState<UserWarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarranty, setSelectedWarranty] = useState<UserWarrantyItem | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const loadWarranties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await warrantyService.getMyWarranties();
      setWarranties(data as UserWarrantyItem[]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Không thể tải danh sách bảo hành thiết bị';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  const handleOpenClaim = (warranty: UserWarrantyItem) => {
    setSelectedWarranty(warranty);
    setIsClaimModalOpen(true);
  };

  const getStatusTag = (w: UserWarrantyItem) => {
    const isExpired = new Date(w.endDate) < new Date();
    const effectiveStatus = isExpired && w.status === 'ACTIVE' ? 'EXPIRED' : w.status;

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
            Chờ xử lý bảo hành
          </Tag>
        );
      case 'EXPIRED':
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Hết hạn bảo hành
          </Tag>
        );
      case 'VOIDED':
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Bị hủy bảo hành
          </Tag>
        );
      default:
        return <Tag>{w.status}</Tag>;
    }
  };

  const columns: ColumnsType<UserWarrantyItem> = [
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
          (record as any).productName ||
          'Thiết bị di động chính hãng';
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
          (record as any).imei ||
          'N/A';

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
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
      title: 'Thời gian bảo hành',
      key: 'period',
      width: 220,
      render: (_, record) => {
        const startDate = new Date(record.startDate).toLocaleDateString('vi-VN');
        const endDate = new Date(record.endDate).toLocaleDateString('vi-VN');
        const now = new Date();
        const end = new Date(record.endDate);
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);

        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700">
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
      render: (_, record) => getStatusTag(record),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      align: 'right',
      render: (_, record) => {
        const isNotExpired = new Date(record.endDate) > new Date();
        const canClaim = record.status === 'ACTIVE' && isNotExpired;

        if (canClaim) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => handleOpenClaim(record)}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              Yêu cầu bảo hành
            </Button>
          );
        }

        if (record.status === 'CLAIMED') {
          return (
            <Tooltip title={record.notes ? `Lý do: ${record.notes}` : 'Yêu cầu đang chờ kỹ thuật xử lý'}>
              <span className="text-xs text-amber-600 italic">Đang thẩm định</span>
            </Tooltip>
          );
        }

        return <span className="text-xs text-slate-400">—</span>;
      },
    },
  ];

  return (
    <Card className="shadow-xs border-slate-200 rounded-3xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
        <div>
          <Title level={4} className="!mb-0 flex items-center gap-2">
            <SafetyCertificateOutlined className="text-blue-600" />
            <span>Bảo hành của tôi</span>
          </Title>
          <Text type="secondary" className="text-xs sm:text-sm">
            Danh sách thiết bị chính hãng đã kích hoạt bảo hành điện tử của bạn
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadWarranties}
            loading={loading}
            className="rounded-xl text-xs"
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={warranties}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Chưa có thiết bị bảo hành</p>
                  <p className="text-xs text-slate-400">
                    Khi bạn mua máy và hoàn tất nhận hàng, bảo hành điện tử sẽ tự động xuất hiện tại đây.
                  </p>
                </div>
              }
            />
          ),
        }}
        scroll={{ x: 750 }}
      />

      <ClaimWarrantyModal
        visible={isClaimModalOpen}
        open={isClaimModalOpen}
        warranty={selectedWarranty}
        onClose={() => {
          setIsClaimModalOpen(false);
          setSelectedWarranty(null);
        }}
        onSuccess={loadWarranties}
      />
    </Card>
  );
};

export default WarrantiesTab;
