import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, Timeline, Tag, Typography, Spin, Empty, Button, Space } from 'antd';
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { userService } from '../../../../services/userService';
import type { ManagedUser, UserAuditLog } from '../../../../types/userManagement';

const { Text } = Typography;

interface UserAuditLogsDrawerProps {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
}

export const UserAuditLogsDrawer: React.FC<UserAuditLogsDrawerProps> = ({
  open,
  user,
  onClose,
}) => {
  const [logs, setLogs] = useState<UserAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await userService.getUserAuditLogs(user.id);
      setLogs(res.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [open, user, fetchLogs]);

  const getActionTagColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'processing';
      case 'DELETE':
        return 'error';
      case 'STATUS_CHANGE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateStr: string) => {
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

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>
            {`Nhật ký hoạt động: ${user ? `${user.firstName} ${user.lastName}` : ''}`}
          </span>
        </Space>
      }
      placement="right"
      width={560}
      onClose={onClose}
      open={open}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={fetchLogs}
          loading={loading}
        >
          Làm mới
        </Button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : logs.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có nhật ký hoạt động nào cho người dùng này"
          style={{ marginTop: 60 }}
        />
      ) : (
        <Timeline
          items={logs.map((log) => {
            const content = (
              <div style={{ paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color={getActionTagColor(log.action)}>{log.action}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDateTime(log.createdAt)}
                  </Text>
                </div>

                <div style={{ fontSize: 13, color: '#595959', marginBottom: 4 }}>
                  <Text strong>Thực hiện bởi: </Text>
                  {log.user ? (
                    <Text>{`${log.user.firstName || ''} ${log.user.lastName || ''} (${log.user.email})`.trim()}</Text>
                  ) : log.userId ? (
                    <Text code>{log.userId}</Text>
                  ) : (
                    <Text italic>Hệ thống</Text>
                  )}
                </div>

                {log.ipAddress && (
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                    <Text type="secondary">IP: </Text>
                    <Text code>{log.ipAddress}</Text>
                  </div>
                )}

                {(log.newData || log.oldData) && (
                  <div
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginTop: 8,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      maxHeight: 180,
                      overflowY: 'auto',
                    }}
                  >
                    {log.oldData && (
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ color: '#cf1322', fontWeight: 600 }}>Dữ liệu cũ: </span>
                        <span>{JSON.stringify(log.oldData, null, 2)}</span>
                      </div>
                    )}
                    {log.newData && (
                      <div>
                        <span style={{ color: '#389e0d', fontWeight: 600 }}>Dữ liệu mới: </span>
                        <span>{JSON.stringify(log.newData, null, 2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            return {
              key: log.id,
              color: log.action === 'CREATE' ? 'green' : log.action === 'DELETE' ? 'red' : 'blue',
              children: content,
              content,
            };
          })}
        />
      )}
    </Drawer>
  );
};
