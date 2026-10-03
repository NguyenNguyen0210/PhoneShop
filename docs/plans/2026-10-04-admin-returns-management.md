# Kế Hoạch Triển Khai: Quản Lý Đổi Trả & Hoàn Tiền (/admin/returns)

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng toàn diện giao diện quản trị Đổi trả & Hoàn tiền cho Admin Portal (`/admin/returns`), đáp ứng xem bằng chứng đổi trả, thực hiện các bước tiếp nhận/kiểm định máy, và phân quyền nghiêm ngặt giữa Nhân viên (Staff) và Quản lý (Manager/Admin).

**Architecture:** Áp dụng kiến trúc module hóa với Ant Design. Tách biệt tầng Dịch vụ API (`returnService`), các Modal thao tác đơn nhiệm (`ReceiveReturnModal`, `RejectReturnModal`, `CreateRefundModal`), Component chi tiết hồ sơ (`ReturnDetailDrawer`), và Bảng điều phối trung tâm (`AdminReturnsPage`).

**Tech Stack:** React 19, TypeScript, Ant Design 5, Vite, Vitest, React Testing Library, Zustand.

---

## Danh Sách File Liên Quan

- **Types:**
  - `frontend/src/types/index.ts` (mở rộng `ReturnRequest`, `RefundItem`, `ReturnUser`, `RefundStatus`)
- **Services:**
  - `frontend/src/services/returnService.ts` (bổ sung các admin endpoints)
  - `frontend/src/services/__tests__/returnService.spec.ts` (unit tests cho service)
- **Components:**
  - `frontend/src/pages/Admin/Returns/components/ReturnStatusTag.tsx` (tag trạng thái)
  - `frontend/src/pages/Admin/Returns/components/ReceiveReturnModal.tsx` (modal nhận hàng)
  - `frontend/src/pages/Admin/Returns/components/RejectReturnModal.tsx` (modal từ chối)
  - `frontend/src/pages/Admin/Returns/components/CreateRefundModal.tsx` (modal hoàn tiền)
  - `frontend/src/pages/Admin/Returns/components/RefundSection.tsx` (danh sách hoàn tiền & giải ngân)
  - `frontend/src/pages/Admin/Returns/components/ReturnDetailDrawer.tsx` (drawer chi tiết & RBAC footer)
- **Pages & Routes:**
  - `frontend/src/pages/Admin/Returns/AdminReturnsPage.tsx` (trang quản lý)
  - `frontend/src/layouts/AdminLayout.tsx` (menu sidebar & breadcrumb)
  - `frontend/src/routes/AppRoutes.tsx` (đăng ký route được bảo vệ bởi RoleGuard)
- **Tests:**
  - `frontend/src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx` (test drawer & RBAC locks)
  - `frontend/src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx` (test table, filter, search)

---

### Task 1: Cập nhật Type Definitions trong `frontend/src/types/index.ts`

**Files:**
- Modify: `frontend/src/types/index.ts:276-320`

- [ ] **Step 1: Mở rộng các types `ReturnUser`, `RefundStatus`, `RefundItem`, và cập nhật `ReturnRequest`**

Chỉnh sửa `frontend/src/types/index.ts`:
```typescript
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ReturnUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface RefundItem {
  id: string;
  returnId: string;
  refundNumber: string;
  amount: number;
  status: RefundStatus;
  reason?: string;
  providerRef?: string;
  processedAt?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  returnNumber: string;
  status: ReturnStatus;
  reason: string;
  customerNote?: string;
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items: ReturnItem[];
  order?: Order;
  user?: ReturnUser;
  refunds?: RefundItem[];
}
```

- [ ] **Step 2: Kiểm tra biên dịch TypeScript**

Chạy: `npx --prefix frontend tsc --noEmit`
Kỳ vọng: Không có lỗi biên dịch liên quan đến types.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): expand ReturnRequest with user, refunds, and refund item types"
```

---

### Task 2: Mở rộng API Service & Viết Unit Test (`returnService.ts`)

**Files:**
- Modify: `frontend/src/services/returnService.ts`
- Create: `frontend/src/services/__tests__/returnService.spec.ts`

- [ ] **Step 1: Viết test thất bại cho các phương thức Admin của `returnService`**

Tạo `frontend/src/services/__tests__/returnService.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { returnService } from '../returnService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('returnService - Admin methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllReturnsAdmin calls GET /returns', async () => {
    const mockData = [{ id: 'ret-1', returnNumber: 'RET-001', status: 'REQUESTED' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const result = await returnService.getAllReturnsAdmin();
    expect(apiClient.get).toHaveBeenCalledWith('/returns');
    expect(result).toEqual(mockData);
  });

  it('getReturnDetailAdmin calls GET /returns/:id', async () => {
    const mockDetail = { id: 'ret-1', returnNumber: 'RET-001', reason: 'Defective screen' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockDetail } });

    const result = await returnService.getReturnDetailAdmin('ret-1');
    expect(apiClient.get).toHaveBeenCalledWith('/returns/ret-1');
    expect(result).toEqual(mockDetail);
  });

  it('approveReturn calls PUT /returns/:id/approve with adminNote', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'APPROVED' } } });

    await returnService.approveReturn('ret-1', 'Approved for inspection');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/approve', { adminNote: 'Approved for inspection' });
  });

  it('rejectReturn calls PUT /returns/:id/reject with required adminNote', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'REJECTED' } } });

    await returnService.rejectReturn('ret-1', 'Liquid damage');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/reject', { adminNote: 'Liquid damage' });
  });

  it('receiveReturn calls PUT /returns/:id/receive', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'RECEIVED' } } });

    await returnService.receiveReturn('ret-1', 'Box intact, serial matches');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/receive', { adminNote: 'Box intact, serial matches' });
  });

  it('inspectReturn calls PUT /returns/:id/inspect', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'INSPECTING' } } });

    await returnService.inspectReturn('ret-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/inspect');
  });

  it('completeReturn calls PUT /returns/:id/complete', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'COMPLETED' } } });

    await returnService.completeReturn('ret-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/ret-1/complete');
  });

  it('createRefund calls POST /returns/refunds with payload', async () => {
    const payload = { returnId: 'ret-1', amount: 5000000, reason: 'Screen glitch refund' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: { id: 'ref-1', amount: 5000000 } } });

    const res = await returnService.createRefund(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/returns/refunds', payload);
    expect(res).toEqual({ id: 'ref-1', amount: 5000000 });
  });

  it('processRefund calls PUT /returns/refunds/:id/process', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'PROCESSING' } } });

    await returnService.processRefund('ref-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/refunds/ref-1/process');
  });

  it('completeRefund calls PUT /returns/refunds/:id/complete', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { status: 'COMPLETED' } } });

    await returnService.completeRefund('ref-1');
    expect(apiClient.put).toHaveBeenCalledWith('/returns/refunds/ref-1/complete');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Chạy: `npx --prefix frontend vitest run src/services/__tests__/returnService.spec.ts`
