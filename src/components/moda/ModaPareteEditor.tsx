'use client';

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronLeft, ChevronRight,
  Trash2, Pencil, Check, Tag, PackagePlus, AlertTriangle, ZoomIn, ZoomOut,
  SlidersHorizontal, ChevronDown, ChevronUp, GripVertical, Undo2, Redo2, ArrowUpDown,
  ImagePlus, Upload,
} from 'lucide-react';
import { compressImageToBase64 } from '@/lib/compressImage';
import { capitalize } from '@/lib/utils';
import { inferHueFromColore } from '@/lib/colorHarmony';
import toast from 'react-hot-toast';
import type {
  PareteAttrezzata, ElementoParete, ItemParete,
  TipoCapo, TipoElementoParete, DimensioneMensola, DimensioneBarra,
  MensolaInlineConfig, PosizioneMensola, Cart, Order,
} from '@/types';
import type { Product } from '@/types';
import { nanoid } from 'nanoid';

// ─── Constants ───────────────────────────────────────────────────────────────

function colorForTipo(tipo: TipoCapo): string {
  const map: Record<TipoCapo, string> = {
    top: '#4f7c9c', bottom: '#6b5a8c', abito: '#8c5a7c',
    capospalla: '#4a6b4a', borsa: '#8c7a4a', accessorio: '#8c6a4a', altro: '#9ca3af',
  };
  return map[tipo] ?? '#9ca3af';
}

const TIPO_LABELS: Record<TipoCapo, string> = {
  top: 'Top', bottom: 'Bottom', abito: 'Abito',
  capospalla: 'Capospalla', borsa: 'Borsa', accessorio: 'Accessorio', altro: 'Altro',
};

const TIPO_OPTIONS_BARRA: TipoCapo[] = ['capospalla', 'top', 'bottom', 'abito'];
const TIPO_OPTIONS_MENSOLA: TipoCapo[] = ['borsa', 'accessorio', 'top', 'bottom', 'abito', 'altro'];
// Frontale slot 1: abbigliamento pieno + borsa/accessorio (half-size, no slot 2)
const TIPO_OPTIONS_FRONTALE_SLOT1: TipoCapo[] = ['abito', 'top', 'capospalla', 'borsa', 'accessorio'];
const TIPO_OPTIONS_FRONTALE_SLOT2: TipoCapo[] = ['bottom'];

const TAGLIE_FULL = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'TU'];

const BARRA_MAX_PZ: Record<DimensioneBarra, number> = { piccola: 24, media: 36, grande: 48 };
// Empty-state placeholder width = max pz × COSTA_W (5px). Rod auto-sizes to actual items when populated.
const BARRA_W: Record<DimensioneBarra, number> = { piccola: 24 * 5, media: 36 * 5, grande: 48 * 5 };
const BARRA_DIMS: DimensioneBarra[] = ['piccola', 'media', 'grande'];
const MENSOLA_DIMS: DimensioneMensola[] = ['piccola', 'media', 'lunga'];

const BARRA_PATTERN: Record<DimensioneBarra, TipoCapo[]> = {
  piccola: ['top', 'bottom', 'top', 'bottom', 'top', 'bottom'],
  media:   ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
  grande:  ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
};

const UNIT = 80;
const COSTA_W = 5;  // 1/3 of original 16 — narrow hangers on barra
const FRONTALE_W = 60; // 3 grid squares (3×20px)
const GRID_SQ = 20; // px per grid square
const WALL_SQUARES = 30; // wall is exactly 30 squares wide
const FRONTALE_H = 140;
const FRONTALE_TOP_H = FRONTALE_H / 2;  // 50% each when top+bottom
const FRONTALE_BOT_H = FRONTALE_H / 2;
// Borse e accessori (stole/sciarpe) occupano metà spazio del frontale abbigliamento
const FRONTALE_SMALL_W = FRONTALE_W / 2;   // 30px
const FRONTALE_SMALL_H = FRONTALE_H / 2;   // 70px
const TIPO_FRONTALE_SMALL: TipoCapo[] = ['borsa', 'accessorio'];
const STRATO_H = 7;
const MENSOLA_W: Record<DimensioneMensola, number> = { piccola: FRONTALE_W, media: FRONTALE_W * 2, lunga: FRONTALE_W * 3 };

function defaultOffsetY(_tipo: TipoElementoParete): number {
  return 0;
}

function mensolaItemVisualW(it: ItemParete): number {
  if (it.tipo === 'borsa') return 50;
  if (it.tipo === 'accessorio') return 30;
  return 48;
}

// Total visual width of items on the shelf (including gaps)
function mensola_totalItemsW(items: ItemParete[]): number {
  if (!items.length) return 0;
  return items.reduce((s, it) => s + mensolaItemVisualW(it), 0) + (items.length - 1) * 2;
}

// Height of the items container above the shelf
function mensolaItemsContainerH(items: ItemParete[]): number {
  if (!items.length) return STRATO_H + 2; // placeholder height + paddingBottom
  const maxH = items.reduce((m, it) => {
    const h = it.tipo === 'borsa' ? 50 : it.tipo === 'accessorio' ? 30 : Math.max(1, it.pezzi.length) * STRATO_H;
    return Math.max(m, h);
  }, 0);
  return maxH + 2; // +2 for paddingBottom
}

function isFrontaleSmall(el: ElementoParete): boolean {
  return el.tipo === 'frontale' && TIPO_FRONTALE_SMALL.includes(el.items[0]?.tipo as TipoCapo);
}

function estimateElementWidth(el: ElementoParete): number {
  if (el.tipo === 'mensola') return MENSOLA_W[(el.dimensione as DimensioneMensola) ?? 'media'];
  if (el.tipo === 'barra') {
    if (!el.items.length) return BARRA_W[(el.dimensione as DimensioneBarra) ?? 'media'];
    // Actual rendered width: each item = max(1, pezzi.length) columns × COSTA_W, gap=1 between items
    const cols = el.items.reduce((s, it) => s + Math.max(1, it.pezzi.length), 0);
    return cols * COSTA_W + Math.max(0, el.items.length - 1);
  }
  if (el.tipo === 'frontale') return isFrontaleSmall(el) ? FRONTALE_SMALL_W : FRONTALE_W;
  return FRONTALE_W;
}

