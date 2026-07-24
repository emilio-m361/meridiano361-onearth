'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Minus, Plus, X, Search, Loader2, MapPin, Copy, Layers, Pencil, Check, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import OrderExcelExport from '@/components/orders/OrderExcelExport';
import OrderDemetraExport from '@/components/orders/OrderDemetraExport';
import { ProductImage } from '@/components/ui/ProductImage';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { cn, formatCurrency, capitalize } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DisplayGroupsManager from '@/components/catalog/DisplayGroupsManager';
import CalendarioEsposizione from '@/components/catalog/CalendarioEsposizione';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useCollectionRoutes } from '@/hooks/useCollectionRoutes';
import type { Order, OrderItem, Product, Destinazione } from '@/types';

// ── Sort options ───────────────────────────────────────────────
const PREVIEW_SORT_KEY = 'preview-sort';
const SORT_OPTIONS = [
  { value: 'name-asc',   label: 'Nome A→Z' },
  { value: 'name-desc',  label: 'Nome Z→A' },
  { value: 'linea-asc',  label: 'Linea A→Z' },
  { value: 'linea-desc', label: 'Linea Z→A' },
  { value: 'price-asc',  label: 'Prezzo ↑' },
  { value: 'price-desc', label: 'Prezzo ↓' },
  { value: 'novita',     label: 'Novità' },
  { value: 'continuativi', label: 'Continuativi' },
] as const;

function sortGroupItems<T extends { product?: any }>(grpItems: T[], sortBy: string): T[] {
  return [...grpItems].sort((a, b) => {
    const pa = a.product;
    const pb = b.product;
    if (!pa || !pb) return 0;
    switch (sortBy) {
      case 'name-asc':  return pa.name.localeCompare(pb.name, 'it');
      case 'name-desc': return pb.name.localeCompare(pa.name, 'it');
      case 'linea-asc':  return (pa.nomLinea ?? '').localeCompare(pb.nomLinea ?? '', 'it');
      case 'linea-desc': return (pb.nomLinea ?? '').localeCompare(pa.nomLinea ?? '', 'it');
      case 'price-asc':  return Number(pa.retailPrice) - Number(pb.retailPrice);
      case 'price-desc': return Number(pb.retailPrice) - Number(pa.retailPrice);
      case 'novita': {
        const aNew = pa.collezione === 'CA27' ? 0 : 1;
        const bNew = pb.collezione === 'CA27' ? 0 : 1;
        return aNew !== bNew ? aNew - bNew : pa.name.localeCompare(pb.name, 'it');
      }
      case 'continuativi': {
        const aCont = !pa.collezione || pa.collezione !== 'CA27' ? 0 : 1;
        const bCont = !pb.collezione || pb.collezione !== 'CA27' ? 0 : 1;
        return aCont !== bCont ? aCont - bCont : pa.name.localeCompare(pb.name, 'it');
      }
      default: return 0;
    }
  });
}

// ── Grouping options ───────────────────────────────────────────
const GROUPING_KEYS = [
  'gruppoMerceologico',
  'famiglia',
  'classe',
  'sottoclasse',
  'gruppoOmogeneo',
  'nomLinea',
  'colore',
  'fantasia',
  'stagione',
  'collezione',
  'produttore',
  'tranche',
  'conferente',
] as const;

type QtyMap = Record<string, number>;

// Senza scelta reso usa unitPrice (prezzo base ordine). Con scelta: costoIeConReso o costoIeSenzaReso.
// choice sovrascrive la priorità quando il conferente ha entrambi i prezzi.
function effectiveCost(product: any, unitPrice: number, choice?: 'con' | 'senza'): number {
  const conReso   = Number(product?.costoIeConReso);
  const senzaReso = Number(product?.costoIeSenzaReso);
  if (choice === 'senza' && senzaReso > 0) return senzaReso;
  if (choice === 'con'   && conReso   > 0) return conReso;
  // Senza scelta reso esplicita usa il prezzo base (unitPrice = costPrice all'ordine = Pr. cessione Demetra)
  return unitPrice;
}