Kỳ vọng: FAIL vì các hàm admin chưa được định nghĩa trong `returnService`.

- [ ] **Step 3: Cập nhật `returnService.ts` với đầy đủ các phương thức Admin**

Cập nhật `frontend/src/services/returnService.ts`:
```typescript
import { apiClient } from './apiClient';
import type { ReturnRequest, RefundItem } from '../types';

export interface CreateReturnPayload {
  orderId: string;
  reason: string;
  customerNote?: string;
  items: {
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
  }[];
}

export interface CreateRefundPayload {
  returnId: string;
  amount: number;
  reason?: string;
}

export const returnService = {
  // Storefront methods
  async createReturn(payload: CreateReturnPayload): Promise<ReturnRequest> {
    const response = await apiClient.post('/returns', payload);
    return response.data?.data ?? response.data;
  },

  async getMyReturns(): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns/my');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getMyReturnById(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/my/${id}`);
    return response.data?.data ?? response.data;
  },

  async cancelReturn(id: string): Promise<void> {
    await apiClient.delete(`/returns/my/${id}/cancel`);
  },

  // Admin methods
  async getAllReturnsAdmin(): Promise<ReturnRequest[]> {
    const response = await apiClient.get('/returns');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },

  async getReturnDetailAdmin(id: string): Promise<ReturnRequest> {
    const response = await apiClient.get(`/returns/${id}`);
    return response.data?.data ?? response.data;
  },

  async approveReturn(id: string, adminNote?: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/approve`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async rejectReturn(id: string, adminNote: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/reject`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async markShippingReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/mark-shipping`);
    return response.data?.data ?? response.data;
  },

  async receiveReturn(id: string, adminNote?: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/receive`, { adminNote });
    return response.data?.data ?? response.data;
  },

  async inspectReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/inspect`);
    return response.data?.data ?? response.data;
  },

  async completeReturn(id: string): Promise<ReturnRequest> {
    const response = await apiClient.put(`/returns/${id}/complete`);
    return response.data?.data ?? response.data;
  },

  async createRefund(payload: CreateRefundPayload): Promise<RefundItem> {
    const response = await apiClient.post('/returns/refunds', payload);
    return response.data?.data ?? response.data;
  },

  async processRefund(refundId: string): Promise<RefundItem> {
    const response = await apiClient.put(`/returns/refunds/${refundId}/process`);
    return response.data?.data ?? response.data;
  },

  async completeRefund(refundId: string): Promise<RefundItem> {
    const response = await apiClient.put(`/returns/refunds/${refundId}/complete`);
    return response.data?.data ?? response.data;
  },

  async getRefundHistory(): Promise<RefundItem[]> {
    const response = await apiClient.get('/returns/refunds/history');
    const data = response.data?.data ?? response.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  },
};
```

- [ ] **Step 4: Chạy test để xác nhận test vượt qua**

Chạy: `npx --prefix frontend vitest run src/services/__tests__/returnService.spec.ts`
Kỳ vọng: PASS (tất cả 10 test case vượt qua).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/returnService.ts frontend/src/services/__tests__/returnService.spec.ts
git commit -m "feat(services): add admin return and refund API endpoints with unit tests"
```

---

### Task 3: Component `ReturnStatusTag.tsx`

**Files:**
- Create: `frontend/src/pages/Admin/Returns/components/ReturnStatusTag.tsx`

- [ ] **Step 1: Tạo `ReturnStatusTag.tsx` hiển thị Tag màu chuẩn theo trạng thái**

Tạo `frontend/src/pages/Admin/Returns/components/ReturnStatusTag.tsx`:
```tsx
import React from 'react';
import { Tag } from 'antd';
import type { ReturnStatus } from '../../../../types';

interface ReturnStatusTagProps {
  status: ReturnStatus;
}

