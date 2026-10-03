import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Card, Space, Button, message } from 'antd';
import {
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { reportService } from '../../../services/reportService';
import { orderService } from '../../../services/orderService';
import type { Order } from '../../../types';
import type {
  DashboardSummary,
  RevenueReport,
  TopProductItem,
  OrderStatusItem,
  BrandSalesReport,
  LowStockItem,
  DatePresetKey,
} from '../../../types/report';
import {
  DashboardFilterBar,
  DashboardKpiCards,
  RevenueChartCard,
  OrderStatusChartCard,
  BrandSalesChartCard,
  TopProductsChartCard,
  DashboardAlertsAndOrders,
} from './components';

const { Title, Text } = Typography;

export const AdminDashboardPage: React.FC = () => {
  const [preset, setPreset] = useState<DatePresetKey>('30_DAYS');
  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const initial = reportService.getDatePresetRange('30_DAYS');
    return [initial.from, initial.to];
  });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusItem[]>([]);
  const [brandSalesData, setBrandSalesData] = useState<BrandSalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const [
        summaryRes,
        revenueRes,
        statusRes,
        brandRes,
        topProdsRes,
        lowStockRes,
        ordersRes,
      ] = await Promise.allSettled([
        reportService.getDashboardSummary(),
        reportService.getRevenueReport(from, to),
        reportService.getOrderStatusReport(),
        reportService.getBrandSalesReport(from, to),
        reportService.getTopSellingProducts(10),
        reportService.getLowStockReport(),
        orderService.getAllOrdersAdmin(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value);
      if (statusRes.status === 'fulfilled') setOrderStatusData(statusRes.value);
      if (brandRes.status === 'fulfilled') setBrandSalesData(brandRes.value);
      if (topProdsRes.status === 'fulfilled') setTopProducts(topProdsRes.value);
      if (lowStockRes.status === 'fulfilled') setLowStock(lowStockRes.value);
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        setOrders(ordersRes.value);
      }
    } catch (err) {
      console.error('Failed to load dashboard analytics data:', err);
      message.error('Không thể tải toàn bộ dữ liệu báo cáo, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(dateRange[0], dateRange[1]);
  }, [dateRange, fetchDashboardData]);

  const handlePresetChange = (newPreset: DatePresetKey) => {
    setPreset(newPreset);
    if (newPreset !== 'CUSTOM') {
      const range = reportService.getDatePresetRange(newPreset);
      setDateRange([range.from, range.to]);
    }
  };

  const handleCustomRangeChange = (from: string, to: string) => {
    setDateRange([from, to]);
  };

  const handleRefresh = () => {
    fetchDashboardData(dateRange[0], dateRange[1]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: -0.3 }}>
              Trung tâm Báo cáo &amp; Phân tích
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
              }}
            >
              Executive Analytics Hub
            </span>
          </div>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'block' }}>
            Theo dõi doanh thu thuần, biến động tăng trưởng, thị phần thương hiệu và tình trạng vận hành kho thiết bị
          </Text>
        </div>

        {/* Engine status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Live Engine</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: 12, color: '#2563eb', fontFamily: 'monospace', fontWeight: 600 }}>
            Asia/Ho_Chi_Minh
          </span>
        </div>
      </div>

      {/* Time Range Filter Bar */}
      <DashboardFilterBar
        preset={preset}
        dateRange={dateRange}
        onPresetChange={handlePresetChange}
        onCustomRangeChange={handleCustomRangeChange}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* 4 Bento KPI Metric Cards */}
      <DashboardKpiCards summary={summary} loading={loading} />

      {/* Charts Grid Row 1: Daily Revenue Area Chart + Order Status Donut */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <RevenueChartCard data={revenueData} loading={loading} />
        </Col>
        <Col xs={24} lg={9}>
          <OrderStatusChartCard data={orderStatusData} loading={loading} />
        </Col>
      </Row>

      {/* Charts Grid Row 2: Top Selling Products Bar Chart + Brand Sales Donut */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <TopProductsChartCard data={topProducts} loading={loading} />
        </Col>
        <Col xs={24} lg={10}>
          <BrandSalesChartCard data={brandSalesData} loading={loading} />
        </Col>
      </Row>

      {/* Operational Shortcuts Banner */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #dbeafe',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)',
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 4,
              }}
            >
              <ThunderboltOutlined /> Điều phối kho &amp; Quản trị chuỗi cung ứng
            </div>
            <div style={{ color: '#0f172a', fontSize: 16, fontWeight: 700 }}>
              Quản lý định danh IMEI thiết bị và quy trình đóng gói giao hàng
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              Đảm bảo tất cả máy bán ra có số IMEI hợp lệ, thời gian bảo hành và trạng thái kho sẵn sàng.
            </div>
          </div>
          <Space size="middle">
            <Link to="/admin/inventory">
              <Button
                type="primary"
                style={{
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Quản lý kho IMEI
              </Button>
            </Link>
            <Link to="/admin/orders">
              <Button style={{ borderColor: '#cbd5e1', fontWeight: 600, borderRadius: 8 }}>
                Tra cứu đơn hàng
              </Button>
            </Link>
          </Space>
        </div>
      </Card>

      {/* Row 3: Alerts & Recent Orders Tabs */}
      <DashboardAlertsAndOrders
        orders={orders}
        lowStockItems={lowStock}
        loading={loading}
      />
    </div>
  );
};

export const AdminDashboard = AdminDashboardPage;
