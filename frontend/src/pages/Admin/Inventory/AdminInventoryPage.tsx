import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Typography, message, Alert } from 'antd';
import { DatabaseOutlined, BarcodeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { inventoryService } from '../../../services/inventoryService';
import type { InventoryRecord } from '../../../types';
import { InventoryStatsCards } from './components/InventoryStatsCards';
import { InventoryStockTab } from './components/InventoryStockTab';
import { InventoryLedgerTab } from './components/InventoryLedgerTab';
import { AdminImeiPage } from '../InventoryImei/AdminImeiPage';

const { Title, Text } = Typography;

export const AdminInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const activeTabKey =
    currentTab === 'imei' ? 'imei' : currentTab === 'ledger' ? 'ledger' : 'stock';

  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getInventoryList();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách tồn kho:', err);
      const msg = err?.response?.data?.message || 'Không thể tải dữ liệu tồn kho từ máy chủ';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const handleTabChange = (key: string) => {
    if (key === 'stock') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: key });
    }
  };

  const handleToggleLowStock = () => {
    if (activeTabKey !== 'stock') {
      setSearchParams({});
    }
    setFilterLowStockOnly((prev) => !prev);
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Quản lý Kho & Thiết bị IMEI
        </Title>
        <Text type="secondary">
          Kiểm soát tồn kho sản phẩm, theo dõi ngưỡng cảnh báo nhập hàng và quản lý danh sách mã máy IMEI.
        </Text>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Lỗi tải dữ liệu"
          description={error}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* 3 Thẻ thống kê tổng quan */}
      <InventoryStatsCards
        items={items}
        loading={loading}
        filterLowStockOnly={filterLowStockOnly}
        onToggleLowStockFilter={handleToggleLowStock}
      />

      {/* Tabs chuyển đổi giữa Tồn kho biến thể và Quản lý IMEI */}
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTabKey}
          onChange={handleTabChange}
          items={[
            {
              key: 'stock',
              label: (
                <span>
                  <DatabaseOutlined style={{ marginRight: 6 }} />
                  Tồn kho biến thể (Stock)
                </span>
              ),
              children: (
                <InventoryStockTab
                  items={items}
                  loading={loading}
                  onRefresh={fetchInventory}
                  filterLowStockOnly={filterLowStockOnly}
                  onToggleLowStockFilter={handleToggleLowStock}
                />
              ),
            },
            {
              key: 'imei',
              label: (
                <span>
                  <BarcodeOutlined style={{ marginRight: 6 }} />
                  Quản lý thiết bị IMEI
                </span>
              ),
              children: <AdminImeiPage />,
            },
            {
              key: 'ledger',
              label: (
                <span>
                  <HistoryOutlined style={{ marginRight: 6 }} />
                  Sổ kho & Dòng tiền
                </span>
              ),
              children: <InventoryLedgerTab />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default AdminInventoryPage;
