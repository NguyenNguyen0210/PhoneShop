export function escapeHtml(value?: string | null): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

// ── CUSTOMER EMAIL LAYOUT ─────────────────────────────────────────────
// Minimalist, elegant transactional e-commerce layout (Apple / Stripe style).
// Clean white container, subtle border, no heavy black bars.
interface CustomerLayoutOptions {
  title: string;
  previewText: string;
  contentHtml: string;
}

export function renderCustomerLayout(options: CustomerLayoutOptions): string {
  const { title, previewText, contentHtml } = options;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-cell { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <!-- Inbox Preview Text -->
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(previewText)}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                      Phone<span style="color:#2563eb;">Shop</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-cell" style="padding:32px 36px 36px 36px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Customer Support & Legal Footer -->
          <tr>
            <td style="padding:24px 36px;background-color:#fafafa;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;line-height:1.6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;color:#334155;font-weight:600;">PhoneShop &bull; Hệ thống bán lẻ thiết bị di động chính hãng</p>
                    <p style="margin:0 0 6px 0;">Cần hỗ trợ? Liên hệ <a href="mailto:support@phoneshop.vn" style="color:#2563eb;text-decoration:none;">support@phoneshop.vn</a> hoặc hotline <a href="tel:19006868" style="color:#2563eb;text-decoration:none;">1900 6868</a> (8:00 - 21:30).</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; 2026 PhoneShop. Tất cả quyền được bảo lưu.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── TECHNICAL DIAGNOSTICS LAYOUT ──────────────────────────────────────
// Stripe / Resend / Vercel style for internal engineering alerts.
export interface DiagnosticOptions {
  host: string;
  port: number;
  user: string;
  from: string;
  latencyMs?: number;
  secure?: boolean;
  environment?: string;
  dashboardUrl?: string;
}

export function buildTestDiagnosticEmail(options: DiagnosticOptions): string {
  const {
    host,
    port,
    user,
    from,
    latencyMs = 185,
    secure = false,
    environment = process.env.NODE_ENV || 'development',
    dashboardUrl = 'http://localhost:5173/admin/settings',
  } = options;

  const safeHost = escapeHtml(host);
  const safeUser = escapeHtml(user);
  const safeFrom = escapeHtml(from);
  const safeEnv = escapeHtml(environment.toUpperCase());
  const encryptionText = secure || port === 465 ? 'TLS / SSL' : 'STARTTLS (Opportunistic)';
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiểm tra kết nối SMTP thành công</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 10px;">
    <tr>
      <td align="center">
        <!-- Container 560px -->
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;padding:32px 36px;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                Phone<span style="color:#2563eb;">Shop</span> <span style="font-size:12px;font-weight:500;color:#64748b;margin-left:6px;">/ System</span>
              </span>
            </td>
          </tr>

          <!-- Heading & Intro -->
          <tr>
            <td style="padding-top:24px;">
              <h2 style="margin:0 0 8px 0;font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
                Kiểm tra kết nối SMTP thành công
              </h2>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;">
                Hệ thống đã kết nối và gửi thư thử nghiệm thành công từ bảng điều khiển quản trị PhoneShop.
              </p>
            </td>
          </tr>

          <!-- Technical Box (Monospace Console) -->
          <tr>
            <td style="padding-top:20px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:13px;line-height:1.5;">
                <tr>
                  <td style="color:#64748b;width:32%;padding:8px 12px;border-bottom:1px solid #edf2f7;">SMTP Host</td>
                  <td style="color:#0f172a;font-weight:600;padding:8px 12px;border-bottom:1px solid #edf2f7;">${safeHost}:${port}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;border-bottom:1px solid #edf2f7;">Sender</td>
                  <td style="color:#0f172a;padding:8px 12px;border-bottom:1px solid #edf2f7;">${safeUser}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;border-bottom:1px solid #edf2f7;">From Header</td>
                  <td style="color:#0f172a;padding:8px 12px;border-bottom:1px solid #edf2f7;">${safeFrom}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;border-bottom:1px solid #edf2f7;">Encryption</td>
                  <td style="color:#0f172a;padding:8px 12px;border-bottom:1px solid #edf2f7;">${encryptionText}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;border-bottom:1px solid #edf2f7;">Latency</td>
                  <td style="color:#0f172a;padding:8px 12px;border-bottom:1px solid #edf2f7;">${latencyMs}ms</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;border-bottom:1px solid #edf2f7;">Timestamp</td>
                  <td style="color:#0f172a;padding:8px 12px;border-bottom:1px solid #edf2f7;">${timestamp}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:8px 12px;">Status</td>
                  <td style="color:#16a34a;font-weight:600;padding:8px 12px;">250 2.0.0 OK (Message accepted for delivery)</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Action Button -->
          <tr>
            <td style="padding-top:28px;">
              <a href="${escapeHtml(dashboardUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
                Quay lại Dashboard Quản trị &rarr;
              </a>
            </td>
          </tr>

          <!-- Tech Footer -->
          <tr>
            <td style="padding-top:28px;border-top:1px solid #f1f5f9;margin-top:28px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                PhoneShop Engineering &bull; Automated System Diagnostics &bull; Môi trường: ${safeEnv}<br/>
                Đây là thông báo kỹ thuật nội bộ tự động. Vui lòng không trả lời thư này.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── CUSTOMER TRANSACTIONAL EMAIL BUILDERS ──────────────────────────────

export function buildWelcomeEmail(recipientName?: string, homeUrl = 'http://localhost:5173'): string {
  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'bạn';
  const safeUrl = escapeHtml(homeUrl);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Chào mừng bạn đến với PhoneShop
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Tài khoản của bạn đã được khởi tạo thành công tại <strong>PhoneShop</strong>. Giờ đây bạn có thể đăng nhập để đặt hàng, quản lý đơn hàng và theo dõi thông tin bảo hành điện tử một cách nhanh chóng.
    </p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">
        Các tiện ích tài khoản của bạn:
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.7;">
        <li>Theo dõi tiến độ đơn hàng theo thời gian thực</li>
        <li>Lưu thông tin giao hàng cho các lần mua tiếp theo</li>
        <li>Tra cứu lịch sử giao dịch và bảo hành điện tử</li>
      </ul>
    </div>

    <div style="margin-top:24px;">
      <a href="${safeUrl}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;">
        Truy cập cửa hàng &rarr;
      </a>
    </div>
  `;

  return renderCustomerLayout({
    title: 'Chào mừng bạn đến với PhoneShop',
    previewText: `Chào ${safeName}, tài khoản PhoneShop của bạn đã sẵn sàng sử dụng.`,
    contentHtml,
  });
}

export function buildPasswordResetEmail(
  resetLink: string,
  recipientName?: string,
  expiresMinutes = 15,
): string {
  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'bạn';
  const safeLink = escapeHtml(resetLink);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Đặt lại mật khẩu tài khoản
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản PhoneShop của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới:
    </p>

    <div style="margin:24px 0;">
      <a href="${safeLink}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:6px;">
        Đặt lại mật khẩu
      </a>
    </div>

    <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;line-height:1.6;">
      Liên kết này có hiệu lực trong vòng <strong>${expiresMinutes} phút</strong>. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn vẫn được giữ nguyên an toàn.
    </p>

    <div style="padding-top:16px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;line-height:1.5;">
      Nếu nút bấm trên không mở được, bạn có thể dán liên kết sau vào trình duyệt:<br/>
      <a href="${safeLink}" style="color:#2563eb;word-break:break-all;font-size:12px;">${safeLink}</a>
    </div>
  `;

  return renderCustomerLayout({
    title: 'Đặt lại mật khẩu PhoneShop',
    previewText: 'Liên kết đặt lại mật khẩu tài khoản PhoneShop của bạn (hiệu lực 15 phút).',
    contentHtml,
  });
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price: number;
  color?: string;
}

export interface OrderConfirmationOptions {
  orderNumber: string;
  totalAmount: number;
  recipientName?: string;
  items?: OrderItemSummary[];
  paymentMethod?: string;
  shippingAddress?: string;
  orderUrl?: string;
}

export function buildOrderConfirmationEmail(options: OrderConfirmationOptions): string {
  const {
    orderNumber,
    totalAmount,
    recipientName,
    items,
    paymentMethod = 'Thanh toán tiêu chuẩn',
    shippingAddress,
    orderUrl,
  } = options;

  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'quý khách';
  const safeOrderNumber = escapeHtml(orderNumber);

  let itemsTableHtml = '';
  if (items && items.length > 0) {
    const rows = items
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">
            <div style="font-weight:600;">${escapeHtml(it.name)}</div>
            ${it.color ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">Màu: ${escapeHtml(it.color)}</div>` : ''}
          </td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">
            ${it.quantity}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">
            ${formatCurrency(it.price * it.quantity)}
          </td>
        </tr>
      `,
      )
      .join('');

    itemsTableHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border-collapse:collapse;">
        <thead>
          <tr>
            <th align="left" style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;">Sản phẩm</th>
            <th align="center" style="padding:8px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;width:60px;">SL</th>
            <th align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;width:110px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Xác nhận đơn hàng #${safeOrderNumber}
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Cảm ơn bạn đã mua sắm tại PhoneShop. Đơn hàng của bạn đã được ghi nhận và đang được chuẩn bị để giao đi.
    </p>

    <!-- Order Summary Details -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;width:35%;">Mã đơn hàng:</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">#${safeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Phương thức:</td>
          <td style="padding:4px 0;font-size:13px;color:#334155;">${escapeHtml(paymentMethod)}</td>
        </tr>
        ${
          shippingAddress
            ? `
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;vertical-align:top;">Địa chỉ giao hàng:</td>
          <td style="padding:4px 0;font-size:13px;color:#334155;">${escapeHtml(shippingAddress)}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="padding:10px 0 0 0;font-size:14px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Tổng thanh toán:</td>
          <td style="padding:10px 0 0 0;font-size:15px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">${formatCurrency(totalAmount)}</td>
        </tr>
      </table>
    </div>

    ${itemsTableHtml}

    ${
      orderUrl
        ? `
      <div style="margin-top:24px;">
        <a href="${escapeHtml(orderUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Xem chi tiết đơn hàng &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Xác nhận đơn hàng #${safeOrderNumber}`,
    previewText: `Đơn hàng #${safeOrderNumber} (${formatCurrency(totalAmount)}) đã được ghi nhận.`,
    contentHtml,
  });
}

export function buildShippingNotificationEmail(
  orderNumber: string,
  trackingNumber: string,
  providerName: string,
  trackingUrl?: string,
): string {
  const safeOrder = escapeHtml(orderNumber);
  const safeTracking = escapeHtml(trackingNumber);
  const safeProvider = escapeHtml(providerName);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Đơn hàng #${safeOrder} đang được giao
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Kiện hàng của bạn đã hoàn tất đóng gói và được bàn giao cho đối tác vận chuyển <strong>${safeProvider}</strong>.
    </p>

    <!-- Tracking Monospace Box -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:18px 20px;margin:20px 0;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:6px;">
        Mã vận đơn (${safeProvider})
      </div>
      <div style="font-size:18px;font-weight:700;color:#0f172a;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;letter-spacing:1px;margin-bottom:6px;">
        ${safeTracking}
      </div>
      <div style="font-size:13px;color:#64748b;line-height:1.5;">
        Nhân viên giao nhận sẽ liên hệ số điện thoại của bạn trước khi phát hàng.
      </div>
    </div>

    ${
      trackingUrl
        ? `
      <div style="margin-top:20px;">
        <a href="${escapeHtml(trackingUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Tra cứu lộ trình giao nhận &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Đơn hàng #${safeOrder} đang được vận chuyển`,
    previewText: `Đơn hàng #${safeOrder} đã bàn giao cho ${safeProvider}. Mã vận đơn: ${safeTracking}.`,
    contentHtml,
  });
}

export function buildReturnApprovedEmail(returnNumber: string, returnAddress?: string): string {
  const safeReturnNumber = escapeHtml(returnNumber);
  const safeAddress = escapeHtml(
    returnAddress || 'Trung tâm Bảo hành PhoneShop, Tòa nhà PhoneShop Tower, TP. Hồ Chí Minh',
  );

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Cập nhật yêu cầu đổi trả #${safeReturnNumber}
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Yêu cầu đổi trả mã <strong>#${safeReturnNumber}</strong> của bạn đã được bộ phận chăm sóc khách hàng tiếp nhận và chấp thuận.
    </p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:18px 20px;margin:20px 0;">
      <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:10px;">
        Hướng dẫn gửi sản phẩm về trung tâm:
      </div>
      <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#334155;">
        <li>Đóng gói sản phẩm cẩn thận kèm theo hộp và phụ kiện đi kèm (nếu có).</li>
        <li>Ghi chú mã yêu cầu <strong>#${safeReturnNumber}</strong> ở mặt ngoài gói hàng.</li>
        <li>Gửi kiện hàng về địa chỉ tiếp nhận bảo hành dưới đây trong vòng <strong>3 ngày làm việc</strong>:</li>
      </ol>
      <div style="margin-top:12px;padding:10px 14px;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;color:#0f172a;font-weight:500;">
        Địa chỉ tiếp nhận: ${safeAddress}
      </div>
    </div>

    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
      Sau khi tiếp nhận và kiểm tra tình trạng sản phẩm, chúng tôi sẽ tiến hành đổi mới hoặc hoàn tiền theo quy định.
    </p>
  `;

  return renderCustomerLayout({
    title: `Yêu cầu đổi trả #${safeReturnNumber} đã được chấp thuận`,
    previewText: `Yêu cầu đổi trả #${safeReturnNumber} đã được duyệt. Hướng dẫn gửi sản phẩm về trung tâm.`,
    contentHtml,
  });
}

