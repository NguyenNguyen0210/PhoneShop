import React from 'react';
import { Modal, Descriptions, Button, Divider, Space, Typography, Tag, message } from 'antd';
import {
  PrinterOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BankOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { Payment } from '../../../../types';
import {
  getCustomerInfo,
  getGatewayRef,
  calculateGatewayFee,
  detectSplitPayment,
} from '../utils/paymentAccountingHelpers';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';

const { Text, Title } = Typography;

export interface PaymentBreakdownModalProps {
  open: boolean;
  payment: Payment | null;
  allPayments: Payment[];
  onClose: () => void;
}

export const PaymentBreakdownModal: React.FC<PaymentBreakdownModalProps> = ({
  open,
  payment,
  allPayments,
  onClose,
}) => {
  if (!payment) return null;

  const customer = getCustomerInfo(payment);
  const gatewayRef = getGatewayRef(payment);
  const amount = Number(payment.amount || 0);
  const fee = calculateGatewayFee(payment.method, amount);
  const split = detectSplitPayment(payment, allPayments);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const handleCopyRef = () => {
    void navigator.clipboard.writeText(gatewayRef);
    message.success(`Đã sao chép mã tham chiếu: ${gatewayRef}`);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <BankOutlined className="text-blue-600 text-lg" />
          <span className="font-bold text-slate-800 text-base">
            Chi tiết Bút toán & Đối soát Giao dịch
          </span>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrintReceipt}
          className="bg-blue-600 hover:bg-blue-500"
        >
          In Biên lai Thu tiền
        </Button>,
      ]}
      width={680}
    >
      <div className="py-2 space-y-4">
        {/* Banner tóm tắt */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-medium">MÃ GIAO DỊCH NỘI BỘ</div>
            <div className="text-base font-mono font-bold text-blue-600">
              #{payment.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Đơn hàng: <strong>#{payment.order?.orderNumber || payment.orderId.slice(0, 8)}</strong>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-slate-500 font-medium">TRẠNG THÁI THANH TOÁN</div>
            <div className="mt-1">
              <PaymentStatusTag status={payment.status} />
            </div>
          </div>
        </div>

        {/* Thông tin đối soát cổng */}
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          labelStyle={{ fontWeight: 600, width: '160px', background: '#f8fafc' }}
        >
          <Descriptions.Item label="Mã tham chiếu Cổng">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
              <span>{gatewayRef}</span>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyRef}
                title="Sao chép mã tham chiếu cổng"
              />
            </div>
          </Descriptions.Item>

          <Descriptions.Item label="Cổng thanh toán">
            <PaymentMethodTag method={payment.method} />
          </Descriptions.Item>

          <Descriptions.Item label="Khách hàng">
            <div className="font-semibold text-slate-900">{customer.name}</div>
            <div className="text-xs text-slate-500">{customer.phone}</div>
          </Descriptions.Item>

          <Descriptions.Item label="Email liên hệ">
            <div className="text-xs text-slate-700">{customer.email || '—'}</div>
          </Descriptions.Item>

          <Descriptions.Item label="Thời gian tạo">
            <span className="text-xs text-slate-600">{formatDate(payment.createdAt)}</span>
          </Descriptions.Item>

          <Descriptions.Item label="Thời gian tiền về">
            <span className="text-xs text-slate-600">{formatDate(payment.paidAt)}</span>
          </Descriptions.Item>
        </Descriptions>

        {/* Phân loại tách dòng (Split payment) */}
        {split.isSplit && (
          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <span className="font-bold">🔗 Đơn hàng thanh toán kết hợp (Split Payment):</span>
            <span>
              Giao dịch này chiếm <strong>{split.percentLabel}</strong> giá trị đơn hàng ({split.roleLabel}).
            </span>
          </div>
        )}

        {/* Bảng phân bổ bút toán tài chính (Breakdown) */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/80 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 flex items-center gap-1.5">
            <FileTextOutlined /> Bút toán đối soát tài chính
          </div>

          <div className="p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center text-slate-700">
              <span>Số tiền giao dịch (Gross Amount):</span>
              <span className="font-bold">{formatPrice(amount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-500 text-xs">
              <span>{fee.feeLabel}:</span>
              <span className="font-mono text-red-500">
                - {formatPrice(fee.feeAmount)}
              </span>
            </div>

            <Divider className="my-2" />

            <div className="flex justify-between items-center text-base pt-1">
              <span className="font-bold text-slate-900">
                Thực nhận về tài khoản (Net Settlement):
              </span>
              <span className="font-bold text-emerald-600 text-lg">
                + {formatPrice(fee.netReceived)}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 italic">
              * Phí giao dịch được tính theo biểu phí đối soát tiêu chuẩn của cổng thanh toán.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
