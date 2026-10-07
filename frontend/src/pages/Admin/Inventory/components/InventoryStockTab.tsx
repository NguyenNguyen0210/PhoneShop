import React, { useState, useMemo } from 'react';
import { Table, Input, Button, Space, Tag, Typography, Tooltip, Empty, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  SettingOutlined,
  WarningOutlined,
  HistoryOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { InventoryRecord } from '../../../../types';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { inventoryService } from '../../../../services/inventoryService';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockInboundModal } from './StockInboundModal';
import { ReorderLevelModal } from './ReorderLevelModal';
import { ProductStockLedgerDrawer } from './ProductStockLedgerDrawer';

const { Text } = Typography;

export interface InventoryStockTabProps {
  items?: InventoryRecord[];
  loading?: boolean;
  onRefresh?: () => void;
  filterLowStockOnly?: boolean;
  onToggleLowStockFilter?: () => void;
}

export const InventoryStockTab: React.FC<InventoryStockTabProps> = ({
  items = [],
  loading = false,
  onRefresh = () => {},
  filterLowStockOnly = false,
  onToggleLowStockFilter = () => {},
}) => {
  const { user } = useAuthStore();
  const userRoles = ((user as any)?.roles as any[]) || [];
  const roleNames = userRoles.map((r) => (typeof r === 'string' ? r : r?.role?.name || r?.name));
  const isManagerOrAdmin =
    user?.role === 'MANAGER' ||
    user?.role === 'ADMIN' ||
    roleNames.includes('MANAGER') ||
    roleNames.includes('ADMIN');

  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryRecord | null>(null);
  const [reorderItem, setReorderItem] = useState<InventoryRecord | null>(null);
  const [selectedLedgerVariant, setSelectedLedgerVariant] = useState<InventoryRecord | null>(null);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncMissing = async () => {
    try {
      setSyncing(true);
      const res = await inventoryService.syncMissingInventories();
      message.success(`Đã đồng bộ kho, tạo mới ${res?.created ?? 0} bản ghi còn thiếu`);
      onRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Đồng bộ kho thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.variant.product.name.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.color.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.storage.toLowerCase().includes(search.toLowerCase());

      const matchLowStock =
        !filterLowStockOnly || item.availableQty <= (item.reorderLevel ?? 0);

      return matchSearch && matchLowStock;
    });
  }, [items, search, filterLowStockOnly]);

  const columns: ColumnsType<InventoryRecord> = [
    {
      title: 'Sản phẩm & SKU',
      key: 'product',
      render: (_, record) => (
        <Space direction="horizontal" align="center">
          {record.variant.product.thumbnail ? (
            <img
              src={record.variant.product.thumbnail}
              alt={record.variant.product.name}
              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }}
            />
          ) : (
            <div style={{ width: 44, height: 44, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📱
            </div>
          )}
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {record.variant.product.name}
            </Text>
            <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
              {record.variant.sku}
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phân loại',
      key: 'variant',
      width: 140,
      render: (_, record) => (
        <div>
          <div><Text>{record.variant.color}</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.variant.storage}</Text>
        </div>
      ),
    },
    {
      title: 'Tồn vật lý',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 100,
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Tạm giữ',
      dataIndex: 'reservedQty',
      key: 'reservedQty',
      align: 'right',
      width: 90,
      render: (reserved: number) => (
        <Text style={{ color: reserved > 0 ? '#722ed1' : '#8c8c8c' }}>{reserved}</Text>
      ),
    },
    {
      title: 'Khả dụng',
      dataIndex: 'availableQty',
      key: 'availableQty',
      align: 'right',
      width: 100,
      render: (avail: number, record) => {
        const isLow = avail <= (record.reorderLevel ?? 0);
        return (
          <Text strong style={{ color: isLow ? '#cf1322' : '#389e0d', fontSize: 14 }}>
            {avail}
          </Text>
        );
      },
    },
    {
      title: 'Định mức',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      align: 'right',
      width: 90,
      render: (lvl: number) => <Text type="secondary">{lvl ?? 0}</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, record) => {
        if (record.availableQty === 0) {
          return <Tag color="error">Hết hàng</Tag>;
        }
        if (record.availableQty <= (record.reorderLevel ?? 0)) {
          return (
            <Tag icon={<WarningOutlined />} color="warning">
              Sắp hết hàng
            </Tag>
          );
        }
        return <Tag color="success">Còn hàng</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setAdjustItem(record)}
          >
            Điều chỉnh
          </Button>
          <Tooltip title="Xem thẻ kho">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => setSelectedLedgerVariant(record)}
            />
          </Tooltip>
          {isManagerOrAdmin && (
            <Tooltip title="Thiết lập ngưỡng cảnh báo (Reorder Level)">
              <Button
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setReorderItem(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input
            placeholder="Tìm theo Tên máy, SKU, Màu, Dung lượng..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Button
            danger={filterLowStockOnly}
            type={filterLowStockOnly ? 'primary' : 'default'}
            onClick={onToggleLowStockFilter}
          >
            {filterLowStockOnly ? 'Đang lọc: Sắp hết hàng' : 'Lọc hàng sắp hết'}
          </Button>
        </Space>
        <Space>
          {isManagerOrAdmin && (
            <Tooltip title="Tạo bản ghi kho còn thiếu cho biến thể cũ (màu/cấu hình chưa hiện trong kho)">
              <Button icon={<SyncOutlined />} onClick={handleSyncMissing} loading={syncing}>
                Đồng bộ kho thiếu
              </Button>
            </Tooltip>
          )}
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInboundOpen(true)}>
            Nhập kho (chọn màu + cấu hình)
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredItems}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
        locale={{
          emptyText: (
            <Empty
              description={
                filterLowStockOnly
                  ? 'Tuyệt vời! Không có mặt hàng nào dưới định mức tồn an toàn.'
                  : 'Chưa có dữ liệu tồn kho.'
              }
            />
          ),
        }}
      />

      <StockAdjustmentModal
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSuccess={onRefresh}
      />

      <StockInboundModal
        open={inboundOpen}
        onClose={() => setInboundOpen(false)}
        onSuccess={onRefresh}
      />

      <ReorderLevelModal
        open={!!reorderItem && isManagerOrAdmin}
        item={reorderItem}
        onClose={() => setReorderItem(null)}
        onSuccess={onRefresh}
      />

      <ProductStockLedgerDrawer
        open={!!selectedLedgerVariant}
        item={selectedLedgerVariant}
        onClose={() => setSelectedLedgerVariant(null)}
      />
    </div>
  );
};