// ── ORDER CANCELLED TEMPLATE ──────────────────────────────────────────

export interface OrderCancelledOptions {
  orderNumber: string;
  recipientName?: string;
  cancelledReason?: string;
  voucherRestored?: boolean;
  orderUrl?: string;
}

export function buildOrderCancelledEmail(options: OrderCancelledOptions): string {
  const {
    orderNumber,
    recipientName,
    cancelledReason = 'Theo yêu cầu của khách hàng hoặc hệ thống hết hạn giữ hàng',
    voucherRestored = false,
    orderUrl,
  } = options;

  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'quý khách';
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeReason = escapeHtml(cancelledReason);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Thông báo hủy đơn hàng #${safeOrderNumber}
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Đơn hàng <strong>#${safeOrderNumber}</strong> của bạn đã được hủy trên hệ thống PhoneShop. Các thiết bị được giữ chỗ trong đơn hàng đã được giải phóng tồn kho.
    </p>

    <!-- Cancellation Details Box -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;width:35%;">Mã đơn hàng:</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">#${safeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;vertical-align:top;">Lý do hủy:</td>
          <td style="padding:4px 0;font-size:13px;color:#334155;">${safeReason}</td>
        </tr>
        ${
          voucherRestored
            ? `
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Mã khuyến mãi:</td>
          <td style="padding:4px 0;font-size:13px;color:#16a34a;font-weight:600;">Đã hoàn lại lượt sử dụng voucher vào tài khoản của bạn</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="margin:0 0 20px 0;font-size:13px;color:#64748b;line-height:1.6;">
      Nếu bạn có nhu cầu tiếp tục mua sắm hoặc cần hỗ trợ đặt hàng lại, xin vui lòng truy cập website hoặc liên hệ đội ngũ chăm sóc khách hàng.
    </p>

    ${
      orderUrl
        ? `
      <div style="margin-top:20px;">
        <a href="${escapeHtml(orderUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Xem lại đơn hàng &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Thông báo hủy đơn hàng #${safeOrderNumber}`,
    previewText: `Đơn hàng #${safeOrderNumber} đã được hủy trên hệ thống PhoneShop.`,
    contentHtml,
  });
}

