import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Typography, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  MailOutlined,
  CalendarOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { installmentService } from '../../../services/installmentService';
import type { InstallmentPaymentTerm } from '../../../types';
import { isInstallmentTermOverdue } from '../../../types';

const { Text } = Typography;

interface InstallmentScheduleCardProps {
  applicationId: string;
}

/**
 * Monthly repayment schedule of an APPROVED application.
 * Money moves through the finance company — ticking a term only records
 * that staff confirmed its collection. OVERDUE is derived from dueDate.
 */
export const InstallmentScheduleCard: React.FC<InstallmentScheduleCardProps> = ({
  applicationId,
}) => {
  const [terms, setTerms] = useState<InstallmentPaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [generating, setGenerating] = useState(false);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      Number(val) || 0
    );
  };

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await installmentService.getAdminSchedule(applicationId);
      setTerms(Array.isArray(res?.terms) ? res.terms : []);
    } catch {
      setTerms([]);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  const overdueCount = terms.filter(
    (t) => t.status === 'PENDING' && isInstallmentTermOverdue(t)
  ).length;
  const paidCount = terms.filter((t) => t.status === 'PAID').length;

  const handleTick = (term: InstallmentPaymentTerm) => {
    Modal.confirm({
      title: `Xác nhận đã thu kỳ ${term.termNo}?`,
      content: `Số tiền ${formatPrice(term.amount)} — hạn ${formatDate(term.dueDate)}. Thao tác chỉ ghi nhận trong hệ thống, tiền thật do công ty tài chính thu.`,
      okText: 'Xác nhận đã thu',
      cancelText: 'Quay lại',
      onOk: async () => {
        setPayingId(term.id);
        try {
          await installmentService.markTermPaid(term.id);
          message.success(`Đã ghi nhận thu kỳ ${term.termNo}`);
          await fetchSchedule();
        } catch (err: any) {
          message.error(err.response?.data?.message || err.message || 'Ghi nhận thất bại');
        } finally {
          setPayingId(null);
        }
      },
    });
  };

  const handleRemind = async () => {
    setReminding(true);
    try {
      const res = await installmentService.remindApplication(applicationId);
      message.success(
        `Đã gửi email nhắc nợ tới ${res?.sentTo || 'khách hàng'} (${res?.remindedTerms?.length || 0} kỳ)`
      );
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Gửi nhắc nợ thất bại');
    } finally {
      setReminding(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      await installmentService.regenerateSchedule(applicationId);
      message.success('Đã tạo lịch trả góp');
      await fetchSchedule();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Tạo lịch trả thất bại');
    } finally {
      setGenerating(false);
    }
  };

  const columns: ColumnsType<InstallmentPaymentTerm> = [
    {
      title: 'Kỳ',
      key: 'termNo',
      width: 70,
      render: (_, r) => <Text strong>Kỳ {r.termNo}</Text>,
    },
    {
      title: 'Hạn trả',
      key: 'dueDate',
      width: 130,
      render: (_, r) => formatDate(r.dueDate),
    },
    {
      title: 'Số tiền',
      key: 'amount',
      width: 160,
      render: (_, r) => <Text strong>{formatPrice(r.amount)}</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_, r) => {
        if (r.status === 'PAID') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Đã thu</Tag>;
        }
        if (isInstallmentTermOverdue(r)) {
          return <Tag color="error" icon={<WarningOutlined />}>Quá hạn</Tag>;
        }
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Chờ thu</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, r) => {
        if (r.status === 'PAID') {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.paidAt ? formatDate(r.paidAt) : 'Đã thu'}
              {r.paidNote ? ` — ${r.paidNote}` : ''}
            </Text>
          );
        }
        return (
          <Button
            size="small"
            type="primary"
            loading={payingId === r.id}
            onClick={() => handleTick(r)}
            style={{ background: '#16a34a', borderColor: '#16a34a' }}
          >
            Xác nhận đã thu
          </Button>
        );
      },
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <CalendarOutlined style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600 }}>
            Lịch trả góp hằng tháng ({paidCount}/{terms.length} kỳ đã thu
            {overdueCount > 0 ? `, ${overdueCount} quá hạn` : ''})
          </span>
        </Space>
      }
      extra={
        <Space>
          {terms.length > 0 && (
            <Button
              size="small"
              icon={<MailOutlined />}
              loading={reminding}
              onClick={handleRemind}
            >
              Gửi nhắc nợ
            </Button>
          )}
          {terms.length === 0 && !loading && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              loading={generating}
              onClick={handleRegenerate}
            >
              Tạo lịch trả
            </Button>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {terms.length === 0 && !loading ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Hồ sơ duyệt trước khi có tính năng lịch trả nên chưa có kỳ nào — bấm
          “Tạo lịch trả” để sinh lịch theo kỳ hạn đã duyệt.
        </Text>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={terms}
          loading={loading}
          pagination={false}
          size="small"
        />
      )}
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
        Tiền thật do công ty tài chính thu — tick ở đây chỉ ghi nhận trong hệ thống.
      </Text>
    </Card>
  );
};
