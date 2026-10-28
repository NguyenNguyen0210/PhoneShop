import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lỗi giao diện bắt được bởi ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <Result
            status="error"
            title="Đã xảy ra sự cố không mong muốn"
            subTitle="Giao diện gặp lỗi trong quá trình xử lý dữ liệu. Vui lòng tải lại trang hoặc quay lại trang chủ."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                Tải lại trang
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                Về trang chủ
              </Button>,
            ]}
          >
            {this.state.error && import.meta.env.DEV && (
              <div style={{ textAlign: 'left', marginTop: 16, maxWidth: 600 }}>
                <Paragraph>
                  <Text strong style={{ fontSize: 13, color: '#475569' }}>
                    Chi tiết lỗi kỹ thuật (chỉ hiển thị ở chế độ phát triển):
                  </Text>
                </Paragraph>
                <Paragraph
                  style={{
                    color: '#dc2626',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                  }}
                >
                  {this.state.error.toString()}
                </Paragraph>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
