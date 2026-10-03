import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Tabs, Typography, Breadcrumb } from 'antd';
import {
  TagOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { promotionService } from '../../../services/promotionService';
import { flashSaleService } from '../../../services/flashSaleService';
import type { PromotionSummary } from '../../../types';
import { VoucherTab } from './components/VoucherTab';
import { FlashSaleTab } from './components/FlashSaleTab';

const { Title, Text } = Typography;

export const AdminPromotionsPage: React.FC = () => {
  const [summary, setSummary] = useState<PromotionSummary | null>(null);
  const [flashSaleCount, setFlashSaleCount] = useState<number>(0);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [sumRes, campaignsRes] = await Promise.allSettled([
        promotionService.getSummary(),
        flashSaleService.getAdminCampaigns(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      }

      if (campaignsRes.status === 'fulfilled' && Array.isArray(campaignsRes.value)) {
        setFlashSaleCount(campaignsRes.value.length);
      }
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const tabItems = [
    {
      key: 'vouchers',
      label: 'Mã giảm giá (Vouchers)',
      children: <VoucherTab onDataChanged={fetchSummary} />,
    },
    {
      key: 'flash-sales',
      label: 'Flash Sale & Khung giờ vàng',
      children: <FlashSaleTab onDataChanged={fetchSummary} />,
    },
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/admin">Trang quản trị</Link> },
          { title: 'Khuyến mãi & Flash Sale' },
        ]}
      />

      {/* Page Title */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý Khuyến mãi & Flash Sale
        </Title>
        <Text type="secondary">
          Thiết lập mã giảm giá (voucher), chiến dịch flash sale khung giờ vàng và theo dõi hiệu quả
        </Text>
      </div>

      {/* KPI Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" loading={loadingSummary}>
            <Statistic
              title="Voucher đang hoạt động"
              value={summary?.activeVouchers ?? 0}
              suffix={`/ ${summary?.totalVouchers ?? 0}`}
              prefix={<TagOutlined style={{ color: '#2563eb', marginRight: 8 }} />}
              styles={{ content: { color: '#2563eb', fontWeight: 600 } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" loading={loadingSummary}>
            <Statistic
              title="Chiến dịch Flash Sale"
              value={flashSaleCount}
              prefix={<ThunderboltOutlined style={{ color: '#e11d48', marginRight: 8 }} />}
              styles={{ content: { color: '#e11d48', fontWeight: 600 } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" loading={loadingSummary}>
            <Statistic
              title="Tổng lượt áp mã"
              value={summary?.totalUsages ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a', marginRight: 8 }} />}
              styles={{ content: { color: '#16a34a', fontWeight: 600 } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" loading={loadingSummary}>
            <Statistic
              title="Tổng chiết khấu đã hỗ trợ"
              value={summary?.totalDiscountAmount ?? 0}
              formatter={(val) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`}
              prefix={<DollarCircleOutlined style={{ color: '#9333ea', marginRight: 8 }} />}
              styles={{ content: { color: '#9333ea', fontWeight: 600 } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card variant="outlined">
        <Tabs defaultActiveKey="vouchers" items={tabItems} />
      </Card>
    </div>
  );
};
