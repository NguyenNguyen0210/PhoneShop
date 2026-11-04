# Quy tắc nghiệp vụ và kiểm thử

## Đơn hàng, tiền và tồn kho

| Sự kiện | Đơn hàng | IMEI | Tồn kho |
| --- | --- | --- | --- |
| Checkout | PENDING | AVAILABLE → RESERVED | available giảm, reserved tăng |
| Thanh toán online thành công | CONFIRMED | Giữ RESERVED | Giữ nguyên bộ đếm |
| Xác nhận COD | CONFIRMED | Giữ RESERVED | Giữ nguyên bộ đếm |
| Giao thành công | DELIVERED | RESERVED → SOLD | quantity và reserved giảm; ghi EXPORT_ORDER |
| Hủy chưa thu tiền | CANCELLED | RESERVED → AVAILABLE | reserved giảm, available tăng |
| Hoàn đủ tiền trước giao | CANCELLED | RESERVED → AVAILABLE | reserved giảm, available tăng |
| Nhà vận chuyển trả hàng | RETURNED | RESERVED → RETURNED | quantity và reserved giảm; cách ly chờ QC |
| Hoàn đủ sau giao | RETURNED | SOLD → RETURNED | Không cộng tồn khả dụng |
| QC chấp nhận hàng trả | Giữ nguyên | RETURNED → AVAILABLE | quantity và available tăng; ghi IMPORT_RETURN |

- Đơn online phải có payment PAID hoặc PARTIALLY_REFUNDED mới được xử lý/giao. COD được thanh toán khi giao thành công.
- Đơn online PENDING giữ hàng 15 phút; COD không áp dụng timeout này.
- Refund ghi nhận tiền **đã được hoàn bên ngoài**, cần mã chứng từ duy nhất. API không tự gọi ngân hàng để chuyển tiền.
- Hoàn một phần giữ trạng thái đơn và hàng. Hoàn phần còn lại tất toán payment và chạy tác vụ hàng hóa một lần.
- Khi đơn đang SHIPPING, cần ghi nhận hàng quay về trước khi xác nhận hoàn tiền; tránh giải phóng hàng còn trên đường.
- Chuyển trạng thái và tác vụ kho, tiền, vận chuyển liên quan nằm trong transaction. Bộ đếm hoặc trạng thái thiết bị không khớp sẽ làm rollback.
- Máy BLOCKED vẫn nằm trong quantity và phần không khả dụng của reservedQty. Đồng bộ IMEI phải giữ cách tính này.
- Mỗi đơn lưu shippingAddressSnapshot tại checkout. Sửa/xóa sổ địa chỉ không thay đổi đơn cũ. Đơn lịch sử chỉ có thể backfill từ địa chỉ còn tồn tại tại thời điểm migration.

## Bảo hành

- Bắt đầu khi giao hàng, theo warrantyMonths của sản phẩm; chuyển DELIVERED → COMPLETED không gia hạn.
- Khách yêu cầu: ACTIVE → CLAIMED, repairStage = REQUESTED.
- Nhân viên nhận máy: REQUESTED → RECEIVED, IMEI SOLD → WARRANTY.
- Sửa xong: RECEIVED → REPAIRED.
- Trả khách: REPAIRED → RETURNED, IMEI WARRANTY → SOLD; warranty trở về ACTIVE hoặc EXPIRED theo ngày hết hạn ban đầu.
- Máy đang sửa thuộc khách hàng, không được nhập vào kho bán hàng. Các bước cần ghi chú và có AuditLog.
- Tra cứu công khai bằng mã bảo hành, IMEI hoặc serial. Tra bằng điện thoại cần đăng nhập và chỉ tìm bảo hành của tài khoản hiện tại.

## Báo cáo tiền

- Nguồn dữ liệu: PaymentTransaction SUCCESS.
- totalRevenue: tổng PAYMENT; refundedTotal: tổng REFUND và PARTIAL_REFUND; netRevenue = totalRevenue - refundedTotal.
- Phân ngày theo thời điểm ghi nhận giao dịch createdAt, múi giờ Asia/Ho_Chi_Minh. Ngày chỉ có hoàn tiền có thể có thực thu âm.
- Biểu đồ theo thương hiệu/danh mục là doanh số hàng đã giao, không phải sổ thu/hoàn tiền. Không cộng chúng để đối chiếu dòng tiền sau chiết khấu và hoàn tiền.
- Giao dịch cũ thiếu bản ghi SUCCESS cần đối soát chứng từ; không tự suy diễn tiền đã thu từ trạng thái đơn.

## Chạy kiểm tra

```powershell
cd backend
npm test -- --runInBand
npm run build
```

Integration test chỉ chạy với TEST_DATABASE_URL được chỉ định rõ, host localhost/127.0.0.1, tên DB kết thúc _test, _ci hoặc _audit. Không dùng DATABASE_URL mặc định để ghi dữ liệu test.

```powershell
docker run --detach --rm --name phoneshop-tests -e POSTGRES_USER=tester -e POSTGRES_PASSWORD=local_test_only -e POSTGRES_DB=phoneshop_test -p 127.0.0.1:55439:5432 postgres:17
$env:DATABASE_URL = 'postgresql://tester:local_test_only@127.0.0.1:55439/phoneshop_test'
npx prisma migrate deploy
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run test:integration
docker stop phoneshop-tests
```

Suite DB thật kiểm tra checkout tranh chấp máy cuối, thanh toán không xuất kho sớm, refund đồng thời/rollback, hàng trả và QC, địa chỉ bất biến, đồng bộ máy BLOCKED, sửa/trả máy bảo hành, COD idempotent và báo cáo hoàn tiền theo ngày Việt Nam.

Kiểm tra giao diện bằng Playwright (cần cài Python Playwright và Chromium):

```powershell
# Sau khi build backend, với TEST_DATABASE_URL trỏ DB test ở trên:
node scripts/seed-business-smoke.cjs
# Chạy backend trên 3101 và frontend trên 5175, VITE_API_URL=http://localhost:3101/api.
# Backend dùng DB test, FRONTEND_URL=http://localhost:5175, email ở chế độ mock.
# Từ thư mục gốc repo:
python frontend/e2e/business-smoke.py
```

Script seed từ chối database ngoài localhost và tên không phải test. Dữ liệu đăng nhập test và screenshot nằm trong test_artifacts/ (được gitignore). Mỗi lần chạy smoke test cần tạo fixture mới vì test thực sự hoàn tiền và hoàn tất sửa máy trong DB test.

## Triển khai

1. Sao lưu và kiểm tra khả năng khôi phục DB; xem PRODUCTION_RUNBOOK.md và preflight trước khi migrate.
2. Dừng ghi trong lúc triển khai migration chuyển đổi cột/IMEI cũ và ứng dụng mới, tránh hai phiên bản dùng quy tắc tồn khác nhau.
3. Chạy prisma migrate deploy và prisma generate; build rồi khởi động ứng dụng mới.
4. Không dùng db push để thay lịch sử migration. Migration chuyển đổi giữ các cột legacy để đối soát, không tự xóa dữ liệu cũ.
5. Kiểm tra đơn đang xử lý, hàng trả, bảo hành và tiền bằng chứng từ trước khi mở lại ghi.

Các đơn RETURNED từ phiên bản trước có thể đã lệch bộ đếm tồn. Cần đối chiếu IMEI và StockMovement trước khi đồng bộ hoặc nhập lại; migration không tự đoán vị trí vật lý của những máy này.
