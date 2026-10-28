import React from 'react';
import {
  Drawer,
  Tag,
  Typography,
  Descriptions,
  Empty,
  Button,
  Space,
  message,
} from 'antd';
import {
  CopyOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { AuditAction, AuditLogEntry } from '../../../../types/auditLog';

const { Text } = Typography;

export interface AuditLogDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  log: AuditLogEntry | null;
}

export const getAuditActionColor = (action: AuditAction | string): string => {
  switch (action) {
    case 'CREATE':
      return 'success';
    case 'UPDATE':
      return 'processing';
    case 'DELETE':
      return 'error';
    case 'LOGIN':
      return 'cyan';
    case 'LOGOUT':
      return 'purple';
    case 'PAYMENT':
      return 'gold';
    case 'REFUND':
      return 'volcano';
    case 'CANCEL_ORDER':
      return 'magenta';
    case 'UPDATE_STOCK':
      return 'orange';
    case 'CHANGE_ROLE':
      return 'geekblue';
    default:
      return 'default';
  }
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Không xác định';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const codeBlockStyle: React.CSSProperties = {
  background: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: 6,
  padding: '12px 16px',
  margin: 0,
  fontSize: 12,
  fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  maxHeight: 320,
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({
  open,
  onClose,
  log,
}) => {
  const [messageApi, contextHolder] = message.useMessage();

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      messageApi.success(`Đã sao chép ${label}`);
    }
  };

  const userDisplayName = log?.user
    ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email
    : null;

  const hasOld = Boolean(log?.oldData && Object.keys(log.oldData).length > 0);
  const hasNew = Boolean(log?.newData && Object.keys(log.newData).length > 0);

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>Chi tiết nhật ký kiểm toán</span>
        </Space>
      }
      placement="right"
      width={640}
      open={open}
      onClose={onClose}
    >
      {contextHolder}

      {!log ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có thông tin nhật ký"
          style={{ marginTop: 60 }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Descriptions
            bordered
            size="small"
            column={2}
            styles={{
              label: { width: 140, fontWeight: 500, background: '#fafafa' },
            }}
          >
            <Descriptions.Item label="Log ID" span={2}>
              <Text copyable={{ text: log.id }} code>
                {log.id}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian">
              {formatDateTime(log.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Hành động">
              <Tag color={getAuditActionColor(log.action)}>{log.action}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Thực thể" span={2}>
              <Space>
                <Tag color="purple">{log.entity}</Tag>
                {log.entityId ? (
                  <Text copyable={{ text: log.entityId }} code>
                    ID: {log.entityId}
                  </Text>
                ) : (
                  <Text type="secondary" italic>
                    (Không có ID)
                  </Text>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Người thực hiện" span={2}>
              {log.user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Text strong>{userDisplayName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Email: {log.user.email} (ID: {log.user.id})
                  </Text>
                </div>
              ) : log.userId ? (
                <Text code>User ID: {log.userId}</Text>
              ) : (
                <Text italic type="secondary">
                  Hệ thống (System)
                </Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Địa chỉ IP" span={2}>
              {log.ipAddress ? (
                <Text code>{log.ipAddress}</Text>
              ) : (
                <Text type="secondary">Không có</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          {/* Dữ liệu thay đổi */}
          {!hasOld && !hasNew ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có dữ liệu thay đổi"
              style={{ padding: '24px 0' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hasNew && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text strong style={{ color: '#389e0d' }}>
                      Dữ liệu mới (newData)
                    </Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        handleCopy(JSON.stringify(log.newData, null, 2), 'dữ liệu mới')
                      }
                    >
                      Sao chép
                    </Button>
                  </div>
                  <pre style={codeBlockStyle}>{JSON.stringify(log.newData, null, 2)}</pre>
                </div>
              )}

              {hasOld && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text strong style={{ color: '#cf1322' }}>
                      Dữ liệu cũ (oldData)
                    </Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        handleCopy(JSON.stringify(log.oldData, null, 2), 'dữ liệu cũ')
                      }
                    >
                      Sao chép
                    </Button>
                  </div>
                  <pre style={codeBlockStyle}>{JSON.stringify(log.oldData, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