export const ReturnStatusTag: React.FC<ReturnStatusTagProps> = ({ status }) => {
  switch (status) {
    case 'REQUESTED':
      return <Tag color="warning">Chờ tiếp nhận</Tag>;
    case 'APPROVED':
      return <Tag color="processing">Chờ gửi máy</Tag>;
    case 'SHIPPING':
      return <Tag color="cyan">Đang gửi về kho</Tag>;
    case 'RECEIVED':
      return <Tag color="geekblue">Đã nhận tại kho</Tag>;
    case 'INSPECTING':
      return <Tag color="orange">Đang kiểm định</Tag>;
    case 'COMPLETED':
      return <Tag color="success">Đã hoàn tất</Tag>;
    case 'REJECTED':
      return <Tag color="error">Đã từ chối</Tag>;
    case 'CANCELLED':
      return <Tag color="default">Khách đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Admin/Returns/components/ReturnStatusTag.tsx
git commit -m "feat(returns): create ReturnStatusTag component"
```

---

### Task 4: Các Modal Thao Tác Nghiệp Vụ (`ReceiveReturnModal`, `RejectReturnModal`, `CreateRefundModal`)

**Files:**
- Create: `frontend/src/pages/Admin/Returns/components/ReceiveReturnModal.tsx`
- Create: `frontend/src/pages/Admin/Returns/components/RejectReturnModal.tsx`
- Create: `frontend/src/pages/Admin/Returns/components/CreateRefundModal.tsx`

- [ ] **Step 1: Tạo `ReceiveReturnModal.tsx`**

Modal cho Staff xác nhận đã nhận máy từ shipper kèm ô nhập `adminNote`.
Tạo `frontend/src/pages/Admin/Returns/components/ReceiveReturnModal.tsx`:
```tsx
import React, { useState } from 'react';
import { Modal, Input, Typography, message } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface ReceiveReturnModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (updated: ReturnRequest) => void;
}

export const ReceiveReturnModal: React.FC<ReceiveReturnModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!returnRecord) return;
    setLoading(true);
    try {
      const updated = await returnService.receiveReturn(returnRecord.id, note.trim() || undefined);
      message.success('Đã xác nhận nhận kiện hàng thành công');
      setNote('');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Xác nhận nhận hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Xác nhận nhận hàng đổi trả (Receive Return)"
      open={visible}
      onOk={handleConfirm}
      confirmLoading={loading}
      onCancel={() => {
        setNote('');
        onClose();
      }}
      okText="Xác nhận đã nhận"
      cancelText="Hủy"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Mã yêu cầu: <strong>{returnRecord?.returnNumber}</strong></Text>
        <br />
        <Text type="secondary">
          Vui lòng ghi chú hiện trạng kiện hàng khi khui hộp (ngoại quan, tem niêm phong, phụ kiện kèm theo).
        </Text>
      </div>
      <TextArea
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ví dụ: Đã nhận kiện hàng từ bưu tá, hộp còn nguyên vẹn, phụ kiện đủ cáp sạc, máy có vết trầy viền..."
      />
    </Modal>
  );
};
```

- [ ] **Step 2: Tạo `RejectReturnModal.tsx`**

Modal nhập lý do từ chối (bắt buộc nhập `adminNote`).
Tạo `frontend/src/pages/Admin/Returns/components/RejectReturnModal.tsx`:
```tsx
import React, { useState } from 'react';
import { Modal, Input, Typography, message } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface RejectReturnModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (updated: ReturnRequest) => void;
}

export const RejectReturnModal: React.FC<RejectReturnModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!returnRecord) return;
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối yêu cầu đổi trả');
      return;
    }

    setLoading(true);
    try {
      const updated = await returnService.rejectReturn(returnRecord.id, rejectReason.trim());
      message.success('Đã từ chối yêu cầu đổi trả');
      setRejectReason('');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác từ chối thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Từ chối yêu cầu đổi trả (Reject Return)"
      open={visible}
      onOk={handleConfirm}
      confirmLoading={loading}
      onCancel={() => {
        setRejectReason('');
        onClose();
      }}
      okText="Xác nhận từ chối"
      okButtonProps={{ danger: true }}
      cancelText="Quay lại"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Mã yêu cầu: <strong>{returnRecord?.returnNumber}</strong></Text>
        <br />
        <Text type="danger">
          Lý do từ chối là bắt buộc và sẽ được hiển thị cho khách hàng cũng như lưu hồ sơ kiểm tra.
        </Text>
      </div>
      <TextArea
        rows={4}
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="Ví dụ: Thiết bị có dấu hiệu cấn móp, ngấm chất lỏng, từ chối theo điều khoản bảo hành..."
      />
    </Modal>
  );
};
```

- [ ] **Step 3: Tạo `CreateRefundModal.tsx`**

Modal cho Manager/Admin tạo lệnh hoàn tiền, validate số tiền <= tổng tiền đơn hàng.
Tạo `frontend/src/pages/Admin/Returns/components/CreateRefundModal.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, InputNumber, Typography, message, Alert } from 'antd';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest, RefundItem } from '../../../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface CreateRefundModalProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onSuccess: (newRefund: RefundItem) => void;
}

