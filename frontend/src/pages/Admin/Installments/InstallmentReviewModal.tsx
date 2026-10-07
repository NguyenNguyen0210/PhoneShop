import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Modal,
  Button,
  Tag,
  Descriptions,
  Input,
  Space,
  Image,
  Typography,
  message,
  Card,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  IdcardOutlined,
  UserOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import type { InstallmentApplication, InstallmentStatus } from '../../../types';
import { installmentService } from '../../../services/installmentService';
import { InstallmentScheduleCard } from './InstallmentScheduleCard';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface InstallmentReviewModalProps {
  open: boolean;
  application: InstallmentApplication | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const InstallmentReviewModal: React.FC<InstallmentReviewModalProps> = ({
  open,
  application,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [staffNotes, setStaffNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  // CCCD che mặc định, chỉ hiện đầy đủ khi nhân viên bấm mắt
  const [showFullCccd, setShowFullCccd] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setShowFullCccd(false);
  }, [application?.id]);

  if (!application) return null;

  const maskCitizenId = (id?: string): string => {
    const clean = (id || '').replace(/\D/g, '');
    if (clean.length < 8) return '••••';
    return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: InstallmentStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>ĐÃ DUYỆT</Tag>;
      case 'REJECTED':
        return <Tag color="error" icon={<CloseCircleOutlined />}>TỪ CHỐI</Tag>;
      case 'CANCELLED':
        return <Tag color="default">ĐÃ HỦY</Tag>;
      case 'PENDING':
      default:
        return <Tag color="processing">CHỜ THẨM ĐỊNH</Tag>;
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await installmentService.reviewInstallment(application.id, {
        status: 'APPROVED',
        staffNotes: staffNotes.trim() || undefined,
      });
      message.success('Đã phê duyệt hồ sơ trả góp thành công!');
      setActionType(null);
      setStaffNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi phê duyệt hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối hồ sơ.');
      return;
    }

    setSubmitting(true);
    try {
      await installmentService.reviewInstallment(application.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        staffNotes: staffNotes.trim() || undefined,
      });
      message.success('Đã từ chối hồ sơ trả góp và nhả tồn kho giữ hàng.');
      setActionType(null);
      setRejectionReason('');
      setStaffNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi từ chối hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = application.status === 'PENDING';

  return (
    <Modal
      open={open}
      onCancel={() => {
        setActionType(null);
        onClose();
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space>
            <IdcardOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              Thẩm định Hồ sơ trả góp #{application.id.slice(0, 8)}
            </span>
          </Space>
          {getStatusTag(application.status)}
        </div>
      }
      width={900}
      footer={null}
      destroyOnClose
    >
      <div style={{ maxHeight: 'calc(85vh - 100px)', overflowY: 'auto', paddingRight: 8 }}>
        {/* Package & Order Financial Header */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
            borderColor: '#bfdbfe',
          }}
        >
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="Đơn vị tài chính">
              <Text strong style={{ color: application.provider === 'HOME_CREDIT' ? '#dc2626' : '#059669' }}>
                {application.provider === 'HOME_CREDIT' ? 'Home Credit (0%)' : 'FE Credit (0%)'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Kỳ hạn vay">
              <Text strong>{application.termMonths} Tháng</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Trả trước">
              <Text strong style={{ color: '#059669' }}>
                {formatPrice(application.prepayAmount)} ({application.prepayPercent}%)
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Góp mỗi tháng">
              <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
                {formatPrice(application.monthlyAmount)}/tháng
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Customer Information */}
        <Card
          size="small"
          title={
            <Space>
              <UserOutlined style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600 }}>Thông tin người nộp hồ sơ & CCCD</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Họ và tên">
              <Text strong>{application.fullName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Số CCCD gắn chip">
              <Space size={6}>
                <Text code style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
                  {showFullCccd ? application.citizenId : maskCitizenId(application.citizenId)}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={showFullCccd ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  title={showFullCccd ? 'Ẩn số CCCD' : 'Hiện đầy đủ số CCCD'}
                  onClick={() => setShowFullCccd((v) => !v)}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {application.birthDate ? new Date(application.birthDate).toLocaleDateString('vi-VN') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại liên hệ">
              <Text copyable strong>{application.phoneNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mức thu nhập">
              <Tag color="cyan">{application.incomeRange || 'Chưa cập nhật'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian nộp">
              {new Date(application.createdAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ hiện tại" span={2}>
              {application.currentAddress}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* CCCD High-Res Images */}
        <Card
          size="small"
          title={
            <Space>
              <EyeOutlined style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600 }}>Ảnh chụp CCCD 2 mặt (Nhấn vào ảnh để phóng to &amp; xoay)</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Image.PreviewGroup>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Mặt trước CCCD
                </Text>
                {application.cccdFrontUrl ? (
                  <Image
                    src={application.cccdFrontUrl}
                    alt="Mặt trước CCCD"
                    style={{
                      maxHeight: 220,
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                ) : (
                  <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                    <Text type="secondary">Chưa có ảnh mặt trước</Text>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Mặt sau CCCD
                </Text>
                {application.cccdBackUrl ? (
                  <Image
                    src={application.cccdBackUrl}
                    alt="Mặt sau CCCD"
                    style={{
                      maxHeight: 220,
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                ) : (
                  <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                    <Text type="secondary">Chưa có ảnh mặt sau</Text>
                  </div>
                )}
              </div>
            </div>
          </Image.PreviewGroup>
        </Card>

        {/* Order Details & Purchased Products */}
        {application.order && (
          <Card
            size="small"
            title={
              <Space>
                <ShoppingOutlined style={{ color: '#2563eb' }} />
                {(() => {
                  const isStaffPath = location.pathname.startsWith('/staff');
                  const orderId = application.orderId || application.order?.id;
                  const orderUrl = orderId
                    ? isStaffPath
                      ? `/staff/orders?id=${orderId}`
                      : `/admin/orders?id=${orderId}`
                    : null;
                  return orderUrl ? (
                    <Link to={orderUrl} style={{ fontWeight: 600, color: '#2563eb' }}>
                      Đơn hàng liên kết #{application.order.orderNumber || application.orderId.slice(0, 8)} ↗
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600 }}>
                      Đơn hàng liên kết #{application.order.orderNumber || application.orderId.slice(0, 8)}
                    </span>
                  );
                })()}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions size="small" column={{ xs: 1, sm: 3 }} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Tổng giá trị đơn">
                <Text strong>{formatPrice(application.order.totalAmount || application.loanAmount + application.prepayAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn">
                <Tag color="blue">{application.order.status || 'Chờ xác nhận'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Giao hàng tới">
                {application.order.shippingPhone} ({application.order.customerName})
              </Descriptions.Item>
            </Descriptions>

            {application.order.items && application.order.items.length > 0 && (
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  Sản phẩm trong đơn:
                </Text>
                {application.order.items.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                    <span>
                      {item.productName || item.variant?.product?.name || 'Sản phẩm'} (x{item.quantity})
                    </span>
                    <Text strong>{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</Text>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Monthly repayment schedule (approved applications) */}
        {application.status === 'APPROVED' && (
          <InstallmentScheduleCard applicationId={application.id} />
        )}

        {/* Previous Review Result if already processed */}
        {!isPending && (
          <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Trạng thái phê duyệt">
                {getStatusTag(application.status)}
              </Descriptions.Item>
              {application.reviewedAt && (
                <Descriptions.Item label="Thời gian xét duyệt">
                  {new Date(application.reviewedAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {application.staffNotes && (
                <Descriptions.Item label="Ghi chú nhân viên">{application.staffNotes}</Descriptions.Item>
              )}
              {application.rejectionReason && (
                <Descriptions.Item label="Lý do từ chối">
                  <Text type="danger">{application.rejectionReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Review Action Controls */}
        {isPending && (
          <Card
            size="small"
            style={{
              borderColor: '#93c5fd',
              background: '#f8fafc',
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>
                Thẩm định hồ sơ
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Vui lòng kiểm tra kỹ số CCCD, hình ảnh 2 mặt và thu nhập khai báo trước khi phê duyệt.
              </Text>
            </div>

            {/* Action Buttons if not in sub-form */}
            {!actionType && (
              <Space size="middle">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  onClick={() => setActionType('APPROVE')}
                >
                  Duyệt hồ sơ (Approve)
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => setActionType('REJECT')}
                >
                  Từ chối (Reject)
                </Button>
              </Space>
            )}

            {/* Approval Sub-form */}
            {actionType === 'APPROVE' && (
              <div style={{ marginTop: 8 }}>
                <Alert
                  type="success"
                  showIcon
                  message="Xác nhận phê duyệt hồ sơ trả góp"
                  description="Đơn hàng sẽ chuyển sang trạng thái ĐÃ XÁC NHẬN (CONFIRMED) và thông báo cho khách hàng."
                  style={{ marginBottom: 12 }}
                />
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Ghi chú thẩm định (Tùy chọn):
                  </Text>
                  <TextArea
                    rows={2}
                    placeholder="VD: Đã đối chiếu thông tin CCCD, khách hàng cam kết thanh toán đúng hạn..."
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    loading={submitting}
                    onClick={handleApprove}
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  >
                    Xác nhận Duyệt hồ sơ
                  </Button>
                  <Button onClick={() => setActionType(null)} disabled={submitting}>
                    Hủy bỏ
                  </Button>
                </Space>
              </div>
            )}

            {/* Rejection Sub-form */}
            {actionType === 'REJECT' && (
              <div style={{ marginTop: 8 }}>
                <Alert
                  type="error"
                  showIcon
                  message="Từ chối hồ sơ trả góp"
                  description="Đơn hàng sẽ bị HỦY và lượng hàng giữ trước sẽ được hoàn trả lại tồn kho khả dụng."
                  style={{ marginBottom: 12 }}
                />
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Lý do từ chối (Bắt buộc) *:
                  </Text>
                  <TextArea
                    rows={2}
                    placeholder="VD: Ảnh CCCD bị mờ không nhận diện được số chip, khách hàng không nghe máy xác nhận..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Ghi chú nội bộ:
                  </Text>
                  <TextArea
                    rows={1}
                    placeholder="Ghi chú thêm cho nội bộ nhân viên..."
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                  />
                </div>
                <Space>
                  <Button danger type="primary" loading={submitting} onClick={handleReject}>
                    Xác nhận Từ chối hồ sơ
                  </Button>
                  <Button onClick={() => setActionType(null)} disabled={submitting}>
                    Hủy bỏ
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        )}
      </div>
    </Modal>
  );
};
