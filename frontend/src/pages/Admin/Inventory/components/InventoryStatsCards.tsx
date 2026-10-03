import React from 'react';
import { Row, Col, Card, Statistic, Badge } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { InventoryRecord } from '../../../../types';

interface InventoryStatsCardsProps {
  items: InventoryRecord[];
  loading: boolean;
  filterLowStockOnly: boolean;
  onToggleLowStockFilter: () => void;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({
  items,
  loading,
  filterLowStockOnly,
  onToggleLowStockFilter,
}) => {
  const totalVariants = items.length;
  const totalAvailable = items.reduce((sum, item) => sum + (item.availableQty || 0), 0);
  const lowStockItems = items.filter(
    (item) => item.availableQty <= (item.reorderLevel ?? 0)
  );
  const lowStockCount = lowStockItems.length;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={8}>
        <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Statistic
            title="Tổng mã biến thể (SKU)"
            value={totalVariants}
            prefix={<AppstoreOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
            suffix="SKU"
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loading} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Statistic
            title="Tổng tồn kho khả dụng"
            value={totalAvailable}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
            suffix="máy"
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card
          loading={loading}
          hoverable
          onClick={onToggleLowStockFilter}
          style={{
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: filterLowStockOnly ? '2px solid #ff4d4f' : '1px solid #f0f0f0',
            background: filterLowStockOnly ? '#fff2f0' : '#ffffff',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Statistic
              title={
                <span>
                  Cảnh báo sắp hết hàng{' '}
                  <Badge count={filterLowStockOnly ? 'Đang lọc' : undefined} style={{ backgroundColor: '#ff4d4f' }} />
                </span>
              }
              value={lowStockCount}
              valueStyle={{ color: lowStockCount > 0 ? '#ff4d4f' : '#8c8c8c' }}
              prefix={<WarningOutlined style={{ color: lowStockCount > 0 ? '#ff4d4f' : '#8c8c8c', marginRight: 8 }} />}
              suffix="biến thể"
            />
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 12, color: filterLowStockOnly ? '#cf1322' : '#8c8c8c' }}>
              {filterLowStockOnly ? 'Nhấp để bỏ lọc danh sách' : 'Nhấp để lọc danh sách cần nhập hàng'}
            </span>
          </div>
        </Card>
      </Col>
    </Row>
  );
};
