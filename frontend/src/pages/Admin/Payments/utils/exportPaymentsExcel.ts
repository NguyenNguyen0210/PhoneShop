import type { Payment } from '../../../../types';
import {
  getCustomerInfo,
  getGatewayRef,
  calculateGatewayFee,
  detectSplitPayment,
} from './paymentAccountingHelpers';

const formatVND = (num: number) => num.toLocaleString('vi-VN');

export const exportPaymentsToExcel = (
  payments: Payment[],
  filename = 'Bao_cao_dong_tien_PhoneShop',
) => {
  const headers = [
    'Mã GD nội bộ',
    'Mã tham chiếu Cổng/NH',
    'Mã đơn hàng',
    'Khách hàng',
    'Số điện thoại',
    'Email',
    'Cổng thanh toán',
    'Phân loại thanh toán',
    'Số tiền (VND)',
    'Phí cổng ước tính (VND)',
    'Thực nhận (VND)',
    'Trạng thái',
    'Ngày tạo',
    'Ngày thanh toán',
  ];

  const rows = payments.map((p) => {
    const customer = getCustomerInfo(p);
    const gatewayRef = getGatewayRef(p);
    const amount = Number(p.amount || 0);
    const fee = calculateGatewayFee(p.method, amount);
    const split = detectSplitPayment(p, payments);

    const splitDesc = split.isSplit
      ? `${split.roleLabel} (${split.percentLabel})`
      : 'Thanh toán tiêu chuẩn (100%)';

    const statusText =
      p.status === 'PAID'
        ? 'Đã thanh toán'
        : p.status === 'PENDING'
          ? 'Chờ thanh toán'
          : p.status === 'FAILED'
            ? 'Thất bại'
            : p.status === 'REFUNDED'
              ? 'Đã hoàn tiền'
              : p.status;

    const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '';
    const paidAt = p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '';

    return [
      `"${`#TXN-${(p.id || '').slice(0, 8).toUpperCase()}`}"`,
      `"${gatewayRef}"`,
      `"${`#${p.order?.orderNumber || p.orderId || ''}`}"`,
      `"${customer.name.replace(/"/g, '""')}"`,
      `"${customer.phone}"`,
      `"${customer.email}"`,
      `"${p.method}"`,
      `"${splitDesc}"`,
      amount,
      fee.feeAmount,
      fee.netReceived,
      `"${statusText}"`,
      `"${createdAt}"`,
      `"${paidAt}"`,
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
