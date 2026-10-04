// FAQ tĩnh cho chatbot PhoneShop — dùng làm grounding khi Gemini không có key
// hoặc để bổ sung context cho prompt. Giữ ngắn gọn, facts-only.
export interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
}

export const SHOP_FAQ: FaqEntry[] = [
  {
    keywords: ['giao hàng', 'ship', 'vận chuyển', 'bao lâu', 'phí ship'],
    question: 'Giao hàng thế nào?',
    answer:
      'PhoneShop miễn phí giao hàng toàn quốc. Nội thành 1-2 ngày, tỉnh 2-4 ngày. Đơn giữ máy 15 phút sau khi đặt, quá hạn tự hủy giữ chỗ.',
  },
  {
    keywords: ['thanh toán', 'vnpay', 'vietqr', 'cod', 'trả góp'],
    question: 'Các hình thức thanh toán?',
    answer:
      'Hỗ trợ COD, VietQR NAPAS 247 (quét mã theo đúng số tiền/nội dung), VNPay Sandbox (ký HMAC-SHA512, xử lý qua IPN). Trả góp qua đối tác, liên hệ CSKH để được tư vấn.',
  },
  {
    keywords: ['bảo hành', 'imei', 'kích hoạt', 'tra cứu', 'warranty'],
    question: 'Chính sách bảo hành?',
    answer:
      'Bảo hành chính hãng 12-24 tháng tùy sản phẩm, 1 đổi 1 trong 30 ngày nếu lỗi NSX. Tra cứu bằng IMEI tại trang Tra cứu bảo hành. Mỗi IMEI là duy nhất, kiểm tra Luhn khi nhập kho.',
  },
  {
    keywords: ['đổi trả', 'hoàn', 'trả hàng', '1 đổi 1'],
    question: 'Đổi trả ra sao?',
    answer:
      '1 đổi 1 trong 30 ngày với lỗi nhà sản xuất, máy giữ nguyên seal/phụ kiện. Quá 30 ngày chuyển sang bảo hành sửa chữa. Tạo yêu cầu tại mục Bảo hành/Đổi trả.',
  },
  {
    keywords: ['giữ hàng', 'giữ máy', '15 phút', 'hold', 'hết hàng', 'flash sale'],
    question: 'Giữ hàng 15 phút là gì?',
    answer:
      'Khi đặt hàng, IMEI được khóa giữ (HOLD) 15 phút để bạn thanh toán. Hết 15 phút chưa thanh toán, đơn tự hủy và máy trả về kho AVAILABLE. Flash sale dùng pessimistic lock nên không bị bán trùng.',
  },
  {
    keywords: ['voucher', 'mã giảm', 'coupon', 'khuyến mãi'],
    question: 'Dùng voucher thế nào?',
    answer:
      'Nhập mã ở giỏ hàng/thanh toán. Mỗi voucher có đơn tối thiểu, mức giảm tối đa và giới hạn lượt dùng. Kiểm tra điều kiện trước khi áp dụng.',
  },
  {
    keywords: ['trả góp', 'installment', 'góp'],
    question: 'Có trả góp không?',
    answer:
      'Có hỗ trợ trả góp qua thẻ tín dụng/đối tác tài chính. Chọn trả góp ở bước thanh toán để xem kỳ hạn và lãi suất.',
  },
  {
    keywords: ['cửa hàng', 'địa chỉ', 'liên hệ', 'hotline', 'nhân viên'],
    question: 'Liên hệ hỗ trợ?',
    answer:
      'Bấm nút chat xanh để gặp nhân viên CSKH, hoặc tạo ticket hỗ trợ. Nhân viên trực tuyến giờ hành chính, AI hỗ trợ 24/7 các câu hỏi thường gặp.',
  },
];

export function findFaqMatches(message: string, limit = 2): FaqEntry[] {
  const lower = message.toLowerCase();
  const scored = SHOP_FAQ.map((faq) => {
    const hits = faq.keywords.filter((k) => lower.includes(k.toLowerCase())).length;
    return { faq, hits };
  })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((s) => s.faq);
  return scored;
}
