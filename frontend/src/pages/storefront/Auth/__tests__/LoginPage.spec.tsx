// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const mockLogin = vi.fn();
vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

vi.mock('../../../../services/authService', () => ({
  authService: {
    getGoogleAuthUrl: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com', state: 'oauth_login' }),
    forgotPassword: vi.fn().mockResolvedValue({ message: 'Success' }),
  },
}));

describe('LoginPage (Centered Card Layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders centered card with brand header, title, and google button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Chào mừng bạn trở lại/i })).toBeDefined();
    expect(screen.getByText(/Đăng nhập nhanh với Google/i)).toBeDefined();
    expect(screen.getByText(/Ghi nhớ đăng nhập/i)).toBeDefined();
    expect(screen.getByText(/Quên mật khẩu\?/i)).toBeDefined();
    expect(screen.getByText(/Đăng ký ngay/i)).toBeDefined();
  });

  it('validates empty inputs on submit', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng nhập đầy đủ email và mật khẩu/i)).toBeDefined();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in user and redirects to home for regular customer', async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, role: 'CUSTOMER', email: 'user@example.com' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập mật khẩu/i), { target: { value: 'pass123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'pass123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to /admin when user role is ADMIN', async () => {
    mockLogin.mockResolvedValueOnce({ id: 2, role: 'ADMIN', email: 'admin@phoneshop.vn' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'admin@phoneshop.vn' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập mật khẩu/i), { target: { value: 'adminpass' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('opens forgot password modal and submits email', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Quên mật khẩu\?/i));

    expect(screen.getByText(/Khôi phục mật khẩu/i)).toBeDefined();

    const forgotInput = screen.getByPlaceholderText(/Địa chỉ email đã đăng ký/i);
    fireEvent.change(forgotInput, { target: { value: 'forgot@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi link đặt lại mật khẩu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Đã gửi email khôi phục/i)).toBeDefined();
    });
  });
});
