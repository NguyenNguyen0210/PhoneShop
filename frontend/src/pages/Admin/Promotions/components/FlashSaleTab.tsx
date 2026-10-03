import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Select,
  Tag,
  Space,
  Progress,
  Popconfirm,
  Tooltip,
  Typography,
  Modal,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { flashSaleService } from '../../../../services/flashSaleService';
import type { FlashSaleCampaign, FlashSaleItem } from '../../../../types';
import { FlashSaleFormModal } from './FlashSaleFormModal';

const { Text } = Typography;

export interface FlashSaleTabProps {
  onDataChanged?: () => void;
}

export const FlashSaleTab: React.FC<FlashSaleTabProps> = ({ onDataChanged }) => {
  const [campaigns, setCampaigns] = useState<FlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] =
    useState<FlashSaleCampaign | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await flashSaleService.getAdminCampaigns(
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      message.error('Không thể tải danh sách Flash Sale');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleEndEarly = async (id: string) => {
    try {
      await flashSaleService.endEarly(id);
      message.success('Đã kết thúc chiến dịch Flash Sale sớm!');
      await fetchCampaigns();
      onDataChanged?.();
    } catch {
      message.error('Không thể kết thúc chiến dịch Flash Sale');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await flashSaleService.deleteCampaign(id);
      message.success('Đã xóa chiến dịch Flash Sale thành công!');
      await fetchCampaigns();
      onDataChanged?.();
    } catch {
      message.error('Không thể xóa chiến dịch Flash Sale');
    }
  };

  const handleOpenDetail = (campaign: FlashSaleCampaign) => {
    setSelectedCampaignForDetail(campaign);
    setDetailModalOpen(true);
  };

  const getCampaignStatus = (campaign: FlashSaleCampaign): 'ACTIVE' | 'UPCOMING' | 'ENDED' => {
    const now = new Date();
    const start = new Date(campaign.startAt);
    const end = new Date(campaign.endAt);

    if (!campaign.isActive || now > end) return 'ENDED';
    if (now < start) return 'UPCOMING';
    return 'ACTIVE';
  };

  const renderStatusTag = (campaign: FlashSaleCampaign) => {
    const status = getCampaignStatus(campaign);
    if (status === 'ACTIVE') {
      return (
        <Tag color="green" icon={<ThunderboltOutlined />}>
          Đang diễn ra
        </Tag>
      );
    }
    if (status === 'UPCOMING') {
      return <Tag color="orange">Sắp diễn ra</Tag>;
    }
    return <Tag color="default">Đã kết thúc</Tag>;
  };

  const columns: ColumnsType<FlashSaleCampaign> = [
    {
      title: 'Tên chiến dịch',
      key: 'name',
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {record.name}
          </Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Khung giờ',
      key: 'timeRange',
      render: (_, record) => {
        const start = new Date(record.startAt).toLocaleString('vi-VN');
        const end = new Date(record.endAt).toLocaleString('vi-VN');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 13 }}>{start}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              đến {end}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, record) => renderStatusTag(record),
    },
    {
      title: 'Số mặt hàng',
      key: 'itemCount',
      align: 'center',
      render: (_, record) => {
        const count = record.items?.length || record._count?.items || 0;
        return (
          <Tag color="blue" style={{ fontSize: 13 }}>
            {count} sản phẩm
          </Tag>
        );
      },
    },
    {
      title: 'Tiến độ bán hàng',
      key: 'soldProgress',
      width: 170,
      render: (_, record) => {
        const items = record.items || [];
        const totalSold = items.reduce((acc, it) => acc + (it.soldCount || 0), 0);
        const totalStock = items.reduce((acc, it) => acc + (it.stockLimit || 0), 0);
        const percent = totalStock > 0 ? Math.min(100, Math.round((totalSold / totalStock) * 100)) : 0;

        return (
          <div style={{ minWidth: 130 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Đã bán: {totalSold}</span>
              <span style={{ color: '#64748b' }}>/ {totalStock}</span>
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor="#dc2626"
              status={percent >= 100 ? 'success' : 'active'}
              showInfo={false}
            />
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const status = getCampaignStatus(record);
        const canEndEarly = status === 'ACTIVE' || status === 'UPCOMING';

        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết các mặt hàng sale">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleOpenDetail(record)}
              >
                Chi tiết
              </Button>
            </Tooltip>

            {canEndEarly && (
              <Popconfirm
                title="Kết thúc chiến dịch sớm?"
                description={`Bạn có chắc muốn kết thúc sớm chiến dịch "${record.name}"?`}
                onConfirm={() => handleEndEarly(record.id)}
                okText="Kết thúc"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Kết thúc sự kiện ngay lập tức">
                  <Button type="text" danger icon={<StopOutlined />}>
                    Kết thúc
                  </Button>
                </Tooltip>
              </Popconfirm>
            )}

            <Popconfirm
              title="Xóa chiến dịch Flash Sale?"
              description={`Bạn có chắc muốn xóa vĩnh viễn chiến dịch "${record.name}"?`}
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
        );
      },
    },
  ];

  // Columns for detail modal table
  const detailItemColumns: ColumnsType<FlashSaleItem> = [
    {
      title: 'Sản phẩm & Biến thể',
      key: 'variant',
      render: (_, item) => {
        const prodName = item.variant?.product?.name || item.variant?.name || 'Sản phẩm';
        const variantDetails = [item.variant?.color, item.variant?.storage].filter(Boolean).join(' - ');
        return (
          <div>
            <Text strong>{prodName}</Text>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {variantDetails} (SKU: {item.variant?.sku || 'N/A'})
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá gốc',
      key: 'origPrice',
      render: (_, item) => {
        const origPrice = item.variant?.price || 0;
        return <Text delete>{Number(origPrice).toLocaleString('vi-VN')} ₫</Text>;
      },
    },
    {
      title: 'Giá Flash Sale',
      key: 'flashPrice',
      render: (_, item) => {
        const origPrice = item.variant?.price || 0;
        const discountPercent =
          origPrice > item.flashPrice
            ? Math.round(((origPrice - item.flashPrice) / origPrice) * 100)
            : 0;

        return (
          <Space>
            <Text strong style={{ color: '#dc2626' }}>
              {Number(item.flashPrice).toLocaleString('vi-VN')} ₫
            </Text>
            {discountPercent > 0 && <Tag color="red">-{discountPercent}%</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Đã bán / Suất mở bán',
      key: 'progress',
      render: (_, item) => {
        const percent =
          item.stockLimit > 0
            ? Math.min(100, Math.round(((item.soldCount || 0) / item.stockLimit) * 100))
            : 0;

        return (
          <div style={{ minWidth: 120 }}>
            <div style={{ fontSize: 12, marginBottom: 2 }}>
              <Text strong>{item.soldCount || 0}</Text> / {item.stockLimit}
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor="#dc2626"
              status={percent >= 100 ? 'success' : 'active'}
            />
          </div>
        );
      },
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
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang diễn ra' },
              { value: 'UPCOMING', label: 'Sắp diễn ra' },
              { value: 'ENDED', label: 'Đã kết thúc' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchCampaigns} loading={loading}>
            Làm mới
          </Button>
        </Space>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
          style={{ background: '#e11d48', borderColor: '#e11d48' }}
        >
          + Tạo chiến dịch Flash Sale
        </Button>
      </div>

      {/* Campaigns Table */}
      <Table
        dataSource={campaigns}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* Create Modal */}
      <FlashSaleFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchCampaigns();
          onDataChanged?.();
        }}
      />

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#e11d48' }} />
            <span>Chi tiết chiến dịch: {selectedCampaignForDetail?.name}</span>
            {selectedCampaignForDetail && renderStatusTag(selectedCampaignForDetail)}
          </Space>
        }
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedCampaignForDetail(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalOpen(false);
              setSelectedCampaignForDetail(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={750}
        destroyOnHidden
      >
        {selectedCampaignForDetail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Thời gian:{' '}
                {new Date(selectedCampaignForDetail.startAt).toLocaleString('vi-VN')} -{' '}
                {new Date(selectedCampaignForDetail.endAt).toLocaleString('vi-VN')}
              </Text>
              {selectedCampaignForDetail.description && (
                <div style={{ marginTop: 4 }}>
                  <Text>{selectedCampaignForDetail.description}</Text>
                </div>
              )}
            </div>

            <Table
              dataSource={selectedCampaignForDetail.items || []}
              columns={detailItemColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Không có sản phẩm nào trong chiến dịch này' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
