import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { BarcodeOutlined, InboxOutlined, HistoryOutlined } from '@ant-design/icons';
import { inventoryService } from '../../../services/inventoryService';
import type { InventoryRecord } from '../../../types';
import { InventoryStockTab } from '../../Admin/Inventory/components/InventoryStockTab';
import { InventoryLedgerTab } from '../../Admin/Inventory/components/InventoryLedgerTab';
import { AdminImeiPage } from '../../Admin/InventoryImei/AdminImeiPage';

const { Title, Text } = Typography;

export const StaffInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stock';

  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(
    searchParams.get('lowStock') === 'true'
  );

  useEffect(() => {
    if (searchParams.get('lowStock') === 'true') {
      setFilterLowStockOnly(true);
    }
  }, [searchParams]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getInventoryList();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách tồn kho:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const handleTabChange = (key: string) => {
    setSearchParams(key === 'stock' ? {} : { tab: key });
  };

  const handleToggleLowStock = () => {
    setFilterLowStockOnly((prev) => !prev);
  };

  const tabItems = [
    {
      key: 'stock',
      label: (
        <span>
          <InboxOutlined /> Tồn kho & Mức cảnh báo
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
      key: 'ledger',
      label: (
        <span>
          <HistoryOutlined /> Lịch sử Biến động kho
        </span>
      ),
      children: <InventoryLedgerTab />,
    },
    {
      key: 'imei',
      label: (
        <span>
          <BarcodeOutlined /> Quản lý Mã IMEI & Barcode
        </span>
      ),
      children: <AdminImeiPage />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            Kho hàng & Quản lý IMEI
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Kiểm tra tồn kho, nhập xuất và quét mã IMEI thiết bị smartphone
          </Text>
        </div>
      </div>

      <Card style={{ borderRadius: 10 }}>
        <Tabs activeKey={currentTab} onChange={handleTabChange} items={tabItems} />
      </Card>
    </div>
  );
};

export default StaffInventoryPage;
