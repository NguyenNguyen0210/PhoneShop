import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App as AntdApp, ConfigProvider, message } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AppRoutes } from './routes/AppRoutes';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '323053585279-2e3jkfp7m1nojsutf5dufau00ajd9osh.apps.googleusercontent.com';


message.config({
  top: 24,
  duration: 3,
  maxCount: 3,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={viVN}
          theme={{
            token: {
              colorPrimary: '#2563eb',
              borderRadius: 8,
              fontFamily: 'inherit',
            },
          }}
        >
          <BrowserRouter>
            <ScrollToTop />
            <AntdApp>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </AntdApp>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
