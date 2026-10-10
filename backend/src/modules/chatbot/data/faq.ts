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
      'PhoneShop miễn phí giao hàng toàn quốc. Nội thành 1-2 ngày, tỉnh 2-4 ngày. Đơn hàng được giữ ưu đãi trong thời gian thanh toán; bạn vui lòng hoàn tất sớm để shop chuẩn bị đơn nhé.',
  },
  {
    keywords: ['thanh toán', 'vnpay', 'vietqr', 'cod'],
    question: 'Các hình thức thanh toán?',
    answer:
      'Hỗ trợ thanh toán khi nhận hàng (COD), chuyển khoản VietQR và cổng thanh toán trực tuyến VNPay (thẻ ATM, thẻ quốc tế, VNPay-QR). Cửa hàng hiện không hỗ trợ hình thức mua hàng trả góp.',
  },
  {
    keywords: ['bảo hành', 'imei', 'kích hoạt', 'tra cứu', 'warranty'],
    question: 'Chính sách bảo hành?',
    answer:
      'Bảo hành chính hãng 12-24 tháng tùy sản phẩm nếu lỗi NSX. Tra cứu bằng IMEI tại trang Tra cứu bảo hành. Mỗi thiết bị chính hãng có số IMEI định danh duy nhất để kích hoạt và theo dõi bảo hành điện tử chính xác.',
  },
  {
    keywords: ['đổi trả', 'hoàn', 'trả hàng'],
    question: 'Đổi trả ra sao?',
    answer:
      'Cửa hàng không áp dụng chính sách đổi trả hàng sau khi đã mua. Các sản phẩm phát sinh lỗi từ nhà sản xuất sẽ được tiếp nhận và bảo hành theo quy định chính hãng.',
  },
  {
    keywords: ['giữ hàng', 'giữ đơn', 'thời gian thanh toán', 'hết hàng', 'flash sale'],
    question: 'Quy định giữ đơn thế nào?',
    answer:
      'Khi bạn tiến hành đặt hàng, shop sẽ ưu tiên giữ đơn và mức giá ưu đãi trong thời gian bạn hoàn tất thanh toán. Quá thời gian quy định, sản phẩm sẽ được mở lại để phục vụ các khách hàng khác.',
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
      'Hiện tại cửa hàng không hỗ trợ mua hàng trả góp. Bạn có thể thanh toán thuận tiện qua COD, chuyển khoản VietQR hoặc cổng VNPay.',
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
