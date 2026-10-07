import React, { useState, useMemo } from 'react';
import { Table, Input, Select, Space, Typography, Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import type { Payment, PaymentMethod, PaymentStatus } from '../../../../types';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';
import { PaymentBreakdownModal } from './PaymentBreakdownModal';
import {
  getCustomerInfo,
  getGatewayRef,
  calculateGatewayFee,
  detectSplitPayment,
} from '../utils/paymentAccountingHelpers';
import { exportPaymentsToExcel } from '../utils/exportPaymentsExcel';

const { Text } = Typography;

export interface PaymentsListTabProps {
  payments: Payment[];
  loading: boolean;
}

export const PaymentsListTab: React.FC<PaymentsListTabProps> = ({ payments, loading }) => {
  const location = useLocation();
  const ordersBase = location.pathname.startsWith('/staff') ? '/staff/orders' : '/admin/orders';
  const [keyword, setKeyword] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal breakdown state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const filteredData = useMemo(() => {
    return payments.filter((item) => {
      if (methodFilter !== 'ALL' && item.method !== methodFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const orderNo = (item.order?.orderNumber || item.orderId || '').toLowerCase();
        const email = (item.order?.user?.email || '').toLowerCase();
        const payId = item.id.toLowerCase();
        const customer = getCustomerInfo(item);
        const gatewayRef = getGatewayRef(item).toLowerCase();
        return (
          orderNo.includes(q) ||
          email.includes(q) ||
          payId.includes(q) ||
          gatewayRef.includes(q) ||
          customer.name.toLowerCase().includes(q) ||
          customer.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
        );
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, keyword]);

  const handleOpenBreakdown = (record: Payment) => {
    setSelectedPayment(record);
    setIsBreakdownOpen(true);
  };

  const handlePrintReceipt = (record: Payment) => {
    setSelectedPayment(record);
    setIsBreakdownOpen(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Mã GD / Ngày tạo',
      key: 'paymentId',
      width: 180,
      render: (_: any, record: Payment) => {
        const gatewayRef = getGatewayRef(record);
        return (
          <div>
            <div className="font-mono font-bold text-blue-600 text-xs">
              #{record.id.slice(0, 8).toUpperCase()}
            </div>
            <div
              className="text-[11px] text-slate-500 font-mono mt-0.5"
              title="Mã đối soát tại Cổng thanh toán / Ngân hàng"
            >
              Ref: {gatewayRef}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {formatDate(record.createdAt)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Đơn hàng & Khách hàng',
      key: 'order',
      render: (_: any, record: Payment) => {
        const customer = getCustomerInfo(record);
        const split = detectSplitPayment(record, payments);
        return (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`${ordersBase}/${record.order?.id || record.orderId}`}
                className="font-bold text-slate-900 hover:text-blue-600 text-sm"
              >
                #{record.order?.orderNumber || record.orderId.slice(0, 8)}
              </Link>
              {split.isSplit && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  🔗 Split Payment
                </span>
              )}
            </div>
            <div className="text-xs text-slate-800 font-semibold mt-0.5">
              {customer.name}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {customer.phone} {customer.email ? `• ${customer.email}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Cổng thanh toán',
      dataIndex: 'method',
      key: 'method',
      width: 175,
      render: (m: PaymentMethod, record: Payment) => {
        const fee = calculateGatewayFee(record.method, Number(record.amount || 0));
        return (
          <div>
            <PaymentMethodTag method={m} />
            <div className="text-[10px] text-slate-400 mt-1 font-medium">
              {fee.feeLabel} ({formatPrice(fee.feeAmount)})
            </div>
          </div>
        );
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 165,
      align: 'right',
      render: (val: number, record: Payment) => {
        const amount = Number(val || 0);
        const fee = calculateGatewayFee(record.method, amount);
        const split = detectSplitPayment(record, payments);
        const isPaid = record.status === 'PAID';

        return (
          <div className="text-right whitespace-nowrap">
            <div className={`font-bold text-sm ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
              {isPaid ? `+ ${formatPrice(amount)}` : formatPrice(amount)}
            </div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
              Thực nhận: {formatPrice(fee.netReceived)}
            </div>
            {split.isSplit && (
              <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                {split.roleLabel} ({split.percentLabel})
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (s: PaymentStatus) => <PaymentStatusTag status={s} />,
    },
    {
      title: 'Ngày thanh toán',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 145,
      align: 'center',
      render: (val: string | null) => {
        if (!val) return <span className="text-slate-300">—</span>;
        const d = new Date(val);
        return (
          <div className="text-xs text-slate-600">
            <div className="font-mono font-medium">
              {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400">
              {d.toLocaleDateString('vi-VN')}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'right',
      render: (_: any, record: Payment) => {
        return (
          <div className="inline-flex items-center gap-1 justify-end">
            <Tooltip title="Xem chi tiết bút toán & đối soát">
              <button
                type="button"
                onClick={() => handleOpenBreakdown(record)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                aria-label="Xem chi tiết bút toán"
              >
                <EyeOutlined style={{ fontSize: 15 }} />
              </button>
            </Tooltip>

            <Tooltip title="In biên lai thu tiền">
              <button
                type="button"
                onClick={() => handlePrintReceipt(record)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                aria-label="Tải biên lai"
              >
                <FileTextOutlined style={{ fontSize: 15 }} />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space wrap>
          <Input
            placeholder="Tìm kiếm mã đơn, email, SĐT, mã Ref..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả cổng' },
              { value: 'VNPAY', label: 'VNPay-QR' },
              { value: 'VIETQR', label: 'VietQR' },
              { value: 'INSTALLMENT', label: 'Trả góp tài chính' },
              { value: 'COD', label: 'COD (Tiền mặt)' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'PAID', label: 'Đã thanh toán (PAID)' },
              { value: 'PENDING', label: 'Chờ thanh toán' },
              { value: 'FAILED', label: 'Thất bại (FAILED)' },
            ]}
          />
        </Space>

        <div className="flex items-center gap-3">
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportPaymentsToExcel(filteredData)}
            className="border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium"
          >
            Xuất báo cáo Excel
          </Button>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị <strong>{filteredData.length}</strong> / {payments.length} giao dịch
          </Text>
        </div>
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <PaymentBreakdownModal
        open={isBreakdownOpen}
        payment={selectedPayment}
        allPayments={payments}
        onClose={() => {
          setIsBreakdownOpen(false);
          setSelectedPayment(null);
        }}
      />
    </div>
  );
};