// ─── Color harmony (ruota cromatica integration) ─────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / d + 2) / 6
      : ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const hk = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toC = (t: number) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = Math.round(toC(hk + 1 / 3) * 255);
  const g = Math.round(toC(hk) * 255);
  const b = Math.round(toC(hk - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getColorHarmony(hex: string): string[] | null {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return null;
  try {
    const [h, s, l] = hexToHsl(hex);
    return [hslToHex(h + 180, s, l), hslToHex(h + 30, s, l), hslToHex(h - 30, s, l)];
  } catch { return null; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalePezzi(items: ItemParete[]): number {
  return items.reduce((acc, it) => acc + it.pezzi.length, 0);
}

function hexFromProduct(p: Product): string | undefined {
  return p.pantoneColors?.find((pc) => pc.isPrimary)?.hex_code ?? p.pantoneColors?.[0]?.hex_code;
}

// Uppercase the model name portion within the display name
function formatProductName(p: Product): string {
  if (!p.modello) return p.name;
  const escaped = p.modello.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return p.name.replace(new RegExp(escaped, 'i'), p.modello.toUpperCase());
}

// Use imageUrl with imageUrl2 as fallback
function productImageUrl(p: Product): string | undefined {
  return p.imageUrl ?? p.imageUrl2 ?? p.imageUrl3 ?? p.imageUrl4 ?? p.imageUrl5 ?? undefined;
}

// Returns true if the product is a clothing item (valid for barra appenderia)
const ACCESSORY_REGEX = /bijou|bigiotteria|gioiell|collana|bracciale|orecchino|anello|spilla|pendente|charm|borsa|bag|clutch|tote|shopper|zaino|backpack|bauletto|pochette|marsupio|foulard|sciarpa|stola|cintura|cappello|guanti|occhiali|belt|hat|scarf|portafoglio|wallet/;
function isAbbigliamento(p: Product): boolean {
  const all = [(p.famiglia ?? ''), (p.sottofamiglia ?? ''), p.name].join(' ').toLowerCase();
  return !ACCESSORY_REGEX.test(all);
}

function tipoFromProduct(p: Product, elementoTipo: TipoElementoParete): TipoCapo {
  const fam = (p.famiglia ?? '').toLowerCase();
  const sf = (p.sottofamiglia ?? '').toLowerCase();
  const name = p.name.toLowerCase();
  const all = fam + ' ' + sf + ' ' + name;
  if (/bijou|bigiotteria|gioiell|collana|bracciale|orecchino|anello|spilla|pendente|charm/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'accessorio';
  }
  if (/borsa|bag|clutch|tote|shopper|zaino|backpack|bauletto|pochette|marsupio/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'borsa';
  }
  if (/foulard|sciarpa|stola|cintura|cappello|guanti|occhiali|belt|hat|scarf|accessori|portafoglio|wallet/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'accessorio';
  }
  if (/abito|vestito|dress|tuta|jumpsuit/.test(all)) return 'abito';
  if (/giaccone|cappotto|giubbott|parka|blazer|trench|coat|jacket|mantella/.test(all)) return 'capospalla';
  if (/pantal|gonna|skirt|short|legging|trouser|culotte/.test(all)) return 'bottom';
  if (/\btee|top|shirt|blusa|camicia|maglia|felpa|maglione|pull|sweat|t-shirt|tshirt|canotta/.test(all)) return 'top';
  if (elementoTipo === 'mensola') return 'borsa';
  if (elementoTipo === 'frontale') return 'abito';
  return 'top';
}

function availableTaglieFromProduct(p: Product): string[] {
  if (!p.sizeVariants?.length) return []; // empty = no sizes (bags, accessories)
  return p.sizeVariants.map((sv) => sv.taglia.toUpperCase());
}

// ─── Product sheet modal ──────────────────────────────────────────────────────

function ProductSheetModal({ item, onClose }: { item: ItemParete; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ data: Product }>({
    queryKey: ['product-detail', item.productId],
    queryFn: () => fetch(`/api/products/${item.productId}`).then((r) => r.json()),
    enabled: !!item.productId,
    staleTime: 120_000,
  });

  const product = data?.data;
  const displayName = product ? formatProductName(product) : (item.productName ?? '—');
  const img = product ? productImageUrl(product) : item.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <p className="flex-1 text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={displayName} className="w-full max-h-48 object-contain rounded-lg border border-gray-100 bg-gray-50" />
            )}
            {product?.famiglia && (
              <p className="text-xs text-gray-500">{[product.famiglia, product.sottofamiglia, product.colore].filter(Boolean).join(' · ')}</p>
            )}

            {product?.sizeVariants?.length ? (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Taglie e codici</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1 text-gray-400 font-normal">Taglia</th>
                      <th className="text-left py-1 text-gray-400 font-normal font-mono">Codice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizeVariants.map((sv) => (
                      <tr key={sv.codice} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700 font-medium">{sv.taglia.toUpperCase()}</td>
                        <td className="py-1.5 text-gray-500 font-mono">{sv.codice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : product?.code ? (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Codice</p>
                <p className="text-sm font-mono text-gray-600">{product.code}</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">Chiudi</button>
        </div>
      </div>
    </div>
  );
}

// ─── Prodotti continuativi type ───────────────────────────────────────────────

interface ProdottoContinuativo {
  id: string;
  nome: string;
  imageUrl: string | null;
}

// ─── Add product modal (multi-select, with source tabs + filters) ─────────────

type SourceTab = 'tutti' | 'carrello' | 'ordine' | 'continuativi';

export interface SourceState { tab: SourceTab; orderId: string; cartId: string; }

function AddProductModal({
  elementoTipo, onAdd, onClose,
  initialSource, onSourceChange,
}: {
  elementoTipo: TipoElementoParete; onAdd: (items: ItemParete[]) => void; onClose: () => void;
  initialSource?: SourceState;
  onSourceChange?: (s: SourceState) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceTab, setSourceTab] = useState<SourceTab>(initialSource?.tab ?? 'tutti');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialSource?.orderId ?? '');
  const [selectedCartId, setSelectedCartId] = useState<string>(initialSource?.cartId ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFamiglia, setFilterFamiglia] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSottoclasse, setFilterSottoclasse] = useState('');
  const [filterColore, setFilterColore] = useState('');
  // continuativi state
  const [selectedConts, setSelectedConts] = useState<Set<string>>(new Set());
  const [newContNome, setNewContNome] = useState('');
  const [newContImage, setNewContImage] = useState<string | null>(null);
  const [savingCont, setSavingCont] = useState(false);
  const [deletingContId, setDeletingContId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: cartsData, isLoading: cartsLoading } = useQuery<{ data: Cart[] }>({
    queryKey: ['catalog-carts-visual', 'moda'],
    queryFn: () => fetch('/api/catalog/carts?collection=moda').then((r) => r.json()),
    staleTime: 30_000,
    enabled: sourceTab === 'carrello',
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ data: Order[]; total: number }>({
    queryKey: ['orders-for-visual'],
    queryFn: () => fetch('/api/orders?my=true&limit=30').then((r) => r.json()),
    staleTime: 30_000,
    enabled: sourceTab === 'ordine',
  });

  const { data: continuativiData, isLoading: continuativiLoading } = useQuery<{ data: ProdottoContinuativo[] }>({
    queryKey: ['continuativi'],
    queryFn: () => fetch('/api/moda/continuativi').then((r) => r.json()),
    staleTime: 30_000,
    enabled: sourceTab === 'continuativi',
  });
  const continuativi = continuativiData?.data ?? [];

  const allProducts = productsData?.data ?? [];
  const orders = ordersData?.data ?? [];

  // Auto-select cart when data loads and we have a saved cartId (or fall back to first)
  const carts = cartsData?.data ?? [];
  useEffect(() => {
    if (!carts.length) return;
    if (!selectedCartId || !carts.find((c) => c.id === selectedCartId)) {
      const first = carts[0].id;
      setSelectedCartId(first);
      if (sourceTab === 'carrello') onSourceChange?.({ tab: 'carrello', orderId: '', cartId: first });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carts.length]);

  const cartProductIds = useMemo<Set<string> | null>(() => {
    const cart = carts.find((c) => c.id === selectedCartId) ?? carts[0];
    if (!cart) return null;
    return new Set(cart.items.map((i) => i.productId));
  }, [carts, selectedCartId]);

  const orderProductIds = useMemo<Set<string> | null>(() => {
    if (!selectedOrderId) return null;
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order?.items?.length) return null;
    return new Set(order.items.map((i) => i.productId));
  }, [orders, selectedOrderId]);

  const sourceProducts = useMemo(() => {
    let base = allProducts;
    // Barra appenderia: only clothing — no bags, accessories, bijou
    if (elementoTipo === 'barra') base = base.filter(isAbbigliamento);
    if (sourceTab === 'carrello' && cartProductIds) return base.filter((p) => cartProductIds.has(p.id));
    if (sourceTab === 'ordine' && orderProductIds) return base.filter((p) => orderProductIds.has(p.id));
    return base;
  }, [allProducts, elementoTipo, sourceTab, cartProductIds, orderProductIds]);

  const norm = (v: string | null | undefined) => v?.trim() ? capitalize(v.trim()) : null;

  const filterOptions = useMemo(() => {
    const uniq = (vals: (string | null)[]) =>
      [...new Map(vals.filter(Boolean).map((v) => [norm(v as string)!.toLowerCase(), norm(v as string)!])).values()]
        .sort((a, b) => a.localeCompare(b, 'it'));
    const byFamiglia    = filterFamiglia    ? sourceProducts.filter((p) => norm(p.famiglia)    === filterFamiglia)    : sourceProducts;
    const byClasse      = filterClasse      ? byFamiglia.filter((p)    => norm(p.classe)       === filterClasse)      : byFamiglia;
    const bySottoclasse = filterSottoclasse ? byClasse.filter((p)      => norm(p.sottoclasse)  === filterSottoclasse) : byClasse;
    return {
      famiglie:    uniq(sourceProducts.map((p) => p.famiglia)),
      classi:      uniq(byFamiglia.map((p)    => p.classe)),
      sottoclassi: uniq(byClasse.map((p)      => p.sottoclasse)),
      colori:      uniq(bySottoclasse.map((p) => p.colore)),
    };
  }, [sourceProducts, filterFamiglia, filterClasse, filterSottoclasse]);

  const filtered = useMemo(() => {
    let list = sourceProducts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => formatProductName(p).toLowerCase().includes(q));
    }
    if (filterFamiglia) list = list.filter((p) => norm(p.famiglia) === filterFamiglia);
    if (filterClasse) list = list.filter((p) => norm(p.classe) === filterClasse);
    if (filterSottoclasse) list = list.filter((p) => norm(p.sottoclasse) === filterSottoclasse);
    if (filterColore) list = list.filter((p) => norm(p.colore) === filterColore);
    return list.slice(0, 200);
  }, [sourceProducts, search, filterFamiglia, filterClasse, filterSottoclasse, filterColore]);

  const activeFilters = [filterFamiglia, filterClasse, filterSottoclasse, filterColore].filter(Boolean).length;

  function resetFilters() {
    setFilterFamiglia(''); setFilterClasse(''); setFilterSottoclasse(''); setFilterColore('');
  }
  function changeTab(t: SourceTab) {
    setSourceTab(t);
    resetFilters();
    onSourceChange?.({ tab: t, orderId: t === 'ordine' ? selectedOrderId : '', cartId: t === 'carrello' ? selectedCartId : '' });
  }
  function changeOrder(id: string) {
    setSelectedOrderId(id);
    resetFilters();
    onSourceChange?.({ tab: 'ordine', orderId: id, cartId: '' });
  }
  function changeCart(id: string) {
    setSelectedCartId(id);
    resetFilters();
    onSourceChange?.({ tab: 'carrello', orderId: '', cartId: id });
  }

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function toggleCont(id: string) {
    setSelectedConts((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file, 20_000, 300);
      setNewContImage(compressed);
    } catch {
      toast.error('Errore compressione immagine');
    }
    e.target.value = '';
  }

  async function handleSaveCont() {
    if (!newContNome.trim()) return;
    setSavingCont(true);
    try {
      const res = await fetch('/api/moda/continuativi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newContNome.trim(), imageUrl: newContImage }),
      });
      if (!res.ok) throw new Error();
      setNewContNome('');
      setNewContImage(null);
      queryClient.invalidateQueries({ queryKey: ['continuativi'] });
    } catch {
      toast.error('Errore salvataggio');
    } finally {
      setSavingCont(false);
    }
  }

  async function handleDeleteCont(id: string) {
    setDeletingContId(id);
    try {
      await fetch(`/api/moda/continuativi/${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['continuativi'] });
      setSelectedConts((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      toast.error('Errore eliminazione');
    } finally {
      setDeletingContId(null);
    }
  }

  function handleConfirm() {
    if (sourceTab === 'continuativi') {
      const sel = continuativi.filter((c) => selectedConts.has(c.id));
      const items: ItemParete[] = sel.map((c) => ({
        id: nanoid(8),
        tipo: 'altro' as TipoCapo,
        continuativoId: c.id,
        productName: c.nome,
        imageUrl: c.imageUrl ?? undefined,
        pezzi: [],
      }));
      onAdd(items);
      onClose();
      return;
    }
    const sel = allProducts.filter((p) => selected.has(p.id));
    const items: ItemParete[] = sel.map((p) => ({
      id: nanoid(8),
      tipo: tipoFromProduct(p, elementoTipo),
      productId: p.id,
      productCode: p.code,
      productName: formatProductName(p),
      imageUrl: productImageUrl(p),
      coloreHex: hexFromProduct(p),
      availableTaglie: availableTaglieFromProduct(p),
      pezzi: [],
    }));
    onAdd(items);
    onClose();
  }

  const isContinuativiTab = sourceTab === 'continuativi';
  const selectedCount = isContinuativiTab ? selectedConts.size : selected.size;
  const isLoading = productsLoading || (sourceTab === 'carrello' && cartsLoading) || (sourceTab === 'ordine' && ordersLoading);

  const tabLabel = (t: SourceTab) => ({ tutti: 'Tutti', carrello: 'Carrello', ordine: 'Ordine', continuativi: 'Continuativi' }[t]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <PackagePlus size={16} className="text-gray-400 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-gray-900">Aggiungi prodotto</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Source tabs */}
        <div className="flex px-4 pt-3 gap-1 flex-shrink-0 flex-wrap">
          {(['tutti', 'carrello', 'ordine', 'continuativi'] as SourceTab[]).map((t) => (
            <button key={t} type="button" onClick={() => changeTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceTab === t ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {/* Cart selector */}
        {sourceTab === 'carrello' && (
          <div className="px-4 pt-2 flex-shrink-0">
            {cartsLoading ? (
              <div className="flex items-center gap-2 py-1"><Loader2 size={14} className="animate-spin text-gray-300" /><span className="text-xs text-gray-400">Carico carrelli…</span></div>
            ) : carts.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">Nessun carrello trovato</p>
            ) : carts.length === 1 ? (
              <p className="text-xs text-gray-600 py-1 font-medium">{carts[0].name}</p>
            ) : (
              <select value={selectedCartId} onChange={(e) => changeCart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">— Seleziona un carrello —</option>
                {carts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.items?.length ?? 0} prodotti
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Order selector */}
        {sourceTab === 'ordine' && (
          <div className="px-4 pt-2 flex-shrink-0">
            {ordersLoading ? (
              <div className="flex items-center gap-2 py-1"><Loader2 size={14} className="animate-spin text-gray-300" /><span className="text-xs text-gray-400">Carico ordini…</span></div>
            ) : orders.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">Nessun ordine trovato</p>
            ) : (
              <select value={selectedOrderId} onChange={(e) => changeOrder(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">— Seleziona un ordine —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber ?? o.id.slice(0, 8)} · {o.items?.length ?? 0} prodotti
                    {o.destinazione?.nome ? ` · ${o.destinazione.nome}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Search + filter toggle (hidden for continuativi tab) */}
        {!isContinuativiTab && <div className="px-4 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per nome…"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex-shrink-0 ${showFilters || activeFilters > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <SlidersHorizontal size={13} />
              Filtri{activeFilters > 0 ? ` (${activeFilters})` : ''}
              <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded filters — cascade: ogni filtro restringe le opzioni dei successivi */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Famiglia', value: filterFamiglia, opts: filterOptions.famiglie,
                  set: (v: string) => { setFilterFamiglia(v); setFilterClasse(''); setFilterSottoclasse(''); setFilterColore(''); },
                },
                {
                  label: 'Classe', value: filterClasse, opts: filterOptions.classi,
                  set: (v: string) => { setFilterClasse(v); setFilterSottoclasse(''); setFilterColore(''); },
                },
                {
                  label: 'Sottoclasse', value: filterSottoclasse, opts: filterOptions.sottoclassi,
                  set: (v: string) => { setFilterSottoclasse(v); setFilterColore(''); },
                },
                {
                  label: 'Colore', value: filterColore, opts: filterOptions.colori,
                  set: setFilterColore,
                },
              ].map(({ label, value, opts, set }) => (
                <select key={label} value={value} onChange={(e) => set(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-400">
                  <option value="">{label}…</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
          )}
        </div>}

        {/* Product list — catalog tabs */}
        {!isContinuativiTab && (
          <div className="overflow-y-auto flex-1 border-t border-gray-100">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : sourceTab === 'ordine' && !selectedOrderId ? (
              <p className="text-center py-8 text-xs text-gray-400">Seleziona un ordine per visualizzare i prodotti</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
            ) : filtered.map((p) => {
              const isChecked = selected.has(p.id);
              const img = productImageUrl(p);
              return (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isChecked ? 'bg-accent/10' : 'hover:bg-gray-50'}`}>
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                    {isChecked && <Check size={10} className="text-white" />}
                  </div>
                  {img
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={img} alt={p.name} className="w-9 h-9 object-cover rounded flex-shrink-0" />
                    : <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{formatProductName(p)}</p>
                    <p className="text-2xs text-gray-400">{[p.famiglia, norm(p.colore)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-2xs text-gray-400 flex-shrink-0 font-medium">{TIPO_LABELS[tipoFromProduct(p, elementoTipo)]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Continuativi tab */}
        {isContinuativiTab && (
          <div className="flex-1 overflow-y-auto border-t border-gray-100 flex flex-col">
            {/* Add new form */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <p className="text-2xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Aggiungi prodotto continuativo</p>
              <div className="flex gap-2 items-start">
                {/* Photo picker */}
                <label className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors overflow-hidden">
                  {newContImage
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={newContImage} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus size={16} className="text-gray-400" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
                </label>
                <div className="flex-1 flex flex-col gap-1.5">
                  <input
                    value={newContNome}
                    onChange={(e) => setNewContNome(e.target.value)}
                    placeholder="Nome prodotto…"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCont(); }}
                  />
                  <button
                    onClick={handleSaveCont}
                    disabled={!newContNome.trim() || savingCont}
                    className="self-end flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    {savingCont ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Salva
                  </button>
                </div>
              </div>
              {newContImage && (
                <p className="text-2xs text-gray-400 mt-1 flex items-center gap-1">
                  <Upload size={10} /> Foto caricata e compressa
                </p>
              )}
            </div>

            {/* List */}
            {continuativiLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : continuativi.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400">Nessun prodotto continuativo salvato</p>
            ) : continuativi.map((c) => {
              const isChecked = selectedConts.has(c.id);
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${isChecked ? 'bg-accent/10' : 'hover:bg-gray-50'}`}>
                  <button onClick={() => toggleCont(c.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {isChecked && <Check size={10} className="text-white" />}
                    </div>
                    {c.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.imageUrl} alt={c.nome} className="w-9 h-9 object-cover rounded flex-shrink-0" />
                      : <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center"><ImagePlus size={12} className="text-gray-300" /></div>}
                    <p className="text-xs font-medium text-gray-900 truncate">{c.nome}</p>
                  </button>
                  <button
                    onClick={() => handleDeleteCont(c.id)}
                    disabled={deletingContId === c.id}
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    {deletingContId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <p className="flex-1 text-xs text-gray-400">
            {selectedCount === 0 ? 'Nessun prodotto selezionato' : `${selectedCount} prodott${selectedCount === 1 ? 'o' : 'i'} selezionat${selectedCount === 1 ? 'o' : 'i'}`}
          </p>
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Annulla</button>
          <button onClick={handleConfirm} disabled={selectedCount === 0}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors">
            Aggiungi {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product picker (single, for re-linking) ─────────────────────────────────

function ProductPickerModal({ onSelect, onClose }: { onSelect: (p: Product) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const products = data?.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 80);
    const q = search.toLowerCase();
    return products.filter((p) => formatProductName(p).toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <p className="flex-1 text-sm font-medium text-gray-900">Seleziona prodotto PE27</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
          ) : filtered.map((p) => {
            const img = productImageUrl(p);
            return (
              <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                {img
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={img} alt={p.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                  : <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{formatProductName(p)}</p>
                  <p className="text-2xs text-gray-400">{[p.famiglia, p.colore].filter(Boolean).join(' · ')}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Senza prodotto collegato — prosegui manualmente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item card ───────────────────────────────────────────────────────────────

function ItemCard({
  item, tipoOptions, onChange, onDelete, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, pareteContext, elementoTipo,
}: {
  item: ItemParete; tipoOptions: TipoCapo[];
  onChange: (u: ItemParete) => void; onDelete: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
  canMoveLeft?: boolean; canMoveRight?: boolean;
  pareteContext?: { pareteId: string; elementId: string; elementTipo: string };
  elementoTipo?: TipoElementoParete;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const color = item.coloreHex || colorForTipo(item.tipo);
  const harmony = item.coloreHex ? getColorHarmony(item.coloreHex) : null;
  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));
  // undefined = old item (unknown sizes) → fall back to TAGLIE_FULL; [] = no sizes (bags); [...] = specific sizes
  const taglieDaMostrare = item.availableTaglie !== undefined ? item.availableTaglie : TAGLIE_FULL;

  function toggleTaglia(t: string) {
    onChange({ ...item, pezzi: activeTaglie.has(t) ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] });
  }
  function addCustomTaglia(t: string) {
    if (!t.trim() || activeTaglie.has(t.toUpperCase())) return;
    onChange({ ...item, pezzi: [...item.pezzi, { taglia: t.toUpperCase() }] });
  }

  return (
    <div className="relative bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
      {/* Delete button — top-right corner of card */}
      <button type="button" onClick={onDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 text-gray-400 hover:bg-red-500 hover:border-red-500 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm z-10">
        <X size={10} />
      </button>
      {/* Row 1: tipo pills (left) + sizes + move actions (right) */}
      <div className="flex items-start gap-2">
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: 24 }} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {tipoOptions.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                  className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {/* size chips — only product-available sizes (or full standard set if none defined) */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {taglieDaMostrare.map((t) => {
                const active = activeTaglie.has(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTaglia(t)}
                    className={`px-1 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-500 border border-gray-200 hover:border-gray-400 hover:bg-white'
                    }`}>
                    {t}
                  </button>
                );
              })}
              {item.availableTaglie === undefined && <CustomTagliaInput onAdd={addCustomTaglia} />}
            </div>
            {/* move buttons only */}
            <div className="flex gap-0.5 flex-shrink-0">
              {onMoveLeft && <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} title="Sposta in su" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"><ChevronUp size={13} /></button>}
              {onMoveRight && <button type="button" onClick={onMoveRight} disabled={!canMoveRight} title="Sposta in giù" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"><ChevronDown size={13} /></button>}
            </div>
          </div>

          {/* Row 2: product thumbnail + name (clickable → sheet) or link-to-catalog */}
          <div className="flex items-center gap-1.5">
            {item.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.imageUrl} alt="" className="w-5 h-5 object-cover rounded flex-shrink-0" />
              : <Tag size={10} className="text-gray-300 flex-shrink-0" />}
            {item.productName ? (
              <button type="button" onClick={() => setShowSheet(true)}
                className="flex-1 text-2xs text-gray-600 hover:text-primary hover:underline transition-colors text-left truncate">
                {item.productName}
              </button>
            ) : (
              <button type="button" onClick={() => setShowPicker(true)}
                className="flex-1 text-2xs text-gray-400 hover:text-gray-600 transition-colors text-left">
                Collega prodotto dal catalogo
              </button>
            )}
            <div className="flex gap-1 flex-shrink-0 ml-auto">
              {item.productName && (
                <button type="button" onClick={() => setShowPicker(true)}
                  title="Cambia prodotto"
                  className="text-gray-300 hover:text-gray-500 transition-colors">
                  <Pencil size={10} />
                </button>
              )}
              {item.pezzi.length > 0 && <span className="text-2xs text-gray-300">{item.pezzi.length} pz</span>}
            </div>
          </div>

          {/* Row 3: abbinamenti cromatici — navigates to ruota page with parete context */}
          {item.productId && pareteContext && (
            <a
              href={`/moda/ruota-cromatica?productId=${item.productId}&pareteId=${pareteContext.pareteId}&elementId=${pareteContext.elementId}&elementTipo=${pareteContext.elementTipo}&sourceTipo=${item.tipo}`}
              className="self-start px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-800 border border-gray-200 hover:border-gray-400 hover:text-black transition-colors">
              abbinamenti cromatici →
            </a>
          )}
        </div>
      </div>

      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => {
            const taglie = availableTaglieFromProduct(p);
            const detectedTipo = tipoFromProduct(p, elementoTipo ?? 'barra');
            const newTipo = tipoOptions.includes(detectedTipo) ? detectedTipo : tipoOptions[0];
            onChange({
              ...item,
              productId: p.id, productCode: p.code, productName: formatProductName(p),
              imageUrl: productImageUrl(p),
              coloreHex: hexFromProduct(p) ?? item.coloreHex,
              tipo: newTipo,
              availableTaglie: taglie,
              // Keep only pezzi whose taglia is still valid
              pezzi: taglie ? item.pezzi.filter((pz) => taglie.includes(pz.taglia)) : item.pezzi,
            });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {showSheet && item.productId && (
        <ProductSheetModal item={item} onClose={() => setShowSheet(false)} />
      )}
    </div>
  );
}

function CustomTagliaInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);
  if (!editing) return (
    <button type="button" onClick={() => setEditing(true)}
      className="px-1.5 py-0.5 rounded text-[9px] text-gray-400 border border-dashed border-gray-300 hover:border-gray-500 transition-colors">
      +
    </button>
  );
  return (
    <input autoFocus value={value} onChange={(e) => setValue(e.target.value.toUpperCase())}
      onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(value); setValue(''); setEditing(false); } if (e.key === 'Escape') { setValue(''); setEditing(false); } }}
      onBlur={() => { if (value) onAdd(value); setValue(''); setEditing(false); }}
      placeholder="44…" className="w-10 px-1 py-0.5 rounded text-[9px] font-mono text-gray-900 bg-white border border-gray-300 focus:outline-none" />
  );
}

// ─── Frontale photo slot with zoom + drag-to-pan ─────────────────────────────

function FrontalePhotoSlot({
  item, w, h, className = '', onUpdate, fit = 'cover',
}: {
  item: ItemParete; w: number; h: number; className?: string;
  onUpdate?: (patch: Partial<ItemParete>) => void;
  fit?: 'cover' | 'contain';
}) {
  const scale = item.photoScale ?? 1;
  const offX = item.photoOffsetX ?? 0;
  const offY = item.photoOffsetY ?? 0;

  const panRef = useRef<{
    pointerId: number; startX: number; startY: number;
    startOffX: number; startOffY: number;
  } | null>(null);

  function startPan(e: React.PointerEvent) {
    if (!onUpdate || scale <= 1 || !item.imageUrl) return;
    e.stopPropagation(); e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startOffX: offX, startOffY: offY };
  }
  function movePan(e: React.PointerEvent) {
    const d = panRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const maxX = w * (scale - 1) / 2;
    const maxY = h * (scale - 1) / 2;
    onUpdate?.({
      photoOffsetX: Math.max(-maxX, Math.min(maxX, d.startOffX + (e.clientX - d.startX))),
      photoOffsetY: Math.max(-maxY, Math.min(maxY, d.startOffY + (e.clientY - d.startY))),
    });
  }
  function endPan(e: React.PointerEvent) {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
  }
  function applyZoom(delta: number) {
    const newScale = Math.max(0.25, Math.min(3, Math.round((scale + delta) * 4) / 4));
    if (newScale <= 1) {
      // Scala ≤ 1: immagine completamente visibile, nessun pan necessario
      onUpdate?.({ photoScale: newScale, photoOffsetX: 0, photoOffsetY: 0 });
      return;
    }
    const newMaxX = w * (newScale - 1) / 2;
    const newMaxY = h * (newScale - 1) / 2;
    onUpdate?.({
      photoScale: newScale,
      photoOffsetX: Math.max(-newMaxX, Math.min(newMaxX, offX)),
      photoOffsetY: Math.max(-newMaxY, Math.min(newMaxY, offY)),
    });
  }

  const scaledW = w * scale;
  const scaledH = h * scale;
  const imgLeft = (w - scaledW) / 2 + offX;
  const imgTop = (h - scaledH) / 2 + offY;

  return (
    <div
      className={`relative overflow-hidden group/fphoto ${className}`}
      style={{ width: w, height: h, cursor: scale > 1 && item.imageUrl ? 'grab' : 'default' }}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      {item.imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={item.imageUrl} alt="" draggable={false}
            className={`absolute ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
            style={{ width: scaledW, height: scaledH, left: imgLeft, top: imgTop, userSelect: 'none', pointerEvents: 'none' }} />
        : <div className="w-full h-full" style={{ backgroundColor: item.coloreHex || '#e5e7eb' }} />
      }
      {onUpdate && item.imageUrl && (
        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/fphoto:opacity-100 transition-opacity z-10"
          onPointerDown={(e) => e.stopPropagation()}>
          <button type="button"
            className="w-4 h-4 bg-black/50 text-white rounded text-[10px] flex items-center justify-center leading-none"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); applyZoom(-0.25); }}
            title="Rimpicciolisci foto">−</button>
          <button type="button"
            className="w-4 h-4 bg-black/50 text-white rounded text-[10px] flex items-center justify-center leading-none"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); applyZoom(+0.25); }}
            title="Ingrandisci foto">+</button>
        </div>
      )}
    </div>
  );
}

// ─── Single-item frontale editor (inline) ────────────────────────────────────

function FrontaleInlineEditor({
  label, item, onChange, onRemove,
}: {
  label: string; item?: ItemParete;
  onChange: (it: ItemParete) => void; onRemove: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (!item) {
    return (
      <button type="button" onClick={() => onChange({ id: nanoid(8), tipo: 'abito', pezzi: [] })}
        className="flex-1 py-2 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5">
        <Plus size={12} /> {label}
      </button>
    );
  }

  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));
  const taglieDaMostrare = item.availableTaglie !== undefined ? item.availableTaglie : TAGLIE_FULL;

  return (
    <div className="relative flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 space-y-1.5">
      <button type="button" onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 text-gray-400 hover:bg-red-500 hover:border-red-500 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm z-10">
        <X size={10} />
      </button>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-7 rounded-sm flex-shrink-0" style={{ backgroundColor: item.coloreHex || colorForTipo(item.tipo) }} />
          <div>
            <p className="text-2xs font-medium text-gray-600">{label}</p>
            <div className="flex gap-0.5 flex-wrap mt-0.5">
              {TIPO_OPTIONS_FRONTALE_SLOT1.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                  className={`px-1.5 py-0 rounded-full text-2xs transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}
                  style={{ fontSize: 9 }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => setShowPicker(true)} className="text-gray-300 hover:text-gray-600 transition-colors" title="Collega prodotto"><Tag size={12} /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {taglieDaMostrare.map((t) => {
          const active = activeTaglie.has(t);
          return (
            <button key={t} type="button"
              onClick={() => onChange({ ...item, pezzi: active ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] })}
              className={`px-1 py-0 rounded text-[9px] font-mono transition-colors ${active ? 'bg-primary text-white' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
              {t}
            </button>
          );
        })}
      </div>
      {item.productName && (
        <p className="text-2xs text-gray-400 truncate">{item.productName}</p>
      )}
      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => {
            const taglie = availableTaglieFromProduct(p);
            const detectedTipo = tipoFromProduct(p, 'frontale');
            const newTipo = (TIPO_OPTIONS_FRONTALE_SLOT1 as string[]).includes(detectedTipo) ? detectedTipo : 'abito';
            onChange({
              ...item, productId: p.id, productCode: p.code, productName: formatProductName(p),
              imageUrl: productImageUrl(p),
              coloreHex: hexFromProduct(p) ?? item.coloreHex,
              tipo: newTipo,
              availableTaglie: taglie,
              pezzi: taglie ? item.pezzi.filter((pz) => taglie.includes(pz.taglia)) : item.pezzi,
            });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Mensola inline editor ───────────────────────────────────────────────────

function MensolaInlineEditor({
  config, onChange, onRemove, elementId, pareteId, source, onSourceChange,
}: {
  config?: MensolaInlineConfig; onChange: (c: MensolaInlineConfig) => void; onRemove: () => void;
  elementId?: string; pareteId?: string;
  source?: SourceState; onSourceChange?: (s: SourceState) => void;
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const mItemDragIdxRef = useRef<number | null>(null);
  const [mItemDragOver, setMItemDragOver] = useState<number | null>(null);

  if (!config) {
    return (
      <button type="button"
        onClick={() => onChange({ dimensione: 'media', items: [] })}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-2xs text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
        <Plus size={11} /> Mensola sopra
      </button>
    );
  }

  function updateItem(idx: number, updated: ItemParete) {
    const items = [...config!.items]; items[idx] = updated; onChange({ ...config!, items });
  }
  function removeItem(idx: number) { onChange({ ...config!, items: config!.items.filter((_, i) => i !== idx) }); }
  function addFromCatalog(newItems: ItemParete[]) { onChange({ ...config!, items: [...config!.items, ...newItems] }); }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        <p className="text-xs font-medium text-gray-700">Mensola</p>
        <div className="flex gap-1">
          {MENSOLA_DIMS.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ ...config, dimensione: d })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${config.dimensione === d ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['sopra', 'sotto', 'fianco'] as PosizioneMensola[]).map((p) => (
            <button key={p} type="button" onClick={() => onChange({ ...config, posizione: p })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${(config.posizione ?? 'sopra') === p ? 'bg-gray-700 text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 ml-auto">
          <button type="button" onClick={() => onChange({ ...config, offsetX: Math.max(0, (config.offsetX ?? 0) - COSTA_W) })}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors"
            disabled={(config.offsetX ?? 0) === 0}><ChevronLeft size={11} /></button>
          <button type="button" onClick={() => onChange({ ...config, offsetX: (config.offsetX ?? 0) + COSTA_W })}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><ChevronRight size={11} /></button>
        </div>
        <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>
      </div>
      {config.items.map((it, idx) => (
        <div
          key={it.id}
          draggable
          onDragStart={() => { mItemDragIdxRef.current = idx; }}
          onDragOver={(e) => { e.preventDefault(); if (mItemDragIdxRef.current !== null && mItemDragIdxRef.current !== idx) setMItemDragOver(idx); }}
          onDrop={(e) => { e.preventDefault(); const from = mItemDragIdxRef.current; if (from !== null && from !== idx) { const a = [...config.items]; [a[from], a[idx]] = [a[idx], a[from]]; onChange({ ...config, items: a }); } mItemDragIdxRef.current = null; setMItemDragOver(null); }}
          onDragEnd={() => { mItemDragIdxRef.current = null; setMItemDragOver(null); }}
          className={`flex items-start gap-1.5 ${mItemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
        >
          <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <ItemCard item={it} tipoOptions={TIPO_OPTIONS_MENSOLA}
              onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
              onMoveLeft={() => { const a = [...config.items]; [a[idx], a[idx - 1]] = [a[idx - 1], a[idx]]; onChange({ ...config, items: a }); }}
              onMoveRight={() => { const a = [...config.items]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; onChange({ ...config, items: a }); }}
              canMoveLeft={idx > 0} canMoveRight={idx < config.items.length - 1}
              pareteContext={pareteId && elementId ? { pareteId, elementId, elementTipo: 'mensola' } : undefined}
              elementoTipo="mensola" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setShowCatalog(true)}
        className="w-full py-1.5 bg-white border border-gray-200 rounded-lg text-2xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 font-medium">
        <PackagePlus size={11} /> Aggiungi prodotto
      </button>
      {showCatalog && <AddProductModal elementoTipo="mensola" onAdd={addFromCatalog} onClose={() => setShowCatalog(false)} initialSource={source} onSourceChange={onSourceChange} />}
    </div>
  );
}

// ─── Elemento card ────────────────────────────────────────────────────────────

function ElementoCard({
  el, index, total, isActive, onChange, onDelete, onMoveUp, onMoveDown, pareteId, source, onSourceChange,
}: {
  el: ElementoParete; index: number; total: number; isActive?: boolean;
  onChange: (u: ElementoParete) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  pareteId?: string;
  source?: SourceState; onSourceChange?: (s: SourceState) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const itemDragIdxRef = useRef<number | null>(null);
  const [itemDragOver, setItemDragOver] = useState<number | null>(null);

  useEffect(() => { if (isActive) setExpanded(true); }, [isActive]);

  const isBarra = el.tipo === 'barra';
  const isMensola = el.tipo === 'mensola';
  const isFrontale = el.tipo === 'frontale';
  const barraDim = (el.dimensione ?? 'media') as DimensioneBarra;
  const maxPz = isBarra ? BARRA_MAX_PZ[barraDim] : null;
  const pzCount = isBarra ? totalePezzi(el.items) : null;
  const pzOver = maxPz !== null && pzCount !== null && pzCount > maxPz;

  // Frontale: slot 2 (bottom) solo se slot 1 è top|capospalla — non per borsa/accessorio
  const frontaleIsSmall = isFrontale && TIPO_FRONTALE_SMALL.includes(el.items[0]?.tipo as TipoCapo);
  const frontaleCanAddBottom = isFrontale && !frontaleIsSmall && el.items.length === 1
    && (el.items[0].tipo === 'top' || el.items[0].tipo === 'capospalla');
  const canAddItem = !isFrontale || (el.items.length === 0) || frontaleCanAddBottom;

  // ── Mensola standalone item helpers ─────────────────────────────────────────
  function saveMensolaItems(newItems: ItemParete[]) {
    const prevItems = el.mensole?.length ? el.mensole[0].items : el.items;
    // Keep shelf visually stable: compensate offsetY for height change
    const dy = isMensola
      ? mensolaItemsContainerH(prevItems) - mensolaItemsContainerH(newItems)
      : 0;
    const newOffsetY = (el.offsetY ?? defaultOffsetY(el.tipo)) + dy;
    const extra = isMensola ? { offsetY: newOffsetY } : {};
    if (el.mensole?.length) {
      const m = [...el.mensole]; m[0] = { ...m[0], items: newItems }; onChange({ ...el, mensole: m, ...extra });
    } else {
      onChange({ ...el, items: newItems, ...extra });
    }
  }
  function updateMensolaItem(idx: number, updated: ItemParete) {
    const a = [...mensolaItems]; a[idx] = updated; saveMensolaItems(a);
  }
  function removeMensolaItem(idx: number) { saveMensolaItems(mensolaItems.filter((_, i) => i !== idx)); }
  function moveMensolaItem(from: number, to: number) {
    if (to < 0 || to >= mensolaItems.length) return;
    const a = [...mensolaItems]; [a[from], a[to]] = [a[to], a[from]]; saveMensolaItems(a);
  }

  function addFromCatalog(items: ItemParete[]) {
    if (isMensola) { saveMensolaItems([...mensolaItems, ...items]); return; }
    if (isFrontale && el.items.length === 1) {
      // Second slot must always be bottom
      const it = items[0];
      if (it) onChange({ ...el, items: [...el.items, { ...it, tipo: 'bottom' }] });
    } else {
      onChange({ ...el, items: [...el.items, ...items] });
    }
  }
  function updateItem(idx: number, updated: ItemParete) {
    const a = [...el.items];
    a[idx] = updated;
    // Se slot 1 diventa abito, borsa o accessorio, rimuovi slot 2 (incompatibile)
    if (isFrontale && idx === 0 && (updated.tipo === 'abito' || TIPO_FRONTALE_SMALL.includes(updated.tipo as TipoCapo)) && a.length > 1) {
      onChange({ ...el, items: [a[0]] });
    } else {
      onChange({ ...el, items: a });
    }
  }
  function removeItem(idx: number) { onChange({ ...el, items: el.items.filter((_, i) => i !== idx) }); }
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= el.items.length) return;
    const a = [...el.items]; [a[from], a[to]] = [a[to], a[from]]; onChange({ ...el, items: a });
  }
  function applySuggerimento() {
    const pezziDefault = [{ taglia: 'S' }, { taglia: 'M' }, { taglia: 'L' }, { taglia: 'XL' }];
    onChange({ ...el, items: BARRA_PATTERN[barraDim].map((tipo) => ({ id: nanoid(8), tipo, pezzi: pezziDefault })) });
  }

  // ── Mensole array helpers (for barra/frontale: side mensole; for standalone mensola: stacked mensole) ──
  function getMensoleEl(): MensolaInlineConfig[] {
    if (el.mensole?.length) return el.mensole;
    if (el.mensolaTop) return [el.mensolaTop];
    return [];
  }
  function updateMensola(idx: number, cfg: MensolaInlineConfig) {
    const mensole = getMensoleEl();
    const next = [...mensole]; next[idx] = cfg;
    onChange({ ...el, mensole: next, mensolaTop: undefined });
  }
  function removeMensola(idx: number) {
    const mensole = getMensoleEl().filter((_, i) => i !== idx);
    onChange({ ...el, mensole, mensolaTop: undefined });
  }
  function addMensola() {
    const mensole = getMensoleEl();
    onChange({ ...el, mensole: [...mensole, { dimensione: 'media', items: [] }], mensolaTop: undefined });
  }

  const mensoleEl = getMensoleEl();
  const maxMensole = isMensola ? 4 : 2;

  // For standalone mensola: items live in mensole[0].items (fall back to el.items for old data)
  const mensolaItems = isMensola
    ? (el.mensole?.length ? el.mensole[0].items : el.items)
    : el.items;

  const elLabel = isBarra ? 'Barra' : isMensola ? 'Mensola' : 'Frontale';
  const totalPz = isMensola ? totalePezzi(mensolaItems) : totalePezzi(el.items);

  return (
    <div id={`card-${el.id}`} className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-colors ${isActive ? 'border-primary/40' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <div className="flex gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronLeft size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronRight size={14} /></button>
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white flex-shrink-0">{elLabel}</span>
          <p className={`text-2xs ${pzOver ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {(isMensola ? mensolaItems : el.items).length} pdt{totalPz > 0 ? ` - ${totalPz}${maxPz !== null ? `/${maxPz}` : ''} pz` : ''}
          </p>
        </button>
        {isBarra && (
          <div className="flex gap-1 flex-shrink-0">
            {BARRA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${barraDim === d ? 'bg-primary text-white border border-primary' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        {isMensola && (
          <div className="flex gap-1 flex-shrink-0">
            {MENSOLA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${el.dimensione === d ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        {pzOver && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0"><Trash2 size={14} /></button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Mensole array for barra/frontale */}
          {(isBarra || isFrontale) && (
            <div className="space-y-2">
              {mensoleEl.map((m, idx) => (
                <MensolaInlineEditor key={idx} config={m}
                  onChange={(c) => updateMensola(idx, c)}
                  onRemove={() => removeMensola(idx)}
                  elementId={el.id} pareteId={pareteId}
                  source={source} onSourceChange={onSourceChange} />
              ))}
            </div>
          )}
          {/* Items for barra and frontale */}
          {!isMensola && (
            <div className="space-y-2">
              {el.items.map((item, idx) => {
                const itemTipoOptions = isFrontale
                  ? (idx === 0 ? TIPO_OPTIONS_FRONTALE_SLOT1 : TIPO_OPTIONS_FRONTALE_SLOT2)
                  : isBarra ? TIPO_OPTIONS_BARRA : TIPO_OPTIONS_MENSOLA;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => { itemDragIdxRef.current = idx; }}
                    onDragOver={(e) => { e.preventDefault(); if (itemDragIdxRef.current !== null && itemDragIdxRef.current !== idx) setItemDragOver(idx); }}
                    onDrop={(e) => { e.preventDefault(); const from = itemDragIdxRef.current; if (from !== null && from !== idx) moveItem(from, idx); itemDragIdxRef.current = null; setItemDragOver(null); }}
                    onDragEnd={() => { itemDragIdxRef.current = null; setItemDragOver(null); }}
                    className={`flex items-start gap-1.5 ${itemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
                  >
                    <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <ItemCard item={item} tipoOptions={itemTipoOptions}
                        onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
                        onMoveLeft={() => moveItem(idx, idx - 1)}
                        onMoveRight={() => moveItem(idx, idx + 1)}
                        canMoveLeft={idx > 0} canMoveRight={idx < el.items.length - 1}
                        pareteContext={pareteId ? { pareteId, elementId: el.id, elementTipo: el.tipo } : undefined}
                        elementoTipo={el.tipo} />
                    </div>
                  </div>
                );
              })}
              {canAddItem && (
                <button type="button" onClick={() => setShowCatalogPicker(true)}
                  className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                  <PackagePlus size={13} />
                  {frontaleCanAddBottom ? 'Aggiungi bottom' : 'Aggiungi prodotto'}
                </button>
              )}
              {isBarra && (
                <button type="button" onClick={applySuggerimento}
                  className="w-full py-1.5 border border-dashed border-gray-200 rounded-xl text-2xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-1">
                  <span className="font-mono">{BARRA_PATTERN[barraDim].map((t) => t === 'top' ? 'T' : 'B').join('·')}</span>
                  <span className="ml-1">— Riempi pattern suggerito ({BARRA_PATTERN[barraDim].length}×4pz)</span>
                </button>
              )}
            </div>
          )}
          {/* Standalone mensola: direct item list + add button */}
          {isMensola && (
            <div className="space-y-2">
              {mensolaItems.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => { itemDragIdxRef.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); if (itemDragIdxRef.current !== null && itemDragIdxRef.current !== idx) setItemDragOver(idx); }}
                  onDrop={(e) => { e.preventDefault(); const from = itemDragIdxRef.current; if (from !== null && from !== idx) moveMensolaItem(from, idx); itemDragIdxRef.current = null; setItemDragOver(null); }}
                  onDragEnd={() => { itemDragIdxRef.current = null; setItemDragOver(null); }}
                  className={`flex items-start gap-1.5 ${itemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
                >
                  <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <ItemCard item={item} tipoOptions={TIPO_OPTIONS_MENSOLA}
                      onChange={(u) => updateMensolaItem(idx, u)}
                      onDelete={() => removeMensolaItem(idx)}
                      onMoveLeft={() => moveMensolaItem(idx, idx - 1)}
                      onMoveRight={() => moveMensolaItem(idx, idx + 1)}
                      canMoveLeft={idx > 0} canMoveRight={idx < mensolaItems.length - 1}
                      pareteContext={pareteId ? { pareteId, elementId: el.id, elementTipo: el.tipo } : undefined}
                      elementoTipo="mensola" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setShowCatalogPicker(true)}
                className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                <PackagePlus size={13} /> Aggiungi prodotto
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <p className="text-2xs text-gray-400 flex-1">Posizione orizzontale</p>
            <button type="button" onClick={() => onChange({ ...el, offsetX: Math.max(0, (el.offsetX ?? 0) - COSTA_W) })}
              disabled={(el.offsetX ?? 0) === 0}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {(el.offsetX ?? 0) > 0 && (
              <span className="text-2xs text-gray-400 font-mono min-w-[28px] text-center">+{el.offsetX}px</span>
            )}
            <button type="button" onClick={() => onChange({ ...el, offsetX: (el.offsetX ?? 0) + COSTA_W })}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <p className="text-2xs text-gray-400 flex-1">Posizione verticale</p>
            <button type="button"
              onClick={() => onChange({ ...el, offsetY: Math.max(0, (el.offsetY ?? defaultOffsetY(el.tipo)) - 4) })}
              disabled={(el.offsetY ?? defaultOffsetY(el.tipo)) === 0}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronUp size={14} />
            </button>
            <span className="text-2xs text-gray-400 font-mono min-w-[28px] text-center">{el.offsetY ?? defaultOffsetY(el.tipo)}px</span>
            <button type="button"
              onClick={() => onChange({ ...el, offsetY: (el.offsetY ?? defaultOffsetY(el.tipo)) + 4 })}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      )}
      {showCatalogPicker && (
        <AddProductModal elementoTipo={el.tipo} onAdd={addFromCatalog} onClose={() => setShowCatalogPicker(false)} initialSource={source} onSourceChange={onSourceChange} />
      )}
    </div>
  );
}

// ─── Photo strips ─────────────────────────────────────────────────────────────

const PHOTO_SQ = 36;
const PHOTO_STRIP_H = PHOTO_SQ + 8;

type PhotoEntry = { src: string | null; color?: string; label?: string };

function PhotoStrip({ photos, align }: { photos: PhotoEntry[]; align: 'top' | 'bottom' }) {
  const slots = Math.max(4, photos.length);
  const border = align === 'top' ? 'border-b' : 'border-t';
  return (
    <div
      className={`flex-shrink-0 overflow-x-auto flex items-center gap-1 px-2 bg-gray-50/80 ${border} border-gray-100`}
      style={{ height: PHOTO_STRIP_H }}
    >
      {Array.from({ length: slots }).map((_, i) => {
        const p = photos[i];
        if (p?.src) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={p.src} alt={p.label ?? ''} draggable={false} title={p.label}
            className="object-contain rounded flex-shrink-0 border border-gray-100 bg-white"
            style={{ width: PHOTO_SQ, height: PHOTO_SQ }} />;
        }
        if (p?.color) {
          return <div key={i} className="flex-shrink-0 rounded border border-gray-200"
            style={{ width: PHOTO_SQ, height: PHOTO_SQ, backgroundColor: p.color }} title={p.label} />;
        }
        return <div key={i} className="flex-shrink-0 rounded border border-dashed border-gray-200 bg-white/60"
          style={{ width: PHOTO_SQ, height: PHOTO_SQ }} />;
      })}
    </div>
  );
}

// ─── Wall renderer ────────────────────────────────────────────────────────────

function WallRenderer({
  config, onSelect, onUpdate, zoom, productColorMap,
}: {
  config: ElementoParete[];
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<ElementoParete>) => void;
  zoom?: number;
  productColorMap?: Map<string, string>;
}) {
  const outerWallRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(WALL_SQUARES * GRID_SQ);
  const effectiveZoomRef = useRef(1);

  // Re-fire when the wall div first becomes available (config loaded async after mount)
  const hasElements = config.length > 0;
  useLayoutEffect(() => {
    const el = outerWallRef.current;
    if (el) setContainerW(el.clientWidth || WALL_SQUARES * GRID_SQ);
  }, [hasElements]);
  useEffect(() => {
    const el = outerWallRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth || WALL_SQUARES * GRID_SQ));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasElements]);

  const dragRef = useRef<{
    id: string; pointerId: number;
    startX: number; startY: number;
    startOffsetX: number; startOffsetY: number;
    minOffsetX: number; maxOffsetX: number;
    didMove: boolean;
  } | null>(null);
  // Per-element DOM refs for direct transform updates during drag (zero re-renders)
  const outerDivRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const innerDivRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  // Auto-fit: scale wall to always fill container width at 100% user zoom
  const fitZoom = containerW / (WALL_SQUARES * GRID_SQ);
  const effectiveZoom = fitZoom * (zoom ?? 1);
  effectiveZoomRef.current = effectiveZoom;

  // Sort config by visual x (flex position + offsetX) to match wall left-to-right order
  const configSortedByVisualX = useMemo(() => {
    let flexX = 16; // px-4 left padding
    return config
      .map((el) => {
        const vx = flexX + (el.offsetX ?? 0);
        flexX += estimateElementWidth(el) + 16; // gap-4
        return { el, vx };
      })
      .sort((a, b) => a.vx - b.vx)
      .map(({ el }) => el);
  }, [config]);

  // Top strip: product photos from mensole (sorted by visual x), color fallback if no image
  // Top strip: only CLOTHING from mensole (borsa/accessorio excluded — they live on the shelf, not in the strip)
  const topPhotos = useMemo(() => {
    const out: PhotoEntry[] = [];
    function pushMensolaItem(it: ItemParete) {
      if (it.tipo === 'borsa' || it.tipo === 'accessorio') return;
      const color = (it.productId && productColorMap?.get(it.productId)) || it.coloreHex || colorForTipo(it.tipo);
      out.push({ src: it.imageUrl || null, color, label: it.productName ?? undefined });
    }
    for (const el of configSortedByVisualX) {
      if (el.tipo === 'mensola') {
        const mensole = el.mensole?.length ? el.mensole : [{ items: el.items, dimensione: (el.dimensione as DimensioneMensola) ?? 'media' }];
        for (const m of mensole) for (const it of m.items) pushMensolaItem(it);
      } else {
        for (const m of getMensole(el)) for (const it of m.items) pushMensolaItem(it);
      }
    }
    return out;
  }, [configSortedByVisualX, productColorMap]);

  // Bottom strip: products from barra elements — hanging items (el.items) + mensola-on-barra items
  const bottomPhotos = useMemo(() => {
    const out: PhotoEntry[] = [];
    function pushItem(it: ItemParete) {
      const color = (it.productId && productColorMap?.get(it.productId)) || it.coloreHex || colorForTipo(it.tipo);
      out.push({ src: it.imageUrl || null, color, label: it.productName ?? undefined });
    }
    for (const el of configSortedByVisualX) {
      if (el.tipo !== 'barra') continue;
      for (const it of el.items) pushItem(it);
      for (const m of getMensole(el)) for (const it of m.items) pushItem(it);
    }
    return out;
  }, [configSortedByVisualX, productColorMap]);

  function startDrag(e: React.PointerEvent, el: ElementoParete) {
    if (e.button !== 0) return;
    e.preventDefault();
    // Capture all subsequent pointer events to the outer wall container —
    // events go here directly even when pointer leaves the dragged element
    outerWallRef.current?.setPointerCapture(e.pointerId);
    lastDragPosRef.current = null;
    const z = effectiveZoomRef.current;
    const startOffsetX = el.offsetX ?? 0;
    const startOffsetY = el.offsetY ?? defaultOffsetY(el.tipo);
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = outerWallRef.current?.getBoundingClientRect();
    const scrollLeft = outerWallRef.current?.scrollLeft ?? 0;
    // (viewportOffset + scrollOffset) / zoom = logical position
    const elAbsLogX = containerRect
      ? (elRect.left - containerRect.left + scrollLeft) / z
      : startOffsetX;
    const flexLogX = elAbsLogX - startOffsetX;
    const elLogW = elRect.width / z;
    dragRef.current = {
      id: el.id, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      startOffsetX, startOffsetY,
      minOffsetX: -flexLogX,
      maxOffsetX: WALL_SQUARES * GRID_SQ - flexLogX - elLogW,
      didMove: false,
    };
    // Elevate dragged element above siblings so it renders on top during drag
    const outerEl = outerDivRefs.current.get(el.id);
    if (outerEl) outerEl.style.zIndex = '10';
    // Visual feedback: ring + grabbing cursor so it's clear what's being moved
    const innerEl = innerDivRefs.current.get(el.id);
    if (innerEl) {
      innerEl.style.boxShadow = '0 0 0 2px #1a1a1a, 0 4px 16px rgba(0,0,0,0.18)';
      innerEl.style.cursor = 'grabbing';
    }
  }

  function onWallPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    // 4px threshold: distinguishes click from drag
    if (!d.didMove) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      d.didMove = true;
    }
    const z = effectiveZoomRef.current;
    const clampedX = Math.max(d.minOffsetX, Math.min(d.maxOffsetX, d.startOffsetX + dx / z));
    const clampedY = Math.max(0, d.startOffsetY + dy / z);
    lastDragPosRef.current = { x: clampedX, y: clampedY };
    // Direct DOM update — zero React re-renders during drag
    const outer = outerDivRefs.current.get(d.id);
    const inner = innerDivRefs.current.get(d.id);
    if (outer) outer.style.transform = `translateX(${clampedX}px)`;
    if (inner) inner.style.transform = `translateY(${clampedY}px)`;
  }

  function endDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    const outerElReset = outerDivRefs.current.get(d.id);
    if (outerElReset) outerElReset.style.zIndex = '';
    // Remove drag highlight
    const innerElReset = innerDivRefs.current.get(d.id);
    if (innerElReset) { innerElReset.style.boxShadow = ''; innerElReset.style.cursor = ''; }
    if (!d.didMove) {
      onSelect?.(d.id);
      return;
    }
    const pos = lastDragPosRef.current;
    lastDragPosRef.current = null;
    const finalX = pos ? Math.round(pos.x) : Math.round(d.startOffsetX);
    const finalY = pos ? Math.round(pos.y) : Math.round(d.startOffsetY);
    // Snap DOM to committed values before React re-renders (prevents flicker)
    const outer = outerDivRefs.current.get(d.id);
    const inner = innerDivRefs.current.get(d.id);
    if (outer) { outer.style.transform = `translateX(${finalX}px)`; outer.style.zIndex = ''; }
    if (inner) inner.style.transform = `translateY(${finalY}px)`;
    onUpdate?.(d.id, { offsetX: finalX, offsetY: finalY });
  }

  if (config.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PhotoStrip photos={[]} align="top" />
        <div className="flex-1 flex items-center justify-center text-gray-300 p-4"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
            backgroundSize: '20px 20px', backgroundColor: '#ffffff',
          }}>
          <p className="text-xs text-center">Aggiungi barre, mensole o frontali</p>
        </div>
        <PhotoStrip photos={[]} align="bottom" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top strip: 4 squares — mensola photos */}
      <PhotoStrip photos={topPhotos} align="top" />

      {/* Main render area — grid background is INSIDE the zoomed div so grid squares scale with content */}
      <div
        ref={outerWallRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden"
        style={{ backgroundColor: '#ffffff', isolation: 'isolate' }}
        onPointerMove={onWallPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex items-start h-full px-4"
          style={{
            gap: 16,
            width: WALL_SQUARES * GRID_SQ,
            zoom: effectiveZoom,
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
            backgroundSize: `${GRID_SQ}px ${GRID_SQ}px`,
            backgroundColor: '#ffffff',
            borderRight: '2px solid rgba(0,0,0,0.1)',
          }}
        >
          {config.map((el) => (
            <div
              key={el.id}
              ref={(node) => { node ? outerDivRefs.current.set(el.id, node) : outerDivRefs.current.delete(el.id); }}
              className="flex-shrink-0 h-full select-none"
              style={{ transform: `translateX(${el.offsetX ?? 0}px)`, pointerEvents: 'none' }}
            >
              <div
                ref={(node) => { node ? innerDivRefs.current.set(el.id, node) : innerDivRefs.current.delete(el.id); }}
                className="inline-block pt-1 cursor-grab"
                style={{ transform: `translateY(${el.offsetY ?? defaultOffsetY(el.tipo)}px)`, pointerEvents: 'auto', touchAction: 'none' }}
                onPointerDown={(e) => startDrag(e, el)}
              >
                <WallElementRenderer
                  el={el}
                  zoom={effectiveZoom}
                  onUpdate={(patch) => onUpdate?.(el.id, patch)}
                  productColorMap={productColorMap}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom strip: 4 squares — barra photos */}
      <PhotoStrip photos={bottomPhotos} align="bottom" />
    </div>
  );
}

function MensolaBlock({ config, productColorMap }: { config: MensolaInlineConfig; productColorMap?: Map<string, string> }) {
  return <div style={{ marginLeft: config.offsetX ?? 0 }}><MensolaRenderer config={config} productColorMap={productColorMap} /></div>;
}

// Resolve mensole array from element (supports both old mensolaTop and new mensole fields)
function getMensole(el: ElementoParete): MensolaInlineConfig[] {
  if (el.mensole?.length) return el.mensole;
  if (el.mensolaTop) return [el.mensolaTop];
  return [];
}

function WallElementRenderer({ el, onUpdate, zoom = 1, productColorMap }: {
  el: ElementoParete;
  onUpdate?: (patch: Partial<ElementoParete>) => void;
  zoom?: number;
  productColorMap?: Map<string, string>;
}) {
  if (el.tipo === 'barra') {
    const dim = (el.dimensione ?? 'media') as DimensioneBarra;
    const pzTot = totalePezzi(el.items);
    const over = pzTot > BARRA_MAX_PZ[dim];
    const mensole = getMensole(el);

    const barraCore = (
      <div className="inline-flex flex-col">
        <div className={`h-0.5 rounded ${over ? 'bg-red-400' : 'bg-gray-400'}`} />
        <div className="flex items-start" style={{ gap: 1, minHeight: 48 }}>
          {el.items.length === 0
            ? <div style={{ width: BARRA_W[dim] }} />
            : el.items.map((it, i) => (
              <div key={it.id ?? i} className="relative group/bitem">
                <CapoOnBarra item={it} productColorMap={productColorMap} />
                {onUpdate && (
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/bitem:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ items: el.items.filter((_, j) => j !== i) }); }}
                  ><X size={8} /></button>
                )}
              </div>
            ))}
        </div>
      </div>
    );

    if (mensole.length === 0) return <div className="flex-shrink-0">{barraCore}</div>;
    // Stack all mensole above the barra
    const mensoleSide = mensole.filter(m => m.posizione === 'fianco');
    const mensoleTop = mensole.filter(m => m.posizione !== 'fianco');
    if (mensoleSide.length > 0) {
      return (
        <div className="flex items-start gap-2 flex-shrink-0">
          <div className="flex flex-col items-start">
            {mensoleTop.map((m, i) => <MensolaBlock key={i} config={m} productColorMap={productColorMap} />)}
            <div style={{ marginTop: mensoleTop.length ? 12 : 0 }}>{barraCore}</div>
          </div>
          {mensoleSide.map((m, i) => <MensolaBlock key={`s${i}`} config={m} productColorMap={productColorMap} />)}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start flex-shrink-0">
        {mensoleTop.map((m, i) => <MensolaBlock key={i} config={m} productColorMap={productColorMap} />)}
        <div style={{ marginTop: 12 }}>{barraCore}</div>
      </div>
    );
  }

  if (el.tipo === 'mensola') {
    // Standalone mensola: el.dimensione is authoritative for the first shelf width
    const elDim = (el.dimensione as DimensioneMensola) ?? 'media';
    const mensole = el.mensole?.length
      ? el.mensole.map((m, i) => i === 0 ? { ...m, dimensione: elDim } : m)
      : [{ dimensione: elDim, items: el.items }];
    return (
      <div className="flex-shrink-0">
        {mensole.map((m, i) => (
          <MensolaRenderer
            key={i}
            config={m}
            zoom={zoom}
            productColorMap={productColorMap}
            onUpdate={onUpdate ? (updated) => {
              const newMensole = mensole.map((ms, mi) => mi === i ? updated : ms);
              onUpdate({ mensole: newMensole });
            } : undefined}
          />
        ))}
      </div>
    );
  }

  if (el.tipo === 'frontale') {
    const item1 = el.items[0];
    const item2 = el.items[1];
    const mensole = getMensole(el);
    // Borsa/accessorio (stole, sciarpe) → metà larghezza e metà altezza
    const small = TIPO_FRONTALE_SMALL.includes(item1?.tipo as TipoCapo);
    const fW = small ? FRONTALE_SMALL_W : FRONTALE_W;
    const fH = small ? FRONTALE_SMALL_H : FRONTALE_H;
    const fTopH = fH / 2;
    const fBotH = fH / 2;

    const updateItem1 = onUpdate
      ? (patch: Partial<ItemParete>) => onUpdate({ items: [{ ...item1!, ...patch }, ...(item2 ? [item2] : [])] })
      : undefined;
    const updateItem2 = onUpdate && item2
      ? (patch: Partial<ItemParete>) => onUpdate({ items: [item1!, { ...item2, ...patch }] })
      : undefined;

    const frontaleCore = item2 ? (
      <div className="relative group/frontale" style={{ width: fW }}>
        <div className="relative group/fitem1">
          <FrontalePhotoSlot item={item1 ?? { id: '', tipo: 'abito', pezzi: [] }} w={fW} h={fTopH}
            className="rounded-t border border-b-0 border-gray-200" fit={small ? 'contain' : 'cover'} onUpdate={updateItem1} />
          {onUpdate && (
            <button type="button" className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/fitem1:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ items: [item2] }); }}
            ><X size={8} /></button>
          )}
        </div>
        <div className="relative group/fitem2">
          <FrontalePhotoSlot item={item2} w={fW} h={fBotH}
            className="rounded-b border border-gray-200" fit={small ? 'contain' : 'cover'} onUpdate={updateItem2} />
          {onUpdate && (
            <button type="button" className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/fitem2:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ items: item1 ? [item1] : [] }); }}
            ><X size={8} /></button>
          )}
        </div>
        {onUpdate && item1 && (
          <button type="button"
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-300 rounded-full opacity-0 group-hover/frontale:opacity-100 transition-opacity flex items-center justify-center z-20 shadow-sm cursor-pointer"
            style={{ top: fTopH }}
            title="Inverti top e bottom"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ items: [item2, item1] }); }}
          ><ArrowUpDown size={9} className="text-gray-500" /></button>
        )}
      </div>
    ) : (
      <div className="relative group/fitem1" style={{ width: fW, height: fH }}>
        {item1
          ? <FrontalePhotoSlot item={item1} w={fW} h={fH}
              className="rounded border border-gray-200" fit={small ? 'contain' : 'cover'} onUpdate={updateItem1} />
          : <div className="rounded border border-gray-200 w-full h-full" style={{ backgroundColor: '#e5e7eb' }} />
        }
        {onUpdate && item1 && (
          <button type="button" className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/fitem1:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ items: [] }); }}
          ><X size={8} /></button>
        )}
      </div>
    );

    const wrapper = (children: React.ReactNode) => (
      <div className="flex-shrink-0">{children}</div>
    );
    if (mensole.length === 0) return wrapper(frontaleCore);
    return wrapper(
      <div className="flex flex-col items-start">
        {mensole.map((m, i) => <MensolaBlock key={i} config={m} productColorMap={productColorMap} />)}
        <div style={{ marginTop: 12 }}>{frontaleCore}</div>
      </div>
    );
  }

  return null;
}

function MensolaRenderer({ config, onUpdate, zoom = 1, productColorMap }: {
  config: MensolaInlineConfig;
  onUpdate?: (c: MensolaInlineConfig) => void;
  zoom?: number;
  productColorMap?: Map<string, string>;
}) {
  const w = MENSOLA_W[config.dimensione];
  const over = mensola_totalItemsW(config.items) > w;
  const mensolaContainerRef = useRef<HTMLDivElement>(null);
  const itemElRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const itemDragRef = useRef<{
    idx: number; pointerId: number;
    startX: number; startOffX: number;
    minOffX: number; maxOffX: number;
    lastX: number;
  } | null>(null);

  function startItemDrag(e: React.PointerEvent, idx: number) {
    if (!onUpdate) return;
    e.stopPropagation();
    e.preventDefault();
    // Capture to the mensola container — moves always arrive here
    mensolaContainerRef.current?.setPointerCapture(e.pointerId);
    const centerOffset = Math.max(0, (w - mensola_totalItemsW(config.items)) / 2);
    let naturalFlexX = centerOffset;
    for (let i = 0; i < idx; i++) naturalFlexX += mensolaItemVisualW(config.items[i]) + 2;
    const itemW = mensolaItemVisualW(config.items[idx]);
    const startOffX = config.items[idx].offsetX ?? 0;
    itemDragRef.current = {
      idx, pointerId: e.pointerId, startX: e.clientX, startOffX,
      minOffX: -naturalFlexX,
      maxOffX: w - naturalFlexX - itemW,
      lastX: startOffX,
    };
  }

  function onItemMove(e: React.PointerEvent) {
    const d = itemDragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    e.stopPropagation();
    const clamped = Math.max(d.minOffX, Math.min(d.maxOffX, d.startOffX + (e.clientX - d.startX) / zoom));
    d.lastX = clamped;
    const el = itemElRefs.current.get(d.idx);
    if (el) el.style.transform = `translateX(${clamped}px)`;
  }

  function endItemDrag(e: React.PointerEvent) {
    e.stopPropagation();
    const d = itemDragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    itemDragRef.current = null;

    // Reset DOM transform immediately so there's no flicker after state update
    const domEl = itemElRefs.current.get(d.idx);
    if (domEl) domEl.style.transform = 'translateX(0px)';

    // Compute natural (flex) X positions accounting for centering
    const centerOffset = Math.max(0, (w - mensola_totalItemsW(config.items)) / 2);
    let natX = centerOffset;
    const natPos = config.items.map((it) => { const x = natX; natX += mensolaItemVisualW(it) + 2; return x; });

    // Center of dragged item after drag
    const fromIdx = d.idx;
    const draggedCenterX = natPos[fromIdx] + mensolaItemVisualW(config.items[fromIdx]) / 2 + d.lastX;

    // Find target slot: item whose center is closest to where the dragged item landed
    let toIdx = fromIdx;
    let minDist = Infinity;
    for (let i = 0; i < config.items.length; i++) {
      const dist = Math.abs(draggedCenterX - (natPos[i] + mensolaItemVisualW(config.items[i]) / 2));
      if (dist < minDist) { minDist = dist; toIdx = i; }
    }

    // Swap and clear all offsetX so items snap back to clean flex positions
    const newItems = config.items.map((it) => ({ ...it, offsetX: undefined }));
    if (toIdx !== fromIdx) [newItems[fromIdx], newItems[toIdx]] = [newItems[toIdx], newItems[fromIdx]];
    onUpdate?.({ ...config, items: newItems });
  }

  return (
    <div
      ref={mensolaContainerRef}
      onPointerMove={onUpdate ? onItemMove : undefined}
      onPointerUp={onUpdate ? endItemDrag : undefined}
      onPointerCancel={onUpdate ? endItemDrag : undefined}
    >
      {/* 2px gap between items and shelf */}
      <div className="flex items-end justify-center gap-0.5" style={{ minWidth: w, paddingBottom: 2 }}>
        {config.items.length === 0
          ? <div style={{ width: w, height: STRATO_H }} />
          : config.items.map((it, i) => {
              const color = (it.productId && productColorMap?.get(it.productId)) || it.coloreHex || colorForTipo(it.tipo);

              let inner: React.ReactNode;
              if (it.tipo === 'borsa') {
                // eslint-disable-next-line @next/next/no-img-element
                inner = it.imageUrl
                  ? <img src={it.imageUrl} alt="" draggable={false} className="object-contain rounded-sm" style={{ width: 50, height: 50 }} title={`Borsa (${it.pezzi.length}pz)`} />
                  : <div className="rounded-sm" style={{ backgroundColor: color, width: 50, height: 50 }} title={`Borsa (${it.pezzi.length}pz)`} />;
              } else if (it.tipo === 'accessorio') {
                // eslint-disable-next-line @next/next/no-img-element
                inner = it.imageUrl
                  ? <img src={it.imageUrl} alt="" draggable={false} className="object-contain rounded-sm" style={{ width: 30, height: 30 }} title={`Accessorio (${it.pezzi.length}pz)`} />
                  : <div className="rounded-sm" style={{ backgroundColor: color, width: 30, height: 30 }} title={`Accessorio (${it.pezzi.length}pz)`} />;
              } else {
                const n = Math.max(1, it.pezzi.length);
                inner = (
                  <div className="flex flex-col-reverse" style={{ width: 48 }}
                    title={`${TIPO_LABELS[it.tipo]} · ${n} strat${n === 1 ? 'o' : 'i'}`}>
                    {Array.from({ length: n }).map((_, j) => (
                      <div key={j} style={{ backgroundColor: color, height: STRATO_H, width: '100%' }} />
                    ))}
                  </div>
                );
              }

              return (
                <div key={it.id ?? i}
                  ref={(node) => { node ? itemElRefs.current.set(i, node) : itemElRefs.current.delete(i); }}
                  className="relative group/mitem flex-shrink-0 select-none"
                  style={{ transform: `translateX(${it.offsetX ?? 0}px)`, cursor: onUpdate ? 'ew-resize' : 'default', touchAction: 'none' }}
                  onPointerDown={onUpdate ? (e) => startItemDrag(e, i) : undefined}
                >
                  {inner}
                  {onUpdate && (
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/mitem:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onUpdate({ ...config, items: config.items.filter((_, j) => j !== i) }); }}
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
              );
            })}
      </div>
      <div className={`rounded ${over ? 'h-1 bg-red-400' : 'h-0.5 bg-gray-400'}`} style={{ width: w }} />
      {over && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <AlertTriangle size={8} className="text-red-500 flex-shrink-0" />
          <span className="text-[8px] text-red-500 font-medium">Mensola piena</span>
        </div>
      )}
    </div>
  );
}

function CapoOnBarra({ item, productColorMap }: { item: ItemParete; productColorMap?: Map<string, string> }) {
  const color = (item.productId && productColorMap?.get(item.productId)) || item.coloreHex || colorForTipo(item.tipo);
  const h = item.tipo === 'abito' ? 96 : item.tipo === 'capospalla' ? 80 : 64;
  const count = Math.max(1, item.pezzi.length);
  return (
    <div className="flex flex-shrink-0"
      title={`${TIPO_LABELS[item.tipo]}${item.productName ? ` — ${item.productName}` : ''} · ${item.pezzi.length}pz`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ width: COSTA_W }}>
          <div style={{ width: 1, height: 6, backgroundColor: '#9ca3af' }} />
          <div style={{ backgroundColor: color, width: COSTA_W, height: h }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function ModaPareteEditor({ pareteId }: { pareteId: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ data: PareteAttrezzata }>({
    queryKey: ['moda-parete', pareteId],
    queryFn: () => fetch(`/api/moda/pareti/${pareteId}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const parete = data?.data;

  const { data: productsForColors } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const productColorMap = useMemo(
    () => new Map(
      (productsForColors?.data ?? [])
        .map((p): [string, string] | null => {
          const hex = hexFromProduct(p);
          if (hex) return [p.id, hex];
          const inferred = inferHueFromColore((p as any).colore);
          if (inferred) return [p.id, inferred.hex];
          return null;
        })
        .filter((e): e is [string, string] => e !== null)
    ),
    [productsForColors]
  );

  const [nome, setNome] = useState('');
  const [editingNome, setEditingNome] = useState(false);
  const [config, setConfig] = useState<ElementoParete[]>([]);
  const [savedSource, setSavedSource] = useState<SourceState>({ tab: 'tutti', orderId: '', cartId: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [zoomInputVal, setZoomInputVal] = useState('');
  const [editingZoom, setEditingZoom] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const historyRef = useRef<ElementoParete[][]>([]);
  const futureRef = useRef<ElementoParete[][]>([]);
  const isDebouncing = useRef(false);
  // Always-current ref so closures (drag handlers, timers) never capture stale config
  const configRef = useRef<ElementoParete[]>([]);
  configRef.current = config;

  useEffect(() => {
    if (!parete || initializedRef.current) return;
    initializedRef.current = true;
    setNome(parete.nome);
    if (parete.sourceOrderId) {
      setSavedSource({ tab: 'ordine', orderId: parete.sourceOrderId, cartId: '' });
    } else if (parete.sourceCartId) {
      setSavedSource({ tab: 'carrello', orderId: '', cartId: parete.sourceCartId });
    }
    const rawConfig = Array.isArray(parete.configurazione) ? parete.configurazione as ElementoParete[] : [];

    // Collect productIds whose imageUrl was lost (stale-closure bug from old sessions)
    const missingIds = new Set<string>();
    function gatherMissing(items: ItemParete[]) {
      for (const it of items) if (it.productId && !it.imageUrl) missingIds.add(it.productId);
    }
    for (const el of rawConfig) {
      gatherMissing(el.items);
      for (const m of (el.mensole ?? [])) gatherMissing(m.items);
      if (el.mensolaTop) gatherMissing(el.mensolaTop.items);
    }

    if (missingIds.size === 0) { setConfig(rawConfig); return; }

    // Fetch missing product images and repair the config permanently
    fetch(`/api/products?ids=${[...missingIds].join(',')}&limit=${missingIds.size + 10}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const pMap = new Map<string, string>();
        for (const p of (data?.data ?? [])) { const url = productImageUrl(p); if (url) pMap.set(p.id, url); }
        function enrichItems(items: ItemParete[]): ItemParete[] {
          return items.map((it) => (it.productId && !it.imageUrl && pMap.has(it.productId) ? { ...it, imageUrl: pMap.get(it.productId) } : it));
        }
        const enriched: ElementoParete[] = rawConfig.map((el) => ({
          ...el,
          items: enrichItems(el.items),
          mensole: el.mensole?.map((m) => ({ ...m, items: enrichItems(m.items) })),
          mensolaTop: el.mensolaTop ? { ...el.mensolaTop, items: enrichItems(el.mensolaTop.items) } : undefined,
        }));
        setConfig(enriched);
        if (pMap.size > 0) saveConfig(enriched); // persist the repair
      })
      .catch(() => setConfig(rawConfig));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parete]);

  const saveConfig = useCallback(async (newConfig: ElementoParete[], newNome?: string) => {
    setSaveStatus('saving');
    try {
      const body: Record<string, unknown> = { configurazione: newConfig };
      if (newNome !== undefined) body.nome = newNome;
      const res = await fetch(`/api/moda/pareti/${pareteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaveStatus('saved');
      qc.invalidateQueries({ queryKey: ['moda-pareti'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      toast.error('Errore nel salvataggio');
      setSaveStatus('idle');
    }
  }, [pareteId, qc]);

  function handleSourceChange(s: SourceState) {
    setSavedSource(s);
    const sourceOrderId = s.tab === 'ordine' && s.orderId ? s.orderId : null;
    const sourceCartId  = s.tab === 'carrello' && s.cartId ? s.cartId : null;
    fetch(`/api/moda/pareti/${pareteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceOrderId, sourceCartId }),
    }).catch(() => {});
  }

  function handleConfigChange(newConfig: ElementoParete[], skipHistory = false) {
    if (!skipHistory && !isDebouncing.current) {
      historyRef.current = [...historyRef.current.slice(-49), configRef.current];
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      isDebouncing.current = true;
    }
    setConfig(newConfig);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      saveConfig(newConfig);
      isDebouncing.current = false;
    }, 1200);
  }

  function handleUndo() {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [configRef.current, ...futureRef.current.slice(0, 49)];
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    isDebouncing.current = false;
    handleConfigChange(prev, true);
  }

  function handleRedo() {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current.slice(-49), configRef.current];
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    isDebouncing.current = false;
    handleConfigChange(next, true);
  }

  function applyZoomInput() {
    const v = parseInt(zoomInputVal, 10);
    if (!isNaN(v)) setPreviewZoom(Math.min(2, Math.max(0.4, v / 100)));
    setEditingZoom(false);
  }

  function handleNomeSave() {
    setEditingNome(false);
    if (nome.trim() && nome !== parete?.nome) saveConfig(config, nome.trim());
  }

  function addElemento(tipo: TipoElementoParete) {
    const id = nanoid(8);
    const newEl: ElementoParete = {
      id, tipo,
      dimensione: tipo === 'mensola' ? 'media' : tipo === 'barra' ? 'media' : undefined,
      items: [],
      ...(tipo === 'mensola' ? { mensole: [{ dimensione: 'media', items: [] }] } : {}),
    };
    // Place new element at wall center so it's immediately visible (px-4=16 padding, gap-4=16 between elements)
    const naturalFlexX = 16 + configRef.current.reduce((sum, el) => sum + estimateElementWidth(el) + 16, 0);
    const elW = estimateElementWidth(newEl);
    const offsetX = Math.round((WALL_SQUARES * GRID_SQ) / 2 - elW / 2 - naturalFlexX);
    handleConfigChange([...configRef.current, { ...newEl, offsetX }]);
    setActiveElementId(id); // auto-espande la nuova card
    setTimeout(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function updateElemento(_idx: number, updated: ElementoParete) {
    const next = configRef.current.map((el) => el.id === updated.id ? updated : el);
    handleConfigChange(next);
  }
  function deleteElemento(idx: number) {
    const current = configRef.current;
    // Compensate for the flex gap left by the deleted element so other elements don't shift
    const deletedW = estimateElementWidth(current[idx]) + 16;
    const next = current
      .map((el, i) => ({ el, i }))
      .filter(({ i }) => i !== idx)
      .map(({ el, i }) => i > idx ? { ...el, offsetX: (el.offsetX ?? 0) + deletedW } : el);
    handleConfigChange(next);
  }
  function moveElemento(from: number, to: number) {
    const current = configRef.current;
    if (to < 0 || to >= current.length) return;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    handleConfigChange(next);
  }

  function handleSelectElement(id: string) {
    setActiveElementId(id);
    setTimeout(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }

  const totalCapi = config.reduce((acc, el) => acc + el.items.length, 0);
  const totalPz = config.reduce((acc, el) => acc + totalePezzi(el.items), 0);

  if (isLoading) return <div className="h-full bg-gray-50 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-300" /></div>;
  if (isError || !parete) return <div className="h-full bg-gray-50 flex items-center justify-center"><p className="text-sm text-gray-400">Layout non trovato</p></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 text-gray-900">
      {/* Header — full width, always visible */}
      <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur border-b border-gray-100 px-4 py-2 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/moda/pareti')} className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={16} /></button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {editingNome ? (
              <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
                onBlur={handleNomeSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNomeSave(); if (e.key === 'Escape') { setNome(parete.nome); setEditingNome(false); } }}
                className="bg-transparent border-b border-gray-400 text-xs font-semibold uppercase tracking-wider text-gray-900 focus:outline-none" />
            ) : (
              <button type="button" onClick={() => setEditingNome(true)} className="flex items-center gap-1.5 group min-w-0">
                <h1 className="text-xs font-semibold uppercase tracking-wider truncate text-gray-900">{nome}</h1>
                <Pencil size={10} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            )}
            <span className="text-gray-300 text-2xs flex-shrink-0">·</span>
            <p className="text-2xs text-gray-600 whitespace-nowrap">{config.length} elementi · {totalCapi} capi · {totalPz} pz</p>
          </div>
          <div className="flex-shrink-0">
            {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-gray-400" />}
            {saveStatus === 'saved' && <Check size={14} className="text-emerald-500" />}
          </div>
        </div>
      </div>

      {/* Body: left = scrollable cards, right = fixed preview */}
      <div className="flex flex-row flex-1 overflow-hidden">

        {/* LEFT: editor cards — own scroll */}
        <div className="flex-1 overflow-y-auto border-r border-gray-200">
          <div className="px-4 py-4 pb-24 space-y-3">
            {config.map((el, idx) => (
              <ElementoCard
                key={el.id}
                el={el}
                index={idx}
                total={config.length}
                isActive={activeElementId === el.id}
                onChange={(u) => updateElemento(idx, u)}
                onDelete={() => deleteElemento(idx)}
                onMoveUp={() => moveElemento(idx, idx - 1)}
                onMoveDown={() => moveElemento(idx, idx + 1)}
                pareteId={pareteId}
                source={savedSource}
                onSourceChange={handleSourceChange}
              />
            ))}
            {config.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">Costruisci il tuo layout</p>
                <p className="text-xs mt-1 text-gray-300">Aggiungi barre appenderia, mensole ed esposizioni frontali usando i pulsanti a destra</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: preview — fixed, never scrolls, always visible */}
        <div className="w-3/5 flex-shrink-0 flex flex-col bg-white border-l border-gray-200 shadow-sm overflow-hidden z-10">
          <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
            <p className="text-2xs text-gray-600 uppercase tracking-widest flex-1">Anteprima parete</p>
            <button type="button" onClick={handleUndo} disabled={!canUndo} title="Annulla"
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
              <Undo2 size={13} />
            </button>
            <button type="button" onClick={handleRedo} disabled={!canRedo} title="Ripristina"
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
              <Redo2 size={13} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button type="button" onClick={() => setPreviewZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
              <ZoomOut size={13} />
            </button>
            {editingZoom ? (
              <input
                autoFocus
                type="text"
                value={zoomInputVal}
                onChange={(e) => setZoomInputVal(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={applyZoomInput}
                onKeyDown={(e) => { if (e.key === 'Enter') applyZoomInput(); if (e.key === 'Escape') setEditingZoom(false); }}
                className="text-2xs text-gray-700 font-mono w-10 text-center bg-transparent border-b border-gray-400 focus:outline-none"
              />
            ) : (
              <button type="button" title="Clicca per inserire un valore"
                onClick={() => { setZoomInputVal(String(Math.round(previewZoom * 100))); setEditingZoom(true); }}
                className="text-2xs text-gray-600 font-mono w-8 text-center hover:text-gray-800 transition-colors">
                {Math.round(previewZoom * 100)}%
              </button>
            )}
            <button type="button" onClick={() => setPreviewZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
              <ZoomIn size={13} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {(['barra', 'mensola', 'frontale'] as const).map((tipo) => (
              <button key={tipo} type="button" onClick={() => addElemento(tipo)}
                className="flex items-center gap-1 px-2.5 py-1 bg-cream text-primary border border-border rounded-lg text-2xs font-medium hover:bg-accent/10 transition-colors">
                <Plus size={11} /> {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 border-t border-gray-100 overflow-hidden flex flex-col">
            <WallRenderer
              config={config}
              onSelect={handleSelectElement}
              onUpdate={(id, patch) => {
                const next = configRef.current.map((el) => el.id === id ? { ...el, ...patch } : el);
                handleConfigChange(next);
              }}
              zoom={previewZoom}
              productColorMap={productColorMap}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
