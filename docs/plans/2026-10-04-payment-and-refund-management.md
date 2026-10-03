# Payment & Refund Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Admin Portal UI and integration for Payment & Refund Management (`/admin/payments`), including multi-channel payment monitoring (VNPay, VietQR, COD), manual bank transfer reconciliation with providerRef evidence, centralized refund ledger with RBAC disbursement controls, and gateway transaction technical logs.

**Architecture:** A modular React + Ant Design frontend under `pages/Admin/Payments/` organized into 4 URL-synced tabs (`payments`, `reconciliation`, `refunds`, `transactions`), with isolated modal workflows for bank confirmation and refund processing, backed by enhanced API methods in `paymentService.ts` and `returnService.ts`.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (Cards, Tables, Modals, Tabs, Tooltip), React Router v7, Zustand, Vitest.

---

## File Structure Map

```text
frontend/src/
├── types/
│   └── index.ts                               # Add Payment and PaymentTransaction interfaces
├── services/
│   ├── paymentService.ts                      # Add getAllPaymentsAdmin, getTransactionHistoryAdmin, confirmPaymentAdmin, failPaymentAdmin
│   └── __tests__/
│       └── paymentService.spec.ts             # Unit tests for paymentService admin methods
├── pages/Admin/Payments/
│   ├── AdminPaymentsPage.tsx                  # Main Page: Tab orchestration, summary stats, URL query sync
│   ├── components/
│   │   ├── PaymentMethodTag.tsx               # Cổng thanh toán tag (VNPAY / VIETQR / COD)
│   │   ├── PaymentStatusTag.tsx               # Trạng thái thanh toán tag (PAID / PENDING / FAILED)
│   │   ├── PaymentStatsCards.tsx              # 4 KPI cards (Total Paid, Gateway Share, Pending Recon, Refunded)
│   │   ├── PaymentsListTab.tsx                # Tab 1: Comprehensive payments table with gateway/status filters
│   │   ├── ReconciliationTab.tsx              # Tab 2: Bank transfer reconciliation queue for PENDING VietQR
│   │   ├── ReconciliationModal.tsx            # Modal for entering bank providerRef and confirming payment
│   │   ├── RefundsLedgerTab.tsx               # Tab 3: Centralized refund ledger with RBAC disbursement actions
│   │   └── TransactionsLogTab.tsx             # Tab 4: Gateway raw transaction logs and payload viewer
│   └── __tests__/
│       ├── AdminPaymentsPage.spec.tsx         # Page tests (stats, tabs, filtering, URL sync)
│       ├── ReconciliationModal.spec.tsx       # Reconciliation modal tests (validation, API calls)
│       └── RefundsLedgerTab.spec.tsx          # Refunds ledger tests (rendering, RBAC disabled tooltips)
├── routes/
│   └── AppRoutes.tsx                          # Register /admin/payments with RoleGuard
└── layouts/
    └── AdminLayout.tsx                        # Add sidebar navigation item "Quản lý Thanh toán"
```

---

## Task Decomposition

- **Task 1: Type Definitions & PaymentService Admin Extensions (TDD)**
- **Task 2: Shared UI Components (PaymentMethodTag, PaymentStatusTag, PaymentStatsCards)**
- **Task 3: Reconciliation Workflow (ReconciliationModal & ReconciliationTab)**
- **Task 4: Payments List Tab & Transactions Log Tab**
- **Task 5: Centralized Refunds Ledger Tab with RBAC Enforcement**
- **Task 6: Main Admin Payments Page, Layout Menu & Route Integration**
- **Task 7: Comprehensive Test Verification, Linting & Build**

---

