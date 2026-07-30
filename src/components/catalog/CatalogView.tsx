'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, FileDown, Heart, Loader2, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, debounce, capitalize } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useViewMode } from '@/hooks/useViewMode';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import ProductList from './ProductList';
import ProductLookbook from './ProductLookbook';
import { ViewToggle } from './ViewToggle';
import type { Product } from '@/types';

type Filters = {
  gruppoMerceologico: string | null;
  famiglia:           string | null;
  classe:             string | null;
  sottoclasse:        string | null;
  gruppoOmogeneo:     string | null;
  nomLinea:           string | null;
  materiale:          string | null;
  colore:             string | null;
  temaColore:         string | null;
  stagione:           string | null;
  collezione:         string | null;
  produttore:         string | null;
  tranche:            string | null;
  conferente:         string | null;
  fantasia:           string | null;
  lavorazione:        string | null;
  nomeStampa:         string | null;
};

// ── Bidirectional filter invalidation helpers ─────────────────────────────────

const FILTER_SECONDARY: Partial<Record<keyof Filters, string>> = {
  classe: 'classe2',
  sottoclasse: 'sottoclasse2',
  gruppoOmogeneo: 'gruppoOmogeneo2',
};

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function filterMatchesProduct(p: Product, key: keyof Filters, value: string): boolean {
  if (key === 'temaColore') {
    return [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].some(v => v === value);
  }
  if (key === 'materiale') {
    return [p.materiale1, p.materiale2, p.materiale3].some(v => v === value);
  }
  if (key === 'colore') {
    return [p.colore, p.colore2, p.colore3].some(v => v && capFirst(v) === value);
  }
  const primary = (p as unknown as Record<string, unknown>)[key] as string | undefined;
  if (primary === value) return true;
  const sec = FILTER_SECONDARY[key];
  if (sec) return (p as unknown as Record<string, unknown>)[sec] === value;
  return false;
}

function getAvailableValues(products: Product[], filters: Filters, key: keyof Filters): Set<string> {
  const result = new Set<string>();
  for (const p of products) {
    const matches = (Object.keys(filters) as (keyof Filters)[]).every(k => {
      const v = filters[k];
      if (!v || k === key) return true;
      return filterMatchesProduct(p, k, v);
    });
    if (!matches) continue;
    if (key === 'temaColore') {
      for (const v of [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5]) {
        if (v) result.add(v);
      }
    } else if (key === 'materiale') {
      for (const v of [p.materiale1, p.materiale2, p.materiale3]) {
        if (v) result.add(v);
      }
    } else if (key === 'colore') {
      for (const v of [p.colore, p.colore2, p.colore3]) {
        if (v) result.add(capFirst(v));
      }
    } else {
      const primary = (p as unknown as Record<string, unknown>)[key] as string | undefined;
      if (primary) result.add(primary);
      const sec = FILTER_SECONDARY[key];
      if (sec) {
        const sv = (p as unknown as Record<string, unknown>)[sec] as string | undefined;
        if (sv) result.add(sv);
      }
    }
  }
  return result;
}

// After changing one filter, clear any other selected filters that have 0 matching products
function clearInvalidFilters(products: Product[], filters: Filters, changedKey: keyof Filters): Filters {
  let next = { ...filters };
  for (const k of Object.keys(next) as (keyof Filters)[]) {
    if (!next[k] || k === changedKey) continue;
    const available = getAvailableValues(products, next, k);
    if (!available.has(next[k] as string)) {
      next = { ...next, [k]: null };
    }
  }
  return next;
}

const EMPTY_FILTERS: Filters = {
  gruppoMerceologico: null, famiglia: null, classe: null, sottoclasse: null,
  gruppoOmogeneo: null, nomLinea: null, materiale: null,
  colore: null, temaColore: null, stagione: null, collezione: null,
  produttore: null, tranche: null, conferente: null,
  fantasia: null, lavorazione: null, nomeStampa: null,
};