// ── Product card (no size variants) ───────────────────────────
function ProductCard({
  item,
  effectiveQty,
  effectiveSubtotal,
  onQtyChange,
  onRemove,
  onViewAnagrafica,
  savingItems,
  removeLabel,
  decreaseLabel,
  increaseLabel,
}: {
  item: OrderItem;
  effectiveQty: number;
  effectiveSubtotal: number;
  // serverQty = original DB quantity (used as fallback in parent's ref computation)
  // delta = ±lotSize
  onQtyChange: (id: string, serverQty: number, delta: number) => void;
  onRemove: (id: string) => void;
  onViewAnagrafica?: (product: Product) => void;
  savingItems: Set<string>;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const product = item.product!;
  const lotSize = product.lotSize || 1;
  const isSaving = savingItems.has(item.id);

  return (
    <div className="bg-white border border-border flex flex-col">
      {/* Image — clickable to open anagrafica */}
      <div
        className="relative aspect-square bg-[#C8C0B5] overflow-hidden cursor-pointer"
        onClick={() => onViewAnagrafica?.(product)}
      >
        <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          className="absolute top-1.5 left-1.5 bg-white/80 rounded p-0.5 text-gray-500 hover:text-red-500 transition-colors"
          title={removeLabel}
        >
          <X size={10} />
        </button>
        <div className="absolute top-1.5 right-1.5 bg-primary/90 text-white text-[9px] font-bold px-1 py-px leading-tight">
          ×{effectiveQty}
        </div>
        {(item.taglia || product.taglia) && (
          <div className="absolute bottom-1.5 left-1.5 bg-white/90 text-primary text-[9px] font-bold px-1.5 py-px leading-tight rounded-sm">
            {item.taglia || product.taglia}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex flex-col gap-1 grow">
        <div>
          <div className="flex items-center gap-1 leading-none">
            <p className="text-[9px] font-mono text-gray-400 tracking-wider">{product.code}</p>
            {product.collezione === 'CA27' && !product.isContinuativo && (
              <span className="bg-black text-white text-[7px] font-bold px-1 py-px rounded-sm leading-none flex-shrink-0">NUOVO</span>
            )}
          </div>
          <p className="text-[10px] font-medium text-primary leading-snug mt-0.5 h-8 overflow-hidden">{product.name}</p>
        </div>

        <div className="mt-auto space-y-px">
          <p className="text-[9px] text-gray-400">
            PVP: <span className="text-gray-600 font-medium">{formatCurrency(product.retailPrice)}</span>
          </p>
          <p className="text-[9px] text-gray-400">
            IE: <span className="text-gray-600 font-medium">{formatCurrency(effectiveCost(item.product, Number(item.unitPrice)))}</span>
          </p>
        </div>

        {/* Quantity control */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onQtyChange(item.id, Number(item.quantity), -lotSize)}
              disabled={isSaving}
              className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={decreaseLabel}
            >
              <Minus size={11} />
            </button>
            <span className={`text-sm font-semibold text-primary text-center min-w-[1.75rem] ${isSaving ? 'opacity-50' : ''}`}>{effectiveQty}</span>
            <button
              onClick={() => onQtyChange(item.id, Number(item.quantity), +lotSize)}
              disabled={isSaving}
              className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={increaseLabel}
            >
              <Plus size={11} />
            </button>
          </div>
          <span className="text-xs font-semibold text-primary">{formatCurrency(effectiveSubtotal)}</span>
        </div>

      </div>
    </div>
  );
}

type EnrichedItem = OrderItem & { effectiveQty: number; effectiveUnitCost: number; effectiveSubtotal: number };

// ── Sized product card (inline size rows under the image) ──────
function SizedProductCard({
  productItems,
  product,
  onQtyChange,
  onRemove,
  onAddVariant,
  onViewAnagrafica,
  addingVariantCode,
  savingItems,
  removeLabel,
  decreaseLabel,
  increaseLabel,
}: {
  productItems: EnrichedItem[];
  product: Product;
  // serverQty = original DB quantity per item (fallback in parent ref computation)
  // delta = ±lotSize
  onQtyChange: (id: string, serverQty: number, delta: number) => void;
  onRemove: (id: string) => void;
  onAddVariant?: (codice: string, taglia: string, productId: string) => void;
  onViewAnagrafica?: (product: Product) => void;
  addingVariantCode?: string | null;
  savingItems: Set<string>;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const sizeVariants = product.sizeVariants ?? [];
  const allSameProduct = productItems.every((i) => i.productId === productItems[0].productId);
  const totalSubtotal = productItems.reduce((s, i) => s + i.effectiveSubtotal, 0);
  const totalQty = productItems.reduce((s, i) => s + i.effectiveQty, 0);

  function findItem(v: { taglia: string; codice: string }): EnrichedItem | null {
    // Primary: exact taglia match on the OrderItem (Arch 2 stores taglia here; also
    // catches Arch 1 items that were added via the Arch 2 fallback path).
    const byTaglia = productItems.find((i) => i.taglia === v.taglia);
    if (byTaglia) return byTaglia;

    // If this variant's codice is the same as the shared product code, taglia
    // matching is the ONLY valid strategy. Code-based matching would find an
    // item that belongs to a different size (e.g. S codice = base product code,
    // while M and L items also share that same product code). Returning null here
    // signals that the size is not yet in the order → show the "Add" button.
    if (v.codice.trim().toUpperCase() === product.code.trim().toUpperCase()) return null;

    // Code-based matching (Arch 1) is only safe when v.codice is unique across all
    // sizeVariants: if another variant shares the same codice we cannot tell which
    // item is which and must return null to avoid cross-contamination.
    const codeIsShared = sizeVariants.some(
      (sv) => sv.taglia !== v.taglia &&
               sv.codice.trim().toUpperCase() === v.codice.trim().toUpperCase()
    );
    if (codeIsShared) return null;

    // Unique codice → safe to match by product code (Arch 1: separate product per size).
    return productItems.find(
      (i) => i.product?.code?.trim().toUpperCase() === v.codice.trim().toUpperCase()
    ) ?? null;
  }

  return (
    <div className="bg-white border border-border flex flex-col">
      {/* Image — clickable to open anagrafica */}
      <div
        className="relative aspect-square bg-[#C8C0B5] overflow-hidden cursor-pointer"
        onClick={() => onViewAnagrafica?.(product)}
      >
        <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        {totalQty > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-primary/90 text-white text-[9px] font-bold px-1 py-px leading-tight">
            ×{totalQty}
          </div>
        )}
        {product.collezione === 'CA27' && !product.isContinuativo && (
          <div className="absolute top-1.5 left-1.5 bg-black text-white text-[7px] font-bold px-1 py-px leading-tight">NUOVO</div>
        )}
        {/* Per-taglia qty chips */}
        {productItems.length > 0 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex flex-wrap gap-0.5 px-1.5 justify-start">
            {productItems.filter(i => i.effectiveQty > 0).map((i) => (
              <span key={i.id} className="bg-primary/80 text-white text-[8px] font-bold px-1 py-px leading-tight rounded-sm">
                {i.taglia || i.product?.taglia || '?'}×{i.effectiveQty}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="p-2 border-b border-border/50">
        {allSameProduct && (
          <p className="text-[9px] font-mono text-gray-400 tracking-wider">{product.code}</p>
        )}
        <p className="text-[10px] font-medium text-primary leading-snug mt-0.5 line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <div>
            <p className="text-[9px] text-gray-400">
              IE: <span className="text-gray-600 font-medium">{formatCurrency(effectiveCost(product, Number(productItems[0].unitPrice)))}</span>
            </p>
            <p className="text-[9px] text-gray-400">
              PVP: <span className="text-gray-600 font-medium">{formatCurrency(product.retailPrice)}</span>
            </p>
          </div>
          {totalSubtotal > 0 && (
            <p className="text-xs font-semibold text-primary">{formatCurrency(totalSubtotal)}</p>
          )}
        </div>
      </div>

      {/* Size rows */}
      <div className="px-2 py-1.5 space-y-1.5">
        {sizeVariants.map((v) => {
          const item = findItem(v);
          const isAdding = addingVariantCode === v.codice.toUpperCase() + '-' + v.taglia;

          if (item) {
            const lotSize = item.product?.lotSize || product.lotSize || 1;
            const isSaving = savingItems.has(item.id);
            return (
              <div key={v.taglia} className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-primary w-6 flex-shrink-0">{v.taglia}</span>
                <button
                  onClick={() => onQtyChange(item.id, Number(item.quantity), -lotSize)}
                  disabled={isSaving}
                  className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={decreaseLabel}
                >
                  <Minus size={9} />
                </button>
                <span className={`text-xs font-semibold text-primary text-center w-5 flex-shrink-0 ${isSaving ? 'opacity-50' : ''}`}>{item.effectiveQty}</span>
                <button
                  onClick={() => onQtyChange(item.id, Number(item.quantity), +lotSize)}
                  disabled={isSaving}
                  className="w-5 h-5 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={increaseLabel}
                >
                  <Plus size={9} />
                </button>
                <span className="text-[9px] text-gray-400 flex-1 text-right">{formatCurrency(item.effectiveSubtotal)}</span>
                <button
                  onClick={() => onRemove(item.id)}
                  disabled={isSaving}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 ml-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={removeLabel}
                >
                  <X size={9} />
                </button>
              </div>
            );
          }

          // Not in order
          if (!onAddVariant) {
            return (
              <div key={v.taglia} className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500 w-6 flex-shrink-0">{v.taglia}</span>
                <span className="text-[9px] text-gray-200">—</span>
              </div>
            );
          }

          return (
            <div key={v.taglia} className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 w-6 flex-shrink-0">{v.taglia}</span>
              <button
                onClick={() => { if (!isAdding) onAddVariant(v.codice, v.taglia, productItems[0].productId); }}
                disabled={isAdding}
                className="flex-1 h-5 flex items-center justify-center gap-0.5 border border-dashed border-border/60 rounded text-[9px] text-gray-300 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {isAdding ? <Loader2 size={8} className="animate-spin" /> : <Plus size={8} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Product Anagrafica Modal ───────────────────────────────────
function ProductAnagraficaModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const photos = [product.imageUrl, product.imageUrl2, product.imageUrl3, product.imageUrl4].filter(Boolean) as string[];
  const safeIdx = Math.min(galleryIndex, Math.max(0, photos.length - 1));
  const rows: [string, string | null][] = [
    ['Linea', product.nomLinea],
    ['Famiglia', product.famiglia],
    ['Classe', product.classe],
    ['Sottoclasse', product.sottoclasse],
    ['Gruppo omogeneo', product.gruppoOmogeneo],
    ['Colore', capitalize(product.colore)],
    ['Tema colore', capitalize(product.temaColore)],
    ['Misura', product.misura],
    ['Produttore', product.produttore],
    ['Collezione', product.collezione],
    ['Stagione', product.stagione],
    ['Tranche', product.tranche],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl shadow-2xl z-10 max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-xs font-mono text-gray-400">{product.code}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {photos.length > 0 && (
            <div className="relative aspect-square bg-cream rounded border border-border overflow-hidden">
              <ProductImage src={photos[safeIdx]} alt={product.name} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setGalleryIndex(i => (i === 0 ? photos.length - 1 : i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"><ChevronLeft size={16} /></button>
                  <button onClick={() => setGalleryIndex(i => (i === photos.length - 1 ? 0 : i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"><ChevronRight size={16} /></button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setGalleryIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === safeIdx ? 'bg-primary' : 'bg-white/60'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div>
            {product.collezione === 'CA27' && !product.isContinuativo && (
              <span className="inline-flex mb-1 bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm leading-none">NUOVO</span>
            )}
            <p className="text-base font-semibold text-primary leading-snug">{product.name}</p>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-gray-500">Costo: <span className="font-medium text-primary">{formatCurrency(product.costPrice)}</span></p>
              <p className="text-xs text-gray-500">Vendita (s.i.): <span className="font-medium text-primary">{formatCurrency(product.retailPrice)}</span></p>
              {product.lotSize > 1 && (
                <p className="text-xs text-gray-500">Lotto: <span className="font-medium text-primary">{product.lotSize} pz</span></p>
              )}
            </div>
          </div>
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}
          <div className="border border-border rounded divide-y divide-border/50">
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex px-3 py-2">
                <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                <span className="text-xs text-primary font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Products Modal ─────────────────────────────────────────
function AddProductsModal({
  orderId,
  onClose,
  onAdded,
  addProductsLabel,
  searchPlaceholder,
  loadingLabel,
  noProductsLabel,
  addLabel,
  orderProductIds,
  orderItems,
  baseFilters,
  initialSearch,
}: {
  orderId: string;
  onClose: () => void;
  onAdded: () => void;
  addProductsLabel: string;
  searchPlaceholder: string;
  loadingLabel: string;
  noProductsLabel: string;
  addLabel: string;
  orderProductIds: Set<string>;
  orderItems: OrderItem[];
  baseFilters: Record<string, string>;
  initialSearch?: string;
}) {
  const [tab, setTab] = useState<'ricerca' | 'catalogo'>('ricerca');
  const [search, setSearch] = useState(initialSearch ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch ?? '');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [presenzaFilter, setPresenzaFilter] = useState<'tutti' | 'non-ancora' | 'gia'>('tutti');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Dedicated query for "già nell'ordine" — fetches exact product IDs, no active filter
  const giaIdsParam = useMemo(
    () => Array.from(orderProductIds).join(','),
    [orderProductIds]
  );
  const { data: giaProductsRaw } = useQuery<Product[]>({
    queryKey: ['products-gia', giaIdsParam],
    queryFn: async () => {
      if (!giaIdsParam) return [];
      const res = await fetch(`/api/products?ids=${giaIdsParam}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    enabled: presenzaFilter === 'gia' && orderProductIds.size > 0,
    staleTime: 30_000,
  });

  const giaProducts = useMemo<Product[]>(() => {
    const base = giaProductsRaw ?? [];
    if (!debouncedSearch.trim()) return base;
    const q = debouncedSearch.toLowerCase();
    return base.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  }, [giaProductsRaw, debouncedSearch]);

  function applyPresenzaFilter(list: Product[]): Product[] {
    if (presenzaFilter === 'non-ancora') return list.filter(p => !orderProductIds.has(p.id));
    return list;
  }

  // ── Catalog tab state ──────────────────────────────────────
  const [filters, setFilters] = useState<Record<string, string>>({});

  type FilterOptions = Record<string, string[]>;
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['products-filter-options'],
    queryFn: async () => {
      const res = await fetch('/api/products/filters');
      if (!res.ok) throw new Error(`products/filters ${res.status}`);
      const d = await res.json();
      return (d.data ?? {}) as FilterOptions;
    },
    staleTime: 5 * 60_000,
    enabled: tab === 'catalogo',
  });
  const fo = filterOptions ?? {};

  const catalogParams = useMemo(() => {
    const p = new URLSearchParams({ limit: '9999', ...baseFilters });
    const keys = [
      'stagione','colore','temaColore','collezione','tranche',
      'nomLinea','famiglia','sottofamiglia','gruppoOmogeneo',
      'classe','sottoclasse','gruppoMerceologico','produttore','conferente',
    ];
    // User-selectable filters only apply if they don't conflict with a baseFilter key
    keys.forEach(k => { if (filters[k] && !baseFilters[k]) p.set(k, filters[k]); });
    return p.toString();
  }, [filters, baseFilters]);

  const { data: catalogProducts, isLoading: catalogLoading } = useQuery<Product[]>({
    queryKey: ['products-catalog-browse', catalogParams],
    queryFn: async () => {
      const res = await fetch(`/api/products?${catalogParams}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    staleTime: 30_000,
    enabled: tab === 'catalogo',
  });

  // Debounce search input
  const debounceRef = useRef<NodeJS.Timeout>();
  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products-for-order', debouncedSearch, baseFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', ...baseFilters });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    staleTime: 30_000,
    enabled: tab === 'ricerca' && (debouncedSearch.trim().length >= 2 || presenzaFilter === 'non-ancora'),
  });

  async function handleAdd(product: Product, taglia?: string) {
    const qty = quantities[product.id] ?? product.lotSize ?? 1;
    const addingKey = taglia ? `${product.id}__${taglia}` : product.id;
    setAddingId(addingKey);
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: qty, taglia: taglia ?? '' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? addLabel + ' — errore');
      }
      toast.success(`${product.code}${taglia ? ' ' + taglia : ''} ✓`);
      onAdded();
    } catch (e: any) {
      toast.error(e.message ?? addLabel + ' — errore');
    } finally {
      setAddingId(null);
    }
  }

  function renderProductRow(product: Product) {
    const qty = quantities[product.id] ?? product.lotSize ?? 1;
    const isAdding = addingId === product.id;
    const sizeVariants = (product as any).sizeVariants as { taglia: string; codice: string }[] | undefined;
    const isArch2 = Array.isArray(sizeVariants) && sizeVariants.length > 0 && !(product as any).taglia;

    return (
      <div
        key={product.id}
        className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-cream/50 transition-colors"
      >
        {/* Thumbnail — clickable to open anagrafica */}
        <button
          onClick={() => { setPreviewProduct(product); setGalleryIndex(0); }}
          className="w-14 h-14 flex-shrink-0 bg-[#C8C0B5] overflow-hidden rounded cursor-pointer hover:opacity-80 transition-opacity"
        >
          <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-mono text-gray-400">{product.code}</p>
            {product.collezione === 'CA27' && !(product as any).isContinuativo && (
              <span className="bg-black text-white text-[8px] font-bold px-1 py-px rounded-sm leading-none flex-shrink-0">NUOVO</span>
            )}
          </div>
          <button
            onClick={() => { setPreviewProduct(product); setGalleryIndex(0); }}
            className="text-sm text-primary font-medium leading-snug line-clamp-2 text-left hover:underline"
          >
            {product.name}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(product.costPrice)}</p>

          {/* Arch 2: per-taglia buttons */}
          {isArch2 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sizeVariants!.map((sv) => {
                const key = `${product.id}__${sv.taglia}`;
                const adding = addingId === key;
                return (
                  <button
                    key={sv.taglia}
                    onClick={() => handleAdd(product, sv.taglia)}
                    disabled={adding}
                    className="text-xs border border-primary text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {adding ? '…' : `+ ${sv.taglia}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Qty + Add (Arch 1 only) */}
        {!isArch2 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              min={product.lotSize ?? 1}
              step={product.lotSize ?? 1}
              value={qty}
              onChange={(e) =>
                setQuantities((prev) => ({
                  ...prev,
                  [product.id]: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-16 text-sm text-center border border-border rounded px-2 py-1.5 text-primary"
            />
            <button
              onClick={() => handleAdd(product)}
              disabled={isAdding}
              className="text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[80px]"
            >
              {isAdding ? '…' : 'Aggiungi'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const presenzaSelector = (
    <div className="pb-3 mb-1 border-b border-border/50">
      <select
        value={presenzaFilter}
        onChange={e => setPresenzaFilter(e.target.value as 'tutti' | 'non-ancora' | 'gia')}
        className="w-full h-9 border border-primary/30 bg-cream rounded px-2 text-sm text-primary font-medium focus:outline-none"
      >
        <option value="tutti">Tutti i prodotti</option>
        <option value="non-ancora">Non ancora nell&apos;ordine</option>
        <option value="gia">Già nell&apos;ordine</option>
      </select>
    </div>
  );

  const filterSelects = (
    <div className="space-y-2">
      {([
        ['gruppoMerceologico', 'Gruppo merceologico'],
        ['famiglia',           'Famiglia'],
        ['classe',             'Classe'],
        ['sottoclasse',        'Sottoclasse'],
        ['gruppoOmogeneo',     'Gruppo omogeneo'],
        ['nomLinea',           'Linea'],
        ['temaColore',         'Tema colore'],
        ['stagione',           'Stagione'],
        ['collezione',         'Collezione'],
        ['produttore',         'Produttore'],
        ['tranche',            'Tranche'],
        ['conferente',         'Conferente'],
      ] as [string, string][]).map(([key, label]) =>
        (fo[key]?.length ?? 0) > 0 ? (
          <select
            key={key}
            value={filters[key] ?? ''}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="w-full h-9 border border-border rounded px-2 text-sm text-primary focus:outline-none bg-white"
          >
            <option value="">{label}</option>
            {fo[key].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : null
      )}
      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => setFilters({})}
          className="text-xs text-gray-400 hover:text-primary transition-colors"
        >
          × Azzera filtri
        </button>
      )}
    </div>
  );

  return (
    <div className="apm-overlay">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="apm-panel">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <p className="text-base font-semibold text-primary">{addProductsLabel}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {previewProduct ? (
          /* ── Anagrafica prodotto ─────────────────────────────── */
          (() => {
            const photos = [previewProduct.imageUrl, previewProduct.imageUrl2, previewProduct.imageUrl3, previewProduct.imageUrl4].filter(Boolean) as string[];
            const safeIdx = Math.min(galleryIndex, Math.max(0, photos.length - 1));
            const rows: [string, string | null][] = [
              ['Linea', previewProduct.nomLinea],
              ['Famiglia', previewProduct.famiglia],
              ['Classe', previewProduct.classe],
              ['Sottoclasse', previewProduct.sottoclasse],
              ['Gruppo omogeneo', previewProduct.gruppoOmogeneo],
              ['Colore', capitalize(previewProduct.colore)],
              ['Tema colore', capitalize(previewProduct.temaColore)],
              ['Misura', previewProduct.misura],
              ['Produttore', previewProduct.produttore],
              ['Collezione', previewProduct.collezione],
              ['Stagione', previewProduct.stagione],
              ['Tranche', previewProduct.tranche],
            ];
            return (
              <>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
                  <button
                    onClick={() => setPreviewProduct(null)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    <ChevronLeft size={16} /> Indietro
                  </button>
                  <span className="text-xs font-mono text-gray-400">{previewProduct.code}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {photos.length > 0 && (
                    <div className="flex gap-3">
                      <div className="relative w-40 h-40 flex-shrink-0 bg-cream rounded border border-border overflow-hidden">
                        <ProductImage src={photos[safeIdx]} alt={previewProduct.name} className="w-full h-full object-cover" />
                        {photos.length > 1 && (
                          <>
                            <button onClick={() => setGalleryIndex(i => (i === 0 ? photos.length - 1 : i - 1))} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow">
                              <ChevronLeft size={14} />
                            </button>
                            <button onClick={() => setGalleryIndex(i => (i === photos.length - 1 ? 0 : i + 1))} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow">
                              <ChevronRight size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {previewProduct.collezione === 'CA27' && (
                          <span className="inline-flex self-start bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm leading-none">NUOVO</span>
                        )}
                        <p className="text-base font-semibold text-primary leading-snug">{previewProduct.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-gray-500">Costo: <span className="font-medium text-primary">{formatCurrency(previewProduct.costPrice)}</span></p>
                          <p className="text-xs text-gray-500">Vendita (s.i.): <span className="font-medium text-primary">{formatCurrency(previewProduct.retailPrice)}</span></p>
                          {previewProduct.lotSize > 1 && (
                            <p className="text-xs text-gray-500">Lotto: <span className="font-medium text-primary">{previewProduct.lotSize} pz</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {previewProduct.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{previewProduct.description}</p>
                  )}
                  <div className="border border-border rounded divide-y divide-border/50">
                    {rows.filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex px-3 py-2">
                        <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                        <span className="text-xs text-primary font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <>
        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setTab('ricerca')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${tab === 'ricerca' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-primary'}`}
          >
            Ricerca
          </button>
          <button
            onClick={() => setTab('catalogo')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${tab === 'catalogo' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-primary'}`}
          >
            Sfoglia catalogo
          </button>
        </div>

        {/* Body: sidebar + product list */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left panel: search input (ricerca) or filters (catalogo) */}
          <div className="md:w-72 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border">
            {tab === 'ricerca' ? (
              <div className="px-4 py-3 space-y-3">
                {presenzaSelector}
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                  <Search size={15} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="flex-1 text-sm outline-none bg-transparent text-primary placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto px-4 py-3 max-h-48 md:max-h-none md:flex-1">
                {presenzaSelector}
                {filterSelects}
              </div>
            )}
          </div>

          {/* Right: product list */}
          <div className="flex-1 overflow-y-auto">
            {presenzaFilter === 'gia' ? (
              <>
                {giaProducts.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {giaProducts.map(renderProductRow)}
              </>
            ) : tab === 'ricerca' ? (
              <>
                {debouncedSearch.trim().length < 2 && presenzaFilter !== 'non-ancora' && (
                  <p className="text-center text-sm text-gray-400 py-12 px-4">Digita almeno 2 caratteri per cercare un prodotto</p>
                )}
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text={loadingLabel} />
                  </div>
                )}
                {!isLoading && (debouncedSearch.trim().length >= 2 || presenzaFilter === 'non-ancora') && applyPresenzaFilter(products ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {applyPresenzaFilter(products ?? []).map(renderProductRow)}
              </>
            ) : (
              <>
                {catalogLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text={loadingLabel} />
                  </div>
                )}
                {!catalogLoading && applyPresenzaFilter(catalogProducts ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {applyPresenzaFilter(catalogProducts ?? []).map(renderProductRow)}
              </>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────
export default function OrderPreviewView({ id, initialTab }: { id: string; initialTab?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('preview');
  const tg = useTranslations('groupings');
  const { mondiEspositivi } = useFeatureFlags();
  const routes = useCollectionRoutes();

  const GROUPINGS = GROUPING_KEYS.map((k) => ({ value: k, label: tg(k) }));

  const [viewMode, setViewMode] = useState<'ordine' | 'mondi' | 'calendario'>(() => {
    if (initialTab === 'esposizione') return 'mondi';
    if (initialTab === 'calendario') return 'calendario';
    return 'ordine';
  });
  const [groupBy, setGroupBy] = useState('gruppoMerceologico');
  const [productSearch, setProductSearch] = useState('');
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetNota, setBudgetNota] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [sortBy, setSortBy] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(PREVIEW_SORT_KEY) ?? 'name-asc') : 'name-asc'
  );
  function handleSortChange(v: string) { setSortBy(v); localStorage.setItem(PREVIEW_SORT_KEY, v); }
  const [qtyOverrides, setQtyOverrides] = useState<QtyMap>({});
  // Ref kept in sync with state — updated synchronously so rapid clicks never read stale values.
  const qtyOverridesRef = useRef<QtyMap>({});
  const qtyDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  // Items currently being saved — disables buttons and prevents double-saves.
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Key: conferente name → 'con' | 'senza'. Drives cost calculation for that supplier.
  // Initialized from and synced to localStorage (same key/structure as CustomerOrdersView).
  const [resoChoices, setResoChoices] = useState<Record<string, 'con' | 'senza'>>(() => {
    try {
      const all = JSON.parse(localStorage.getItem('reso-choices') ?? '{}');
      return (all[id] ?? {}) as Record<string, 'con' | 'senza'>;
    } catch { return {}; }
  });

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('reso-choices') ?? '{}');
      all[id] = resoChoices;
      localStorage.setItem('reso-choices', JSON.stringify(all));
    } catch {}
  }, [id, resoChoices]);

  const [showDemetraInstructions, setShowDemetraInstructions] = useState(false);
  const [addProductsOpen, setAddProductsOpen] = useState(false);
  const [addingVariantCode, setAddingVariantCode] = useState<string | null>(null);
  const [anagraficaProduct, setAnagraficaProduct] = useState<Product | null>(null);
  const [fantasySubFilter, setFantasySubFilter] = useState<Record<string, string | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  // ── Change destination ─────────────────────────────────────
  const [showChangeDestModal, setShowChangeDestModal] = useState(false);
  const [newCanaleId, setNewCanaleId] = useState('');
  const [changingDest, setChangingDest] = useState(false);

  // ── Duplicate order ────────────────────────────────────────
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupCanaleId, setDupCanaleId] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const { data: destData } = useQuery<{ data: Destinazione[] }>({
    queryKey: ['catalog-destinazioni-preview'],
    queryFn: () => fetch('/api/catalog/destinazioni').then((r) => r.json()),
    enabled: showChangeDestModal || showDupModal,
    staleTime: 60_000,
  });
  const destinazioni = destData?.data ?? [];

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['order-preview', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error('Ordine non trovato');
      return (await res.json()).data as Order;
    },
    staleTime: 60_000,
  });

  const { data: displayGroupsData } = useQuery<{ groups: { id: string }[] }>({
    queryKey: ['display-groups', id],
    queryFn: () => fetch(`/api/catalog/orders/${id}/display-groups`).then(r => r.json()),
    enabled: mondiEspositivi,
    staleTime: 15_000,
    select: (d) => ({ groups: d.groups.map((g: any) => ({ id: g.id })) }),
  });
  const displayGroupCount = displayGroupsData?.groups.length ?? 0;

  async function handleSaveBudget() {
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/catalog/orders/${id}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetPersonalizzato: budgetInput ? Number(budgetInput) : null,
          budgetNota: budgetNota || null,
        }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      setBudgetEditing(false);
      toast.success('Budget salvato');
    } catch { toast.error('Errore nel salvataggio'); }
    setSavingBudget(false);
  }

  // Items with effective qty / subtotal (local optimistic overrides).
  // Il costo unitario rispetta la scelta reso; senza scelta usa unitPrice
  // così i totali riflettono sempre il costo reale del prodotto.
  // Phantom filter: Arch 2 products have sizeVariants but NO product.taglia; items with no
  // item.taglia for those products are ghost records that must never appear in counts or totals.
  // Arch 1 products (product.taglia set) are left untouched.
  const items = useMemo(
    () =>
      (order?.items ?? [])
        .filter((it) => {
          if (!it.product) return false;
          const sv = (it.product as any).sizeVariants;
          const productTaglia = (it.product as any).taglia;
          if (Array.isArray(sv) && sv.length > 0 && !productTaglia && !it.taglia) {
            // Only suppress if a sibling with a real taglia exists (phantom duplicate).
            // If ALL items for this product have no taglia (pre-fix conversion), keep them.
            const allItems = order?.items ?? [];
            const hasRealSibling = allItems.some((other) => other.productId === it.productId && !!other.taglia);
            if (hasRealSibling) return false;
          }
          return true;
        })
        .map((it) => {
          const qty      = qtyOverridesRef.current[it.id] ?? it.quantity;
          const conf     = (it.product as any)?.conferente ?? '';
          const unitCost = effectiveCost(it.product, Number(it.unitPrice), resoChoices[conf]);
          return { ...it, effectiveQty: qty, effectiveUnitCost: unitCost, effectiveSubtotal: qty * unitCost };
        }),
    [order?.items, qtyOverrides, resoChoices]  // qtyOverrides state triggers re-render; ref provides the actual values
  );

  // Search filter (works on top of groupBy grouping)
  const filteredItems = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it =>
      (it.product?.name ?? '').toLowerCase().includes(q) ||
      (it.product?.code ?? '').toLowerCase().includes(q)
    );
  }, [items, productSearch]);

  // Groups computed client-side from current groupBy
  const unclassifiedLabel = t('unclassified');
  const groups = useMemo(() => {
    // Normalize field values so case/whitespace variants collapse into one group
    // e.g. "bianco" / "Bianco" / "BIANCO" → "Bianco"
    const norm = (s: string | null | undefined): string | null =>
      s?.trim() ? capitalize(s.trim()) : null;

    const map = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const p = item.product as any;
      let key: string;
      if (groupBy === 'fantasia') {
        key = norm(p?.fantasia) || unclassifiedLabel;
      } else {
        key = norm(p?.[groupBy]) || unclassifiedLabel;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'it'))
      .map(([name, grpItems]) => {
        const sorted = sortGroupItems(grpItems, sortBy);
        return {
          name,
          items: sorted,
          subtotal: grpItems.reduce((s, it) => s + it.effectiveSubtotal, 0),
          totalQty: grpItems.reduce((s, it) => s + it.effectiveQty, 0),
        };
      });
  }, [filteredItems, groupBy, sortBy]);

  const grandTotal = useMemo(() => items.reduce((s, it) => s + it.effectiveSubtotal, 0), [items]);
  const grandQty   = useMemo(() => items.reduce((s, it) => s + it.effectiveQty, 0),   [items]);

  // Extra-sconto Altraqualità abbigliamento PE27
  const altraqualitaBanner = useMemo(() => {
    const aqItems = items.filter(
      (it) =>
        it.product?.conferente?.toLowerCase().includes('altraqualit') &&
        it.product?.famiglia === 'Abbigliamento',
    );
    if (aqItems.length === 0) return null;
    const total = aqItems.reduce((s, it) => s + it.effectiveSubtotal, 0);
    const extraPct = total > 7000 ? 5 : total > 3000 ? 3 : 0;
    return { total, extraPct, effective: total * (1 - extraPct / 100) };
  }, [items]);

  async function handleAddVariant(codice: string, taglia: string, currentProductId: string) {
    const upperCode = codice.trim().toUpperCase();
    setAddingVariantCode(upperCode + '-' + taglia);
    try {
      // Detect arch-2 locally: if the sizeVariant codice matches the current product's own code,
      // they share a single Product record (no separate DB record per size → no search needed).
      const cachedOrder = queryClient.getQueryData<any>(['order-preview', id]);
      const currentProduct = cachedOrder?.items?.find((it: any) => it.productId === currentProductId)?.product;
      const isArch2 = currentProduct?.code?.trim().toUpperCase() === upperCode;

      let productId: string;
      let tagliaDaUsare: string;
      let quantity: number;

      if (isArch2) {
        productId = currentProductId;
        tagliaDaUsare = taglia;
        quantity = 1;
      } else {
        // Arch 1: each size is a separate Product record → search by code to get its ID.
        // If no separate record exists (or it belongs to a different product), fall back to
        // Arch 2 so the taglia is recorded on the current product instead.
        const res = await fetch(`/api/products?search=${encodeURIComponent(codice.trim())}&limit=100`);
        const data = res.ok ? await res.json() : { data: [] };
        const foundProduct = (data.data as Product[])?.find(
          (p: Product) => p.code.trim().toUpperCase() === upperCode
        );
        const isTrueArch1 = foundProduct && foundProduct.name === currentProduct?.name;
        if (isTrueArch1) {
          productId = foundProduct!.id;
          tagliaDaUsare = '';
          quantity = foundProduct!.lotSize || 1;
        } else {
          // Variant code missing or points to a different product — use Arch 2
          productId = currentProductId;
          tagliaDaUsare = taglia;
          quantity = 1;
        }
      }

      const addRes = await fetch(`/api/orders/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, taglia: tagliaDaUsare }),
      });
      if (!addRes.ok) {
        const err = await addRes.json();
        throw new Error(err.error ?? 'Errore');
      }
      const { data: { item: newItem } } = await addRes.json();

      // Optimistic update: replace or append the returned item in the cache immediately.
      // Background invalidate keeps the cache eventually consistent.
      queryClient.setQueryData<any>(['order-preview', id], (old: any) => {
        if (!old) return old;
        const existing = (old.items ?? []) as any[];
        const idx = existing.findIndex((it: any) => it.id === newItem.id);
        const newItems = idx >= 0
          ? existing.map((it: any) => (it.id === newItem.id ? newItem : it))
          : [...existing, newItem];
        return { ...old, items: newItems };
      });
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Taglia aggiunta ✓');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore aggiunta taglia');
    } finally {
      setAddingVariantCode(null);
    }
  }

  // Delta-based qty change: uses qtyOverridesRef (updated synchronously) as the source of
  // truth so rapid clicks always accumulate correctly even before React re-renders.
  // serverQty = item.quantity from DB (fallback only when no override exists yet).
  // delta = ±lotSize.
  function handleQtyChange(itemId: string, serverQty: number, delta: number) {
    // Block double-saves: if a PATCH is already in-flight for this item, ignore the click.
    if (savingItems.has(itemId)) return;

    const current = qtyOverridesRef.current[itemId] ?? serverQty;
    const newQty  = current + delta;

    if (newQty <= 0) { void handleRemove(itemId); return; }

    // Update ref immediately (synchronous — next click within same frame reads correct value)
    qtyOverridesRef.current = { ...qtyOverridesRef.current, [itemId]: newQty };
    setQtyOverrides({ ...qtyOverridesRef.current });

    // Debounce PATCH — cancel previous timer, then read from ref at FIRE TIME so the
    // server always receives the latest qty, not the one captured when the timer was set.
    if (qtyDebounceRef.current[itemId]) clearTimeout(qtyDebounceRef.current[itemId]);
    qtyDebounceRef.current[itemId] = setTimeout(async () => {
      const finalQty = qtyOverridesRef.current[itemId];
      if (finalQty == null || finalQty <= 0) return; // removed while debounce was pending

      // Cancel any background refetch in-flight so it doesn't overwrite our PATCH result.
      await queryClient.cancelQueries({ queryKey: ['order-preview', id] });
      setSavingItems((prev) => new Set(prev).add(itemId));
      try {
        const res = await fetch(`/api/orders/${id}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: finalQty }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? t('updateQtyError'));
        }
        // Write the confirmed qty into the cache so any subsequent refetch won't revert it.
        queryClient.setQueryData<any>(['order-preview', id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: (old.items ?? []).map((it: any) =>
              it.id === itemId ? { ...it, quantity: finalQty } : it
            ),
          };
        });
        // Override no longer needed — cache is authoritative.
        delete qtyOverridesRef.current[itemId];
        setQtyOverrides({ ...qtyOverridesRef.current });
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      } catch (err: any) {
        // Rollback: restore the server quantity so the UI shows the last known good value.
        qtyOverridesRef.current = { ...qtyOverridesRef.current, [itemId]: serverQty };
        setQtyOverrides({ ...qtyOverridesRef.current });
        toast.error(err?.message ?? t('updateQtyError'));
      } finally {
        setSavingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    }, 500);
  }

  async function handleRemove(itemId: string) {
    // Cancel any pending qty PATCH for this item to prevent it from racing DELETE
    if (qtyDebounceRef.current[itemId]) {
      clearTimeout(qtyDebounceRef.current[itemId]);
      delete qtyDebounceRef.current[itemId];
    }
    // Remove from ref before any async work
    delete qtyOverridesRef.current[itemId];

    const previousData = queryClient.getQueryData<Order>(['order-preview', id]);
    // Optimistic: remove item from cache immediately
    queryClient.setQueryData<Order>(['order-preview', id], (old: any) => {
      if (!old) return old;
      return { ...old, items: (old.items ?? []).filter((it: any) => it.id !== itemId) };
    });
    setQtyOverrides({ ...qtyOverridesRef.current });

    try {
      const res = await fetch(`/api/orders/${id}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success(t('removeSuccess'));
    } catch {
      // Restore previous state on failure
      queryClient.setQueryData(['order-preview', id], previousData);
      toast.error(t('removeError'));
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const res = await fetch(`/api/orders/${id}/pdf-classification?groupBy=${groupBy}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const label = groupBy.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordine-${id.slice(0, 8)}-per-${label}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('pdfReady'));
    } catch {
      toast.error(t('pdfError'));
    } finally {
      setExporting(false);
    }
  }


  async function handleChangeDest() {
    setChangingDest(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canaleId: newCanaleId || null }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setShowChangeDestModal(false);
      toast.success('Destinazione aggiornata');
    } catch {
      toast.error('Errore nell\'aggiornamento della destinazione');
    } finally {
      setChangingDest(false);
    }
  }

  async function handleDuplicate() {
    if (!dupCanaleId) return;
    setDuplicating(true);
    try {
      const orderItems = (order?.items ?? []).map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, canaleId: dupCanaleId }),
      });
      if (!res.ok) throw new Error();
      const { data: newOrder } = await res.json();
      toast.success('Ordine duplicato con successo');
      router.push(routes.orderPreview(newOrder.id));
    } catch {
      toast.error('Errore nella duplicazione dell\'ordine');
    } finally {
      setDuplicating(false);
    }
  }

  const currentGroupLabel = GROUPINGS.find((g) => g.value === groupBy)?.label ?? '';

  const addProductsBaseFilters: Record<string, string> = routes.collectionId === 'moda'
    ? { gruppoMerceologico: 'Moda' }
    : { excludeModa: 'true' };

  // ── Loading / error states ─────────────────────────────────
  if (isLoading) return <LoadingSpinner fullPage text={t('loadingOrder')} />;
  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-sm text-gray-500">{t('notFound')}</p>
        <Link href={routes.orders} className="mt-3 text-sm text-accent hover:underline">
          ← {t('backToOrders')}
        </Link>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div>

      {anagraficaProduct && (
        <ProductAnagraficaModal product={anagraficaProduct} onClose={() => setAnagraficaProduct(null)} />
      )}

      {showDemetraInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDemetraInstructions(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-primary">Importa in Demetra</p>
                <p className="text-2xs text-gray-400 mt-0.5">Il file CSV è stato scaricato. Segui questi passi.</p>
              </div>
              <button onClick={() => setShowDemetraInstructions(false)} className="text-gray-400 hover:text-primary p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
            <ol className="px-5 py-4 space-y-3">
              {[
                <>Vai in <span className="font-medium">Proposte di prenotazione</span> › <span className="font-medium">Proposte attive</span> › <span className="font-medium">Nuova prenotazione</span>, compila i campi e clicca <span className="font-medium">Crea prenotazione</span> (in Cliente seleziona <span className="font-medium">Prenotazioni dirette</span>).</>,
                <>Nella finestra successiva inserisci la destinazione e gli altri campi, poi clicca il pulsante blu <span className="font-medium">Carica da file</span>.</>,
                <>Si apre una nuova finestra: clicca il pulsante grigio <span className="font-medium">Scegli file</span>, seleziona il CSV appena scaricato, poi clicca il pulsante verde <span className="font-medium">Carica da file</span>.</>,
                <>Prosegui e conferma la prenotazione.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowDemetraInstructions(false)}
                className="w-full py-2.5 text-xs font-medium bg-primary text-background rounded hover:bg-warm-darker transition-colors"
              >
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}

      {addProductsOpen && (
        <AddProductsModal
          orderId={id}
          onClose={() => setAddProductsOpen(false)}
          addProductsLabel={t('addProducts')}
          searchPlaceholder={t('searchPlaceholder')}
          loadingLabel={t('loading')}
          noProductsLabel={t('noProducts')}
          addLabel={t('add')}
          orderProductIds={new Set((order?.items ?? []).map(i => i.productId))}
          orderItems={order?.items ?? []}
          baseFilters={addProductsBaseFilters}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
          }}
        />
      )}

      {/* Change destination modal */}
      {showChangeDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowChangeDestModal(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">Cambia destinazione</h3>
            <p className="text-xs text-gray-400 mb-3">Seleziona la destinazione da associare a questo ordine.</p>
            <select
              value={newCanaleId}
              onChange={(e) => setNewCanaleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              <option value="">— Nessuna —</option>
              {destinazioni.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tipo}{d.citta ? ` · ${d.citta}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowChangeDestModal(false)}
                className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleChangeDest}
                disabled={changingDest}
                className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {changingDest ? <Loader2 size={11} className="animate-spin" /> : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate order modal */}
      {showDupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDupModal(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">Duplica ordine</h3>
            <p className="text-xs text-gray-400 mb-3">Seleziona la destinazione per il nuovo ordine.</p>
            <select
              value={dupCanaleId}
              onChange={(e) => setDupCanaleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              <option value="">— Seleziona destinazione —</option>
              {destinazioni.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tipo}{d.citta ? ` · ${d.citta}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDupModal(false)}
                className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating || !dupCanaleId}
                className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {duplicating ? <Loader2 size={11} className="animate-spin" /> : <><Copy size={11} /> Duplica</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header — compact single row ────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="px-4 sm:px-6 py-2 flex items-center gap-2">
          {/* Back */}
          <Link
            href={routes.orders}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-cream rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </Link>

          {/* Order number */}
          <p className="text-sm font-semibold text-primary tracking-wide flex-shrink-0">
            {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
          </p>

          {/* Vista tabs — inline when mondiEspositivi */}
          {mondiEspositivi && (
            <div className="flex gap-1 ml-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setViewMode('ordine')}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded transition-colors ${viewMode === 'ordine' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-cream border border-border'}`}
              >
                Ordine
              </button>
              <button
                onClick={() => setViewMode('mondi')}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors ${viewMode === 'mondi' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-cream border border-border'}`}
              >
                <Layers size={11} />
                Esposizione
                {displayGroupCount > 0 && (
                  <span className={`text-[9px] px-1 rounded-full font-semibold ${viewMode === 'mondi' ? 'bg-white/20 text-white' : 'bg-cream text-primary'}`}>{displayGroupCount}</span>
                )}
              </button>
              <button
                onClick={() => setViewMode('calendario')}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors ${viewMode === 'calendario' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-cream border border-border'}`}
              >
                <CalendarDays size={11} />
                Calendario
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* Stats + budget — right side */}
          <div className="text-right text-xs text-gray-500 flex-shrink-0">
            <p>
              <span className="font-semibold text-primary">{formatCurrency(grandTotal)}</span>
              <span className="mx-1.5 text-gray-200">·</span>
              {items.length} art. · {grandQty} pz.
            </p>
            {/* Per-conferente reso toggle — only when at least one supplier has both prices */}
            {(() => {
              type ConfEntry = { cost: number; hasResoChoice: boolean };
              const confMap = new Map<string, ConfEntry>();
              for (const it of items) {
                const conf = (it.product as any)?.conferente ?? '—';
                if (!confMap.has(conf)) confMap.set(conf, { cost: 0, hasResoChoice: false });
                const e = confMap.get(conf)!;
                e.cost += it.effectiveSubtotal;
                const con = Number((it.product as any)?.costoIeConReso);
                const senza = Number((it.product as any)?.costoIeSenzaReso);
                if (con > 0 && senza > 0) e.hasResoChoice = true;
              }
              if (![...confMap.values()].some(v => v.hasResoChoice)) return null;
              return (
                <div className="mt-1 space-y-0.5">
                  {[...confMap.entries()].map(([conf, data]) => {
                    if (!data.hasResoChoice) return null;
                    const choice = resoChoices[conf];
                    return (
                      <div key={conf} className="flex items-center justify-end gap-1.5">
                        <span className="text-2xs text-gray-400 truncate max-w-[90px]">{conf}</span>
                        <span className="text-2xs text-gray-500">{formatCurrency(data.cost)}</span>
                        <button
                          onClick={() => setResoChoices(p => ({ ...p, [conf]: 'con' }))}
                          className={`text-2xs px-1.5 py-0.5 rounded transition-colors ${!choice || choice === 'con' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}
                        >con</button>
                        <button
                          onClick={() => setResoChoices(p => ({ ...p, [conf]: 'senza' }))}
                          className={`text-2xs px-1.5 py-0.5 rounded transition-colors ${choice === 'senza' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}
                        >s/reso</button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {mondiEspositivi && order.budgetPersonalizzato && !budgetEditing && (() => {
              const budget = Number(order.budgetPersonalizzato);
              const pct = Math.min(100, (grandTotal / budget) * 100);
              const over = grandTotal > budget;
              return (
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: over ? '#C17A5A' : '#8FAF8F' }} />
                  </div>
                  <span className={`text-2xs ${over ? 'text-[#C17A5A]' : 'text-[#8FAF8F]'}`}>
                    {over ? '+' : ''}{formatCurrency(grandTotal - budget)}
                  </span>
                  <span className="text-2xs text-gray-300">/ {formatCurrency(budget)}</span>
                  <button onClick={() => { setBudgetEditing(true); setBudgetInput(String(budget)); setBudgetNota(order.budgetNota ?? ''); }} className="text-gray-300 hover:text-gray-400 transition-colors">
                    <Pencil size={9} />
                  </button>
                </div>
              );
            })()}
            {mondiEspositivi && !order.budgetPersonalizzato && !budgetEditing && (
              <button onClick={() => { setBudgetEditing(true); setBudgetInput(''); setBudgetNota(''); }} className="text-2xs text-gray-300 hover:text-gray-400 mt-0.5 block ml-auto transition-colors">
                + budget
              </button>
            )}
            {mondiEspositivi && budgetEditing && (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <input type="number" min={0} step={100} value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="Budget €" className="text-xs border border-border rounded px-1.5 py-0.5 w-20 text-right" />
                <button onClick={handleSaveBudget} disabled={savingBudget} className="text-[#8FAF8F] hover:opacity-70 disabled:opacity-50">
                  {savingBudget ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                </button>
                <button onClick={() => setBudgetEditing(false)} className="text-gray-400 hover:text-primary"><X size={11} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mondi Espositivi view ──────────────────────────── */}
      {mondiEspositivi && viewMode === 'mondi' && (
        <DisplayGroupsManager orderId={id} orderItems={order.items ?? []} />
      )}

      {/* ── Calendario view ────────────────────────────────── */}
      {mondiEspositivi && viewMode === 'calendario' && (
        <CalendarioEsposizione orderId={id} />
      )}


      {viewMode === 'ordine' && <>

      {/* ── Grouping tabs ─────────────────────────────────── */}
      <div className="sticky z-10 bg-white border-b border-border" style={{ top: 44 }}>
        <div
          ref={tabsRef}
          className="flex overflow-x-auto scrollbar-none px-4 sm:px-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {GROUPINGS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGroupBy(g.value)}
              className={`
                flex-shrink-0 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
                border-b-2
                ${groupBy === g.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-primary hover:border-border'
                }
              `}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 sm:px-6 py-1.5 border-t border-border/40">
          <span className="text-2xs text-gray-400 flex-shrink-0">Ordina:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-2xs border border-border rounded px-1.5 py-0.5 bg-white text-primary focus:outline-none cursor-pointer flex-shrink-0"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-1 border border-border rounded px-2 py-0.5 bg-white w-48">
            <Search size={11} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Cerca per nome o codice"
              className="flex-1 text-2xs outline-none bg-transparent text-primary placeholder-gray-300"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={9} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Destination info bar ──────────────────────────── */}
      {order.destinazione && (
        <div className="px-4 sm:px-6 py-2 bg-cream/50 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span>{order.destinazione.tipo}{order.destinazione.citta ? ` · ${order.destinazione.citta}` : ''}</span>
          </div>
          {order.status !== 'ESPORTATO' && (
            <button
              onClick={() => { setNewCanaleId(order.canaleId ?? ''); setShowChangeDestModal(true); }}
              className="text-xs text-accent hover:text-accent/80 transition-colors flex-shrink-0"
            >
              Cambia
            </button>
          )}
        </div>
      )}

      {/* ── Extra-sconto Altraqualità abbigliamento ──────── */}
      {altraqualitaBanner && (
        <div className={`mx-4 sm:mx-6 mt-4 rounded-lg border px-4 py-3 text-xs ${altraqualitaBanner.extraPct > 0 ? 'border-[#8FAF8F]/60 bg-[#8FAF8F]/8' : 'border-border bg-cream/50'}`}>
          <p className="font-semibold text-primary mb-0.5">
            Altraqualità — Abbigliamento PE27
          </p>
          <p className="text-gray-500">
            Totale i.e.: <span className="font-medium text-primary">{formatCurrency(altraqualitaBanner.total)}</span>
            {altraqualitaBanner.extraPct > 0 ? (
              <>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="text-[#8FAF8F] font-semibold">Extrasconto {altraqualitaBanner.extraPct}%</span>
                {' '}per acquisti &gt; {altraqualitaBanner.extraPct === 5 ? '7.000' : '3.000'} €
                <span className="mx-1.5 text-gray-300">→</span>
                Costo effettivo: <span className="font-semibold text-primary">{formatCurrency(altraqualitaBanner.effective)}</span>
              </>
            ) : (
              <span className="ml-2 text-gray-400 text-2xs">Extrasconto 3% oltre 3.000 € · 5% oltre 7.000 €</span>
            )}
          </p>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 pb-32 lg:pb-24">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-16">
            {productSearch ? `Nessun prodotto per "${productSearch}"` : t('noItems')}
          </p>
        )}

        {groups.map((group) => {
          // Sub-filter chips: colore for "Tinta unita", nomeStampa for "Stampa"
          const isFantasia = groupBy === 'fantasia';
          const subField: 'colore' | 'nomeStampa' | null =
            isFantasia && group.name === 'Tinta unita' ? 'colore' :
            isFantasia && group.name === 'Stampa'      ? 'nomeStampa' :
            null;
          const subOptions = subField
            ? [...new Set(
                group.items
                  .map((i) => { const v = (i.product as any)?.[subField]; return v?.trim() ? capitalize(v.trim()) : null; })
                  .filter(Boolean) as string[]
              )].sort((a, b) => a.localeCompare(b, 'it'))
            : [];
          const activeSub = fantasySubFilter[group.name] ?? null;
          const visibleItems = (subField && activeSub)
            ? group.items.filter((i) => { const v = (i.product as any)?.[subField]; return v?.trim() ? capitalize(v.trim()) === activeSub : false; })
            : group.items;

          return (
          <section key={group.name} className="mb-10">
            {/* Group header */}
            <div className="bg-primary text-white px-4 py-3 flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] uppercase">{group.name}</p>
                <p className="text-2xs text-gray-400 mt-0.5">
                  {group.totalQty} pz.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-gray-400">{t('subtotal')}</p>
                <p className="text-sm font-bold">{formatCurrency(group.subtotal)}</p>
              </div>
            </div>

            {/* Sub-filter chips */}
            {subOptions.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setFantasySubFilter(prev => ({ ...prev, [group.name]: null }))}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors ${!activeSub ? 'bg-primary text-white border-primary' : 'border-border text-gray-500 hover:border-primary hover:text-primary'}`}
                >Tutti</button>
                {subOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFantasySubFilter(prev => ({ ...prev, [group.name]: prev[group.name] === opt ? null : opt }))}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors ${activeSub === opt ? 'bg-primary text-white border-primary' : 'border-border text-gray-500 hover:border-primary hover:text-primary'}`}
                  >{opt}</button>
                ))}
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {Array.from(
                visibleItems.reduce((map, item) => {
                  const productTaglia = (item.product as any)?.taglia;
                  const key = item.taglia
                    ? item.productId
                    : (productTaglia ? `name:${item.product?.name ?? item.productId}` : item.productId);
                  if (!map.has(key)) map.set(key, []);
                  map.get(key)!.push(item as EnrichedItem);
                  return map;
                }, new Map<string, EnrichedItem[]>()).values()
              ).map((productItems) => {
                const firstProduct = productItems[0].product!;
                const hasSizes = (firstProduct.sizeVariants?.length ?? 0) > 0;
                if (hasSizes) {
                  return (
                    <SizedProductCard
                      key={productItems.map((i) => i.id).join('-')}
                      productItems={productItems}
                      product={firstProduct}
                      onQtyChange={handleQtyChange}
                      onRemove={handleRemove}
                      onAddVariant={handleAddVariant}
                      onViewAnagrafica={setAnagraficaProduct}
                      addingVariantCode={addingVariantCode}
                      savingItems={savingItems}
                      removeLabel={t('remove')}
                      decreaseLabel={t('decrease')}
                      increaseLabel={t('increase')}
                    />
                  );
                }
                return (
                  <ProductCard
                    key={productItems[0].id}
                    item={productItems[0]}
                    effectiveQty={productItems[0].effectiveQty}
                    effectiveSubtotal={productItems[0].effectiveSubtotal}
                    onQtyChange={handleQtyChange}
                    onRemove={handleRemove}
                    onViewAnagrafica={setAnagraficaProduct}
                    savingItems={savingItems}
                    removeLabel={t('remove')}
                    decreaseLabel={t('decrease')}
                    increaseLabel={t('increase')}
                  />
                );
              })}
            </div>

            {/* Group subtotal line */}
            <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
              <span className="text-gray-400 uppercase tracking-widest">
                {t('subtotal')} {group.name}
              </span>
              <span className="font-semibold text-primary text-sm">
                {formatCurrency(group.subtotal)}
              </span>
            </div>
          </section>
          );
        })}

        {/* ── Riepilogo ─────────────────────────────────────── */}
        {groups.length > 1 && (
          <section className="mt-4 mb-8 border border-border rounded overflow-hidden">
            <div className="bg-cream/50 px-4 py-2 border-b border-border">
              <p className="text-2xs font-bold tracking-[0.12em] uppercase text-gray-500">Riepilogo</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {groups.map((group) => (
                  <tr key={group.name} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2 text-primary">{group.name}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{group.totalQty} pz</td>
                    <td className="px-4 py-2 text-right font-medium text-primary">{formatCurrency(group.subtotal)}</td>
                  </tr>
                ))}
                <tr className="bg-primary text-white">
                  <td className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">TOTALE</td>
                  <td className="px-4 py-2.5 text-right font-bold">{grandQty} pz</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sm">{formatCurrency(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* ── Fixed footer ──────────────────────────────────── */}
      <div className="
        fixed above-mobile-nav md:bottom-0 left-0 right-0 z-20
        lg:bottom-0 lg:right-80 xl:right-[340px]
        bg-white border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
      ">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Back */}
          <Link
            href={routes.orders}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{t('back')}</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add products */}
            <button
              onClick={() => setAddProductsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary flex-shrink-0"
            >
              <Plus size={12} />
              <span className="hidden sm:inline">{t('addProducts')}</span>
            </button>

            {/* PDF export */}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary disabled:opacity-50 flex-shrink-0"
            >
              <FileText size={12} />
              <span className="hidden sm:inline">
                {exporting ? t('generating') : `PDF · ${currentGroupLabel}`}
              </span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Esporta Excel completo */}
            <OrderExcelExport orderId={id} />

            {/* Duplica ordine */}
            <button
              onClick={() => { setDupCanaleId(order.canaleId ?? ''); setShowDupModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary flex-shrink-0"
            >
              <Copy size={12} />
              <span className="hidden sm:inline">Duplica</span>
            </button>

            {/* Esporta in Demetra — dropdown con completo/tranche/Excel */}
            <OrderDemetraExport
              order={order}
              onExported={() => setShowDemetraInstructions(true)}
            />
          </div>
        </div>
      </div>

      </> /* end viewMode === 'ordine' */}

    </div>
  );
}
