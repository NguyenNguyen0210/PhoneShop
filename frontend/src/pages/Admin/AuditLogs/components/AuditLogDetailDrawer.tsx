import React from 'react';
import {
  Drawer,
  Tabs,
  Tag,
  Typography,
  Descriptions,
  Empty,
  Card,
  Row,
  Col,
  Button,
  Space,
  Tooltip,
  message,
} from 'antd';
import {
  CopyOutlined,
  HistoryOutlined,
  DiffOutlined,
  CodeOutlined,
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

const formatDateTime = (dateStr?: string | null): string => {
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

const renderFormattedValue = (val: any) => {
  if (val === undefined) {
    return <Text type="secondary" italic>(không tồn tại)</Text>;
  }
  if (val === null) {
    return <Text type="secondary" italic>null</Text>;
  }
  if (typeof val === 'object') {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
        }}
      >
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  }
  if (typeof val === 'boolean') {
    return <span>{val ? 'true' : 'false'}</span>;
  }
  return <span>{String(val)}</span>;
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

  const renderDiffTab = () => {
    if (!log) return <Empty description="Không có dữ liệu" />;

    const hasOld = Boolean(log.oldData && Object.keys(log.oldData).length > 0);
    const hasNew = Boolean(log.newData && Object.keys(log.newData).length > 0);

    // If both oldData and newData null or empty
    if (!hasOld && !hasNew) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có dữ liệu thay đổi để so sánh"
          style={{ padding: '40px 0' }}
        />
      );
    }

    // Created (no oldData, only newData)
    if (!hasOld && hasNew) {
      const jsonStr = JSON.stringify(log.newData, null, 2);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color="success" style={{ fontSize: 13, padding: '4px 8px' }}>
              Dữ liệu được tạo mới
            </Tag>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(jsonStr, 'dữ liệu mới')}
            >
              Sao chép JSON
            </Button>
          </div>
          <pre style={codeBlockStyle}>{jsonStr}</pre>
        </div>
      );
    }

    // Deleted (only oldData, no newData)
    if (hasOld && !hasNew) {
      const jsonStr = JSON.stringify(log.oldData, null, 2);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color="error" style={{ fontSize: 13, padding: '4px 8px' }}>
              Dữ liệu đã bị xóa
            </Tag>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(jsonStr, 'dữ liệu đã xóa')}
            >
              Sao chép JSON
            </Button>
          </div>
          <pre style={codeBlockStyle}>{jsonStr}</pre>
        </div>
      );
    }

    // Updated: both exist, compare all keys
    const oldKeys = Object.keys(log.oldData || {});
    const newKeys = Object.keys(log.newData || {});
    const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allKeys.map((key) => {
          const oldVal = log.oldData?.[key];
          const newVal = log.newData?.[key];
          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          return (
            <Card
              key={key}
              size="small"
              title={
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text strong code style={{ fontSize: 13 }}>
                    {key}
                  </Text>
                  {isChanged ? (
                    <Tag color="error">Thay đổi</Tag>
                  ) : (
                    <Tag color="default">Không đổi</Tag>
                  )}
                </Space>
              }
              styles={{
                header: { background: isChanged ? '#fff7e6' : '#fafafa', padding: '6px 12px' },
                body: { padding: 12 },
              }}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isChanged ? '#cf1322' : '#8c8c8c',
                      marginBottom: 6,
                    }}
                  >
                    Trước thay đổi:
                  </div>
                  <div
                    style={{
                      background: isChanged ? '#fff1f0' : '#f5f5f5',
                      border: `1px solid ${isChanged ? '#ffa39e' : '#e8e8e8'}`,
                      borderRadius: 4,
                      padding: '8px 10px',
                      minHeight: 38,
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {renderFormattedValue(oldVal)}
                  </div>
                </Col>

                <Col span={12}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isChanged ? '#389e0d' : '#8c8c8c',
                      marginBottom: 6,
                    }}
                  >
                    Sau thay đổi:
                  </div>
                  <div
                    style={{
                      background: isChanged ? '#f6ffed' : '#f5f5f5',
                      border: `1px solid ${isChanged ? '#b7eb8f' : '#e8e8e8'}`,
                      borderRadius: 4,
                      padding: '8px 10px',
                      minHeight: 38,
                      fontSize: 12,
                      overflowX: 'auto',
                    }}
                  >
                    {renderFormattedValue(newVal)}
                  </div>
                </Col>
              </Row>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderJsonTab = () => {
    if (!log) return <Empty description="Không có dữ liệu" />;

    const hasOld = Boolean(log.oldData && Object.keys(log.oldData).length > 0);
    const hasNew = Boolean(log.newData && Object.keys(log.newData).length > 0);

    if (!hasOld && !hasNew) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có dữ liệu JSON gốc"
          style={{ padding: '40px 0' }}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                Dữ liệu trước thay đổi (oldData):
              </Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() =>
                  handleCopy(JSON.stringify(log.oldData, null, 2), 'oldData')
                }
              >
                Sao chép oldData
              </Button>
            </div>
            <pre style={codeBlockStyle}>{JSON.stringify(log.oldData, null, 2)}</pre>
          </div>
        )}

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
                Dữ liệu sau thay đổi (newData):
              </Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() =>
                  handleCopy(JSON.stringify(log.newData, null, 2), 'newData')
                }
              >
                Sao chép newData
              </Button>
            </div>
            <pre style={codeBlockStyle}>{JSON.stringify(log.newData, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  const userDisplayName = log?.user
    ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email
    : null;

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>Chi tiết nhật ký kiểm toán</span>
        </Space>
      }
      placement="right"
      size={680}
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

            <Descriptions.Item label="Địa chỉ IP">
              {log.ipAddress ? (
                <Text code>{log.ipAddress}</Text>
              ) : (
                <Text type="secondary">Không có</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="User Agent">
              {log.userAgent ? (
                <Tooltip title={log.userAgent}>
                  <Text
                    ellipsis
                    style={{ maxWidth: 220, display: 'inline-block' }}
                  >
                    {log.userAgent}
                  </Text>
                </Tooltip>
              ) : (
                <Text type="secondary">Không có</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Tabs
            defaultActiveKey="diff"
            items={[
              {
                key: 'diff',
                label: (
                  <Space>
                    <DiffOutlined />
                    <span>So sánh thay đổi (Diff)</span>
                  </Space>
                ),
                children: renderDiffTab(),
              },
              {
                key: 'json',
                label: (
                  <Space>
                    <CodeOutlined />
                    <span>Dữ liệu gốc (JSON)</span>
                  </Space>
                ),
                children: renderJsonTab(),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
};
