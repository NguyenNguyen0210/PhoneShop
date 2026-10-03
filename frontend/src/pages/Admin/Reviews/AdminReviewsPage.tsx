import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Tabs,
  Typography,
  Row,
  Col,
  Statistic,
  Rate,
  Image,
  Popconfirm,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CommentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { reviewService } from '../../../services/reviewService';
import type { Review } from '../../../types';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ReviewDetailDrawer } from './components/ReviewDetailDrawer';

const { Title, Text, Paragraph } = Typography;

export const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Review for Detail Drawer
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) =>
    typeof state.isAdmin === 'function' ? state.isAdmin() : state.user?.role === 'ADMIN',
  );

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewService.getAdminReviews({
        page,
        limit,
        status: statusTab !== 'ALL' ? statusTab : undefined,
      });

      if (res && Array.isArray(res.data)) {
        setReviews(res.data);
        setTotal(res.total);
      } else {
        setReviews([]);
        setTotal(0);
      }
    } catch {
      message.error('Không thể tải danh sách đánh giá');
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusTab]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Client-side filtering for search & star
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Star filter
      if (starFilter !== 'ALL' && r.rating !== starFilter) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const productName = r.product?.name?.toLowerCase() || '';
        const reviewerName = [r.user?.lastName, r.user?.firstName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const reviewerEmail = r.user?.email?.toLowerCase() || '';
        const title = r.title?.toLowerCase() || '';
        const content = r.content?.toLowerCase() || '';

        const matches =
          productName.includes(query) ||
          reviewerName.includes(query) ||
          reviewerEmail.includes(query) ||
          title.includes(query) ||
          content.includes(query);

        if (!matches) return false;
      }
      return true;
    });
  }, [reviews, starFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const pending = reviews.filter((r) => r.status === 'PENDING').length;
    const approved = reviews.filter((r) => r.status === 'APPROVED').length;
    const rejected = reviews.filter((r) => r.status === 'REJECTED').length;
    return { total: reviews.length, pending, approved, rejected };
  }, [reviews]);

  // Actions
  const handleApprove = async (review: Review) => {
    if (review.userId === currentUser?.id) {
      message.warning('Bạn không thể tự duyệt đánh giá của chính mình');
      return;
    }
    try {
      await reviewService.approveReview(review.id);
      message.success('Đã duyệt đánh giá thành công');
      fetchReviews();
      if (selectedReview?.id === review.id) {
        setSelectedReview((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi duyệt đánh giá');
    }
  };

  const handleReject = async (review: Review) => {
    if (review.userId === currentUser?.id) {
      message.warning('Bạn không thể từ chối đánh giá của chính mình');
      return;
    }
    try {
      await reviewService.rejectReview(review.id);
      message.success('Đã ẩn / từ chối đánh giá');
      fetchReviews();
      if (selectedReview?.id === review.id) {
        setSelectedReview((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi từ chối đánh giá');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await reviewService.deleteReviewAdmin(id);
      message.success('Đã xóa vĩnh viễn đánh giá');
      fetchReviews();
      if (selectedReview?.id === id) {
        setIsDrawerOpen(false);
        setSelectedReview(null);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi xóa đánh giá');
    }
  };

  const handleOpenDetail = (review: Review) => {
    setSelectedReview(review);
    setIsDrawerOpen(true);
  };

  const columns: ColumnsType<Review> = [
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 240,
      render: (_, r) => {
        const thumb = r.product?.thumbnail || r.product?.thumbnailUrl;
        return (
          <Space align="center">
            {thumb && (
              <Image
                src={thumb}
                alt={r.product?.name}
                width={48}
                height={48}
                style={{ objectFit: 'cover', borderRadius: 6 }}
              />
            )}
            <div>
              <Text strong style={{ fontSize: 13, display: 'block' }}>
                {r.product?.name || 'Sản phẩm'}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ID: {r.productId?.substring(0, 8)}...
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'user',
      width: 180,
      render: (_, r) => {
        const name =
          [r.user?.lastName, r.user?.firstName].filter(Boolean).join(' ') || 'Khách hàng';
        return (
          <div>
            <Space size={4}>
              <UserOutlined style={{ color: '#8c8c8c' }} />
              <Text strong style={{ fontSize: 13 }}>
                {name}
              </Text>
            </Space>
            {r.user?.email && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.user.email}</div>
            )}
            {r.isVerified && (
              <Tag color="cyan" style={{ fontSize: 10, marginTop: 4 }}>
                Đã mua hàng
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Đánh giá & Nội dung',
      key: 'content',
      render: (_, r) => (
        <div style={{ maxWidth: 360 }}>
          <Space size={6} style={{ marginBottom: 4 }}>
            <Rate disabled value={r.rating} style={{ fontSize: 13 }} />
            <Text strong style={{ fontSize: 12 }}>
              ({r.rating} sao)
            </Text>
          </Space>
          {r.title && (
            <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>
              {r.title}
            </Text>
          )}
          <Paragraph
            ellipsis={{ rows: 2, expandable: false }}
            style={{ fontSize: 12, color: '#595959', marginBottom: 6 }}
          >
            {r.content || '(Không có nội dung)'}
          </Paragraph>

          {/* Mini Thumbnail gallery */}
          {r.images && r.images.length > 0 && (
            <Image.PreviewGroup>
              <Space size={4}>
                {r.images.map((img, idx) => (
                  <Image
                    key={idx}
                    src={img}
                    width={36}
                    height={36}
                    style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, r) => {
        if (r.status === 'APPROVED') return <Tag color="success">Đã duyệt</Tag>;
        if (r.status === 'REJECTED') return <Tag color="error">Bị từ chối / Ẩn</Tag>;
        return <Tag color="warning">Chờ duyệt</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      key: 'createdAt',
      width: 140,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      render: (_, r) => {
        const isSelf = r.userId === currentUser?.id;

        return (
          <Space size="small">
            {/* Duyệt Button */}
            {r.status !== 'APPROVED' && (
              <Tooltip title={isSelf ? 'Không thể tự duyệt bài của bạn' : 'Duyệt đánh giá này'}>
                <Button
                  title={isSelf ? 'Không thể tự duyệt bài của bạn' : 'Duyệt đánh giá này'}
                  aria-label="Duyệt đánh giá này"
                  type="text"
                  shape="circle"
                  disabled={isSelf}
                  icon={
                    <CheckCircleOutlined
                      style={{ color: isSelf ? '#d9d9d9' : '#52c41a', fontSize: 16 }}
                    />
                  }
                  onClick={() => handleApprove(r)}
                />
              </Tooltip>
            )}

            {/* Từ chối / Ẩn Button */}
            {r.status !== 'REJECTED' && (
              <Tooltip title={isSelf ? 'Không thể từ chối bài của bạn' : 'Ẩn / Từ chối đánh giá'}>
                <Button
                  title={isSelf ? 'Không thể từ chối bài của bạn' : 'Ẩn / Từ chối đánh giá'}
                  aria-label="Ẩn / Từ chối đánh giá"
                  type="text"
                  shape="circle"
                  disabled={isSelf}
                  icon={
                    <CloseCircleOutlined
                      style={{ color: isSelf ? '#d9d9d9' : '#fa8c16', fontSize: 16 }}
                    />
                  }
                  onClick={() => handleReject(r)}
                />
              </Tooltip>
            )}

            {/* Chi tiết & Phản hồi Button */}
            <Tooltip title="Xem chi tiết & Phản hồi">
              <Button
                title="Xem chi tiết & Phản hồi"
                aria-label="Xem chi tiết & Phản hồi"
                type="text"
                shape="circle"
                icon={<EyeOutlined style={{ color: '#1677ff', fontSize: 16 }} />}
                onClick={() => handleOpenDetail(r)}
              />
            </Tooltip>

            {/* Xóa vĩnh viễn (Chỉ Admin) */}
            {isAdmin && (
              <Tooltip title="Xóa vĩnh viễn">
                <Popconfirm
                  title="Xác nhận xóa vĩnh viễn đánh giá?"
                  description="Hành động này không thể hoàn tác và sẽ xóa toàn bộ câu trả lời."
                  okText="Xác nhận xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(r.id)}
                >
                  <Button
                    title="Xóa vĩnh viễn"
                    aria-label="Xóa vĩnh viễn"
                    type="text"
                    shape="circle"
                    danger
                    icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                  />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý Đánh giá & Kiểm duyệt
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Kiểm duyệt đánh giá của khách hàng, phản hồi CSKH và ẩn các nội dung vi phạm
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchReviews} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" variant="borderless" style={{ background: '#fafafa' }}>
            <Statistic title="Tổng đánh giá" value={stats.total} prefix={<CommentOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            variant="borderless"
            style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}
          >
            <Statistic
              title="Chờ duyệt"
              value={stats.pending}
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            variant="borderless"
            style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
          >
            <Statistic
              title="Đã duyệt"
              value={stats.approved}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            variant="borderless"
            style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}
          >
            <Statistic
              title="Đã từ chối"
              value={stats.rejected}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Table */}
      <Card>
        <Tabs
          activeKey={statusTab}
          onChange={(key) => {
            setStatusTab(key);
            setPage(1);
          }}
          items={[
            { key: 'ALL', label: 'Tất cả đánh giá' },
            {
              key: 'PENDING',
              label: (
                <span>
                  Chờ duyệt {stats.pending > 0 && <Tag color="warning">{stats.pending}</Tag>}
                </span>
              ),
            },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Bị từ chối / Ẩn' },
          ]}
        />

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder="Tìm theo sản phẩm, khách hàng, nội dung..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />
          <Select
            value={starFilter}
            onChange={(val) => setStarFilter(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'Tất cả sao' },
              { value: 5, label: '5 sao ★' },
              { value: 4, label: '4 sao ★' },
              { value: 3, label: '3 sao ★' },
              { value: 2, label: '2 sao ★' },
              { value: 1, label: '1 sao ★' },
            ]}
          />
        </div>

        {/* Reviews Table */}
        <Table<Review>
          rowKey="id"
          columns={columns}
          dataSource={filteredReviews}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      {/* Detail & Reply Drawer */}
      <ReviewDetailDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedReview(null);
        }}
        review={selectedReview}
        onSuccess={() => {
          fetchReviews();
        }}
      />
    </div>
  );
};