export const CreateRefundModal: React.FC<CreateRefundModalProps> = ({
  visible,
  returnRecord,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const orderTotal = Number(returnRecord?.order?.totalAmount ?? 0);
  const alreadyRefunded = (returnRecord?.refunds ?? [])
    .filter((r) => r.status !== 'FAILED' && r.status !== 'CANCELLED')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const maxRefundable = Math.max(0, orderTotal - alreadyRefunded);

  useEffect(() => {
    if (visible && returnRecord) {
      setAmount(maxRefundable);
      setReason(`Hoàn tiền đổi trả thiết bị cho yêu cầu ${returnRecord.returnNumber}`);
    }
  }, [visible, returnRecord, maxRefundable]);

  const handleCreate = async () => {
    if (!returnRecord) return;
    if (!amount || amount <= 0) {
      message.warning('Số tiền hoàn phải lớn hơn 0 ₫');
      return;
    }
    if (amount > maxRefundable) {
      message.error(`Số tiền hoàn không được vượt quá số tiền tối đa còn lại (${formatPrice(maxRefundable)})`);
      return;
    }

    setLoading(true);
    try {
      const res = await returnService.createRefund({
        returnId: returnRecord.id,
        amount,
        reason: reason.trim() || undefined,
      });
      message.success('Đã lập lệnh hoàn tiền thành công (Trạng thái: PENDING)');
      onSuccess(res);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lập lệnh hoàn tiền thất bại');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <Modal
      title="Lập lệnh hoàn tiền (Manager/Admin)"
      open={visible}
      onOk={handleCreate}
      confirmLoading={loading}
      onCancel={onClose}
      okText="Tạo lệnh hoàn tiền"
      cancelText="Hủy"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          message="Chính sách hoàn tiền an toàn"
          description={
            <div>
              <div>Tổng giá trị đơn hàng: <strong>{formatPrice(orderTotal)}</strong></div>
              <div>Đã tạo hoàn tiền trước đó: <strong>{formatPrice(alreadyRefunded)}</strong></div>
              <div>Số tiền tối đa có thể hoàn: <strong style={{ color: '#2563eb' }}>{formatPrice(maxRefundable)}</strong></div>
            </div>
          }
          style={{ marginBottom: 12 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Số tiền hoàn trả (VNĐ):</Text>
        <InputNumber
          style={{ width: '100%', marginTop: 4 }}
          value={amount}
          min={1000}
          max={maxRefundable}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
          onChange={(val) => setAmount(Number(val || 0))}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Lý do hoàn tiền:</Text>
        <TextArea
          rows={3}
          style={{ marginTop: 4 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do hoàn tiền..."
        />
      </div>
    </Modal>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Admin/Returns/components/ReceiveReturnModal.tsx frontend/src/pages/Admin/Returns/components/RejectReturnModal.tsx frontend/src/pages/Admin/Returns/components/CreateRefundModal.tsx
git commit -m "feat(returns): add Receive, Reject, and CreateRefund modals"
```

---

### Task 5: Component `RefundSection.tsx`

**Files:**
- Create: `frontend/src/pages/Admin/Returns/components/RefundSection.tsx`

- [ ] **Step 1: Tạo `RefundSection.tsx`**

Component hiển thị các đợt hoàn tiền của yêu cầu return này, hỗ trợ Manager/Admin bấm "Giải ngân (Process)" và "Hoàn tất chi tiền (Complete)".
Tạo `frontend/src/pages/Admin/Returns/components/RefundSection.tsx`:
```tsx
import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, message, Popconfirm } from 'antd';
import { DollarOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { returnService } from '../../../../services/returnService';
import type { RefundItem, RefundStatus } from '../../../../types';

const { Text } = Typography;

interface RefundSectionProps {
  refunds: RefundItem[];
  canManageRefunds: boolean; // true for MANAGER and ADMIN
  onRefundUpdated: () => void;
}

export const RefundSection: React.FC<RefundSectionProps> = ({
  refunds,
  canManageRefunds,
  onRefundUpdated,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
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
      onRefundUpdated();
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
      onRefundUpdated();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Hoàn tất hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      title: 'Mã hoàn tiền',
      dataIndex: 'refundNumber',
      key: 'refundNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <Text style={{ color: '#2563eb', fontWeight: 600 }}>{formatPrice(Number(val))}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: RefundStatus) => getRefundStatusTag(status),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string) => val || '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: RefundItem) => {
        if (!canManageRefunds) {
          return <Text type="secondary" style={{ fontSize: 12 }}>🔒 Chỉ Manager</Text>;
        }

        if (record.status === 'PENDING') {
          return (
            <Button
              size="small"
              type="primary"
              icon={<SyncOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleProcess(record.id)}
            >
              Giải ngân
            </Button>
          );
        }

        if (record.status === 'PROCESSING') {
          return (
            <Popconfirm
              title="Xác nhận đã giải ngân thành công cho khách hàng?"
              onConfirm={() => handleComplete(record.id)}
              okText="Xác nhận"
              cancelText="Hủy"
            >
              <Button
                size="small"
                type="primary"
                style={{ background: '#16a34a' }}
                icon={<CheckCircleOutlined />}
                loading={actionLoadingId === record.id}
              >
                Hoàn tất
              </Button>
            </Popconfirm>
          );
        }

        return <Text type="secondary">—</Text>;
      },
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <DollarOutlined style={{ color: '#16a34a' }} />
          <span>Lịch sử & Lệnh hoàn tiền ({refunds.length})</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Table
        dataSource={refunds}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'Chưa có lệnh hoàn tiền nào được tạo' }}
      />
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Admin/Returns/components/RefundSection.tsx
git commit -m "feat(returns): create RefundSection component with role-based refund processing"
```

---

### Task 6: Component `ReturnDetailDrawer.tsx` & RBAC Tests

**Files:**
- Create: `frontend/src/pages/Admin/Returns/components/ReturnDetailDrawer.tsx`
- Create: `frontend/src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx`

- [ ] **Step 1: Viết test cho `ReturnDetailDrawer.spec.tsx` kiểm tra Evidence và Khóa quyền RBAC**

Tạo `frontend/src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReturnDetailDrawer } from '../components/ReturnDetailDrawer';
import type { ReturnRequest } from '../../../../types';

// Mock useAuthStore
const mockUseAuthStore = vi.fn();
vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

const sampleReturn: ReturnRequest = {
  id: 'ret-101',
  orderId: 'ord-202',
  userId: 'usr-303',
  returnNumber: 'RET-1741-TEST',
  status: 'RECEIVED',
  reason: 'Màn hình bị sọc xanh ngang dọc',
  customerNote: 'Máy mới nhận hôm qua mở lên đã bị sọc, còn nguyên hộp và sạc',
  adminNote: 'Kiểm tra ngoại quan máy chưa trầy xước',
  requestedAt: '2026-10-01T10:00:00Z',
  receivedAt: '2026-10-02T14:00:00Z',
  order: {
    id: 'ord-202',
    orderNumber: 'ORD-9988',
    totalAmount: 25000000,
    status: 'DELIVERED',
    items: [],
    shippingAddress: {
      recipientName: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'Quan 1',
      province: 'TP.HCM',
    },
    createdAt: '2026-09-28T09:00:00Z',
  } as any,
  user: {
    id: 'usr-303',
    email: 'khachhang@example.com',
    firstName: 'Van A',
    lastName: 'Nguyen',
  },
  items: [
    {
      id: 'item-1',
      returnId: 'ret-101',
      orderItemId: 'oi-1',
      quantity: 1,
      reason: 'Lỗi tấm nền OLED',
      condition: 'Nguyên vẹn',
    },
  ],
  refunds: [],
};

describe('ReturnDetailDrawer - Evidence & RBAC', () => {
  it('renders return reasons, customer note evidence, and order info', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('RET-1741-TEST')).toBeDefined();
    expect(screen.getByText('Màn hình bị sọc xanh ngang dọc')).toBeDefined();
    expect(screen.getByText(/Máy mới nhận hôm qua mở lên đã bị sọc/)).toBeDefined();
    expect(screen.getByText(/Kiểm tra ngoại quan máy chưa trầy xước/)).toBeDefined();
    expect(screen.getByText('ORD-9988')).toBeDefined();
  });

  it('disables Complete and Refund buttons with lock icon for STAFF user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'STAFF' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    const completeBtn = screen.getByTestId('btn-complete-return');
    const refundBtn = screen.getByTestId('btn-create-refund');

    expect(completeBtn).toBeDefined();
    expect(completeBtn.hasAttribute('disabled')).toBe(true);

    expect(refundBtn).toBeDefined();
    expect(refundBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables Complete and Refund buttons for MANAGER user', () => {
    mockUseAuthStore.mockReturnValue({
      user: { role: 'MANAGER' },
    });

    render(
      <ReturnDetailDrawer
        visible={true}
        returnRecord={sampleReturn}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    );

    const completeBtn = screen.getByTestId('btn-complete-return');
    const refundBtn = screen.getByTestId('btn-create-refund');

    expect(completeBtn.hasAttribute('disabled')).toBe(false);
    expect(refundBtn.hasAttribute('disabled')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Chạy: `npx --prefix frontend vitest run src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx`
Kỳ vọng: FAIL vì `ReturnDetailDrawer.tsx` chưa được tạo.

- [ ] **Step 3: Tạo `ReturnDetailDrawer.tsx`**

Tạo `frontend/src/pages/Admin/Returns/components/ReturnDetailDrawer.tsx`:
```tsx
import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Divider,
  Typography,
  Space,
  Button,
  Table,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  InboxOutlined,
  LockOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { returnService } from '../../../../services/returnService';
import type { ReturnRequest, ReturnItem } from '../../../../types';
import { ReturnStatusTag } from './ReturnStatusTag';
import { ReceiveReturnModal } from './ReceiveReturnModal';
import { RejectReturnModal } from './RejectReturnModal';
import { CreateRefundModal } from './CreateRefundModal';
import { RefundSection } from './RefundSection';

const { Title, Text, Paragraph } = Typography;

interface ReturnDetailDrawerProps {
  visible: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onUpdated: (updated: ReturnRequest) => void;
}

export const ReturnDetailDrawer: React.FC<ReturnDetailDrawerProps> = ({
  visible,
  returnRecord,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const isManagerOrAdmin = userRole === 'MANAGER' || userRole === 'ADMIN';

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!returnRecord) return null;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const updated = await returnService.approveReturn(returnRecord.id);
      message.success('Đã phê duyệt tiếp nhận yêu cầu đổi trả');
      onUpdated(updated);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Phê duyệt thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkShipping = async () => {
    setActionLoading(true);
    try {
      const updated = await returnService.markShippingReturn(returnRecord.id);
      message.success('Đã chuyển trạng thái sang Đang gửi về kho (SHIPPING)');
      onUpdated(updated);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspect = async () => {
    setActionLoading(true);
    try {
      const updated = await returnService.inspectReturn(returnRecord.id);
      message.success('Đã chuyển trạng thái sang Đang kiểm định (INSPECTING)');
      onUpdated(updated);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Chuyển kiểm định thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteReturn = async () => {
    if (!isManagerOrAdmin) {
      message.warning('Chỉ Quản lý (Manager/Admin) mới có quyền hoàn tất đổi trả và nhập kho');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await returnService.completeReturn(returnRecord.id);
      message.success('Đã hoàn tất đổi trả và khôi phục số lượng/IMEI tồn kho');
      onUpdated(updated);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Hoàn tất đổi trả thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshDetail = async () => {
    try {
      const fresh = await returnService.getReturnDetailAdmin(returnRecord.id);
      onUpdated(fresh);
    } catch {
      // Ignored
    }
  };

  const itemColumns = [
    {
      title: 'Mã mục đơn',
      dataIndex: 'orderItemId',
      key: 'orderItemId',
      render: (val: string) => <Text code>{val.slice(0, 8)}...</Text>,
    },
    {
      title: 'Số lượng trả',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Tình trạng máy',
      dataIndex: 'condition',
      key: 'condition',
      render: (cond?: string) => cond ? <Tag color="blue">{cond}</Tag> : '—',
    },
    {
      title: 'Lý do riêng món này',
      dataIndex: 'reason',
      key: 'reason',
      render: (r?: string) => r || '—',
    },
  ];

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text strong style={{ fontSize: 16 }}>{returnRecord.returnNumber}</Text>
              <ReturnStatusTag status={returnRecord.status} />
            </Space>
          </div>
        }
        placement="right"
        width={760}
        onClose={onClose}
        open={visible}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Button onClick={onClose}>Đóng</Button>
            <Space wrap>
              {/* REQUESTED Actions */}
              {returnRecord.status === 'REQUESTED' && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={actionLoading}
                    onClick={handleApprove}
                  >
                    Duyệt tiếp nhận
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setIsRejectModalOpen(true)}
                  >
                    Từ chối
                  </Button>
                </>
              )}

              {/* APPROVED Actions */}
              {returnRecord.status === 'APPROVED' && (
                <>
                  <Button
                    icon={<CarOutlined />}
                    loading={actionLoading}
                    onClick={handleMarkShipping}
                  >
                    Đang gửi về kho
                  </Button>
                  <Button
                    type="primary"
                    icon={<InboxOutlined />}
                    onClick={() => setIsReceiveModalOpen(true)}
                  >
                    Xác nhận nhận hàng
                  </Button>
                </>
              )}

              {/* SHIPPING Actions */}
              {returnRecord.status === 'SHIPPING' && (
                <Button
                  type="primary"
                  icon={<InboxOutlined />}
                  onClick={() => setIsReceiveModalOpen(true)}
                >
                  Xác nhận nhận hàng
                </Button>
              )}

              {/* RECEIVED Actions */}
              {returnRecord.status === 'RECEIVED' && (
                <>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    loading={actionLoading}
                    onClick={handleInspect}
                  >
                    Bắt đầu kiểm định (Inspect)
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setIsRejectModalOpen(true)}
                  >
                    Từ chối
                  </Button>
                </>
              )}

              {/* INSPECTING Actions */}
              {returnRecord.status === 'INSPECTING' && (
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setIsRejectModalOpen(true)}
                >
                  Từ chối sau kiểm định
                </Button>
              )}

              {/* Complete Return (Manager/Admin Only) */}
              {(returnRecord.status === 'RECEIVED' || returnRecord.status === 'INSPECTING') && (
                <Tooltip
                  title={
                    isManagerOrAdmin
                      ? 'Hoàn tất quy trình, trả máy và khôi phục tồn kho/IMEI'
                      : 'Chỉ Quản lý (Manager/Admin) có quyền thực hiện thao tác này'
                  }
                >
                  <span>
                    <Popconfirm
                      title="Xác nhận hoàn tất đổi trả và khôi phục tồn kho thiết bị?"
                      disabled={!isManagerOrAdmin}
                      onConfirm={handleCompleteReturn}
                      okText="Xác nhận"
                      cancelText="Hủy"
                    >
                      <Button
                        type="primary"
                        data-testid="btn-complete-return"
                        disabled={!isManagerOrAdmin}
                        loading={actionLoading}
                        style={{ background: isManagerOrAdmin ? '#16a34a' : undefined }}
                        icon={isManagerOrAdmin ? <CheckCircleOutlined /> : <LockOutlined />}
                      >
                        Hoàn tất đổi trả
                      </Button>
                    </Popconfirm>
                  </span>
                </Tooltip>
              )}

              {/* Create Refund (Manager/Admin Only) */}
              {(returnRecord.status === 'RECEIVED' || returnRecord.status === 'COMPLETED') && (
                <Tooltip
                  title={
                    isManagerOrAdmin
                      ? 'Lập lệnh hoàn tiền cho khách hàng'
                      : 'Chỉ Quản lý (Manager/Admin) có quyền lập lệnh hoàn tiền'
                  }
                >
                  <span>
                    <Button
                      data-testid="btn-create-refund"
                      disabled={!isManagerOrAdmin}
                      icon={isManagerOrAdmin ? <DollarOutlined /> : <LockOutlined />}
                      onClick={() => setIsRefundModalOpen(true)}
                    >
                      Tạo lệnh hoàn tiền
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Space>
          </div>
        }
      >
        {/* KHỐI 1: THÔNG TIN ĐƠN HÀNG VÀ KHÁCH HÀNG */}
        <Card size="small" title="Thông tin Đơn hàng & Khách hàng" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Mã đơn hàng">
              <Text strong>{returnRecord.order?.orderNumber || returnRecord.orderId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền đơn">
              <Text style={{ color: '#2563eb', fontWeight: 600 }}>
                {formatPrice(Number(returnRecord.order?.totalAmount ?? 0))}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {returnRecord.user?.firstName || returnRecord.user?.lastName
                ? `${returnRecord.user?.lastName || ''} ${returnRecord.user?.firstName || ''}`
                : returnRecord.user?.email || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Email liên hệ">
              {returnRecord.user?.email || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày đặt mua">
              {formatDate(returnRecord.order?.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày yêu cầu đổi">
              {formatDate(returnRecord.requestedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* KHỐI 2: LÝ DO & BẰNG CHỨNG (EVIDENCE & NOTES) */}
        <Card size="small" title="Lý do & Bằng chứng từ Khách hàng" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">Lý do yêu cầu đổi trả:</Text>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 4 }}>
              <Text strong style={{ color: '#0f172a' }}>{returnRecord.reason}</Text>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">Ghi chú chi tiết của khách (Evidence Note):</Text>
            <div style={{ background: '#eff6ff', padding: '8px 12px', borderRadius: 6, border: '1px solid #bfdbfe', marginTop: 4 }}>
              <Paragraph style={{ margin: 0, fontStyle: 'italic', color: '#1e3a8a' }}>
                {returnRecord.customerNote || 'Không có ghi chú thêm từ khách.'}
              </Paragraph>
            </div>
          </div>

          {returnRecord.adminNote && (
            <div>
              <Text type="secondary">Ghi chú từ Nhân viên / Quản lý (Admin Note):</Text>
              <div style={{ background: '#fef2f2', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca', marginTop: 4 }}>
                <Paragraph style={{ margin: 0, color: '#991b1b' }}>
                  {returnRecord.adminNote}
                </Paragraph>
              </div>
            </div>
          )}
        </Card>

        {/* KHỐI 3: DANH SÁCH MÁY ĐỔI TRẢ */}
        <Card size="small" title={`Danh sách thiết bị đổi trả (${returnRecord.items?.length || 0})`} style={{ marginBottom: 16 }}>
          <Table
            dataSource={returnRecord.items || []}
            columns={itemColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>

        {/* KHỐI 4: LỊCH SỬ HOÀN TIỀN */}
        <RefundSection
          refunds={returnRecord.refunds || []}
          canManageRefunds={isManagerOrAdmin}
          onRefundUpdated={refreshDetail}
        />
      </Drawer>

      {/* Modals */}
      <ReceiveReturnModal
        visible={isReceiveModalOpen}
        returnRecord={returnRecord}
        onClose={() => setIsReceiveModalOpen(false)}
        onSuccess={(updated) => onUpdated(updated)}
      />

      <RejectReturnModal
        visible={isRejectModalOpen}
        returnRecord={returnRecord}
        onClose={() => setIsRejectModalOpen(false)}
        onSuccess={(updated) => onUpdated(updated)}
      />

      <CreateRefundModal
        visible={isRefundModalOpen}
        returnRecord={returnRecord}
        onClose={() => setIsRefundModalOpen(false)}
        onSuccess={() => refreshDetail()}
      />
    </>
  );
};
```

- [ ] **Step 4: Chạy test để xác nhận test vượt qua**

Chạy: `npx --prefix frontend vitest run src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx`
Kỳ vọng: PASS (tất cả 3 test case vượt qua).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Returns/components/ReturnDetailDrawer.tsx frontend/src/pages/Admin/Returns/__tests__/ReturnDetailDrawer.spec.tsx
git commit -m "feat(returns): create ReturnDetailDrawer with evidence display and RBAC lock enforcement"
```

---

### Task 7: Trang Chính `AdminReturnsPage.tsx` & Component Tests

**Files:**
- Create: `frontend/src/pages/Admin/Returns/AdminReturnsPage.tsx`
- Create: `frontend/src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx`

- [ ] **Step 1: Viết test cho `AdminReturnsPage.spec.tsx`**

Tạo `frontend/src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminReturnsPage } from '../AdminReturnsPage';
import { returnService } from '../../../../services/returnService';

vi.mock('../../../../services/returnService', () => ({
  returnService: {
    getAllReturnsAdmin: vi.fn(),
    getReturnDetailAdmin: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { role: 'STAFF' },
  }),
}));

const mockReturns = [
  {
    id: 'ret-1',
    orderId: 'ord-1',
    userId: 'usr-1',
    returnNumber: 'RET-001',
    status: 'REQUESTED',
    reason: 'Hỏng loa thoại',
    customerNote: 'Loa rè không nghe rõ',
    requestedAt: '2026-10-01T10:00:00Z',
    items: [{ id: 'item-1', quantity: 1 }],
    order: { orderNumber: 'ORD-101', totalAmount: 15000000 },
    user: { email: 'customer1@test.com' },
    refunds: [],
  },
  {
    id: 'ret-2',
    orderId: 'ord-2',
    userId: 'usr-2',
    returnNumber: 'RET-002',
    status: 'RECEIVED',
    reason: 'Lỗi pin phồng',
    customerNote: 'Pin tụt nhanh',
    requestedAt: '2026-10-02T10:00:00Z',
    items: [{ id: 'item-2', quantity: 1 }],
    order: { orderNumber: 'ORD-102', totalAmount: 20000000 },
    user: { email: 'customer2@test.com' },
    refunds: [],
  },
];

describe('AdminReturnsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders returns table and loads data', async () => {
    vi.mocked(returnService.getAllReturnsAdmin).mockResolvedValueOnce(mockReturns as any);

    render(<AdminReturnsPage />);

    expect(screen.getByText('Quản lý Đổi trả & Hoàn tiền')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('RET-001')).toBeDefined();
      expect(screen.getByText('RET-002')).toBeDefined();
      expect(screen.getByText('ORD-101')).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Chạy: `npx --prefix frontend vitest run src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx`
Kỳ vọng: FAIL vì `AdminReturnsPage.tsx` chưa được tạo.

- [ ] **Step 3: Tạo `AdminReturnsPage.tsx`**

Tạo `frontend/src/pages/Admin/Returns/AdminReturnsPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tabs,
  Input,
  Space,
  Typography,
  message,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { returnService } from '../../../services/returnService';
import type { ReturnRequest, ReturnStatus } from '../../../types';
import { ReturnStatusTag } from './components/ReturnStatusTag';
import { ReturnDetailDrawer } from './components/ReturnDetailDrawer';

const { Title, Text } = Typography;

export const AdminReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await returnService.getAllReturnsAdmin();
      setReturns(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách đổi trả');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  const filteredReturns = useMemo(() => {
    return returns.filter((item) => {
      // Filter by status tab
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // Filter by search keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        const returnNo = (item.returnNumber || '').toLowerCase();
        const orderNo = (item.order?.orderNumber || item.orderId || '').toLowerCase();
        const email = (item.user?.email || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        return (
          returnNo.includes(q) ||
          orderNo.includes(q) ||
          email.includes(q) ||
          reason.includes(q)
        );
      }
      return true;
    });
  }, [returns, statusFilter, searchKeyword]);

  const handleOpenDetail = (record: ReturnRequest) => {
    setSelectedReturn(record);
    setIsDrawerOpen(true);
  };

  const handleRecordUpdated = (updated: ReturnRequest) => {
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedReturn?.id === updated.id) {
      setSelectedReturn(updated);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const columns: ColumnsType<ReturnRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 170,
      render: (text: string, record: ReturnRequest) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(record.requestedAt)}</Text>
        </div>
      ),
    },
    {
      title: 'Đơn hàng & Khách hàng',
      key: 'orderAndCustomer',
      render: (_: any, record: ReturnRequest) => (
        <div>
          <Text strong>#{record.order?.orderNumber || record.orderId.slice(0, 8)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user?.email || 'Khách vãng lai'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Lý do đổi trả',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <span>{reason}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Số lượng',
      key: 'itemCount',
      width: 90,
      align: 'center',
      render: (_: any, record: ReturnRequest) => (
        <Text strong>{record.items?.length || 0} món</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: ReturnStatus) => <ReturnStatusTag status={status} />,
    },
    {
      title: 'Hoàn tiền',
      key: 'refundStatus',
      width: 140,
      render: (_: any, record: ReturnRequest) => {
        const refunds = record.refunds || [];
        if (refunds.length === 0) return <Text type="secondary">Chưa có</Text>;
        const completed = refunds.find((r) => r.status === 'COMPLETED');
        if (completed) {
          return <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatPrice(Number(completed.amount))}</span>;
        }
        return <span style={{ color: '#ea580c' }}>Chờ xử lý ({refunds.length})</span>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_: any, record: ReturnRequest) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
        >
          Xử lý
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `Tất cả (${returns.length})` },
    { key: 'REQUESTED', label: `Chờ tiếp nhận (${returns.filter((r) => r.status === 'REQUESTED').length})` },
    { key: 'APPROVED', label: `Chờ gửi máy (${returns.filter((r) => r.status === 'APPROVED').length})` },
    { key: 'SHIPPING', label: `Đang gửi kho (${returns.filter((r) => r.status === 'SHIPPING').length})` },
    { key: 'RECEIVED', label: `Đã nhận kho (${returns.filter((r) => r.status === 'RECEIVED').length})` },
    { key: 'INSPECTING', label: `Đang kiểm định (${returns.filter((r) => r.status === 'INSPECTING').length})` },
    { key: 'COMPLETED', label: `Đã hoàn tất (${returns.filter((r) => r.status === 'COMPLETED').length})` },
    { key: 'REJECTED', label: `Đã từ chối (${returns.filter((r) => r.status === 'REJECTED').length})` },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Quản lý Đổi trả & Hoàn tiền</Title>
          <Text type="secondary">Tiếp nhận, kiểm tra máy và điều phối hoàn tiền theo quy định</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadReturns} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input
            placeholder="Tìm theo mã Return, đơn hàng, khách hàng, lý do..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ width: 360 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
          />
        </Space>

        <Tabs
          activeKey={statusFilter}
          onChange={(key) => setStatusFilter(key)}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={filteredReturns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng cộng ${total} yêu cầu` }}
          locale={{ emptyText: 'Chưa có yêu cầu đổi trả nào trong mục này' }}
        />
      </Card>

      <ReturnDetailDrawer
        visible={isDrawerOpen}
        returnRecord={selectedReturn}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleRecordUpdated}
      />
    </div>
  );
};
```

- [ ] **Step 4: Chạy test để xác nhận test vượt qua**

Chạy: `npx --prefix frontend vitest run src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx`
Kỳ vọng: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Admin/Returns/AdminReturnsPage.tsx frontend/src/pages/Admin/Returns/__tests__/AdminReturnsPage.spec.tsx
git commit -m "feat(returns): create AdminReturnsPage with filter tabs, search, and action integration"
```

---

### Task 8: Tích Hợp Menu Sidebar (`AdminLayout.tsx`) & Route (`AppRoutes.tsx`)

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Cập nhật `AdminLayout.tsx`**

Thêm icon `UndoOutlined`, thêm mục menu `/admin/returns` (Quản lý Đổi trả & Hoàn tiền), và thêm breadcrumb.
Chỉnh sửa `frontend/src/layouts/AdminLayout.tsx`:
- Import `UndoOutlined` từ `@ant-design/icons`.
- Thêm item vào `menuItems`:
```typescript
    {
      key: '/admin/returns',
      icon: <UndoOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Đổi trả',
    },
```
- Thêm vào hàm `getBreadcrumbTitle()`:
```typescript
    if (location.pathname === '/admin/returns') return 'Quản lý Đổi trả & Hoàn tiền';
```

- [ ] **Step 2: Cập nhật `AppRoutes.tsx`**

- Import `AdminReturnsPage` từ `../pages/Admin/Returns/AdminReturnsPage`.
- Đăng ký Route:
```tsx
          <Route
            path="/admin/returns"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminReturnsPage />
              </RoleGuard>
            }
          />
```

- [ ] **Step 3: Chạy test toàn bộ frontend để đảm bảo không bị vỡ routes**

Chạy: `npm --prefix frontend test -- --run`
Kỳ vọng: Tất cả test files (bao gồm các test mới) đều PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/AdminLayout.tsx frontend/src/routes/AppRoutes.tsx
git commit -m "feat(routes): register /admin/returns route and sidebar menu in AdminLayout"
```

---

### Task 9: Kiểm Tra Toàn Diện (End-to-End Suite Verification & TypeScript Build)

**Files:**
- Verify all modified files

- [ ] **Step 1: Kiểm tra biên dịch TypeScript toàn dự án frontend**

Chạy: `npx --prefix frontend tsc --noEmit`
Kỳ vọng: 0 lỗi biên dịch.

- [ ] **Step 2: Chạy toàn bộ test suite frontend**

Chạy: `npm --prefix frontend test -- --run`
Kỳ vọng: 100% test files pass.

- [ ] **Step 3: Commit hoàn thiện**

```bash
git status
```
Đảm bảo working tree sạch sẽ, tất cả thay đổi đã được commit vào nhánh `feature/admin-returns-management`.