// ── ORDER DELIVERED & WARRANTY ACTIVATION TEMPLATE ────────────────────

export interface WarrantyItemSummary {
  productName: string;
  imei?: string | null;
  warrantyCode: string;
  startDate?: string;
  endDate: string;
}

export interface OrderDeliveredOptions {
  orderNumber: string;
  recipientName?: string;
  warranties?: WarrantyItemSummary[];
  orderUrl?: string;
}

export function buildOrderDeliveredEmail(options: OrderDeliveredOptions): string {
  const { orderNumber, recipientName, warranties = [], orderUrl } = options;

  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'quý khách';
  const safeOrderNumber = escapeHtml(orderNumber);

  let warrantiesTableHtml = '';
  if (warranties.length > 0) {
    const rows = warranties
      .map(
        (w) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">
            <div style="font-weight:600;">${escapeHtml(w.productName)}</div>
            ${w.imei ? `<div style="font-size:12px;color:#64748b;font-family:monospace;margin-top:2px;">IMEI: ${escapeHtml(w.imei)}</div>` : ''}
          </td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;font-family:monospace;font-weight:600;color:#2563eb;">
            ${escapeHtml(w.warrantyCode)}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#334155;">
            Đến ${escapeHtml(w.endDate)}
          </td>
        </tr>
      `,
      )
      .join('');

    warrantiesTableHtml = `
      <div style="margin:20px 0;">
        <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">
          Thông tin bảo hành điện tử chính hãng (e-Warranty):
        </div>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th align="left" style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Thiết bị</th>
              <th align="center" style="padding:8px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Mã bảo hành</th>
              <th align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Hạn bảo hành</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Đơn hàng #${safeOrderNumber} đã giao thành công
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Kiện hàng của đơn <strong>#${safeOrderNumber}</strong> đã được giao thành công đến bạn. Cảm ơn bạn đã tin tưởng và lựa chọn sản phẩm tại PhoneShop.
    </p>

    ${warrantiesTableHtml}

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px;margin:20px 0;font-size:13px;color:#475569;line-height:1.6;">
      <strong>Lưu ý quyền lợi khách hàng:</strong> Quý khách được áp dụng chính sách đổi mới sản phẩm trong vòng 30 ngày nếu phát sinh lỗi kỹ thuật từ nhà sản xuất. Mọi thắc mắc kỹ thuật vui lòng liên hệ hotline 1900 6868.
    </div>

    ${
      orderUrl
        ? `
      <div style="margin-top:20px;">
        <a href="${escapeHtml(orderUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Quản lý đơn hàng & Bảo hành &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Đơn hàng #${safeOrderNumber} đã giao thành công`,
    previewText: `Đơn hàng #${safeOrderNumber} đã hoàn tất giao hàng và kích hoạt bảo hành điện tử.`,
    contentHtml,
  });
}

// ── INSTALLMENT REVIEW TEMPLATES ──────────────────────────────────────

export interface InstallmentApprovedOptions {
  orderNumber: string;
  recipientName?: string;
  providerName?: string;
  prepayAmount: number;
  monthlyAmount: number;
  termMonths: number;
  orderUrl?: string;
}

export function buildInstallmentApprovedEmail(options: InstallmentApprovedOptions): string {
  const {
    orderNumber,
    recipientName,
    providerName = 'Đối tác tài chính',
    prepayAmount,
    monthlyAmount,
    termMonths,
    orderUrl,
  } = options;

  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'quý khách';
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeProvider = escapeHtml(providerName);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Hồ sơ trả góp cho đơn hàng #${safeOrderNumber} đã được phê duyệt
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Hồ sơ đăng ký mua trả góp cho đơn hàng <strong>#${safeOrderNumber}</strong> đã được đối tác tài chính <strong>${safeProvider}</strong> và PhoneShop phê duyệt thành công.
    </p>

    <!-- Financial Schedule Box -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:10px;">
        Chi tiết gói trả góp đã duyệt:
      </div>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;width:40%;">Đơn vị tài chính:</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${safeProvider}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Số tiền trả trước:</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${formatCurrency(prepayAmount)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Kỳ hạn vay:</td>
          <td style="padding:4px 0;font-size:13px;color:#334155;">${termMonths} tháng</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;">Góp mỗi tháng (ước tính):</td>
          <td style="padding:4px 0;font-size:14px;font-weight:700;color:#2563eb;">${formatCurrency(monthlyAmount)} / tháng</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px 0;font-size:13px;color:#64748b;line-height:1.6;">
      Đơn hàng đang được chuyển sang bộ phận kho để đóng gói và bàn giao vận chuyển. Quý khách vui lòng chuẩn bị số tiền trả trước khi nhận hàng.
    </p>

    ${
      orderUrl
        ? `
      <div style="margin-top:20px;">
        <a href="${escapeHtml(orderUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Xem tiến độ đơn hàng &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Hồ sơ trả góp đơn hàng #${safeOrderNumber} đã được duyệt`,
    previewText: `Hồ sơ trả góp đơn hàng #${safeOrderNumber} qua ${safeProvider} đã được duyệt.`,
    contentHtml,
  });
}