### Task 1: Type Definitions & PaymentService Admin Extensions (TDD)

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/paymentService.ts`
- Test: `frontend/src/services/__tests__/paymentService.spec.ts`

- [ ] **Step 1: Write the failing unit tests for paymentService admin methods**

Create `frontend/src/services/__tests__/paymentService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../paymentService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('paymentService - Admin methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllPaymentsAdmin calls GET /payments and returns array', async () => {
    const mockPayments = [
      { id: 'pay-1', orderId: 'ord-1', method: 'VIETQR', status: 'PENDING', amount: 15000000 },
      { id: 'pay-2', orderId: 'ord-2', method: 'VNPAY', status: 'PAID', amount: 20000000 },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockPayments } });

    const result = await paymentService.getAllPaymentsAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/payments');
    expect(result).toEqual(mockPayments);
  });

  it('getTransactionHistoryAdmin calls GET /payments/transactions', async () => {
    const mockTransactions = [
      { id: 'txn-1', transactionCode: 'TXN-1001', type: 'PAYMENT', status: 'SUCCESS', amount: 15000000 },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockTransactions } });

    const result = await paymentService.getTransactionHistoryAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/payments/transactions');
    expect(result).toEqual(mockTransactions);
  });

  it('confirmPaymentAdmin calls PUT /payments/:id/confirm with providerRef', async () => {
    const mockResponse = { id: 'pay-1', status: 'PAID' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await paymentService.confirmPaymentAdmin('pay-1', 'FT261004123456');
    expect(apiClient.put).toHaveBeenCalledWith('/payments/pay-1/confirm', { providerRef: 'FT261004123456' });
    expect(result).toEqual(mockResponse);
  });

  it('failPaymentAdmin calls PUT /payments/:id/fail', async () => {
    const mockResponse = { id: 'pay-1', status: 'FAILED' };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await paymentService.failPaymentAdmin('pay-1');
    expect(apiClient.put).toHaveBeenCalledWith('/payments/pay-1/fail');
    expect(result).toEqual(mockResponse);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/services/__tests__/paymentService.spec.ts`
Expected: FAIL (functions `getAllPaymentsAdmin`, `getTransactionHistoryAdmin`, `confirmPaymentAdmin`, `failPaymentAdmin` not defined)

- [ ] **Step 3: Update `frontend/src/types/index.ts` and `frontend/src/services/paymentService.ts`**

In `frontend/src/types/index.ts`, add the `Payment` and `PaymentTransaction` interfaces:
```typescript
export type TransactionType = 'PAYMENT' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  transactionCode: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  providerReference?: string | null;
  responseData?: any;
  createdAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    userId: string;
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  transactions?: PaymentTransaction[];
}
```

In `frontend/src/services/paymentService.ts`, import `Payment` and `PaymentTransaction` from `../types` and add methods:
```typescript
  // Admin methods
  async getAllPaymentsAdmin(): Promise<Payment[]> {
    const response = await apiClient.get('/payments');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getTransactionHistoryAdmin(): Promise<PaymentTransaction[]> {
    const response = await apiClient.get('/payments/transactions');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async confirmPaymentAdmin(paymentId: string, providerRef: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/confirm`, { providerRef });
    return response.data?.data ?? response.data;
  },

  async failPaymentAdmin(paymentId: string): Promise<Payment> {
    const response = await apiClient.put(`/payments/${paymentId}/fail`);
    return response.data?.data ?? response.data;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/services/__tests__/paymentService.spec.ts`
Expected: PASS (4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/paymentService.ts frontend/src/services/__tests__/paymentService.spec.ts
git commit -m "feat(payments): add payment types and admin paymentService methods with unit tests"
```

---

### Task 2: Shared UI Components (PaymentMethodTag, PaymentStatusTag, PaymentStatsCards)

**Files:**
- Create: `frontend/src/pages/Admin/Payments/components/PaymentMethodTag.tsx`
- Create: `frontend/src/pages/Admin/Payments/components/PaymentStatusTag.tsx`
- Create: `frontend/src/pages/Admin/Payments/components/PaymentStatsCards.tsx`
- Test: `frontend/src/pages/Admin/Payments/components/__tests__/PaymentStatsCards.spec.tsx`

- [ ] **Step 1: Write failing test for PaymentStatsCards**

Create `frontend/src/pages/Admin/Payments/components/__tests__/PaymentStatsCards.spec.tsx`:
```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PaymentStatsCards } from '../PaymentStatsCards';
import type { Payment, RefundItem } from '../../../../types';

describe('PaymentStatsCards', () => {
  const mockPayments: Payment[] = [
    { id: '1', orderId: 'o1', method: 'VNPAY', status: 'PAID', amount: 10000000, createdAt: '', updatedAt: '' },
    { id: '2', orderId: 'o2', method: 'VIETQR', status: 'PAID', amount: 5000000, createdAt: '', updatedAt: '' },
    { id: '3', orderId: 'o3', method: 'VIETQR', status: 'PENDING', amount: 3000000, createdAt: '', updatedAt: '' },
    { id: '4', orderId: 'o4', method: 'COD', status: 'PAID', amount: 2000000, createdAt: '', updatedAt: '' },
  ];

  const mockRefunds: RefundItem[] = [
    { id: 'r1', returnId: 'ret1', refundNumber: 'REF-001', amount: 1000000, status: 'COMPLETED', createdAt: '' },
    { id: 'r2', returnId: 'ret2', refundNumber: 'REF-002', amount: 500000, status: 'PENDING', createdAt: '' },
  ];

  it('renders total revenue and formatted amounts accurately', () => {
    render(<PaymentStatsCards payments={mockPayments} refunds={mockRefunds} loading={false} />);

    // Total Paid = 10m + 5m + 2m = 17m
    expect(screen.getByText('Tổng doanh thu đã thu')).toBeInTheDocument();
    expect(screen.getByText(/17\.000\.000/)).toBeInTheDocument();

    // Pending Recon = 1 item (id 3)
    expect(screen.getByText('Chờ đối soát VietQR')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Total Refunded = 1m
    expect(screen.getByText('Tổng tiền đã hoàn trả')).toBeInTheDocument();
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/PaymentStatsCards.spec.tsx`
Expected: FAIL (Component does not exist)

- [ ] **Step 3: Implement PaymentMethodTag, PaymentStatusTag, and PaymentStatsCards**

Create `frontend/src/pages/Admin/Payments/components/PaymentMethodTag.tsx`:
```typescript
import React from 'react';
import { Tag } from 'antd';
import { QrcodeOutlined, CreditCardOutlined, CarOutlined } from '@ant-design/icons';
import type { PaymentMethod } from '../../../../types';

interface PaymentMethodTagProps {
  method: PaymentMethod;
}

export const PaymentMethodTag: React.FC<PaymentMethodTagProps> = ({ method }) => {
  switch (method) {
    case 'VNPAY':
      return (
        <Tag color="blue" icon={<CreditCardOutlined />}>
          VNPay
        </Tag>
      );
    case 'VIETQR':
      return (
        <Tag color="cyan" icon={<QrcodeOutlined />}>
          VietQR
        </Tag>
      );
    case 'COD':
      return (
        <Tag color="orange" icon={<CarOutlined />}>
          COD (Tiền mặt)
        </Tag>
      );
    default:
      return <Tag>{method}</Tag>;
  }
};
```

Create `frontend/src/pages/Admin/Payments/components/PaymentStatusTag.tsx`:
```typescript
import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { PaymentStatus } from '../../../../types';

interface PaymentStatusTagProps {
  status: PaymentStatus;
}

export const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({ status }) => {
  switch (status) {
    case 'PAID':
      return (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          Đã thanh toán
        </Tag>
      );
    case 'PENDING':
      return (
        <Tag color="warning" icon={<ClockCircleOutlined />}>
          Chờ thanh toán
        </Tag>
      );
    case 'FAILED':
      return (
        <Tag color="error" icon={<CloseCircleOutlined />}>
          Thất bại
        </Tag>
      );
    case 'REFUNDED':
      return (
        <Tag color="purple" icon={<CheckCircleOutlined />}>
          Đã hoàn tiền
        </Tag>
      );
    default:
      return <Tag>{status}</Tag>;
  }
};
```

Create `frontend/src/pages/Admin/Payments/components/PaymentStatsCards.tsx`:
```typescript
import React from 'react';
import { Row, Col, Card, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  QrcodeOutlined,
  ExclamationCircleOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { Payment, RefundItem } from '../../../../types';

const { Text, Title } = Typography;

interface PaymentStatsCardsProps {
  payments: Payment[];
  refunds: RefundItem[];
  loading: boolean;
}

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = ({ payments, refunds, loading }) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const totalRevenue = paidPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const pendingReconcile = payments.filter((p) => p.method === 'VIETQR' && p.status === 'PENDING').length;

  const completedRefunds = refunds.filter((r) => r.status === 'COMPLETED');
  const totalRefunded = completedRefunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const vnpayTotal = paidPayments.filter((p) => p.method === 'VNPAY').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const vietqrTotal = paidPayments.filter((p) => p.method === 'VIETQR').reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tổng doanh thu đã thu
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: '#16a34a' }}>
                  {formatPrice(totalRevenue)}
                </Title>
              </div>
              <div style={{ background: '#dcfce7', padding: 10, borderRadius: 10, color: '#16a34a' }}>
                <DollarOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              Từ {paidPayments.length} giao dịch thành công
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Cổng VNPay & VietQR
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: '#2563eb' }}>
                  {formatPrice(vnpayTotal + vietqrTotal)}
                </Title>
              </div>
              <div style={{ background: '#eff6ff', padding: 10, borderRadius: 10, color: '#2563eb' }}>
                <QrcodeOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              VNPay: {formatPrice(vnpayTotal)} | VietQR: {formatPrice(vietqrTotal)}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Chờ đối soát VietQR
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: pendingReconcile > 0 ? '#d97706' : '#64748b' }}>
                  {pendingReconcile}
                </Title>
              </div>
              <div
                style={{
                  background: pendingReconcile > 0 ? '#fef3c7' : '#f1f5f9',
                  padding: 10,
                  borderRadius: 10,
                  color: pendingReconcile > 0 ? '#d97706' : '#64748b',
                }}
              >
                <ExclamationCircleOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              {pendingReconcile > 0 ? 'Cần kiểm tra biến động số dư' : 'Đã đối soát toàn bộ'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tổng tiền đã hoàn trả
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: '#9333ea' }}>
                  {formatPrice(totalRefunded)}
                </Title>
              </div>
              <div style={{ background: '#f5f3ff', padding: 10, borderRadius: 10, color: '#9333ea' }}>
                <RollbackOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              Đã chi trả {completedRefunds.length} yêu cầu đổi trả
            </Text>
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/PaymentStatsCards.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Payments/components/
git commit -m "feat(payments): add PaymentMethodTag, PaymentStatusTag, and PaymentStatsCards with unit tests"
```

---

### Task 3: Reconciliation Workflow (ReconciliationModal & ReconciliationTab)

**Files:**
- Create: `frontend/src/pages/Admin/Payments/components/ReconciliationModal.tsx`
- Create: `frontend/src/pages/Admin/Payments/components/ReconciliationTab.tsx`
- Test: `frontend/src/pages/Admin/Payments/components/__tests__/ReconciliationModal.spec.tsx`

- [ ] **Step 1: Write failing test for ReconciliationModal**

Create `frontend/src/pages/Admin/Payments/components/__tests__/ReconciliationModal.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationModal } from '../ReconciliationModal';
import { paymentService } from '../../../../../services/paymentService';
import type { Payment } from '../../../../../types';

vi.mock('../../../../../services/paymentService', () => ({
  paymentService: {
    confirmPaymentAdmin: vi.fn(),
  },
}));

describe('ReconciliationModal', () => {
  const mockPayment: Payment = {
    id: 'pay-123',
    orderId: 'ord-456',
    method: 'VIETQR',
    status: 'PENDING',
    amount: 24990000,
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z',
    order: {
      id: 'ord-456',
      orderNumber: 'ORD-998877',
      userId: 'usr-1',
      user: {
        id: 'usr-1',
        email: 'customer@example.com',
        firstName: 'Nguyen',
        lastName: 'Van A',
      },
    },
  };

  const handleClose = vi.fn();
  const handleSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with order number, customer, and formatted amount', () => {
    render(
      <ReconciliationModal
        open={true}
        payment={mockPayment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/ORD-998877/)).toBeInTheDocument();
    expect(screen.getByText(/customer@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/24\.990\.000/)).toBeInTheDocument();
  });

  it('validates providerRef input and calls paymentService.confirmPaymentAdmin', async () => {
    vi.mocked(paymentService.confirmPaymentAdmin).mockResolvedValueOnce({
      ...mockPayment,
      status: 'PAID',
    });

    render(
      <ReconciliationModal
        open={true}
        payment={mockPayment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/FT261004/i);
    fireEvent.change(input, { target: { value: 'FT261004998877' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận khớp tiền/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentService.confirmPaymentAdmin).toHaveBeenCalledWith('pay-123', 'FT261004998877');
      expect(handleSuccess).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/ReconciliationModal.spec.tsx`
Expected: FAIL (ReconciliationModal not found)

- [ ] **Step 3: Implement ReconciliationModal and ReconciliationTab**

Create `frontend/src/pages/Admin/Payments/components/ReconciliationModal.tsx`:
```typescript
import React, { useState } from 'react';
import { Modal, Form, Input, Typography, Alert, Descriptions, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { paymentService } from '../../../../services/paymentService';
import type { Payment } from '../../../../types';

const { Text } = Typography;

interface ReconciliationModalProps {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  open,
  payment,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  if (!payment) return null;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await paymentService.confirmPaymentAdmin(payment.id, values.providerRef.trim());
      message.success('Đối soát thành công! Đơn hàng đã chuyển CONFIRMED và kích hoạt bảo hành.');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || err.message || 'Xác nhận đối soát thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#16a34a' }} />
          <span>Xác nhận Đối soát Giao dịch Chuyển khoản</span>
        </div>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleSubmit}
      okText="Xác nhận khớp tiền & Chốt đơn"
      cancelText="Đóng"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Alert
        message="Hệ thống sẽ cập nhật tự động"
        description="Khi bấm xác nhận: Payment chuyển PAID, Order chuyển CONFIRMED, thiết bị IMEI gắn với đơn chuyển SOLD và kích hoạt bảo hành điện tử."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã đơn hàng">
          <Text strong style={{ color: '#2563eb' }}>
            #{payment.order?.orderNumber || payment.orderId}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Khách hàng">
          {payment.order?.user?.firstName || payment.order?.user?.lastName
            ? `${payment.order.user.lastName || ''} ${payment.order.user.firstName || ''} (${payment.order.user.email})`
            : payment.order?.user?.email || 'Khách vãng lai'}
        </Descriptions.Item>
        <Descriptions.Item label="Số tiền cần khớp">
          <Text strong style={{ color: '#16a34a', fontSize: 16 }}>
            {formatPrice(Number(payment.amount))}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Form.Item
          name="providerRef"
          label="Mã bút toán / Mã tham chiếu ngân hàng (providerRef)"
          rules={[
            { required: true, message: 'Vui lòng nhập mã giao dịch ngân hàng' },
            { min: 4, message: 'Mã tham chiếu tối thiểu 4 ký tự' },
          ]}
        >
          <Input placeholder="VD: FT261004998877 hoặc MB-123456" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

Create `frontend/src/pages/Admin/Payments/components/ReconciliationTab.tsx`:
```typescript
import React, { useState } from 'react';
import { Table, Button, Space, Typography, Popconfirm, Alert, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { paymentService } from '../../../../services/paymentService';
import type { Payment } from '../../../../types';
import { PaymentMethodTag } from './PaymentMethodTag';
import { ReconciliationModal } from './ReconciliationModal';

const { Text } = Typography;

interface ReconciliationTabProps {
  payments: Payment[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  payments,
  loading,
  canManage,
  onRefresh,
}) => {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const pendingReconcileList = payments.filter(
    (p) => p.status === 'PENDING' && (p.method === 'VIETQR' || p.method === 'VNPAY')
  );

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const handleOpenConfirm = (record: Payment) => {
    setSelectedPayment(record);
    setModalOpen(true);
  };

  const handleFail = async (paymentId: string) => {
    setActionLoadingId(paymentId);
    try {
      await paymentService.failPaymentAdmin(paymentId);
      message.success('Đã đánh dấu giao dịch thất bại (FAILED)');
      onRefresh();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Mã đơn hàng',
      key: 'order',
      width: 180,
      render: (_: any, record: Payment) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>
            #{record.order?.orderNumber || record.orderId.slice(0, 8)}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Tạo: {formatDate(record.createdAt)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: Payment) => (
        <div>
          <Text>
            {record.order?.user?.firstName || record.order?.user?.lastName
              ? `${record.order.user.lastName || ''} ${record.order.user.firstName || ''}`
              : 'Khách mua hàng'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.order?.user?.email || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Cổng thanh toán',
      dataIndex: 'method',
      key: 'method',
      width: 140,
      render: (m: any) => <PaymentMethodTag method={m} />,
    },
    {
      title: 'Số tiền cần khớp',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      render: (val: number) => (
        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>
          {formatPrice(Number(val))}
        </span>
      ),
    },
    {
      title: 'Cú pháp chuyển khoản',
      key: 'syntax',
      width: 180,
      render: (_: any, record: Payment) => (
        <Text code style={{ fontSize: 12 }}>
          {record.order?.orderNumber || `ORD-${record.orderId.slice(0, 8).toUpperCase()}`}
        </Text>
      ),
    },
    {
      title: 'Thao tác đối soát',
      key: 'action',
      width: 220,
      align: 'center',
      render: (_: any, record: Payment) => {
        if (!canManage) {
          return (
            <Tooltip title="Chỉ Quản lý (Manager/Admin) có quyền xác nhận đối soát">
              <Button size="small" disabled icon={<CheckOutlined />}>
                🔒 Xác nhận
              </Button>
            </Tooltip>
          );
        }

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              style={{ background: '#16a34a' }}
              icon={<CheckOutlined />}
              onClick={() => handleOpenConfirm(record)}
            >
              Xác nhận
            </Button>
            <Popconfirm
              title="Đánh dấu thất bại"
              description="Bạn có chắc chắn khách không chuyển tiền hoặc hủy đơn này?"
              onConfirm={() => handleFail(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                loading={actionLoadingId === record.id}
              >
                Hủy
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Alert
        message="Hàng chờ đối soát ngân hàng"
        description="Danh sách các đơn thanh toán chuyển khoản VietQR đang chờ tiền về tài khoản. Kiểm tra sao kê ngân hàng và bấm Xác nhận để tự động hoàn tất đơn hàng."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            Làm mới
          </Button>
        }
      />

      <Table
        dataSource={pendingReconcileList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: 'Tuyệt vời! Không có giao dịch chuyển khoản nào đang chờ đối soát.',
        }}
      />

      <ReconciliationModal
        open={modalOpen}
        payment={selectedPayment}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/ReconciliationModal.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Payments/components/ReconciliationModal.tsx frontend/src/pages/Admin/Payments/components/ReconciliationTab.tsx frontend/src/pages/Admin/Payments/components/__tests__/ReconciliationModal.spec.tsx
git commit -m "feat(payments): add ReconciliationModal and ReconciliationTab with unit tests"
```

---

### Task 4: Payments List Tab & Transactions Log Tab

**Files:**
- Create: `frontend/src/pages/Admin/Payments/components/PaymentsListTab.tsx`
- Create: `frontend/src/pages/Admin/Payments/components/TransactionsLogTab.tsx`
- Test: `frontend/src/pages/Admin/Payments/components/__tests__/PaymentsListTab.spec.tsx`

- [ ] **Step 1: Write failing test for PaymentsListTab**

Create `frontend/src/pages/Admin/Payments/components/__tests__/PaymentsListTab.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PaymentsListTab } from '../PaymentsListTab';
import type { Payment } from '../../../../types';

describe('PaymentsListTab', () => {
  const mockPayments: Payment[] = [
    {
      id: 'p-1',
      orderId: 'o-1',
      method: 'VNPAY',
      status: 'PAID',
      amount: 15000000,
      createdAt: '2026-10-04T08:00:00Z',
      paidAt: '2026-10-04T08:05:00Z',
      updatedAt: '',
      order: { id: 'o-1', orderNumber: 'ORD-101', userId: 'u-1', user: { id: 'u-1', email: 'alice@test.com' } },
    },
    {
      id: 'p-2',
      orderId: 'o-2',
      method: 'COD',
      status: 'PENDING',
      amount: 5000000,
      createdAt: '2026-10-04T09:00:00Z',
      updatedAt: '',
      order: { id: 'o-2', orderNumber: 'ORD-102', userId: 'u-2', user: { id: 'u-2', email: 'bob@test.com' } },
    },
  ];

  it('renders table rows and filters by search keyword', () => {
    render(
      <BrowserRouter>
        <PaymentsListTab payments={mockPayments} loading={false} />
      </BrowserRouter>
    );

    expect(screen.getByText('#ORD-101')).toBeInTheDocument();
    expect(screen.getByText('#ORD-102')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm mã đơn/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(screen.getByText('#ORD-101')).toBeInTheDocument();
    expect(screen.queryByText('#ORD-102')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/PaymentsListTab.spec.tsx`
Expected: FAIL (PaymentsListTab not found)

- [ ] **Step 3: Implement PaymentsListTab and TransactionsLogTab**

Create `frontend/src/pages/Admin/Payments/components/PaymentsListTab.tsx`:
```typescript
import React, { useState, useMemo } from 'react';
import { Table, Input, Select, Space, Typography, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Payment, PaymentMethod, PaymentStatus } from '../../../../types';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';

const { Text } = Typography;

interface PaymentsListTabProps {
  payments: Payment[];
  loading: boolean;
}

export const PaymentsListTab: React.FC<PaymentsListTabProps> = ({ payments, loading }) => {
  const [keyword, setKeyword] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
        return orderNo.includes(q) || email.includes(q) || payId.includes(q);
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, keyword]);

  const columns: ColumnsType<Payment> = [
    {
      title: 'Mã GD / Ngày tạo',
      key: 'paymentId',
      width: 170,
      render: (_: any, record: Payment) => (
        <div>
          <Text strong code style={{ color: '#2563eb' }}>
            #{record.id.slice(0, 8).toUpperCase()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatDate(record.createdAt)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'order',
      render: (_: any, record: Payment) => (
        <div>
          <Link to={`/admin/orders`} style={{ fontWeight: 600 }}>
            #{record.order?.orderNumber || record.orderId.slice(0, 8)}
          </Link>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.order?.user?.email || 'Khách vãng lai'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Cổng thanh toán',
      dataIndex: 'method',
      key: 'method',
      width: 140,
      render: (m: PaymentMethod) => <PaymentMethodTag method={m} />,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatPrice(Number(val))}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s: PaymentStatus) => <PaymentStatusTag status={s} />,
    },
    {
      title: 'Ngày thanh toán',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 170,
      render: (val: string | null) => (
        <Text style={{ fontSize: 12, color: val ? '#16a34a' : '#64748b' }}>
          {formatDate(val)}
        </Text>
      ),
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
            placeholder="Tìm kiếm mã đơn, email..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 160 }}
            options={[
              { value: 'ALL', label: 'Tất cả cổng' },
              { value: 'VNPAY', label: 'VNPay' },
              { value: 'VIETQR', label: 'VietQR' },
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
        <Text type="secondary" style={{ fontSize: 13 }}>
          Hiển thị <strong>{filteredData.length}</strong> / {payments.length} giao dịch
        </Text>
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};
```

Create `frontend/src/pages/Admin/Payments/components/TransactionsLogTab.tsx`:
```typescript
import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CodeOutlined } from '@ant-design/icons';
import type { PaymentTransaction } from '../../../../types';

const { Text } = Typography;

interface TransactionsLogTabProps {
  transactions: PaymentTransaction[];
  loading: boolean;
}

export const TransactionsLogTab: React.FC<TransactionsLogTabProps> = ({ transactions, loading }) => {
  const [selectedPayload, setSelectedPayload] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Tag color="success">THÀNH CÔNG</Tag>;
      case 'PENDING':
        return <Tag color="warning">CHỜ XỬ LÝ</Tag>;
      case 'FAILED':
        return <Tag color="error">THẤT BẠI</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: ColumnsType<PaymentTransaction> = [
    {
      title: 'Mã GD Hệ thống',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      width: 170,
      render: (code: string) => <Text code strong>{code}</Text>,
    },
    {
      title: 'Đơn hàng liên kết',
      key: 'order',
      render: (_: any, record: PaymentTransaction) => (
        <Text strong>
          #{record.payment?.order?.orderNumber || record.paymentId.slice(0, 8)}
        </Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (val: number) => <span>{formatPrice(Number(val))}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => getStatusTag(s),
    },
    {
      title: 'Mã đối tác (providerRef)',
      dataIndex: 'providerReference',
      key: 'providerReference',
      width: 180,
      render: (val: string | null) => (val ? <Text code>{val}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (d: string) => <Text style={{ fontSize: 12 }}>{formatDate(d)}</Text>,
    },
    {
      title: 'Dữ liệu thô',
      key: 'payload',
      width: 100,
      align: 'center',
      render: (_: any, record: PaymentTransaction) => (
        <Button
          size="small"
          icon={<CodeOutlined />}
          onClick={() => {
            setSelectedPayload(record.responseData || { message: 'Không có payload phản hồi' });
            setIsModalOpen(true);
          }}
        >
          JSON
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={transactions}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="Dữ liệu phản hồi kỹ thuật (Raw Response Payload)"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <pre
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
            maxHeight: 400,
            fontSize: 12,
          }}
        >
          {JSON.stringify(selectedPayload, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/PaymentsListTab.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Payments/components/PaymentsListTab.tsx frontend/src/pages/Admin/Payments/components/TransactionsLogTab.tsx frontend/src/pages/Admin/Payments/components/__tests__/PaymentsListTab.spec.tsx
git commit -m "feat(payments): add PaymentsListTab and TransactionsLogTab with unit tests"
```

---

### Task 5: Centralized Refunds Ledger Tab with RBAC Enforcement

**Files:**
- Create: `frontend/src/pages/Admin/Payments/components/RefundsLedgerTab.tsx`
- Test: `frontend/src/pages/Admin/Payments/components/__tests__/RefundsLedgerTab.spec.tsx`

- [ ] **Step 1: Write failing test for RefundsLedgerTab**

Create `frontend/src/pages/Admin/Payments/components/__tests__/RefundsLedgerTab.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundsLedgerTab } from '../RefundsLedgerTab';
import { returnService } from '../../../../../services/returnService';
import type { RefundItem } from '../../../../../types';

vi.mock('../../../../../services/returnService', () => ({
  returnService: {
    processRefund: vi.fn(),
    completeRefund: vi.fn(),
  },
}));

describe('RefundsLedgerTab', () => {
  const mockRefunds: RefundItem[] = [
    {
      id: 'ref-1',
      returnId: 'ret-101',
      refundNumber: 'RF-2026-001',
      amount: 12000000,
      status: 'PENDING',
      reason: 'Hàng lỗi camera',
      createdAt: '2026-10-04T09:00:00Z',
    },
    {
      id: 'ref-2',
      returnId: 'ret-102',
      refundNumber: 'RF-2026-002',
      amount: 8000000,
      status: 'PROCESSING',
      reason: 'Đổi máy khác',
      createdAt: '2026-10-04T09:10:00Z',
    },
  ];

  const handleRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders refund items with amounts and reasons', () => {
    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('RF-2026-001')).toBeInTheDocument();
    expect(screen.getByText('RF-2026-002')).toBeInTheDocument();
    expect(screen.getByText(/12\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText('Hàng lỗi camera')).toBeInTheDocument();
  });

  it('disables action buttons when canManage is false (STAFF role)', () => {
    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={false}
        onRefresh={handleRefresh}
      />
    );

    const lockLabels = screen.getAllByText(/🔒/);
    expect(lockLabels.length).toBeGreaterThan(0);
  });

  it('calls processRefund when canManage is true and button clicked', async () => {
    vi.mocked(returnService.processRefund).mockResolvedValueOnce({
      ...mockRefunds[0],
      status: 'PROCESSING',
    });

    render(
      <RefundsLedgerTab
        refunds={mockRefunds}
        loading={false}
        canManage={true}
        onRefresh={handleRefresh}
      />
    );

    const processBtn = screen.getByRole('button', { name: /Bắt đầu giải ngân/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(returnService.processRefund).toHaveBeenCalledWith('ref-1');
      expect(handleRefresh).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/RefundsLedgerTab.spec.tsx`
Expected: FAIL (RefundsLedgerTab not found)

- [ ] **Step 3: Implement RefundsLedgerTab**

Create `frontend/src/pages/Admin/Payments/components/RefundsLedgerTab.tsx`:
```typescript
import React, { useState } from 'react';
import { Table, Tag, Button, Space, Typography, Tooltip, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { returnService } from '../../../../services/returnService';
import type { RefundItem, RefundStatus } from '../../../../types';

const { Text } = Typography;

interface RefundsLedgerTabProps {
  refunds: RefundItem[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}

export const RefundsLedgerTab: React.FC<RefundsLedgerTabProps> = ({
  refunds,
  loading,
  canManage,
  onRefresh,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getRefundStatusTag = (status: RefundStatus) => {
    switch (status) {
      case 'PENDING':
        return <Tag color="warning">Chờ xử lý</Tag>;
      case 'PROCESSING':
        return <Tag color="processing">Đang giải ngân</Tag>;
      case 'COMPLETED':
        return <Tag color="success">Đã hoàn tiền</Tag>;
      case 'FAILED':
        return <Tag color="error">Thất bại</Tag>;
      case 'CANCELLED':
        return <Tag color="default">Đã hủy</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const handleProcess = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.processRefund(refundId);
      message.success('Đã chuyển trạng thái sang Đang giải ngân (PROCESSING)');
      onRefresh();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Xử lý hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.completeRefund(refundId);
      message.success('Đã hoàn tất lệnh hoàn tiền (COMPLETED)');
      onRefresh();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Hoàn tất hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<RefundItem> = [
    {
      title: 'Mã hoàn tiền',
      dataIndex: 'refundNumber',
      key: 'refundNumber',
      width: 170,
      render: (text: string) => <Text strong code style={{ color: '#9333ea' }}>{text}</Text>,
    },
    {
      title: 'Mã yêu cầu đổi trả',
      dataIndex: 'returnId',
      key: 'returnId',
      width: 160,
      render: (val: string) => <Text code>#{val.slice(0, 8)}</Text>,
    },
    {
      title: 'Số tiền hoàn',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      render: (val: number) => (
        <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
          {formatPrice(Number(val))}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: RefundStatus) => getRefundStatusTag(status),
    },
    {
      title: 'Lý do hoàn trả',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string) => val || '—',
    },
    {
      title: 'Ngày tạo / Xử lý',
      key: 'dates',
      width: 170,
      render: (_: any, record: RefundItem) => (
        <div>
          <Text style={{ fontSize: 12 }}>{formatDate(record.createdAt)}</Text>
          {record.processedAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Xử lý: {formatDate(record.processedAt)}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác giải ngân',
      key: 'action',
      width: 200,
      align: 'center',
      render: (_: any, record: RefundItem) => {
        if (!canManage) {
          return (
            <Tooltip title="Chỉ Quản lý (Manager/Admin) có quyền thực hiện giải ngân">
              <Button size="small" disabled>
                🔒 Xem quyền
              </Button>
            </Tooltip>
          );
        }

        if (record.status === 'PENDING') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleProcess(record.id)}
            >
              Bắt đầu giải ngân
            </Button>
          );
        }

        if (record.status === 'PROCESSING') {
          return (
            <Popconfirm
              title="Xác nhận hoàn tất hoàn tiền"
              description="Bạn xác nhận đã chuyển tiền thành công cho khách hàng?"
              onConfirm={() => handleComplete(record.id)}
              okText="Đã chuyển"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="small"
                style={{ background: '#16a34a' }}
                icon={<CheckCircleOutlined />}
                loading={actionLoadingId === record.id}
              >
                Xác nhận đã chuyển
              </Button>
            </Popconfirm>
          );
        }

        return <Text type="secondary" style={{ fontSize: 12 }}>Hoàn tất</Text>;
      },
    },
  ];

  return (
    <div>
      <Table
        dataSource={refunds}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/components/__tests__/RefundsLedgerTab.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Payments/components/RefundsLedgerTab.tsx frontend/src/pages/Admin/Payments/components/__tests__/RefundsLedgerTab.spec.tsx
git commit -m "feat(payments): add RefundsLedgerTab with RBAC controls and unit tests"
```

---

### Task 6: Main Admin Payments Page, Layout Menu & Route Integration

**Files:**
- Create: `frontend/src/pages/Admin/Payments/AdminPaymentsPage.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Test: `frontend/src/pages/Admin/Payments/__tests__/AdminPaymentsPage.spec.tsx`

- [ ] **Step 1: Write failing test for AdminPaymentsPage**

Create `frontend/src/pages/Admin/Payments/__tests__/AdminPaymentsPage.spec.tsx`:
```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPaymentsPage } from '../AdminPaymentsPage';
import { paymentService } from '../../../../services/paymentService';
import { returnService } from '../../../../services/returnService';
import { useAuthStore } from '../../../../stores/useAuthStore';

vi.mock('../../../../services/paymentService', () => ({
  paymentService: {
    getAllPaymentsAdmin: vi.fn(),
    getTransactionHistoryAdmin: vi.fn(),
  },
}));

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getRefundHistory: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('AdminPaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'u1', role: 'ADMIN', roles: ['ADMIN'] },
    } as any);

    vi.mocked(paymentService.getAllPaymentsAdmin).mockResolvedValue([
      { id: 'p1', orderId: 'o1', method: 'VIETQR', status: 'PENDING', amount: 5000000, createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(paymentService.getTransactionHistoryAdmin).mockResolvedValue([]);
    vi.mocked(returnService.getRefundHistory).mockResolvedValue([]);
  });

  it('renders page header and tabs correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/payments']}>
        <AdminPaymentsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quản lý Thanh toán & Dòng tiền')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Giao dịch thanh toán/)).toBeInTheDocument();
      expect(screen.getByText(/Đối soát ngân hàng/)).toBeInTheDocument();
      expect(screen.getByText(/Sổ cái hoàn tiền/)).toBeInTheDocument();
      expect(screen.getByText(/Nhật ký Gateway/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/__tests__/AdminPaymentsPage.spec.tsx`
Expected: FAIL (AdminPaymentsPage not found)

- [ ] **Step 3: Implement AdminPaymentsPage and integrate Route & Layout**

Create `frontend/src/pages/Admin/Payments/AdminPaymentsPage.tsx`:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Typography, Button, message, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { paymentService } from '../../../services/paymentService';
import { returnService } from '../../../services/returnService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { Payment, PaymentTransaction, RefundItem } from '../../../types';
import { PaymentStatsCards } from './components/PaymentStatsCards';
import { PaymentsListTab } from './components/PaymentsListTab';
import { ReconciliationTab } from './components/ReconciliationTab';
import { RefundsLedgerTab } from './components/RefundsLedgerTab';
import { TransactionsLogTab } from './components/TransactionsLogTab';

const { Title, Text } = Typography;

export const AdminPaymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'payments';

  const { user } = useAuthStore();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || (user?.roles as any)?.includes('ADMIN') || (user?.roles as any)?.includes('MANAGER');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, txnRes, refRes] = await Promise.all([
        paymentService.getAllPaymentsAdmin().catch(() => []),
        paymentService.getTransactionHistoryAdmin().catch(() => []),
        returnService.getRefundHistory().catch(() => []),
      ]);
      setPayments(Array.isArray(payRes) ? payRes : []);
      setTransactions(Array.isArray(txnRes) ? txnRes : []);
      setRefunds(Array.isArray(refRes) ? refRes : []);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể tải dữ liệu thanh toán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingReconcileCount = payments.filter(
    (p) => p.status === 'PENDING' && (p.method === 'VIETQR' || p.method === 'VNPAY')
  ).length;

  const tabItems = [
    {
      key: 'payments',
      label: `Giao dịch thanh toán (${payments.length})`,
      children: <PaymentsListTab payments={payments} loading={loading} />,
    },
    {
      key: 'reconciliation',
      label: (
        <span>
          Đối soát ngân hàng{' '}
          {pendingReconcileCount > 0 && (
            <Badge count={pendingReconcileCount} style={{ backgroundColor: '#f59e0b' }} />
          )}
        </span>
      ),
      children: (
        <ReconciliationTab
          payments={payments}
          loading={loading}
          canManage={canManage}
          onRefresh={loadData}
        />
      ),
    },
    {
      key: 'refunds',
      label: `Sổ cái hoàn tiền (${refunds.length})`,
      children: (
        <RefundsLedgerTab
          refunds={refunds}
          loading={loading}
          canManage={canManage}
          onRefresh={loadData}
        />
      ),
    },
    {
      key: 'transactions',
      label: `Nhật ký Gateway (${transactions.length})`,
      children: <TransactionsLogTab transactions={transactions} loading={loading} />,
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý Thanh toán & Dòng tiền
          </Title>
          <Text type="secondary">
            Theo dõi giao dịch đa kênh, đối soát chuyển khoản ngân hàng và kiểm soát lệnh hoàn tiền
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      <PaymentStatsCards payments={payments} refunds={refunds} loading={loading} />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={tabItems}
        type="card"
      />
    </div>
  );
};
```

In `frontend/src/layouts/AdminLayout.tsx`:
Add menu item for `/admin/payments`:
```typescript
    {
      key: '/admin/orders',
      icon: <OrderedListOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Đơn hàng',
    },
    {
      key: '/admin/payments',
      icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Thanh toán',
    },
    {
      key: '/admin/returns',
      icon: <UndoOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Đổi trả',
    },
```
And add breadcrumb mapping:
```typescript
    if (location.pathname === '/admin/payments') return 'Quản lý Thanh toán & Đối soát';
```

In `frontend/src/routes/AppRoutes.tsx`:
Import `AdminPaymentsPage`:
```typescript
import { AdminPaymentsPage } from '../pages/Admin/Payments/AdminPaymentsPage';
```
And register the route under Admin routes:
```typescript
          <Route
            path="/admin/payments"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminPaymentsPage />
              </RoleGuard>
            }
          />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- frontend/src/pages/Admin/Payments/__tests__/AdminPaymentsPage.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Payments/AdminPaymentsPage.tsx frontend/src/layouts/AdminLayout.tsx frontend/src/routes/AppRoutes.tsx frontend/src/pages/Admin/Payments/__tests__/AdminPaymentsPage.spec.tsx
git commit -m "feat(payments): add AdminPaymentsPage, navigation menu, and route integration"
```

---

### Task 7: Comprehensive Test Verification, Linting & Build

**Files:**
- Test: All frontend tests
- Build: Full frontend application build

- [ ] **Step 1: Run all unit tests for the Payments module and frontend**

Run: `npm --prefix frontend run test`
Expected: All tests pass with 0 failures

- [ ] **Step 2: Run linter**

Run: `npm --prefix frontend run lint`
Expected: No linting errors

- [ ] **Step 3: Run production build**

Run: `npm --prefix frontend run build`
Expected: Build succeeds with 0 TypeScript/bundling errors

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore(payments): verify all unit tests and production build pass"
```




