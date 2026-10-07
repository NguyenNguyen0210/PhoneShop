import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const getStoredAccessToken = () =>
  localStorage.getItem('phoneshop_access_token');

export { getStoredAccessToken };
export const getApiBaseUrl = () => baseURL;

const getStoredRefreshToken = () =>
  localStorage.getItem('phoneshop_refresh_token');

const clearStoredAuth = () => {
  localStorage.removeItem('phoneshop_access_token');
  localStorage.removeItem('phoneshop_refresh_token');
  localStorage.removeItem('phoneshop_user');
};

// Refresh tokens, shared by the 401 interceptor and proactive refresh.
const doRefreshTokens = async (
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const response = await axios.post<{
    accessToken?: string;
    refreshToken?: string;
    data?: { accessToken: string; refreshToken: string };
  }>(
    `${baseURL.replace(/\/$/, '')}/auth/refresh-token`,
    { refreshToken },
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  const payload = response.data?.data || response.data;
  const newAccessToken = payload?.accessToken;
  const newRefreshToken = payload?.refreshToken || refreshToken;

  if (!newAccessToken) {
    throw new Error('No access token returned from refresh');
  }

  localStorage.setItem('phoneshop_access_token', newAccessToken);
  localStorage.setItem('phoneshop_refresh_token', newRefreshToken);
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// Proactive refresh for endpoints with OPTIONAL auth (no 401 to trigger the
// interceptor — e.g. chatbot): an expired access token would silently become
// a guest request. Call before such requests.
export const ensureFreshAccessToken = async (): Promise<void> => {
  const token = getStoredAccessToken();
  const refreshToken = getStoredRefreshToken();
  if (!token || !refreshToken) return;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (Number(payload?.exp || 0) * 1000 - Date.now() > 60000) return;
  } catch {
    return;
  }
  await doRefreshTokens(refreshToken);
};
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearStoredAuth();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { accessToken: newAccessToken } = await doRefreshTokens(refreshToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearStoredAuth();
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