export interface InstallmentRejectedOptions {
  orderNumber: string;
  recipientName?: string;
  rejectionReason: string;
  orderUrl?: string;
}

export function buildInstallmentRejectedEmail(options: InstallmentRejectedOptions): string {
  const {
    orderNumber,
    recipientName,
    rejectionReason = 'Hồ sơ chưa đạt tiêu chuẩn thẩm định tín dụng',
    orderUrl,
  } = options;

  const safeName = recipientName ? escapeHtml(recipientName.trim()) : 'quý khách';
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeReason = escapeHtml(rejectionReason);

  const contentHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
      Thông báo kết quả hồ sơ trả góp đơn hàng #${safeOrderNumber}
    </h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Xin chào ${safeName},
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
      Rất tiếc, hồ sơ đăng ký mua trả góp cho đơn hàng <strong>#${safeOrderNumber}</strong> chưa được đối tác tài chính chấp thuận tại thời điểm này.
    </p>

    <!-- Reason Box -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;width:35%;">Mã đơn hàng:</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">#${safeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748b;vertical-align:top;">Lý do phản hồi:</td>
          <td style="padding:4px 0;font-size:13px;color:#b91c1c;font-weight:500;">${safeReason}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px 0;font-size:13px;color:#64748b;line-height:1.6;">
      Đơn hàng trả góp tạm thời đã bị hủy. Bạn có thể đặt lại đơn hàng với hình thức thanh toán trực tiếp (Thanh toán khi nhận hàng COD, chuyển khoản VietQR hoặc ví VNPAY) để sở hữu sản phẩm nhanh chóng.
    </p>

    ${
      orderUrl
        ? `
      <div style="margin-top:20px;">
        <a href="${escapeHtml(orderUrl)}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
          Đặt lại đơn hàng &rarr;
        </a>
      </div>
    `
        : ''
    }
  `;

  return renderCustomerLayout({
    title: `Kết quả hồ sơ trả góp đơn hàng #${safeOrderNumber}`,
    previewText: `Thông báo kết quả thẩm định hồ sơ trả góp đơn hàng #${safeOrderNumber}.`,
    contentHtml,
  });
}
