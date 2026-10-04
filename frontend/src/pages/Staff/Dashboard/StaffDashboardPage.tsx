import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Button, Alert, Space, message } from 'antd';
import {
  ReloadOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import { ticketService } from '../../../services/ticketService';
import { returnService } from '../../../services/returnService';
import { installmentService } from '../../../services/installmentService';
import { inventoryService } from '../../../services/inventoryService';
import type { Order, InventoryRecord, ReturnRequest, InstallmentApplication } from '../../../types';
import type { Ticket } from '../../../types/ticket';
import {
  StaffActionCards,
  StaffOrdersQueue,
  StaffAlertsSidebar,
} from './components';

const { Title, Text } = Typography;

export const StaffDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState<number>(0);
  const [submittedInstallmentsCount, setSubmittedInstallmentsCount] = useState<number>(0);
  const [lowStockItems, setLowStockItems] = useState<InventoryRecord[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // CRITICAL: ZERO calls to reportService! (Never call reportService to avoid 403 Forbidden).
    const [ordersRes, ticketsRes, returnsRes, installmentsRes, inventoryRes] =
      await Promise.allSettled([
        orderService.getAllOrdersAdmin(),
        ticketService.getAdminTickets({ status: 'OPEN', limit: 10 }),
        returnService.getAdminReturns({ status: 'REQUESTED', limit: 10 }),
        installmentService.getInstallments({ status: 'PENDING', limit: 10 }),
        inventoryService.getStockLevels({ limit: 50 }),
      ]);

    let anyFailed = false;

    // Process Orders
    if (ordersRes.status === 'fulfilled') {
      const val = ordersRes.value;
      const orderList: Order[] = Array.isArray(val)
        ? val
        : Array.isArray(val?.data)
        ? val.data
        : [];
      setOrders(orderList);
    } else {
      console.error('Failed to load orders:', ordersRes.reason);
      anyFailed = true;
    }

    // Process Tickets
    if (ticketsRes.status === 'fulfilled') {
      const val: any = ticketsRes.value;
      const ticketList: Ticket[] = Array.isArray(val)
        ? val
        : Array.isArray(val?.items)
        ? val.items
        : Array.isArray(val?.data)
        ? val.data
        : [];
      setTickets(ticketList);
      const totalCount =
        typeof val?.total === 'number'
          ? val.total
          : typeof val?.count === 'number'
          ? val.count
          : ticketList.length;
      setOpenTicketsCount(totalCount);
    } else {
      console.error('Failed to load tickets:', ticketsRes.reason);
      anyFailed = true;
    }

    // Process Returns
    if (returnsRes.status === 'fulfilled') {
      const val: any = returnsRes.value;
      const returnList: ReturnRequest[] = Array.isArray(val)
        ? val
        : Array.isArray(val?.items)
        ? val.items
        : Array.isArray(val?.data)
        ? val.data
        : [];
      const totalCount =
        typeof val?.total === 'number' ? val.total : returnList.length;
      setPendingReturnsCount(totalCount);
    } else {
      console.error('Failed to load returns:', returnsRes.reason);
      anyFailed = true;
    }

    // Process Installments
    if (installmentsRes.status === 'fulfilled') {
      const val: any = installmentsRes.value;
      const installmentList: InstallmentApplication[] = Array.isArray(val)
        ? val
        : Array.isArray(val?.items)
        ? val.items
        : [];
      const totalCount =
        typeof val?.total === 'number' ? val.total : installmentList.length;
      setSubmittedInstallmentsCount(totalCount);
    } else {
      console.error('Failed to load installments:', installmentsRes.reason);
      anyFailed = true;
    }

    // Process Inventory
    if (inventoryRes.status === 'fulfilled') {
      const val: any = inventoryRes.value;
      const invList: InventoryRecord[] = Array.isArray(val)
        ? val
        : Array.isArray(val?.data)
        ? val.data
        : [];
      const lowStock = invList.filter((item) => {
        const qty = item.availableQty ?? item.quantity ?? 0;
        const reorder = item.reorderLevel ?? 0;
        return qty <= reorder;
      });
      setLowStockItems(lowStock);
    } else {
      console.error('Failed to load inventory:', inventoryRes.reason);
      anyFailed = true;
    }

    if (anyFailed) {
      setError('Không thể tải một số dữ liệu vận hành. Vui lòng bấm thử lại.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle quick actions on orders
  const handleConfirmOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'confirm');
      message.success('Đã xác nhận đơn hàng thành công');
      void fetchDashboardData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Xác nhận đơn thất bại');
    }
  };

  const handlePackOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'pack');
      message.success('Đã chuyển sang đóng gói thành công');
      void fetchDashboardData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Đóng gói đơn thất bại');
    }
  };

  // Derive counts for action cards
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const packingOrdersCount = orders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING'
  ).length;

  // Filter orders for the queue: actionable orders first, or all orders if none
  const actionableOrders = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PROCESSING'
  );
  const queueOrders = actionableOrders.length > 0 ? actionableOrders : orders;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            <DashboardOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            Bảng Vận Hành Nhân Viên
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
            Theo dõi hàng đợi đơn hàng, yêu cầu hỗ trợ và cảnh báo tồn kho thời gian thực
          </Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => {
              void fetchDashboardData();
            }}
            data-testid="refresh-btn"
            style={{ borderRadius: 6 }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Error Alert with retry */}
      {error && (
        <Alert
          title="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={fetchDashboardData} data-testid="retry-btn">
              Thử lại
            </Button>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Counter Action Cards */}
      <div style={{ marginBottom: 20 }}>
        <StaffActionCards
          pendingOrdersCount={pendingOrdersCount}
          packingOrdersCount={packingOrdersCount}
          openTicketsCount={openTicketsCount}
          pendingReturnsCount={pendingReturnsCount}
          submittedInstallmentsCount={submittedInstallmentsCount}
          loading={loading}
        />
      </div>

      {/* Main Content: Orders Queue (left) & Alerts Sidebar (right) */}
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <StaffOrdersQueue
            orders={queueOrders}
            loading={loading}
            onConfirm={handleConfirmOrder}
            onPack={handlePackOrder}
          />
        </Col>

        <Col xs={24} xl={8}>
          <StaffAlertsSidebar
            lowStockItems={lowStockItems}
            openTickets={tickets}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default StaffDashboardPage;
