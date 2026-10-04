// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRegister = vi.fn();
vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    register: mockRegister,
  }),
}));

vi.mock('../../../../services/authService', () => ({
  authService: {
    getGoogleAuthUrl: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com', state: 'test_state' }),
  },
}));

describe('RegisterPage (Centered Card Layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders centered card with brand header, title, and voucher ribbon', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Tạo tài khoản PhoneShop/i })).toBeDefined();
    expect(screen.getByText(/WELCOME50/i)).toBeDefined();
    expect(screen.getByText(/50\.000/i)).toBeDefined();
    expect(screen.getByText(/Đăng ký nhanh với Google/i)).toBeDefined();
    expect(screen.getByText(/Đăng nhập ngay/i)).toBeDefined();
  });

  it('renders 5 stacked input fields and submit button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Nguyễn Văn A/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/0912 345 678/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Nhập lại mật khẩu/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Đăng ký tài khoản/i })).toBeDefined();
  });

  it('displays client error if required fields are empty', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Đăng ký tài khoản/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng điền đầy đủ các thông tin bắt buộc/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error if password is less than 6 characters', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu phải có ít nhất 6 ký tự/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays error if passwords do not match', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: '654321' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register and redirects to / on successful registration', async () => {
    mockRegister.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/0912 345 678/i), { target: { value: '0988776655' } });
    fireEvent.change(screen.getByPlaceholderText(/Tối thiểu 6 ký tự/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập lại mật khẩu/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn Test',
        email: 'test@example.com',
        phone: '0988776655',
        password: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
