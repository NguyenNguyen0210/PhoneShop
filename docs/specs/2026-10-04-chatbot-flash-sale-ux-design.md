# Design Spec: Chatbot Flash Sale Grounding & Rich UX Experience

- **Date:** 2026-10-04
- **Author:** PhoneShop Engineering Team
- **Topic:** Chatbot Flash Sale Grounding, Query Matching, and Rich Frontend UX

---

## 1. Context & Objectives

### Problem
Khi khách hàng mở khung chat AI và hỏi *"sản phẩm flash sale"*, chatbot phản hồi rằng shop chưa có sản phẩm nào chạy Flash Sale, mặc dù cơ sở dữ liệu đang có chiến dịch Flash Sale đang diễn ra (`FlashSaleCampaign`).
Nguyên nhân:
1. Backend `searchProducts` cũ chỉ tìm kiếm theo từ khóa trong tên/hãng điện thoại (`name` / `brand` chứa từ khóa "flash" hoặc "sale", trong khi tên điện thoại không chứa các từ này).
2. AI Gemini không nhận được danh sách sản phẩm hay chiến dịch Flash Sale, suy diễn từ FAQ tĩnh.
3. Frontend `AiChatWidget.tsx` chưa thể hiện nổi bật ưu đãi Flash Sale (thiếu nhãn badge ⚡ Flash Sale, thiếu giá gốc gạch ngang, chưa có gợi ý 1 chạm cho Flash Sale).

### Objectives
1. **Chính xác hóa Backend:** Bóc tách ý định người dùng với câu hỏi Flash Sale, tự động truy vấn chiến dịch đang chạy, lấy danh sách sản phẩm flash sale với giá thực tế và số lượng tồn còn lại.
2. **Nâng cấp Frontend UI/UX:**
   - Cung cấp badge `⚡ Flash Sale` trực quan trên các card sản phẩm được gợi ý trong khung chat.
   - Thể hiện rõ mức giá Flash Sale nổi bật và giá gốc gạch ngang.
   - Hiển thị badge nguồn dữ liệu minh bạch (`⚡ Flash Sale`, `🏷️ Voucher`, `🛡️ Bảo hành`).
   - Thêm nút gợi ý nhanh `⚡ Flash sale đang chạy` và `🏷️ Voucher hôm nay` trong danh sách suggestions mặc định.
3. **Độ ổn định:** Cung cấp multi-model retry (`gemini-3.5-flash-lite` -> `gemini-2.5-flash`) và fallback nội bộ hoàn chỉnh.

---

## 2. Technical Architecture & Data Contract

### 2.1 Backend Contract (`ChatbotProduct` & `ChatbotAskResponse`)
```ts
export interface ChatbotVariant {
  name: string;
  color?: string;
  storage?: string;
  ram?: string;
  price: number;
  compareAtPrice?: number;
  availableQty: number;
  flashPrice?: number;
}

export interface ChatbotProduct {
  slug: string;
  name: string;
  brand?: string;
  price: number;
  image: string;
  warrantyMonths?: number;
  specsSummary?: string;
  variants?: ChatbotVariant[];
}

export interface ChatbotAskResponse {
  reply: string;
  products: ChatbotProduct[];
  sources: string[]; // ['faq', 'flash-sale', 'voucher', 'order', 'warranty']
  escalate: boolean;
}
```

### 2.2 Frontend Client Service (`frontend/src/services/chatbotService.ts`)
- Mở rộng kiểu dữ liệu `ChatbotProduct` và `ChatbotVariant` để nhận `variants`, `flashPrice`, `compareAtPrice`.
- Cung cấp tiện ích kiểm tra nhanh sản phẩm có đang thuộc Flash Sale hay không (`isFlashSaleProduct(p)`).

### 2.3 Frontend Widget (`frontend/src/components/storefront/AiChatWidget.tsx`)
- Thêm trường `sources?: string[]` vào `UiMessage`.
- Hiển thị nhãn nguồn dưới câu trả lời của AI:
  - `flash-sale`: Tag `⚡ Flash Sale` (nền rose-50, chữ rose-700, viền rose-200).
  - `voucher`: Tag `🏷️ Voucher` (nền amber-50, chữ amber-700, viền amber-200).
  - `warranty`: Tag `🛡️ Bảo hành` (nền sky-50, chữ sky-700, viền sky-200).
- Card sản phẩm trong tin nhắn:
  - Nếu sản phẩm có giá Flash Sale: Hiển thị badge `⚡ Flash Sale` góc trên, giá Flash Sale đỏ hồng nổi bật, giá gốc gạch ngang.
  - Hiển thị tóm tắt phiên bản/màu hoặc cấu hình nổi bật.
- Danh sách gợi ý nhanh (`DEFAULT_SUGGESTIONS`):
  - `⚡ Flash sale nào đang chạy?`
  - `🏷️ Voucher nào dùng được hôm nay?`
  - `iPhone dưới 20 triệu còn hàng?`
  - `Đơn hàng của tôi đâu rồi?`
  - `Tra bảo hành bằng IMEI?`

---

## 3. State Coverage & Error Handling

1. **Khi có Flash Sale:** Card sản phẩm hiển thị giá giảm nổi bật, câu trả lời AI trích dẫn số suất còn lại và thời gian hết hạn.
2. **Khi không có Flash Sale nào đang chạy:** Chatbot giải thích lịch sự, gợi ý xem sản phẩm hot hoặc voucher đang hoạt động, không bị lỗi giao diện.
3. **Khi API Gemini phản hồi chậm hoặc lỗi 503:**
   - Hệ thống tự động retry sang model dự phòng.
   - Nếu vẫn lỗi, kích hoạt Local Fallback trả về đúng danh sách sản phẩm và văn bản từ database.
4. **Mạng chậm / Chờ tin nhắn:** Hiển thị spinner và trạng thái `Đang tìm ưu đãi tốt nhất...`.

---

## 4. Verification & Testing Strategy
1. **Unit Test Backend:** Bộ test `backend/test/unit/chatbot.spec.ts` kiểm tra câu hỏi chung về flash sale, câu hỏi theo hãng và fallback.
2. **Frontend Test:** Kiểm tra giao diện `AiChatWidget.tsx` hiển thị badge `⚡ Flash Sale` và giá gốc gạch ngang khi có sản phẩm flash sale.
3. **Live Verification:** Gửi request kiểm tra thực tế tới backend endpoint đã deploy trên production.
