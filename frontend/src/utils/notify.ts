import { message } from 'antd';

/**
 * Danh sách dịch lỗi backend (EN) -> tiếng Việt thân thiện.
 * Mọi lỗi trong toàn project đều đi qua đây để luôn hiện toast thay vì box đỏ inline.
 */
const VI_ERROR_MAP: Array<{ match: RegExp; text: string }> = [
  { match: /invalid\s*credentials/i, text: 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.' },
  { match: /unauthorized/i, text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
  { match: /user\s*not\s*found/i, text: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc đăng ký mới.' },
  { match: /email.*exist|exist.*email|email.*already/i, text: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.' },
  { match: /password.*incorrect|wrong\s*password/i, text: 'Mật khẩu không đúng. Vui lòng thử lại.' },
  { match: /token.*expired|expired.*token|jwt expired/i, text: 'Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại liên kết mới.' },
  { match: /token.*invalid|invalid.*token/i, text: 'Liên kết không hợp lệ hoặc đã được sử dụng. Vui lòng thử lại.' },
  { match: /network\s*error|failed to fetch|networkerror/i, text: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.' },
  { match: /too many requests|rate limit/i, text: 'Bạn thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.' },
  { match: /voucher.*expired|coupon.*expired/i, text: 'Mã ưu đãi đã hết hạn sử dụng.' },
  { match: /voucher.*invalid|coupon.*invalid|invalid.*voucher/i, text: 'Mã ưu đãi không hợp lệ.' },
];

export function translateErrorMessage(raw: string): string {
  if (!raw) return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const trimmed = raw.trim();
  for (const entry of VI_ERROR_MAP) {
    if (entry.match.test(trimmed)) return entry.text;
  }
  // Backend đôi khi trả message kỹ thuật bằng tiếng Anh -> giữ nguyên nếu đã là tiếng Việt
  // Nếu là tiếng Anh ngắn không dịch được thì vẫn hiện nhưng thêm gợi ý tiếng Việt
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed);
  if (hasVietnamese) return trimmed;
  return trimmed;
}

export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return translateErrorMessage(err);
  const e = err as any;
  const raw =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.message ??
    fallback;
  if (Array.isArray(raw)) return translateErrorMessage(raw.join(', '));
  if (typeof raw === 'string') return translateErrorMessage(raw);
  return fallback;
}

/** Hiện toast lỗi - dùng thay cho mọi box đỏ inline + alert() native */
export function notifyError(err: unknown, fallback?: string): void {
  const msg = typeof err === 'string' ? translateErrorMessage(err) : getErrorMessage(err, fallback);
  message.error(msg);
}

/** Hiện toast thành công */
export function notifySuccess(msg: string): void {
  message.success(msg);
}

/** Hiện toast cảnh báo */
export function notifyWarning(msg: string): void {
  message.warning(msg);
}

/** Hiện toast thông tin */
export function notifyInfo(msg: string): void {
  message.info(msg);
}