// Short URL keys for cleaner URLs
const URL_KEYS: Record<keyof Filters, string> = {
  gruppoMerceologico: 'gm', famiglia: 'fam', classe: 'cls', sottoclasse: 'sub',
  gruppoOmogeneo: 'go', nomLinea: 'lin', materiale: 'mat',
  colore: 'col', temaColore: 'tcol', stagione: 'stag', collezione: 'coll',
  produttore: 'prod', tranche: 'tran', conferente: 'conf',
  fantasia: 'fan', lavorazione: 'lav', nomeStampa: 'nst',
};

const CHIP_LABELS: { key: keyof Filters; label: string }[] = [
  { key: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { key: 'famiglia',           label: 'Famiglia' },
  { key: 'classe',             label: 'Classe' },
  { key: 'sottoclasse',        label: 'Sottoclasse' },
  { key: 'gruppoOmogeneo',     label: 'Gruppo omogeneo' },
  { key: 'nomLinea',           label: 'Linea' },
  { key: 'materiale',          label: 'Materiale' },
  { key: 'colore',             label: 'Colore' },
  { key: 'temaColore',         label: 'Tema colore' },
  { key: 'stagione',           label: 'Stagione' },
  { key: 'collezione',         label: 'Collezione' },
  { key: 'produttore',         label: 'Produttore' },
  { key: 'tranche',            label: 'Tranche' },
  { key: 'conferente',         label: 'Conferente' },
  { key: 'fantasia',           label: 'Fantasia' },
  { key: 'lavorazione',        label: 'Lavorazione' },
  { key: 'nomeStampa',         label: 'Nome stampa' },
];

export default function CatalogView({
  lockedCollezione,
  lockedGruppoMerceologico,
  lockedFamiglia,
  lockedFamiglie,
  excludeGruppoMerceologico,
  excludeCollezioni,
  readOnly,
}: {
  lockedCollezione?: string;
  lockedGruppoMerceologico?: string;
  lockedFamiglia?: string;
  lockedFamiglie?: string[];
  excludeGruppoMerceologico?: string;
  excludeCollezioni?: string[];
  readOnly?: boolean;
} = {}) {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === 'CUSTOMER';
  const isModa = lockedCollezione === 'PE27' || lockedGruppoMerceologico?.toLowerCase() === 'moda';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Initialize filters from URL params ──────────────────────
  const [filters, setFilters] = useState<Filters>(() => {
    const init: Filters = { ...EMPTY_FILTERS };
    for (const [filterKey, urlKey] of Object.entries(URL_KEYS)) {
      const v = searchParams.get(urlKey);
      if (v) (init as any)[filterKey] = v;
    }
    // Locked values always override URL params
    if (lockedCollezione) init.collezione = lockedCollezione;
    if (lockedFamiglia)   init.famiglia   = lockedFamiglia;
    return init;
  });

  const [sortBy, setSortByRaw] = useState<'az' | 'za' | 'price-asc' | 'price-desc' | 'novita' | 'continuativi'>(
    () => (searchParams.get('sort') as any) || 'az'
  );
  const [search, setSearch]               = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // ── Mobile drawer state ──────────────────────────────────────
  const [bloccoColoreFilter, setBloccoColoreFilter] = useState<{ id: number; name: string } | null>(() => {
    const v = searchParams.get('bcol');
    const n = searchParams.get('bcoln');
    return v && n ? { id: Number(v), name: n } : null;
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS);
  const [pendingBloccoColore, setPendingBloccoColore] = useState<{ id: number; name: string } | null>(null);

  const { favoriteIds } = useFavorites();
  const { mode: viewMode, changeMode: setViewMode } = useViewMode();
  const tn = useTranslations('nav');

  // ── URL update helper ────────────────────────────────────────
  function updateUrl(f: Filters, sort: string, q: string, bcol?: { id: number; name: string } | null) {
    const params = new URLSearchParams();
    for (const [filterKey, urlKey] of Object.entries(URL_KEYS)) {
      const v = (f as any)[filterKey];
      if (v) params.set(urlKey, v);
    }
    const resolvedBcol = bcol !== undefined ? bcol : bloccoColoreFilter;
    if (resolvedBcol) { params.set('bcol', String(resolvedBcol.id)); params.set('bcoln', resolvedBcol.name); }
    if (sort && sort !== 'az') params.set('sort', sort);
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  // ── Filter setters (update state + URL) ─────────────────────
  function setFilter(key: keyof Filters, value: string | null) {
    setFilters(prev => {
      const withNew = { ...prev, [key]: value };
      const next = clearInvalidFilters(branchProducts, withNew, key);
      updateUrl(next, sortBy, search);
      return next;
    });
  }

  function handleResetAll() {
    const reset = {
      ...EMPTY_FILTERS,
      ...(lockedCollezione ? { collezione: lockedCollezione } : {}),
      ...(lockedFamiglia   ? { famiglia:   lockedFamiglia   } : {}),
    };
    setFilters(reset);
    setBloccoColoreFilter(null);
    updateUrl(reset, sortBy, search, null);
  }

  function setSortBy(v: typeof sortBy) {
    setSortByRaw(v);
    updateUrl(filters, v, search);
  }

  const debouncedSetSearch = useCallback(
    debounce((val: string) => {
      setDebouncedSearch(val);
      updateUrl(filters, sortBy, val);
    }, 300),
    [filters, sortBy]
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  }

  // ── Mobile drawer helpers ────────────────────────────────────
  function openMobileFilters() {
    setPendingFilters({ ...filters });
    setPendingBloccoColore(bloccoColoreFilter);
    setShowMobileFilters(true);
  }

  function setPendingFilter(key: keyof Filters, value: string | null) {
    setPendingFilters(prev => {
      const withNew = { ...prev, [key]: value };
      return clearInvalidFilters(branchProducts, withNew, key);
    });
  }

  function applyMobileFilters() {
    setFilters(pendingFilters);
    setBloccoColoreFilter(pendingBloccoColore);
    updateUrl(pendingFilters, sortBy, search, pendingBloccoColore);
    setShowMobileFilters(false);
  }

  function resetMobileFilters() {
    setPendingFilters(EMPTY_FILTERS);
    setPendingBloccoColore(null);
    setFilters(EMPTY_FILTERS);
    setBloccoColoreFilter(null);
    updateUrl(EMPTY_FILTERS, sortBy, search, null);
    setShowMobileFilters(false);
  }

  const hasActiveFilters = bloccoColoreFilter !== null || Object.entries(filters).some(
    ([k, v]) => v && !(lockedCollezione && k === 'collezione')
  );
  const activeFilterCount  = (bloccoColoreFilter ? 1 : 0) + Object.values(filters).filter(Boolean).length;
  const pendingFilterCount = (pendingBloccoColore ? 1 : 0) + Object.values(pendingFilters).filter(Boolean).length;

  // ── Products ─────────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', lockedFamiglia ?? null, lockedFamiglie ?? null, lockedCollezione ?? null, lockedGruppoMerceologico ?? null, excludeGruppoMerceologico ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ active: 'true', limit: '2000' });
      if (lockedFamiglie && lockedFamiglie.length > 0) {
        params.set('famiglie', lockedFamiglie.join(','));
      } else if (lockedFamiglia) {
        params.set('famiglia', lockedFamiglia);
      }
      if (lockedCollezione) params.set('collezione', lockedCollezione);
      if (lockedGruppoMerceologico) params.set('gruppoMerceologico', lockedGruppoMerceologico);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return (await res.json()).data as Product[];
    },
  });

  // ── Admin catalog settings (enabled filters) ─────────────────
  const { data: catalogSettingsData } = useQuery({
    queryKey: ['catalog-settings'],
    queryFn: () => fetch('/api/admin/catalog-settings').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const enabledFilters: string[] | null = catalogSettingsData?.filtriVisibili ?? null;

  const { data: docsData } = useQuery({
    queryKey: ['public-documents'],
    queryFn: () => fetch('/api/documents').then((r) => r.json()),
    staleTime: 60_000,
  });
  const publicDocs: { tipo: string; url: string; nome: string }[] = docsData?.data ?? [];
  const catalogoDoc = publicDocs.find((d) => d.tipo === 'Catalogo PDF');

  const products = productsData ?? [];

  // Base list scoped to the branch — used for filter option computation AND product display
  const branchProducts = useMemo(() => {
    let base = products;
    if (lockedGruppoMerceologico) {
      base = base.filter((p) => p.gruppoMerceologico?.toLowerCase() === lockedGruppoMerceologico.toLowerCase());
    }
    if (excludeGruppoMerceologico) {
      base = base.filter((p) => p.gruppoMerceologico?.toLowerCase() !== excludeGruppoMerceologico.toLowerCase());
    }
    if (lockedFamiglie && lockedFamiglie.length > 0) {
      const lower = lockedFamiglie.map((f) => f.toLowerCase());
      base = base.filter((p) => lower.includes(p.famiglia?.toLowerCase() ?? ''));
    } else if (lockedFamiglia) {
      base = base.filter((p) => p.famiglia?.toLowerCase() === lockedFamiglia.toLowerCase());
    }
    if (excludeCollezioni && excludeCollezioni.length > 0) {
      const excl = excludeCollezioni.map((c) => c.toUpperCase());
      base = base.filter((p) => !excl.includes((p.collezione ?? '').toUpperCase()));
    }
    return base;
  }, [products, lockedGruppoMerceologico, excludeGruppoMerceologico, lockedFamiglie, lockedFamiglia, excludeCollezioni]);

  const filteredProducts = useMemo(() => {
    let result = branchProducts;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.famiglia && p.famiglia.toLowerCase().includes(q)) ||
          (p.sottofamiglia && p.sottofamiglia.toLowerCase().includes(q)) ||
          (p.nomLinea && p.nomLinea.toLowerCase().includes(q)) ||
          (p.produttore && p.produttore.toLowerCase().includes(q))
      );
    }

    const { gruppoMerceologico, famiglia, classe, sottoclasse, gruppoOmogeneo, nomLinea, materiale, colore, temaColore, stagione, collezione, produttore, tranche, conferente, fantasia, lavorazione, nomeStampa } = filters;
    if (gruppoMerceologico) result = result.filter((p) => p.gruppoMerceologico === gruppoMerceologico);
    if (famiglia)           result = result.filter((p) => p.famiglia           === famiglia);
    if (classe)             result = result.filter((p) => p.classe === classe || (p as any).classe2 === classe);
    if (sottoclasse)        result = result.filter((p) => p.sottoclasse === sottoclasse || (p as any).sottoclasse2 === sottoclasse);
    if (gruppoOmogeneo)     result = result.filter((p) => p.gruppoOmogeneo === gruppoOmogeneo || (p as any).gruppoOmogeneo2 === gruppoOmogeneo);
    if (nomLinea)           result = result.filter((p) => p.nomLinea           === nomLinea);
    if (materiale)          result = result.filter((p) => [p.materiale1, p.materiale2, p.materiale3].includes(materiale));
    if (colore)             result = result.filter((p) => [p.colore, p.colore2, p.colore3].some(v => v && v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() === colore));
    if (temaColore)         result = result.filter((p) => [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].includes(temaColore));
    if (stagione)           result = result.filter((p) => p.stagione           === stagione);
    if (collezione)         result = result.filter((p) => p.collezione?.toLowerCase() === collezione.toLowerCase());
    if (produttore)         result = result.filter((p) => p.produttore         === produttore);
    if (tranche)            result = result.filter((p) => p.tranche            === tranche);
    if (conferente)         result = result.filter((p) => (p as any).conferente === conferente);
    if (fantasia)           result = result.filter((p) => (p as any).fantasia   === fantasia);
    if (lavorazione)        result = result.filter((p) => (p as any).lavorazione === lavorazione);
    if (nomeStampa)         result = result.filter((p) => (p as any).nomeStampa  === nomeStampa);
    if (bloccoColoreFilter) result = result.filter((p) => (p.colorBlockIds ?? []).includes(bloccoColoreFilter.id));
    if (onlyFavorites)      result = result.filter((p) => favoriteIds.has(p.id));
    if (sortBy === 'novita')       result = result.filter((p) => isModa ? !p.isContinuativo : p.collezione === 'CA27');
    if (sortBy === 'continuativi') result = result.filter((p) => isModa ? p.isContinuativo  : p.collezione !== 'CA27');

    if (sortBy === 'az')        result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    else if (sortBy === 'za')   result = [...result].sort((a, b) => b.name.localeCompare(a.name, 'it'));
    else if (sortBy === 'price-asc')  result = [...result].sort((a, b) => {
      const price = (p: typeof a) => readOnly ? Number(p.retailPrice) : (Number((p as any).costoIeConReso) > 0 ? Number((p as any).costoIeConReso) : Number((p as any).costoIeSenzaReso) > 0 ? Number((p as any).costoIeSenzaReso) : Number(p.costPrice));
      return price(a) - price(b);
    });
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => {
      const price = (p: typeof a) => readOnly ? Number(p.retailPrice) : (Number((p as any).costoIeConReso) > 0 ? Number((p as any).costoIeConReso) : Number((p as any).costoIeSenzaReso) > 0 ? Number((p as any).costoIeSenzaReso) : Number(p.costPrice));
      return price(b) - price(a);
    });

    return result;
  }, [branchProducts, debouncedSearch, filters, bloccoColoreFilter, onlyFavorites, favoriteIds, sortBy]);

  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedSearch, filters, onlyFavorites, sortBy]);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  function makeFilterProps(
    currentFilters: Filters,
    onFilterChange: (key: keyof Filters, value: string | null) => void,
    currentBloccoColore: { id: number; name: string } | null,
    onBloccoColoreChange: (v: { id: number; name: string } | null) => void,
  ) {
    return {
      products: branchProducts,
      selectedGruppoMerceologico: currentFilters.gruppoMerceologico, onGruppoMerceologicoChange: (v: string | null) => onFilterChange('gruppoMerceologico', v),
      selectedFamiglia:           currentFilters.famiglia,           onFamigliaChange:           (v: string | null) => onFilterChange('famiglia', v),
      selectedClasse:             currentFilters.classe,             onClasseChange:             (v: string | null) => onFilterChange('classe', v),
      selectedSottoclasse:        currentFilters.sottoclasse,        onSottoclasseChange:        (v: string | null) => onFilterChange('sottoclasse', v),
      selectedGruppoOmogeneo:     currentFilters.gruppoOmogeneo,     onGruppoOmogeneoChange:     (v: string | null) => onFilterChange('gruppoOmogeneo', v),
      selectedNomLinea:           currentFilters.nomLinea,           onNomLineaChange:           (v: string | null) => onFilterChange('nomLinea', v),
      selectedMateriale:          currentFilters.materiale,          onMaterialeChange:          (v: string | null) => onFilterChange('materiale', v),
      selectedColore:             currentFilters.colore,             onColoreChange:             (v: string | null) => onFilterChange('colore', v),
      selectedTemaColore:         currentFilters.temaColore,         onTemaColoreChange:         (v: string | null) => onFilterChange('temaColore', v),
      selectedStagione:           currentFilters.stagione,           onStagioneChange:           (v: string | null) => onFilterChange('stagione', v),
      selectedCollezione:         currentFilters.collezione,         onCollezioneChange:         (v: string | null) => onFilterChange('collezione', v),
      selectedProduttore:         currentFilters.produttore,         onProduttoreChange:         (v: string | null) => onFilterChange('produttore', v),
      selectedTranche:            currentFilters.tranche,            onTrancheChange:            (v: string | null) => onFilterChange('tranche', v),
      selectedConferente:         currentFilters.conferente,         onConferenteChange:         (v: string | null) => onFilterChange('conferente', v),
      selectedFantasia:           currentFilters.fantasia,           onFantasiaChange:           (v: string | null) => onFilterChange('fantasia', v),
      selectedLavorazione:        currentFilters.lavorazione,        onLavorazioneChange:        (v: string | null) => onFilterChange('lavorazione', v),
      selectedNomeStampa:         currentFilters.nomeStampa,         onNomeStampaChange:         (v: string | null) => onFilterChange('nomeStampa', v),
      selectedBloccoColore:       currentBloccoColore,               onBloccoColoreChange,
      hasActiveFilters,
      onResetAll: handleResetAll,
      enabledFilters,
      lockedCollezione,
      lockedFamiglia,
    };
  }

  const desktopFilterProps = makeFilterProps(filters, setFilter, bloccoColoreFilter, (v) => {
    setBloccoColoreFilter(v);
    updateUrl(filters, sortBy, search, v);
  });
  const pendingFilterProps = makeFilterProps(pendingFilters, setPendingFilter, pendingBloccoColore, setPendingBloccoColore);

  return (
    <div className="flex h-full">
      {/* Filters sidebar — desktop only */}
      <div className="hidden md:block h-full overflow-hidden">
        <CatalogFilters {...desktopFilterProps} />
      </div>

      {/* Mobile bottom drawer */}
      {showMobileFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl flex flex-col" style={{ maxHeight: '85dvh' }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="text-sm font-semibold text-primary">Filtri</span>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-primary">
                <X size={16} />
              </button>
            </div>
            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto">
              <CatalogFilters
                {...pendingFilterProps}
                hasActiveFilters={pendingFilterCount > 0}
                onResetAll={() => setPendingFilters(EMPTY_FILTERS)}
              />
            </div>
            {/* Action buttons — sticky bottom */}
            <div className="flex-shrink-0 border-t border-border bg-white px-4 py-3 flex gap-3">
              <button
                onClick={resetMobileFilters}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-cream transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={13} />
                Reset
              </button>
              <button
                onClick={applyMobileFilters}
                className="flex-1 py-2.5 bg-primary text-background rounded-lg text-sm font-semibold hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={13} />
                Applica{pendingFilterCount > 0 ? ` (${pendingFilterCount})` : ' filtri'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Catalog PDF download ─────────────────────────────────── */}
        {catalogoDoc && !isModa && !readOnly && (
          <div className="hidden sm:flex border-b border-border bg-cream/30 px-4 sm:px-6 py-2.5 items-center justify-end gap-3">
            <a
              href={catalogoDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
            >
              <FileDown size={13} />
              Catalogo CASA 2027
            </a>
          </div>
        )}

        {/* Top bar */}
        <div className="flex-shrink-0 z-10 bg-background border-b border-border">
          {/* Search — full width on mobile */}
          <div className="md:hidden px-4 pt-3 pb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Cerca per codice, nome, linea..."
                className="w-full pl-10 pr-10 py-2.5 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-accent transition-colors"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); updateUrl(filters, sortBy, ''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div className="px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
            {/* Mobile filter button */}
            <button
              onClick={openMobileFilters}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-border rounded px-2.5 py-2 hover:bg-cream transition-colors flex-shrink-0 relative"
            >
              <SlidersHorizontal size={13} />
              Filtra
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-2xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search — desktop only */}
            <div className="relative flex-1 max-w-sm hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Cerca per codice, nome, linea..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-border rounded focus:outline-none focus:border-accent transition-colors"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); updateUrl(filters, sortBy, ''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-border rounded px-2 py-2 bg-white text-gray-600 focus:outline-none focus:border-accent transition-colors flex-shrink-0"
            >
              <option value="" disabled>Ordina per...</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="price-asc">Prezzo crescente</option>
              <option value="price-desc">Prezzo decrescente</option>
              <option value="novita">Novità</option>
              <option value="continuativi">Continuativi</option>
            </select>

            {/* View mode toggle */}
            <ViewToggle mode={viewMode} onChange={setViewMode} />

            {/* Favorites toggle — desktop only */}
            <button
              onClick={() => setOnlyFavorites((v) => !v)}
              className={cn(
                'hidden md:flex items-center gap-1.5 text-xs font-medium border rounded px-2.5 py-2 transition-colors flex-shrink-0',
                onlyFavorites
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'text-gray-600 border-border hover:bg-cream'
              )}
            >
              <Heart size={13} className={onlyFavorites ? 'fill-red-500 text-red-500' : ''} />
              <span>{tn('favorites')}</span>
            </button>

            {/* Results count + reset */}
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-gray-400">
                {productsLoading ? 'Caricamento...' : `${filteredProducts.length} prodotti`}
              </span>
              {hasActiveFilters && (
                <button onClick={handleResetAll} className="text-xs text-accent hover:text-primary transition-colors font-medium">
                  Azzera filtri
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4">

        {/* Active filter chips — desktop */}
        {hasActiveFilters && (
          <div className="hidden md:flex flex-wrap gap-1.5 px-6 py-2 border-b border-border/50 bg-cream/30">
            {CHIP_LABELS.map(({ key, label }) =>
              filters[key] && !(lockedCollezione && key === 'collezione') && !(lockedFamiglia && key === 'famiglia') ? (
                <span key={key} className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                  <span className="text-gray-400">{label}:</span> {(key === 'colore' || key === 'temaColore') ? capitalize(filters[key]) : filters[key]}
                  <button onClick={() => setFilter(key, null)} className="text-gray-400 hover:text-primary ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ) : null
            )}
            {bloccoColoreFilter && (
              <span className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                <span className="text-gray-400">Blocco colore:</span> {bloccoColoreFilter.name}
                <button onClick={() => { setBloccoColoreFilter(null); updateUrl(filters, sortBy, search, null); }} className="text-gray-400 hover:text-primary ml-0.5">
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Collection header — hidden on sm+ where the site header already shows it */}
        <div className="sm:hidden px-4 py-4 border-b border-border/50">
          <p className="label-luxury text-accent">Collezione</p>
          <h1 className="font-display text-xl text-primary font-light tracking-wide">
            {isModa ? 'MODA PE27' : readOnly ? 'COLLEZIONE HOME' : 'CASA 2027'}
          </h1>
        </div>

        {/* Product display */}
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          {viewMode === 'grid' && (
            <ProductGrid products={visibleProducts} isLoading={productsLoading} />
          )}
          {viewMode === 'list' && (
            <ProductList products={visibleProducts} isLoading={productsLoading} />
          )}
          {viewMode === 'lookbook' && (
            <ProductLookbook products={visibleProducts} isLoading={productsLoading} />
          )}
          {hasMore && (
            <div className="flex flex-col items-center gap-1 mt-6 mb-4">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="px-6 py-2.5 text-sm font-medium border border-border rounded-lg text-gray-600 hover:bg-cream transition-colors"
              >
                Carica altri {Math.min(PAGE_SIZE, filteredProducts.length - visibleCount)} prodotti
              </button>
              <span className="text-2xs text-gray-400">{visibleCount} di {filteredProducts.length} visualizzati</span>
            </div>
          )}
        </div>

        </div>{/* end scrollable content */}
      </div>

    </div>
  );
}
