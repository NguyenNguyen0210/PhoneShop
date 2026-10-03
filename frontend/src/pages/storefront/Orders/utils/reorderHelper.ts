import type { Order, Product, ProductVariant } from '../../../../types';
import { useCartStore } from '../../../../stores/useCartStore';

export function reorderOrderItems(order: Order): { addedCount: number; totalItems: number } {
  const items = order?.items || [];
  let addedCount = 0;

  for (const item of items) {
    if (item.variant) {
      const variant: ProductVariant = {
        ...item.variant,
        id: item.variant.id || item.variantId,
        price: item.variant.price ?? item.unitPrice ?? 0,
      };

      const product: Product = {
        id: variant.productId || variant.product?.id || 'unknown-product',
        name: variant.product?.name || item.productName || 'Sản phẩm',
        slug: variant.product?.slug || '',
        description: '',
        brandId: variant.product?.brand?.id || '',
        categoryId: variant.product?.category?.id || '',
        brand: variant.product?.brand,
        category: variant.product?.category,
        variants: [variant],
        thumbnail: variant.imageUrl || variant.product?.thumbnail,
        thumbnailUrl: variant.imageUrl || variant.product?.thumbnail,
        status: 'ACTIVE',
      };

      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      useCartStore.getState().addItem(product, variant, quantity);
      addedCount++;
    }
  }

  useCartStore.getState().setDrawerOpen(true);

  return {
    addedCount,
    totalItems: items.length,
  };
}
