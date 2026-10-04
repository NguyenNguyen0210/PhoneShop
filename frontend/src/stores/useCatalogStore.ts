import { create } from 'zustand';
import type { Product, Brand, FlashSaleCampaign } from '../types';
import type { ProductSortOption } from '../components/storefront/ProductSortToolbar';

interface CatalogStoreState {
  // Data cache
  products: Product[];
  brands: Brand[];
  activeFlashSale: FlashSaleCampaign | null;
  hasLoaded: boolean;
  lastFetchedAt: number | null;

  // Filter & sort states
  selectedBrand: string;
  priceRange: [number, number];
  selectedStorages: string[];
  selectedRams: string[];
  selectedColors: string[];
  has5GOnly: boolean;
  selectedScreenRanges: string[];
  selectedBatteryRanges: string[];
  selectedOs: string[];
  selectedChipsets: string[];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minRating: number | null;
  searchKeyword: string;
  sortBy: ProductSortOption;

  // Scroll restoration
  scrollPosition: number;

  // Setters
  setCatalogData: (data: {
    products: Product[];
    brands: Brand[];
    activeFlashSale: FlashSaleCampaign | null;
  }) => void;
  setSelectedBrand: (brand: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setSelectedStorages: (storages: string[] | ((prev: string[]) => string[])) => void;
  setSelectedRams: (rams: string[] | ((prev: string[]) => string[])) => void;
  setSelectedColors: (colors: string[] | ((prev: string[]) => string[])) => void;
  setHas5GOnly: (has5G: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedScreenRanges: (screens: string[] | ((prev: string[]) => string[])) => void;
  setSelectedBatteryRanges: (batteries: string[] | ((prev: string[]) => string[])) => void;
  setSelectedOs: (os: string[] | ((prev: string[]) => string[])) => void;
  setSelectedChipsets: (chipsets: string[] | ((prev: string[]) => string[])) => void;
  setInStockOnly: (inStock: boolean | ((prev: boolean) => boolean)) => void;
  setOnSaleOnly: (onSale: boolean | ((prev: boolean) => boolean)) => void;
  setMinRating: (rating: number | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setSortBy: (sort: ProductSortOption) => void;
  resetFilters: () => void;
  setScrollPosition: (pos: number) => void;
}

const DEFAULT_PRICE_RANGE: [number, number] = [0, 50000000];

export const useCatalogStore = create<CatalogStoreState>((set) => ({
  products: [],
  brands: [],
  activeFlashSale: null,
  hasLoaded: false,
  lastFetchedAt: null,

  selectedBrand: 'all',
  priceRange: DEFAULT_PRICE_RANGE,
  selectedStorages: [],
  selectedRams: [],
  selectedColors: [],
  has5GOnly: false,
  selectedScreenRanges: [],
  selectedBatteryRanges: [],
  selectedOs: [],
  selectedChipsets: [],
  inStockOnly: false,
  onSaleOnly: false,
  minRating: null,
  searchKeyword: '',
  sortBy: 'default',

  scrollPosition: 0,

  setCatalogData: ({ products, brands, activeFlashSale }) =>
    set({
      products,
      brands,
      activeFlashSale,
      hasLoaded: true,
      lastFetchedAt: Date.now(),
    }),

  setSelectedBrand: (selectedBrand) => set({ selectedBrand }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setSelectedStorages: (updater) =>
    set((state) => ({
      selectedStorages: typeof updater === 'function' ? updater(state.selectedStorages) : updater,
    })),
  setSelectedRams: (updater) =>
    set((state) => ({
      selectedRams: typeof updater === 'function' ? updater(state.selectedRams) : updater,
    })),
  setSelectedColors: (updater) =>
    set((state) => ({
      selectedColors: typeof updater === 'function' ? updater(state.selectedColors) : updater,
    })),
  setHas5GOnly: (updater) =>
    set((state) => ({
      has5GOnly: typeof updater === 'function' ? updater(state.has5GOnly) : updater,
    })),
  setSelectedScreenRanges: (updater) =>
    set((state) => ({
      selectedScreenRanges:
        typeof updater === 'function' ? updater(state.selectedScreenRanges) : updater,
    })),
  setSelectedBatteryRanges: (updater) =>
    set((state) => ({
      selectedBatteryRanges:
        typeof updater === 'function' ? updater(state.selectedBatteryRanges) : updater,
    })),
  setSelectedOs: (updater) =>
    set((state) => ({
      selectedOs: typeof updater === 'function' ? updater(state.selectedOs) : updater,
    })),
  setSelectedChipsets: (updater) =>
    set((state) => ({
      selectedChipsets: typeof updater === 'function' ? updater(state.selectedChipsets) : updater,
    })),
  setInStockOnly: (updater) =>
    set((state) => ({
      inStockOnly: typeof updater === 'function' ? updater(state.inStockOnly) : updater,
    })),
  setOnSaleOnly: (updater) =>
    set((state) => ({
      onSaleOnly: typeof updater === 'function' ? updater(state.onSaleOnly) : updater,
    })),
  setMinRating: (minRating) => set({ minRating }),
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),
  setSortBy: (sortBy) => set({ sortBy }),

  resetFilters: () =>
    set({
      selectedBrand: 'all',
      priceRange: DEFAULT_PRICE_RANGE,
      selectedStorages: [],
      selectedRams: [],
      selectedColors: [],
      has5GOnly: false,
      selectedScreenRanges: [],
      selectedBatteryRanges: [],
      selectedOs: [],
      selectedChipsets: [],
      inStockOnly: false,
      onSaleOnly: false,
      minRating: null,
      searchKeyword: '',
      sortBy: 'default',
    }),

  setScrollPosition: (scrollPosition) => set({ scrollPosition }),
}));
