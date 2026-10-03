import React, { useState } from 'react';
import {
  Drawer,
  Typography,
  Descriptions,
  Tag,
  Rate,
  Image,
  Divider,
  Input,
  Button,
  Space,
  Avatar,
  message,
  Card,
  Empty,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  SendOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { Review } from '../../../../types';
import { reviewService } from '../../../../services/reviewService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ReviewDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  onSuccess: () => void;
}

export const ReviewDetailDrawer: React.FC<ReviewDetailDrawerProps> = ({
  open,
  onClose,
  review,
  onSuccess,
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!review) return null;

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      message.warning('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setSubmitting(true);
      await reviewService.createReply(review.id, replyContent.trim());
      message.success('Đã gửi phản hồi thành công');
      setReplyContent('');
      onSuccess();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const statusTag = {
    PENDING: <Tag color="warning">Chờ duyệt</Tag>,
    APPROVED: <Tag color="success">Đã duyệt</Tag>,
    REJECTED: <Tag color="error">Bị từ chối / Ẩn</Tag>,
  }[review.status || 'PENDING'];

  const replies = Array.isArray(review.replies) ? review.replies : [];

  return (
    <Drawer
      title="Chi tiết Đánh giá & Phản hồi"
      width={600}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Customer & Product Information */}
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Sản phẩm">
            <Space align="center">
              {(review.product?.thumbnail || review.product?.thumbnailUrl) && (
                <Image
                  src={review.product.thumbnail || review.product.thumbnailUrl}
                  alt={review.product.name}
                  width={40}
                  height={40}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
              )}
              <Text strong>{review.product?.name || 'Sản phẩm'}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            <Space>
              <Avatar icon={<UserOutlined />} src={review.user?.avatarUrl} />
              <div>
                <Text strong>
                  {[review.user?.lastName, review.user?.firstName].filter(Boolean).join(' ') ||
                    review.user?.email ||
                    'Khách hàng'}
                </Text>
                {review.user?.email && (
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{review.user.email}</div>
                )}
              </div>
              {review.isVerified && (
                <Tag icon={<CheckCircleOutlined />} color="cyan">
                  Đã mua hàng
                </Tag>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Đánh giá & Trạng thái">
            <Space align="center">
              <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
              {statusTag}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày gửi">
            {new Date(review.createdAt).toLocaleString('vi-VN')}
          </Descriptions.Item>
        </Descriptions>

        {/* Content Section */}
        <div>
          <Title level={5}>Nội dung đánh giá</Title>
          {review.title && (
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {review.title}
            </Text>
          )}
          <Paragraph style={{ whiteSpace: 'pre-line', background: '#fafafa', padding: 12, borderRadius: 8 }}>
            {review.content || '(Không có nội dung nhận xét)'}
          </Paragraph>

          {/* Images Gallery */}
          {review.images && review.images.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                Hình ảnh đính kèm ({review.images.length})
              </Text>
              <Image.PreviewGroup>
                <Space wrap size={8}>
                  {review.images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      width={80}
                      height={80}
                      style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            </div>
          )}
        </div>

        <Divider />

        {/* Replies Section */}
        <div>
          <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageOutlined />
            <span>Phản hồi từ CSKH ({replies.length})</span>
          </Title>

          {replies.length > 0 ? (
            <div className="space-y-3" style={{ marginBottom: 16 }}>
              {replies.map((rep) => (
                <Card
                  key={rep.id}
                  size="small"
                  style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Space size={6}>
                      <Text strong style={{ fontSize: 13, color: '#1d39c4' }}>
                        {[rep.user?.lastName, rep.user?.firstName].filter(Boolean).join(' ') ||
                          'PhoneShop CSKH'}
                      </Text>
                      <Tag color="blue">Shop phản hồi</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(rep.createdAt).toLocaleString('vi-VN')}
                    </Text>
                  </div>
                  <Text style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{rep.content}</Text>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có phản hồi nào cho đánh giá này"
              style={{ margin: '16px 0' }}
            />
          )}

          {/* Reply Form */}
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Soạn phản hồi mới:
            </Text>
            <TextArea
              rows={3}
              placeholder="Nhập nội dung phản hồi gửi đến khách hàng..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              maxLength={1000}
              showCount
              disabled={submitting}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={handleSendReply}
              >
                Gửi phản hồi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};