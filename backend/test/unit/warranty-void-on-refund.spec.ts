import { describe, it, expect, jest } from '@jest/globals';
import { WarrantyService } from '../../src/modules/warranty/warranty.service';

// Cancelling / refunding / returning an order must VOID its ACTIVE
// warranties: the buyer got their money back, so the coverage must die with
// the sale. CLAIMED (under repair) rows are left alone.
describe('WarrantyService.voidWarrantiesForOrder', () => {
  it('voids ACTIVE warranties of the order only', async () => {
    const mockPrisma: any = {
      warranty: {
        updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 2 })),
      },
    };
    const service = new WarrantyService(mockPrisma);
    await service.voidWarrantiesForOrder(mockPrisma, 'ord-1');
    expect(mockPrisma.warranty.updateMany).toHaveBeenCalledWith({
      where: { orderItem: { orderId: 'ord-1' }, status: 'ACTIVE' },
      data: { status: 'VOIDED' },
    });
  });
});
