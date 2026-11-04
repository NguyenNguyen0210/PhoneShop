# Google OAuth cho PhoneShop: chỉ đăng nhập cơ bản

Ứng dụng sử dụng **Sign in with Google** với các scope `openid email profile`, chỉ để xác thực người dùng và đọc email/tên/ảnh đại diện. Không truy cập Gmail, Drive, Calendar hoặc các Google API có quyền nhạy cảm; không yêu cầu Google refresh token.

## Có cần Google xét duyệt không?

- **Sensitive/restricted scope verification:** Với đúng ba scope đăng nhập cơ bản ở trên, không có yêu cầu xin xác minh các scope nhạy cảm hoặc bị hạn chế. Nếu về sau thêm scope khác, phải đánh giá lại.
- **Brand verification:** Google vẫn có thể yêu cầu xác minh thương hiệu của ứng dụng **External / In production**, đặc biệt để hiển thị tên và logo ứng dụng trên consent screen. Không thể bảo đảm bỏ qua mọi hình thức xác minh chỉ nhờ giới hạn scope. Google có thể chỉ hiển thị domain nếu chưa xác minh thương hiệu.
- **Testing:** Chỉ các Google account được thêm vào danh sách test users mới sử dụng được ứng dụng đang ở chế độ Testing. Khi mở cho công chúng, chuyển trạng thái publishing phù hợp trên Google Auth Platform và thực hiện các yêu cầu branding đang áp dụng.

Hướng dẫn chính thức của Google:

- https://developers.google.com/identity/verification/authentication-verification
- https://support.google.com/cloud/answer/15549049
- https://developers.google.com/identity/protocols/oauth2/resources/granular-permissions

## Cấu hình Google Cloud Console

1. Mở **Google Cloud Console → Google Auth Platform**; tạo hoặc chọn project. Ở **Branding**, điền thông tin ứng dụng, email hỗ trợ và các URL hợp lệ nếu được yêu cầu.
2. Trong **Audience**, chọn `External`; thêm tài khoản thử nghiệm nếu đang ở trạng thái `Testing`.
3. Ở **Data Access**, chỉ dùng scope đăng nhập `openid`, `email`, `profile`. Không thêm scope nhạy cảm hoặc restricted.
4. Trong **Clients**, tạo OAuth client loại **Web application**. Dùng chung Client ID cho frontend và backend. Thiết lập chính xác:

   | Môi trường | Authorized JavaScript origin | Authorized redirect URI |
   | --- | --- | --- |
   | Local | `http://localhost:5173` | `http://localhost:5173/auth/oauth/callback` |
   | Production hiện tại | `https://phoneshop-blond.vercel.app` | `https://phoneshop-blond.vercel.app/auth/oauth/callback` |

   Nếu chuyển sang domain riêng, cập nhật lại các origin và redirect URI. Google có thể yêu cầu xác minh quyền sở hữu domain; domain chia sẻ của nền tảng hosting có thể gây khó khăn cho việc xác minh thương hiệu.

5. Cấu hình biến môi trường thực tế trên máy local hoặc nền tảng deploy:

   - Backend: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (và `FRONTEND_URL` đang dùng).
   - Frontend: `VITE_GOOGLE_CLIENT_ID` bằng **đúng Client ID của backend**. `VITE_GOOGLE_REDIRECT_URI` trong file ví dụ hiện chưa được frontend sử dụng; backend quyết định `redirect_uri` khi tạo authorization URL.
   - Không đưa `GOOGLE_CLIENT_SECRET` vào frontend hoặc Git.

## Các luồng đăng nhập hiện có

- **Popup GoogleLogin trên Login/Register:** Google Identity Services cấp **ID token**; frontend gửi nó tới `POST /api/auth/google/credential`. Backend kiểm tra token với Google, rồi bắt buộc xác thực `aud`, `iss`, `sub`, `exp` và `email_verified` trước khi cấp JWT của PhoneShop.
- **Authorization Code (được giữ lại cho callback; UI hiện dùng popup):** `GET /api/auth/google/url` chỉ yêu cầu `openid email profile`; không ép `prompt=consent` hay `access_type=offline`. Backend kiểm tra `state` đã ký, đổi code với Google và chỉ chấp nhận email đã xác minh trong `POST /api/auth/google/callback`.
- JWT/refresh token **của PhoneShop** là độc lập với Google refresh token và vẫn được sử dụng bình thường.

## Kiểm tra thủ công trước khi mở public

1. Thử GoogleLogin trên trang đăng nhập và đăng ký bằng tài khoản được phép truy cập theo Publishing status.
2. Kiểm tra thông báo lỗi với Client ID sai hoặc token hết hạn; backend không tạo phiên đăng nhập.
3. Kiểm tra URL authorization chỉ chứa `scope=openid email profile`, `response_type=code` và `state`, không chứa `access_type=offline` hay `prompt=consent`.
4. Kiểm tra Google Auth Platform → **Branding** và **Verification Center** để biết ứng dụng có yêu cầu xác minh thương hiệu hoặc domain hay không; xử lý trước khi công khai nếu được yêu cầu.
