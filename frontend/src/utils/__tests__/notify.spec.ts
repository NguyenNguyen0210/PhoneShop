import { describe, it, expect } from 'vitest';
import { translateErrorMessage, getErrorMessage } from '../notify';

describe('notify translation & error message helpers', () => {
  describe('translateErrorMessage', () => {
    it('translates warranty not found error', () => {
      expect(translateErrorMessage('Warranty not found')).toBe(
        'Không tìm thấy thông tin bảo hành cho mã/IMEI này.'
      );
    });

    it('translates already reviewed error', () => {
      expect(translateErrorMessage('You have already reviewed this product')).toBe(
        'Bạn đã gửi đánh giá cho sản phẩm này rồi.'
      );
    });

    it('translates insufficient stock error', () => {
      expect(translateErrorMessage('Insufficient stock')).toBe(
        'Số lượng sản phẩm trong kho không đủ đáp ứng.'
      );
    });

    it('translates out of stock error', () => {
      expect(translateErrorMessage('Out of stock')).toBe(
        'Phiên bản sản phẩm này hiện đã hết hàng.'
      );
    });

    it('translates variant not found or inactive error', () => {
      expect(translateErrorMessage('Product variant not found or inactive')).toBe(
        'Phiên bản sản phẩm không tồn tại hoặc đã ngừng kinh doanh.'
      );
      expect(translateErrorMessage('Variant inactive')).toBe(
        'Phiên bản sản phẩm không tồn tại hoặc đã ngừng kinh doanh.'
      );
    });

    it('translates wishlist errors', () => {
      expect(translateErrorMessage('Product already in wishlist')).toBe(
        'Sản phẩm này đã có trong danh sách yêu thích của bạn.'
      );
      expect(translateErrorMessage('Product not in wishlist')).toBe(
        'Sản phẩm không có trong danh sách yêu thích.'
      );
    });

    it('translates order cancellation errors properly with priority for paid orders', () => {
      expect(translateErrorMessage('Order cannot be cancelled in its current status')).toBe(
        'Đơn hàng không thể hủy ở trạng thái hiện tại.'
      );
      expect(
        translateErrorMessage(
          'Order is already paid and cannot be cancelled directly. Please contact support.'
        )
      ).toBe('Đơn hàng đã thanh toán không thể tự hủy. Vui lòng liên hệ CSKH để được hỗ trợ.');
    });

    it('translates order not found error', () => {
      expect(translateErrorMessage('Order not found')).toBe('Không tìm thấy thông tin đơn hàng.');
    });

    it('translates address not found error', () => {
      expect(translateErrorMessage('Address not found')).toBe(
        'Không tìm thấy địa chỉ giao hàng.'
      );
    });

    it('returns Vietnamese error messages unchanged', () => {
      const viMsg = 'Số lượng không hợp lệ';
      expect(translateErrorMessage(viMsg)).toBe(viMsg);
    });

    it('returns default fallback message when raw is empty', () => {
      expect(translateErrorMessage('')).toBe('Đã xảy ra lỗi. Vui lòng thử lại.');
    });
  });

  describe('getErrorMessage', () => {
    const testCases: Array<[string, string]> = [
      ['Warranty not found', 'Không tìm thấy thông tin bảo hành cho mã/IMEI này.'],
      ['You have already reviewed this product', 'Bạn đã gửi đánh giá cho sản phẩm này rồi.'],
      ['Insufficient stock', 'Số lượng sản phẩm trong kho không đủ đáp ứng.'],
      ['Product variant not found or inactive', 'Phiên bản sản phẩm không tồn tại hoặc đã ngừng kinh doanh.'],
      ['Product already in wishlist', 'Sản phẩm này đã có trong danh sách yêu thích của bạn.'],
      ['Product not in wishlist', 'Sản phẩm không có trong danh sách yêu thích.'],
      ['Order cannot be cancelled in its current status', 'Đơn hàng không thể hủy ở trạng thái hiện tại.'],
      [
        'Order is already paid and cannot be cancelled directly. Please contact support.',
        'Đơn hàng đã thanh toán không thể tự hủy. Vui lòng liên hệ CSKH để được hỗ trợ.',
      ],
      ['Order not found', 'Không tìm thấy thông tin đơn hàng.'],
      ['Address not found', 'Không tìm thấy địa chỉ giao hàng.'],
    ];

    it.each(testCases)('translates "%s" correctly via getErrorMessage', (input, expected) => {
      expect(getErrorMessage(input)).toBe(expected);
      expect(getErrorMessage(new Error(input))).toBe(expected);
      expect(getErrorMessage({ response: { data: { message: input } } })).toBe(expected);
    });

    it('extracts and translates error from string', () => {
      expect(getErrorMessage('Warranty not found')).toBe(
        'Không tìm thấy thông tin bảo hành cho mã/IMEI này.'
      );
    });

    it('extracts and translates error from axios response data message', () => {
      const err = {
        response: {
          data: {
            message: 'Insufficient stock',
          },
        },
      };
      expect(getErrorMessage(err)).toBe('Số lượng sản phẩm trong kho không đủ đáp ứng.');
    });

    it('extracts and translates error from axios response data error', () => {
      const err = {
        response: {
          data: {
            error: 'Address not found',
          },
        },
      };
      expect(getErrorMessage(err)).toBe('Không tìm thấy địa chỉ giao hàng.');
    });

    it('extracts and translates error from Error instance message', () => {
      const err = new Error('Order not found');
      expect(getErrorMessage(err)).toBe('Không tìm thấy thông tin đơn hàng.');
    });

    it('extracts and translates error when response message is an array', () => {
      const err = {
        response: {
          data: {
            message: ['Product already in wishlist'],
          },
        },
      };
      expect(getErrorMessage(err)).toBe('Sản phẩm này đã có trong danh sách yêu thích của bạn.');
    });

    it('returns custom fallback when error is falsy or unresolvable', () => {
      expect(getErrorMessage(null, 'Lỗi mặc định')).toBe('Lỗi mặc định');
      expect(getErrorMessage(undefined)).toBe('Đã xảy ra lỗi. Vui lòng thử lại.');
      expect(getErrorMessage({}, 'Lỗi mặc định')).toBe('Lỗi mặc định');
    });
  });
});
