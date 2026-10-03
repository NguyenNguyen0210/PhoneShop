import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
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

const { Text, Paragraph } = Typography;

export interface ReturnDetailDrawerProps {
  open?: boolean;
  visible?: boolean;
  returnRecord: ReturnRequest | null;
  onClose: () => void;
  onUpdated?: (updated: ReturnRequest) => void;
}

export const ReturnDetailDrawer: React.FC<ReturnDetailDrawerProps> = ({
  open,
  visible,
  returnRecord,
  onClose,
  onUpdated,
}) => {
  const isDrawerOpen = open ?? visible ?? false;
  const { user } = useAuthStore();
  const isManagerOrAdmin = Boolean(
    user &&
      (user.role === 'MANAGER' ||
        user.role === 'ADMIN' ||
        ((user as any).roles &&
          ((user as any).roles.includes('MANAGER') ||
            (user as any).roles.includes('ADMIN'))))
  );

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
      onUpdated?.(updated);
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
      onUpdated?.(updated);
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
      onUpdated?.(updated);
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
      onUpdated?.(updated);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Hoàn tất đổi trả thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshDetail = async () => {
    try {
      const fresh = await returnService.getReturnDetailAdmin(returnRecord.id);
      onUpdated?.(fresh);
    } catch {
      // Ignored
    }
  };

  const itemColumns = [
    {
      title: 'Mục đổi trả',
      dataIndex: 'orderItemId',
      key: 'orderItemId',
      render: (val: string, record: ReturnItem) => (
        <div>
          {record.orderItem?.productName ? (
            <div>
              <Text strong>{record.orderItem.productName}</Text>
              {record.orderItem.variant && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {[
                    record.orderItem.variant.color,
                    record.orderItem.variant.storage,
                    record.orderItem.variant.sku,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}
            </div>
          ) : (
            <Text code>{val ? `${val.slice(0, 8)}...` : '—'}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Tình trạng máy',
      dataIndex: 'condition',
      key: 'condition',
      render: (cond?: string) => (cond ? <Tag color="blue">{cond}</Tag> : '—'),
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
              <Text strong style={{ fontSize: 16 }}>
                {returnRecord.returnNumber}
              </Text>
              <ReturnStatusTag status={returnRecord.status} />
            </Space>
          </div>
        }
        placement="right"
        size={760 as any}
        onClose={onClose}
        open={isDrawerOpen}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
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
                      : '🔒 Chỉ Quản lý (Manager/Admin) có quyền thực hiện thao tác này'
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
                        icon={
                          isManagerOrAdmin ? (
                            <CheckCircleOutlined />
                          ) : (
                            <span>
                              🔒 <LockOutlined style={{ display: 'none' }} />
                            </span>
                          )
                        }
                      >
                        Hoàn tất đổi trả
                      </Button>
                    </Popconfirm>
                  </span>
                </Tooltip>
              )}

              {/* Create Refund (Manager/Admin Only) */}
              {(returnRecord.status === 'RECEIVED' ||
                returnRecord.status === 'INSPECTING' ||
                returnRecord.status === 'COMPLETED') && (
                <Tooltip
                  title={
                    isManagerOrAdmin
                      ? 'Lập lệnh hoàn tiền cho khách hàng'
                      : '🔒 Chỉ Quản lý (Manager/Admin) có quyền lập lệnh hoàn tiền'
                  }
                >
                  <span>
                    <Button
                      data-testid="btn-create-refund"
                      disabled={!isManagerOrAdmin}
                      icon={
                        isManagerOrAdmin ? (
                          <DollarOutlined />
                        ) : (
                          <span>
                            🔒 <LockOutlined style={{ display: 'none' }} />
                          </span>
                        )
                      }
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
            <div
              style={{
                background: '#f8fafc',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                marginTop: 4,
              }}
            >
              <Text strong style={{ color: '#0f172a' }}>
                {returnRecord.reason}
              </Text>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">Ghi chú chi tiết của khách (Evidence Note):</Text>
            <div
              style={{
                background: '#eff6ff',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #bfdbfe',
                marginTop: 4,
              }}
            >
              <Paragraph style={{ margin: 0, fontStyle: 'italic', color: '#1e3a8a' }}>
                {returnRecord.customerNote || 'Không có ghi chú thêm từ khách.'}
              </Paragraph>
            </div>
          </div>

          {returnRecord.adminNote && (
            <div>
              <Text type="secondary">Ghi chú từ Nhân viên / Quản lý (Admin Note):</Text>
              <div
                style={{
                  background: '#fef2f2',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  marginTop: 4,
                }}
              >
                <Paragraph style={{ margin: 0, color: '#991b1b' }}>
                  {returnRecord.adminNote}
                </Paragraph>
              </div>
            </div>
          )}
        </Card>

        {/* KHỐI 3: DANH SÁCH MÁY ĐỔI TRẢ */}
        <Card
          size="small"
          title={`Danh sách thiết bị đổi trả (${returnRecord.items?.length || 0})`}
          style={{ marginBottom: 16 }}
        >
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
        onSuccess={(updated) => onUpdated?.(updated)}
      />

      <RejectReturnModal
        visible={isRejectModalOpen}
        returnRecord={returnRecord}
        onClose={() => setIsRejectModalOpen(false)}
        onSuccess={(updated) => onUpdated?.(updated)}
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
