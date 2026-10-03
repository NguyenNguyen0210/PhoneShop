import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AddressSelectModal } from '../AddressSelectModal';

// Mock addressService
vi.mock('../../../../services/addressService', () => ({
  addressService: {
    getAddresses: vi.fn().mockResolvedValue([]),
    createAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
    deleteAddress: vi.fn(),
  },
}));

describe('AddressSelectModal Component', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <AddressSelectModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectAddress={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog when isOpen is true', () => {
    const html = renderToString(
      <AddressSelectModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectAddress={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Địa chỉ nhận hàng');
    expect(html).toContain('+ Thêm địa chỉ mới');
    expect(html).toContain('Xác nhận địa chỉ');
  });
});
