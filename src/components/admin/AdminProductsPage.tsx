'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Pencil, Trash2, Eye, Power, PowerOff, X, RotateCcw, ImagePlus, ChevronUp, ChevronDown, ChevronsUpDown, Languages, Loader2, Shirt, Home, Copy, Download, Columns2, Sparkles } from 'lucide-react';
import { CONFERENTE_OPTIONS, STAGIONE_OPTIONS, COLORE_OPTIONS, MATERIALE_OPTIONS, FANTASIA_OPTIONS, TAGLIA_OPTIONS } from '@/lib/productConstants';
import { formatCurrency, capitalize } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PaeseSelect from '@/components/ui/PaeseSelect';
import ProductImport from './ProductImport';
import BulkImageUpload from './BulkImageUpload';
import ProductForm from './ProductForm';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

type ActiveFilter = 'all' | 'active' | 'inactive';
type FotoFilter = 'all' | 'con-foto' | 'senza-foto' | 'foto-multiple';
type TemaColorePresenzaFilter = 'all' | 'con-tema' | 'senza-tema';
type PantoneSourceFilter = 'all' | 'auto' | 'manual';
type SortField = 'code' | 'name' | 'produttore' | 'collezione' | 'costPrice' | 'retailPrice' | 'createdAt';
type SortDir = 'asc' | 'desc';
type ColKey =
  | 'costPrice' | 'costoIeConReso' | 'costoIeSenzaReso' | 'retailPrice' | 'sconto' | 'ricarico' | 'iva' | 'lotSize' | 'stock'
  | 'produttore' | 'conferente' | 'paese' | 'misura' | 'stagione' | 'tranche' | 'nomLinea' | 'collezione'
  | 'gruppoMerceologico' | 'famiglia' | 'classe' | 'sottoclasse' | 'gruppoOmogeneo'
  | 'modello' | 'dettaglio' | 'forma' | 'taglia' | 'materiale1' | 'materiale2' | 'materiale3' | 'composizione' | 'fantasia' | 'lavorazione' | 'bloccoColore'
  | 'colore' | 'colore2' | 'colore3' | 'altriColori' | 'temaColore'
  | 'certificazione1' | 'certificazione2' | 'certificazione3'
  | 'foto' | 'stato';

const COL_GROUPS: { label: string; cols: { key: ColKey; label: string }[] }[] = [
  { label: 'Prezzi', cols: [
    { key: 'costPrice',        label: 'Costo i.e.'       },
    { key: 'costoIeConReso',   label: 'Con reso'         },
    { key: 'costoIeSenzaReso', label: 'Senza reso'       },
    { key: 'retailPrice',      label: 'Vendita i.i.'     },
    { key: 'sconto',           label: '% Sconto'         },
    { key: 'ricarico',         label: '% Ricarico'       },
    { key: 'iva',              label: 'IVA'              },
    { key: 'lotSize',          label: 'Confezione'       },
    { key: 'stock',            label: 'Stock'            },
  ]},
  { label: 'Anagrafica', cols: [
    { key: 'produttore',  label: 'Produttore'  },
    { key: 'conferente',  label: 'Conferente'  },
    { key: 'paese',       label: 'Paese'       },
    { key: 'misura',      label: 'Misura'      },
    { key: 'stagione',    label: 'Stagione'    },
    { key: 'tranche',     label: 'Tranche'     },
    { key: 'nomLinea',    label: 'Linea'       },
    { key: 'collezione',  label: 'Collezione'  },
  ]},
  { label: 'Classificazione', cols: [
    { key: 'gruppoMerceologico', label: 'Gruppo merc.'  },
    { key: 'famiglia',           label: 'Famiglia'      },
    { key: 'classe',             label: 'Classe'        },
    { key: 'sottoclasse',        label: 'Sottoclasse'   },
    { key: 'gruppoOmogeneo',     label: 'Gr. omogeneo'  },
  ]},
  { label: 'Dettagli', cols: [
    { key: 'modello',      label: 'Modello'      },
    { key: 'dettaglio',    label: 'Tipo'          },
    { key: 'forma',        label: 'Forma'        },
    { key: 'taglia',       label: 'Taglia'       },
    { key: 'materiale1',   label: 'Materiale 1'  },
    { key: 'materiale2',   label: 'Materiale 2'  },
    { key: 'materiale3',   label: 'Materiale 3'  },
    { key: 'composizione', label: 'Composizione' },
    { key: 'fantasia',     label: 'Fantasia'     },
    { key: 'lavorazione',  label: 'Lavorazione'  },
    { key: 'bloccoColore', label: 'Blocco colore'},
  ]},
  { label: 'Colori', cols: [
    { key: 'colore',      label: 'Colore 1'     },
    { key: 'colore2',     label: 'Colore 2'     },
    { key: 'colore3',     label: 'Colore 3'     },
    { key: 'altriColori', label: 'Altri colori' },
    { key: 'temaColore',  label: 'Tema colore'  },
  ]},
  { label: 'Certificazioni', cols: [
    { key: 'certificazione1', label: 'Certif. 1' },
    { key: 'certificazione2', label: 'Certif. 2' },
    { key: 'certificazione3', label: 'Certif. 3' },
  ]},
  { label: 'Stato', cols: [
    { key: 'foto',  label: 'Foto'  },
    { key: 'stato', label: 'Stato' },
  ]},
];

const ALL_COLS = COL_GROUPS.flatMap((g) => g.cols);
const DEFAULT_COLS: ColKey[] = ['produttore', 'collezione', 'costPrice', 'retailPrice', 'sconto', 'ricarico', 'foto', 'stato'];

function loadSavedCols(): Set<ColKey> {
  try {
    const raw = localStorage.getItem('admin-products-cols-v2');
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch {}
  return new Set(DEFAULT_COLS);
}

interface BulkEditValues {
  // Anagrafica
  description: string;
  produttore: string;
  conferente: string;
  misura: string;
  paese: string;
  stock: string;
  // Classificazione
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  sottoclasse: string;
  gruppoOmogeneo: string;
  nomLinea: string;
  stagione: string;
  collezione: string;
  tranche: string;
  dettaglio: string;
  forma: string;
  taglia: string;
  // Colori
  colore: string;
  colore2: string;
  colore3: string;
  altriColori: string;
  bloccoColore: string;
  temaColore: string;
  temaColore2: string;
  temaColore3: string;
  temaColore4: string;
  temaColore5: string;
  temaColoreBulkMode: 'sostituisci' | 'aggiungi';
  // Materiali
  materiale1: string;
  materiale1Bio: '' | 'true' | 'false';
  materiale2: string;
  materiale2Bio: '' | 'true' | 'false';
  materiale3: string;
  materiale3Bio: '' | 'true' | 'false';
  composizione: string;
  fantasia: string;
  lavorazione: string;
  materialeBottoni: string;
  nomeStampa: string;
  // Certificazioni
  certificazione1: string;
  certificazione2: string;
  certificazione3: string;
  // Prezzi e logistica
  lotSize: string;
  iva: string;
  costPrice: string;
  retailPrice: string;
  costoIeConReso: string;
  costoIeSenzaReso: string;
  fasciaRicarico: string;
  fasciaSconto: string;
  // Altri
  notes: string;
  isActive: '' | 'true' | 'false';
}

const EMPTY_BULK: BulkEditValues = {
  description: '', produttore: '', conferente: '', misura: '', paese: '', stock: '',
  gruppoMerceologico: '', famiglia: '', classe: '', sottoclasse: '', gruppoOmogeneo: '',
  nomLinea: '', stagione: '', collezione: '', tranche: '', dettaglio: '', forma: '', taglia: '',
  colore: '', colore2: '', colore3: '', altriColori: '', bloccoColore: '',
  temaColore: '', temaColore2: '', temaColore3: '', temaColore4: '', temaColore5: '', temaColoreBulkMode: 'sostituisci',
  materiale1: '', materiale1Bio: '', materiale2: '', materiale2Bio: '', materiale3: '', materiale3Bio: '',
  composizione: '', fantasia: '', lavorazione: '', materialeBottoni: '', nomeStampa: '',
  certificazione1: '', certificazione2: '', certificazione3: '',
  lotSize: '', iva: '', costPrice: '', retailPrice: '', costoIeConReso: '', costoIeSenzaReso: '',
  fasciaRicarico: '', fasciaSconto: '',
  notes: '', isActive: '',
};

const _BLBL = 'block text-xs font-medium text-gray-600 mb-1';
const _BSEL = 'h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';

function BulkMaterialRow({ label, value, bioValue, onChangeValue, onChangeBio }: {
  label: string; value: string; bioValue: string;
  onChangeValue: (v: string) => void; onChangeBio: (v: string) => void;
}) {
  const parseMat = (v: string) => {
    const m = (v || '').match(/^(\d+(?:\.\d+)?)\s*%\s+(.+)$/);
    const raw = m ? m[2] : (v || '');
    const canon = (MATERIALE_OPTIONS as readonly string[]).find((o) => o.toLowerCase() === raw.toLowerCase()) ?? '';
    return { pct: m ? m[1] : '', mat: canon };
  };
  const init = parseMat(value);
  const [pct, setPct] = useState(init.pct);
  const [mat, setMat] = useState(init.mat);

  function emit(p: string, m: string) {
    if (!m) { onChangeValue(''); return; }
    onChangeValue(p.trim() ? `${p.trim()}% ${m}` : m);
  }

  return (
    <div className="grid grid-cols-[1fr_120px] gap-2 items-end">
      <div>
        <label className={_BLBL}>{label}</label>
        <div className="flex gap-1.5">
          <div className="relative w-[72px] flex-shrink-0">
            <input
              type="number" min="0" max="100" step="1"
              value={pct}
              onChange={(e) => { setPct(e.target.value); emit(e.target.value, mat); }}
              placeholder="—"
              className="w-full h-9 border border-border rounded pl-2 pr-5 text-sm focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300"
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">%</span>
          </div>
          <select value={mat} onChange={(e) => { setMat(e.target.value); emit(pct, e.target.value); }} className={`flex-1 ${_BSEL}`}>
            <option value="">— non modificare —</option>
            {MATERIALE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={_BLBL}>Bio</label>
        <select value={bioValue} onChange={(e) => onChangeBio(e.target.value)} className={`w-full ${_BSEL}`}>
          <option value="">—</option>
          <option value="true">Sì</option>
          <option value="false">No</option>
        </select>
      </div>
    </div>
  );
}

function uniqueSorted(products: Product[], key: keyof Product): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const v = p[key];
    if (v && typeof v === 'string') set.add(v);
  }
  return Array.from(set).sort();
}

function computeCommonBulkValues(products: Product[]): BulkEditValues {
  if (products.length === 0) return EMPTY_BULK;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps = products as any[];

  function cStr(key: string): string {
    const vals = ps.map((p) => (p[key] as string | null | undefined) ?? '');
    return vals.every((v) => v === vals[0]) ? (vals[0] || '') : '';
  }

  function cNum(key: string): string {
    const vals = ps.map((p) => p[key] as number | null | undefined);
    if (!vals.every((v) => v === vals[0])) return '';
    return vals[0] != null && vals[0] !== 0 ? String(vals[0]) : '';
  }

  function cBool(key: string): '' | 'true' | 'false' {
    const vals = ps.map((p) => !!(p[key] as boolean));
    if (!vals.every((v) => v === vals[0])) return '';
    // Only pre-fill 'true'; leave '' for false so the field is not sent to API unless user explicitly sets it
    return vals[0] ? 'true' : '';
  }

  return {
    description: cStr('description'),
    produttore: cStr('produttore'),
    conferente: cStr('conferente'),
    misura: cStr('misura'),
    paese: cStr('paese'),
    stock: '',
    gruppoMerceologico: cStr('gruppoMerceologico'),
    famiglia: cStr('famiglia'),
    classe: cStr('classe'),
    sottoclasse: cStr('sottoclasse'),
    gruppoOmogeneo: cStr('gruppoOmogeneo'),
    nomLinea: cStr('nomLinea'),
    stagione: cStr('stagione'),
    collezione: cStr('collezione'),
    tranche: cStr('tranche'),
    dettaglio: cStr('dettaglio'),
    forma: cStr('forma'),
    taglia: cStr('taglia'),
    colore: cStr('colore'),
    colore2: cStr('colore2'),
    colore3: cStr('colore3'),
    altriColori: cStr('altriColori'),
    bloccoColore: cStr('bloccoColore'),
    temaColore: cStr('temaColore'),
    temaColore2: cStr('temaColore2'),
    temaColore3: cStr('temaColore3'),
    temaColore4: cStr('temaColore4'),
    temaColore5: cStr('temaColore5'),
    temaColoreBulkMode: 'sostituisci',
    materiale1: cStr('materiale1'),
    materiale1Bio: cBool('materiale1Bio'),
    materiale2: cStr('materiale2'),
    materiale2Bio: cBool('materiale2Bio'),
    materiale3: cStr('materiale3'),
    materiale3Bio: cBool('materiale3Bio'),
    composizione: cStr('composizione'),
    fantasia: cStr('fantasia'),
    lavorazione: cStr('lavorazione'),
    materialeBottoni: cStr('materialeBottoni'),
    nomeStampa: cStr('nomeStampa'),
    certificazione1: cStr('certificazione1'),
    certificazione2: cStr('certificazione2'),
    certificazione3: cStr('certificazione3'),
    lotSize: cNum('lotSize'),
    iva: cNum('iva'),
    costPrice: cNum('costPrice'),
    retailPrice: cNum('retailPrice'),
    costoIeConReso: cNum('costoIeConReso'),
    costoIeSenzaReso: cNum('costoIeSenzaReso'),
    fasciaRicarico: cStr('fasciaRicarico'),
    fasciaSconto: (() => { const vals = ps.map((p) => p.fasciaSconto as number | null); if (!vals.every((v: number | null) => v === vals[0])) return ''; return vals[0] != null ? String(vals[0]) : ''; })(),
    notes: cStr('notes'),
    isActive: cBool('isActive'),
  };
}

export default function AdminProductsPage({ lockedSection }: { lockedSection?: 'moda' | 'casa' }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkImages, setShowBulkImages] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [createCollectionHint, setCreateCollectionHint] = useState<'moda' | 'casa' | null>(null);
  const [duplicatingProduct, setDuplicatingProduct] = useState<Product | null>(null);
  const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null);

  // Filters
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [filterGruppo, setFilterGruppo] = useState('');
  const [filterFamiglia, setFilterFamiglia] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSottoclasse, setFilterSottoclasse] = useState('');
  const [filterGruppoOmogeneo, setFilterGruppoOmogeneo] = useState('');
  const [filterColore, setFilterColore] = useState('');
  const [filterTemaColore, setFilterTemaColore] = useState('');
  const [filterCollezione, setFilterCollezione] = useState('');
  const [filterLinea, setFilterLinea] = useState('');
  const [filterProduttore, setFilterProduttore] = useState('');
  const [filterTranche, setFilterTranche] = useState('');
  const [filterStagione, setFilterStagione] = useState('');
  const [filterActive, setFilterActive] = useState<ActiveFilter>('all');
  const [filterFoto, setFilterFoto] = useState<FotoFilter>('all');
  const [filterTemaColorePresenza, setFilterTemaColorePresenza] = useState<TemaColorePresenzaFilter>('all');
  const [filterFasciaSconto, setFilterFasciaSconto] = useState('');
  const [filterFasciaRicarico, setFilterFasciaRicarico] = useState('');
  const [filterPrezzoCosto, setFilterPrezzoCosto] = useState('');
  // Advanced filters
  const [filterPaese, setFilterPaese] = useState('');
  const [filterConferente, setFilterConferente] = useState('');
  const [filterModello, setFilterModello] = useState('');
  const [filterDettaglio, setFilterDettaglio] = useState('');
  const [filterForma, setFilterForma] = useState('');
  const [filterTaglia, setFilterTaglia] = useState('');
  const [filterMisura, setFilterMisura] = useState('');
  const [filterColore2, setFilterColore2] = useState('');
  const [filterColore3, setFilterColore3] = useState('');
  const [filterMateriale1, setFilterMateriale1] = useState('');
  const [filterMateriale2, setFilterMateriale2] = useState('');
  const [filterMateriale3, setFilterMateriale3] = useState('');
  const [filterComposizione, setFilterComposizione] = useState('');
  const [filterFantasia, setFilterFantasia] = useState('');
  const [filterLavorazione, setFilterLavorazione] = useState('');
  const [filterBloccoColore, setFilterBloccoColore] = useState('');
  const [filterIva, setFilterIva] = useState('');
  const [filterCostoConFascia, setFilterCostoConFascia] = useState('');
  const [filterCostoSenzaFascia, setFilterCostoSenzaFascia] = useState('');
  const [filterRetailFascia, setFilterRetailFascia] = useState('');
  const [filterPantoneSource, setFilterPantoneSource] = useState<PantoneSourceFilter>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Column picker
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => loadSavedCols());
  const [showColPicker, setShowColPicker] = useState(false);

  function toggleCol(k: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      try { localStorage.setItem('admin-products-cols-v2', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  // CSV export
  const [showExportMenu, setShowExportMenu] = useState(false);

  // MODA Excel import
  const [showModaImport, setShowModaImport] = useState(false);
  const [isModaExporting, setIsModaExporting] = useState(false);
  const [isModaImporting, setIsModaImporting] = useState(false);
  const [modaImportResult, setModaImportResult] = useState<{ created: number; updated: number; errors: { row: number; code: string; error: string }[] } | null>(null);
  const [isDeriving, setIsDeriving] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<BulkEditValues>(EMPTY_BULK);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=9999');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const allProducts: Product[] = data?.data || [];

  const gruppoOptions = useMemo(() => uniqueSorted(allProducts, 'gruppoMerceologico'), [allProducts]);
  const famigliaOptions = useMemo(() => uniqueSorted(allProducts, 'famiglia'), [allProducts]);
  const classeOptions = useMemo(() => uniqueSorted(allProducts, 'classe'), [allProducts]);
  const sottoclasseOptions = useMemo(() => uniqueSorted(allProducts, 'sottoclasse'), [allProducts]);
  const gruppoOmogeneoOptions = useMemo(() => uniqueSorted(allProducts, 'gruppoOmogeneo'), [allProducts]);
  const coloreOptions = useMemo(() => uniqueSorted(allProducts, 'colore').filter(v => !v.includes('/')), [allProducts]);
  const temaColoreOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) {
      [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].forEach((v) => { if (v) set.add(v); });
    }
    return Array.from(set).sort();
  }, [allProducts]);
  const collezioneOptions = useMemo(() => uniqueSorted(allProducts, 'collezione'), [allProducts]);
  const lineaOptions = useMemo(() => uniqueSorted(allProducts, 'nomLinea'), [allProducts]);
  const produttoreOptions = useMemo(() => uniqueSorted(allProducts, 'produttore'), [allProducts]);
  const trancheOptions = useMemo(() => uniqueSorted(allProducts, 'tranche'), [allProducts]);
  const stagioneOptions = useMemo(() => uniqueSorted(allProducts, 'stagione'), [allProducts]);
  const paeseOptions = useMemo(() => uniqueSorted(allProducts, 'paese' as any), [allProducts]);
  const conferenteOptions = useMemo(() => uniqueSorted(allProducts, 'conferente' as any), [allProducts]);
  const modelloOptions = useMemo(() => uniqueSorted(allProducts, 'modello' as any), [allProducts]);
  const dettaglioOptions = useMemo(() => uniqueSorted(allProducts, 'dettaglio' as any), [allProducts]);
  const formaOptions = useMemo(() => uniqueSorted(allProducts, 'forma' as any), [allProducts]);
  const tagliaOptions = useMemo(() => uniqueSorted(allProducts, 'taglia' as any), [allProducts]);
  const misuraOptions = useMemo(() => uniqueSorted(allProducts, 'misura' as any), [allProducts]);
  const colore2Options = useMemo(() => uniqueSorted(allProducts, 'colore2' as any).filter((v: string) => !v.includes('/')), [allProducts]);
  const colore3Options = useMemo(() => uniqueSorted(allProducts, 'colore3' as any).filter((v: string) => !v.includes('/')), [allProducts]);
  const materiale1Options = useMemo(() => uniqueSorted(allProducts, 'materiale1' as any).filter((v: string) => !v.includes('/')), [allProducts]);
  const materiale2Options = useMemo(() => uniqueSorted(allProducts, 'materiale2' as any).filter((v: string) => !v.includes('/')), [allProducts]);
  const materiale3Options = useMemo(() => uniqueSorted(allProducts, 'materiale3' as any).filter((v: string) => !v.includes('/')), [allProducts]);
  const composizioneOptions = useMemo(() => uniqueSorted(allProducts, 'composizione' as any), [allProducts]);
  const fantasiaOptions = useMemo(() => uniqueSorted(allProducts, 'fantasia' as any), [allProducts]);
  const lavorazioneOptions = useMemo(() => uniqueSorted(allProducts, 'lavorazione' as any), [allProducts]);
  const bloccoColoreOptions = useMemo(() => uniqueSorted(allProducts, 'bloccoColore' as any), [allProducts]);
  const ivaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) { if (p.iva != null) set.add(String(p.iva)); }
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [allProducts]);

  function hasTemaColore(p: Product): boolean {
    return !!(p.temaColore || p.temaColore2 || p.temaColore3 || p.temaColore4 || p.temaColore5);
  }

  function computeSconto(p: Product): number {
    const fs = Number((p as any).fasciaSconto);
    if (fs > 0) return fs;
    const iva = (p.iva ?? 22);
    const pvn = Number(p.retailPrice) / (1 + iva / 100);
    return pvn > 0 ? (1 - Number(p.costPrice) / pvn) * 100 : 0;
  }

  function computeRicarico(p: Product): number {
    const iva = (p.iva ?? 22);
    const pvn = Number(p.retailPrice) / (1 + iva / 100);
    const cost = Number(p.costPrice);
    return cost > 0 ? ((pvn - cost) / cost) * 100 : 0;
  }

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = allProducts.filter((p) => {
      if (lockedSection === 'moda' && p.gruppoMerceologico?.toLowerCase() !== 'moda') return false;
      if (lockedSection === 'casa' && p.gruppoMerceologico?.toLowerCase() === 'moda') return false;
      if (q) {
        const match =
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.produttore?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      if (filterGruppo && p.gruppoMerceologico !== filterGruppo) return false;
      if (filterFamiglia && p.famiglia !== filterFamiglia) return false;
      if (filterClasse && p.classe !== filterClasse) return false;
      if (filterSottoclasse && p.sottoclasse !== filterSottoclasse) return false;
      if (filterGruppoOmogeneo && p.gruppoOmogeneo !== filterGruppoOmogeneo) return false;
      if (filterColore && p.colore !== filterColore) return false;
      if (filterTemaColore && ![p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].includes(filterTemaColore)) return false;
      if (filterCollezione) {
        if (filterCollezione === '__empty__') { if (p.collezione) return false; }
        else if (p.collezione !== filterCollezione) return false;
      }
      if (filterLinea && p.nomLinea !== filterLinea) return false;
      if (filterProduttore && p.produttore !== filterProduttore) return false;
      if (filterTranche && p.tranche !== filterTranche) return false;
      if (filterStagione && p.stagione !== filterStagione) return false;
      if (filterActive === 'active' && !p.isActive) return false;
      if (filterActive === 'inactive' && p.isActive) return false;
      const hasAnyFoto = !!(p.imageUrl || p.imageUrl2 || p.imageUrl3 || p.imageUrl4 || p.imageUrl5);
      if (filterFoto === 'con-foto' && !hasAnyFoto) return false;
      if (filterFoto === 'senza-foto' && hasAnyFoto) return false;
      const fotoCount = [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4, p.imageUrl5].filter(Boolean).length;
      if (filterFoto === 'foto-multiple' && fotoCount < 2) return false;
      if (filterFasciaSconto) {
        const sc = computeSconto(p);
        if (filterFasciaSconto === '0-30' && sc >= 30) return false;
        if (filterFasciaSconto === '30-40' && (sc < 30 || sc >= 40)) return false;
        if (filterFasciaSconto === '40-50' && (sc < 40 || sc >= 50)) return false;
        if (filterFasciaSconto === '50-60' && (sc < 50 || sc >= 60)) return false;
        if (filterFasciaSconto === '60+' && sc < 60) return false;
      }
      if (filterFasciaRicarico) {
        const ric = computeRicarico(p);
        if (filterFasciaRicarico === '0-50' && ric >= 50) return false;
        if (filterFasciaRicarico === '50-100' && (ric < 50 || ric >= 100)) return false;
        if (filterFasciaRicarico === '100-150' && (ric < 100 || ric >= 150)) return false;
        if (filterFasciaRicarico === '150+' && ric < 150) return false;
      }
      if (filterPrezzoCosto) {
        const cost = Number(p.costPrice);
        if (filterPrezzoCosto === '0-5' && cost >= 5) return false;
        if (filterPrezzoCosto === '5-10' && (cost < 5 || cost >= 10)) return false;
        if (filterPrezzoCosto === '10-20' && (cost < 10 || cost >= 20)) return false;
        if (filterPrezzoCosto === '20-50' && (cost < 20 || cost >= 50)) return false;
        if (filterPrezzoCosto === '50+' && cost < 50) return false;
      }
      if (filterTemaColorePresenza === 'con-tema' && !hasTemaColore(p)) return false;
      if (filterTemaColorePresenza === 'senza-tema' && hasTemaColore(p)) return false;
      // Advanced filters
      const pa = p as any;
      if (filterPaese && pa.paese !== filterPaese) return false;
      if (filterConferente && pa.conferente !== filterConferente) return false;
      if (filterModello && pa.modello !== filterModello) return false;
      if (filterDettaglio && pa.dettaglio !== filterDettaglio) return false;
      if (filterForma && pa.forma !== filterForma) return false;
      if (filterTaglia && pa.taglia !== filterTaglia) return false;
      if (filterMisura && pa.misura !== filterMisura) return false;
      if (filterColore2 && pa.colore2 !== filterColore2) return false;
      if (filterColore3 && pa.colore3 !== filterColore3) return false;
      if (filterMateriale1 && pa.materiale1 !== filterMateriale1) return false;
      if (filterMateriale2 && pa.materiale2 !== filterMateriale2) return false;
      if (filterMateriale3 && pa.materiale3 !== filterMateriale3) return false;
      if (filterComposizione && pa.composizione !== filterComposizione) return false;
      if (filterFantasia && pa.fantasia !== filterFantasia) return false;
      if (filterLavorazione && pa.lavorazione !== filterLavorazione) return false;
      if (filterBloccoColore && pa.bloccoColore !== filterBloccoColore) return false;
      if (filterIva && String(p.iva ?? 22) !== filterIva) return false;
      if (filterPantoneSource === 'auto' && !p.pantoneColors.some((pc) => pc.isAutoFilled)) return false;
      if (filterPantoneSource === 'manual' && p.pantoneColors.some((pc) => pc.isAutoFilled)) return false;
      if (filterCostoConFascia) {
        const v = Number(pa.costoIeConReso ?? 0);
        if (filterCostoConFascia === '0-5' && v >= 5) return false;
        if (filterCostoConFascia === '5-10' && (v < 5 || v >= 10)) return false;
        if (filterCostoConFascia === '10-20' && (v < 10 || v >= 20)) return false;
        if (filterCostoConFascia === '20-50' && (v < 20 || v >= 50)) return false;
        if (filterCostoConFascia === '50+' && v < 50) return false;
      }
      if (filterCostoSenzaFascia) {
        const v = Number(pa.costoIeSenzaReso ?? 0);
        if (filterCostoSenzaFascia === '0-5' && v >= 5) return false;
        if (filterCostoSenzaFascia === '5-10' && (v < 5 || v >= 10)) return false;
        if (filterCostoSenzaFascia === '10-20' && (v < 10 || v >= 20)) return false;
        if (filterCostoSenzaFascia === '20-50' && (v < 20 || v >= 50)) return false;
        if (filterCostoSenzaFascia === '50+' && v < 50) return false;
      }
      if (filterRetailFascia) {
        const v = Number(p.retailPrice);
        if (filterRetailFascia === '0-20' && v >= 20) return false;
        if (filterRetailFascia === '20-50' && (v < 20 || v >= 50)) return false;
        if (filterRetailFascia === '50-100' && (v < 50 || v >= 100)) return false;
        if (filterRetailFascia === '100-200' && (v < 100 || v >= 200)) return false;
        if (filterRetailFascia === '200+' && v < 200) return false;
      }
      return true;
    });

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'createdAt') {
          const aT = new Date(a.createdAt).getTime();
          const bT = new Date(b.createdAt).getTime();
          return sortDir === 'asc' ? aT - bT : bT - aT;
        }
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal, 'it', { sensitivity: 'base' })
            : bVal.localeCompare(aVal, 'it', { sensitivity: 'base' });
        }
        return sortDir === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
      });
    }

    return filtered;
  }, [allProducts, search, filterGruppo, filterFamiglia, filterClasse, filterSottoclasse, filterGruppoOmogeneo, filterColore, filterTemaColore, filterCollezione, filterLinea, filterProduttore, filterTranche, filterStagione, filterActive, filterFoto, filterFasciaSconto, filterFasciaRicarico, filterPrezzoCosto, filterTemaColorePresenza, filterPaese, filterConferente, filterModello, filterDettaglio, filterForma, filterTaglia, filterMisura, filterColore2, filterColore3, filterMateriale1, filterMateriale2, filterMateriale3, filterComposizione, filterFantasia, filterLavorazione, filterBloccoColore, filterIva, filterCostoConFascia, filterCostoSenzaFascia, filterRetailFascia, filterPantoneSource, sortField, sortDir]);

  function handleColumnSort(field: SortField) {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={11} className="ml-1 text-gray-300 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="ml-1 text-accent inline" />
      : <ChevronDown size={11} className="ml-1 text-accent inline" />;
  }

  const hasFilters = !!(search || filterGruppo || filterFamiglia || filterClasse || filterSottoclasse || filterGruppoOmogeneo || filterColore || filterTemaColore || filterCollezione || filterLinea || filterProduttore || filterTranche || filterStagione || filterActive !== 'all' || filterFoto !== 'all' || filterFasciaSconto || filterFasciaRicarico || filterPrezzoCosto || filterTemaColorePresenza !== 'all' || filterPaese || filterConferente || filterModello || filterDettaglio || filterForma || filterTaglia || filterMisura || filterColore2 || filterColore3 || filterMateriale1 || filterMateriale2 || filterMateriale3 || filterComposizione || filterFantasia || filterLavorazione || filterBloccoColore || filterIva || filterCostoConFascia || filterCostoSenzaFascia || filterRetailFascia || filterPantoneSource !== 'all' || sortField === 'createdAt');
  const hasAdvancedFilters = !!(filterPaese || filterConferente || filterModello || filterDettaglio || filterForma || filterTaglia || filterMisura || filterColore2 || filterColore3 || filterMateriale1 || filterMateriale2 || filterMateriale3 || filterComposizione || filterFantasia || filterLavorazione || filterBloccoColore || filterIva || filterCostoConFascia || filterCostoSenzaFascia || filterRetailFascia || filterPantoneSource !== 'all');

  function resetFilters() {
    setSearch(''); setFilterGruppo(''); setFilterFamiglia('');
    setFilterClasse(''); setFilterSottoclasse(''); setFilterGruppoOmogeneo('');
    setFilterColore(''); setFilterTemaColore(''); setFilterCollezione(''); setFilterLinea('');
    setFilterProduttore(''); setFilterTranche(''); setFilterStagione('');
    setFilterActive('all'); setFilterFoto('all'); setFilterTemaColorePresenza('all');
    setFilterFasciaSconto(''); setFilterFasciaRicarico(''); setFilterPrezzoCosto('');
    setFilterPaese(''); setFilterConferente(''); setFilterModello(''); setFilterDettaglio('');
    setFilterForma(''); setFilterTaglia(''); setFilterMisura('');
    setFilterColore2(''); setFilterColore3('');
    setFilterMateriale1(''); setFilterMateriale2(''); setFilterMateriale3('');
    setFilterComposizione(''); setFilterFantasia(''); setFilterLavorazione(''); setFilterBloccoColore('');
    setFilterIva(''); setFilterCostoConFascia(''); setFilterCostoSenzaFascia(''); setFilterRetailFascia('');
    setFilterPantoneSource('all');
    if (sortField === 'createdAt') { setSortField(null); setSortDir('asc'); }
  }

  const allVisibleSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`Prodotto ${product.isActive ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Impossibile aggiornare il prodotto');
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Eliminare ${product.name}? Questa azione non può essere annullata.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Impossibile eliminare il prodotto');
      }
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Prodotto eliminato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile eliminare il prodotto');
    }
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Impossibile eliminare i prodotti');
      }
      const { deleted } = await res.json();
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${deleted} prodott${deleted === 1 ? 'o eliminato' : 'i eliminati'}`);
    } catch (err: any) {
      toast.error(err.message || 'Impossibile eliminare i prodotti');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function setBulk(k: keyof BulkEditValues, v: string) {
    setBulkEditValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleBulkUpdate() {
    const b = bulkEditValues;
    const payload: Record<string, unknown> = {};

    const strKeys: (keyof BulkEditValues)[] = [
      'description', 'produttore', 'conferente', 'misura', 'paese',
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
      'nomLinea', 'stagione', 'collezione', 'tranche', 'dettaglio', 'forma', 'taglia',
      'colore', 'colore2', 'colore3', 'altriColori', 'bloccoColore',
      'materiale1', 'materiale2', 'materiale3', 'composizione', 'fantasia', 'lavorazione',
      'materialeBottoni', 'nomeStampa',
      'certificazione1', 'certificazione2', 'certificazione3',
      'fasciaRicarico', 'notes',
    ];
    for (const k of strKeys) {
      const v = b[k] as string;
      if (v.trim()) payload[k] = v.trim();
    }

    // temaColore — modalità Sostituisci o Aggiungi
    if (b.temaColoreBulkMode === 'sostituisci' && b.temaColore.trim()) {
      payload.temaColore = b.temaColore.trim();
      payload.temaColore2 = b.temaColore2.trim() || null;
      payload.temaColore3 = b.temaColore3.trim() || null;
      payload.temaColore4 = b.temaColore4.trim() || null;
      payload.temaColore5 = b.temaColore5.trim() || null;
    }
    if (b.stock.trim()) { const n = parseInt(b.stock, 10); if (!isNaN(n) && n >= 0) payload.stock = n; }
    if (b.lotSize.trim()) { const n = parseInt(b.lotSize, 10); if (!isNaN(n) && n > 0) payload.lotSize = n; }
    if (b.iva.trim()) { const n = parseInt(b.iva, 10); if (!isNaN(n)) payload.iva = n; }
    if (b.costPrice.trim()) { const n = parseFloat(b.costPrice); if (!isNaN(n) && n > 0) payload.costPrice = n; }
    if (b.retailPrice.trim()) { const n = parseFloat(b.retailPrice); if (!isNaN(n) && n > 0) payload.retailPrice = n; }
    if (b.costoIeConReso.trim()) { const n = parseFloat(b.costoIeConReso); if (!isNaN(n) && n >= 0) payload.costoIeConReso = n; }
    if (b.costoIeSenzaReso.trim()) { const n = parseFloat(b.costoIeSenzaReso); if (!isNaN(n) && n >= 0) payload.costoIeSenzaReso = n; }
    if (b.fasciaSconto.trim()) { const n = parseFloat(b.fasciaSconto); if (!isNaN(n)) payload.fasciaSconto = n; }
    if (b.isActive !== '') payload.isActive = b.isActive === 'true';
    if (b.materiale1Bio !== '') payload.materiale1Bio = b.materiale1Bio === 'true';
    if (b.materiale2Bio !== '') payload.materiale2Bio = b.materiale2Bio === 'true';
    if (b.materiale3Bio !== '') payload.materiale3Bio = b.materiale3Bio === 'true';

    // Aggiungi mode: per-product update to fill first empty temaColore slot.
    // First flush any non-temaColore fields via bulk-update, then do per-product temaColore.
    if (b.temaColoreBulkMode === 'aggiungi' && b.temaColore.trim()) {
      const newTema = b.temaColore.trim();
      const selectedProds = allProducts.filter((p) => selectedIds.has(p.id));
      if (selectedProds.length === 0) { toast.error('Nessun prodotto selezionato'); return; }
      setIsBulkUpdating(true);
      try {
        // 1. Save any other filled fields via bulk-update
        if (Object.keys(payload).length > 0) {
          const res = await fetch('/api/products/bulk-update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds), data: payload }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Errore salvataggio campi');
          }
        }
        // 2. Add temaColore to first empty slot per-product
        let updated = 0;
        await Promise.all(selectedProds.map(async (p) => {
          const slots = ['temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5'] as const;
          const emptySlot = slots.find((s) => !p[s]);
          if (!emptySlot) return;
          await fetch(`/api/products/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [emptySlot]: newTema }),
          });
          updated++;
        }));
        setShowBulkEdit(false);
        setBulkEditValues(EMPTY_BULK);
        setSelectedIds(new Set());
        await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        toast.success(`Tema colore aggiunto a ${updated} prodott${updated === 1 ? 'o' : 'i'}`);
      } catch (err: any) {
        toast.error(err.message || 'Impossibile aggiornare i prodotti');
      } finally {
        setIsBulkUpdating(false);
      }
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast.error('Compila almeno un campo');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const res = await fetch('/api/products/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), data: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Errore salvataggio');
      }
      const { updated } = await res.json();
      setShowBulkEdit(false);
      setBulkEditValues(EMPTY_BULK);
      setSelectedIds(new Set());
      if (payload.tranche !== undefined) setFilterTranche('');
      if (payload.nomLinea !== undefined) setFilterLinea('');
      if (payload.collezione !== undefined) setFilterCollezione('');
      if (payload.stagione !== undefined) setFilterStagione('');
      if (payload.colore !== undefined) setFilterColore('');
      if (payload.gruppoMerceologico !== undefined) setFilterGruppo('');
      if (payload.famiglia !== undefined) setFilterFamiglia('');
      if (payload.classe !== undefined) setFilterClasse('');
      if (payload.sottoclasse !== undefined) setFilterSottoclasse('');
      if (payload.gruppoOmogeneo !== undefined) setFilterGruppoOmogeneo('');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${updated} prodott${updated === 1 ? 'o aggiornato' : 'i aggiornati'}`);
    } catch (err: any) {
      console.error('[bulk-update]', err);
      toast.error(err.message || 'Impossibile aggiornare i prodotti', { duration: 6000 });
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleTranslateAll() {
    const missing = allProducts.filter((p) => !(p as any).descrizioneEn);
    if (missing.length === 0) { toast('Tutti i prodotti hanno già le traduzioni'); return; }
    setIsTranslatingAll(true);
    setTranslateProgress({ done: 0, total: missing.length });
    const ids = missing.map((p) => p.id);
    // Invia in batch da 10 per mostrare progress
    const BATCH = 10;
    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      try {
        const res = await fetch('/api/admin/products/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: batch }),
        });
        const data = await res.json();
        done += data.translated ?? batch.length;
      } catch {
        done += batch.length;
      }
      setTranslateProgress({ done, total: missing.length });
    }
    setIsTranslatingAll(false);
    setShowTranslateConfirm(false);
    setTranslateProgress(null);
    toast.success(`Traduzione completata: ${done} prodotti tradotti`);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  }

  const selectClass = 'h-8 border border-border rounded px-2 text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
  const bulkInputClass = 'w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300';
  const bulkSelectClass = 'w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
  const bulkLabelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const bulkSectionClass = 'text-2xs font-semibold tracking-widest uppercase text-gray-400 mb-2 pt-2';

  function thBtn(field: SortField, label: string) {
    return (
      <button
        onClick={() => handleColumnSort(field)}
        className="flex items-center whitespace-nowrap hover:text-accent transition-colors"
      >
        {label}
        <SortIcon field={field} />
      </button>
    );
  }

  function downloadCsv(list: Product[], groupBy: 'none' | 'tranche' | 'conferente') {
    const sorted = [...list].sort((a, b) => {
      if (groupBy === 'tranche') {
        const t = (a.tranche ?? '').localeCompare(b.tranche ?? '', 'it');
        if (t !== 0) return t;
      }
      if (groupBy === 'conferente') {
        const c = ((a as any).conferente ?? '').localeCompare((b as any).conferente ?? '', 'it');
        if (c !== 0) return c;
      }
      return a.code.localeCompare(b.code, 'it');
    });

    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      'Codice', 'Nome', 'Attivo',
      'Gruppo merceologico', 'Famiglia', 'Classe', 'Sottoclasse', 'Gruppo omogeneo', 'Linea',
      'Colore 1', 'Colore 2', 'Colore 3', 'Fantasia', 'Taglia', 'Misura',
      'Materiale 1', 'Materiale 2', 'Materiale 3',
      'Stagione', 'Collezione', 'Tranche', 'Conferente', 'Produttore',
      'Costo i.e.', 'Prezzo vendita', 'Iva', 'Confezione',
    ];

    const rows = sorted.map((p) => [
      p.code, p.name, p.isActive ? 'Sì' : 'No',
      p.gruppoMerceologico, p.famiglia, p.classe, p.sottoclasse, p.gruppoOmogeneo, p.nomLinea,
      p.colore, (p as any).colore2, (p as any).colore3, (p as any).fantasia, p.taglia, p.misura,
      p.materiale1, p.materiale2, p.materiale3,
      p.stagione, p.collezione, p.tranche, (p as any).conferente, p.produttore,
      p.costPrice, p.retailPrice, p.iva, p.lotSize,
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const label = groupBy === 'none' ? 'prodotti' : groupBy === 'tranche' ? 'per-tranche' : 'per-conferente';
    a.href = url;
    a.download = `${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  async function handleModaExport() {
    setIsModaExporting(true);
    try {
      const res = await fetch('/api/admin/moda/export-template');
      if (!res.ok) throw new Error('Export fallito');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moda-prodotti-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Errore durante l\'esportazione');
    } finally {
      setIsModaExporting(false);
    }
  }

  async function handleDeriveLinea() {
    setIsDeriving(true);
    try {
      const res = await fetch('/api/admin/products/derive-linea', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore');
      toast.success(`Linea derivata per ${data.updated} prodotti${data.skipped ? ` · ${data.skipped} saltati (nome non leggibile)` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err: any) {
      toast.error(err.message ?? 'Errore durante la derivazione');
    } finally {
      setIsDeriving(false);
    }
  }

  async function handleModaImport(file: File) {
    setIsModaImporting(true);
    setModaImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/moda/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore import');
      setModaImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err: any) {
      toast.error(err.message ?? 'Errore durante l\'importazione');
    } finally {
      setIsModaImporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">
            Prodotti{lockedSection === 'moda' ? ' · Moda' : lockedSection === 'casa' ? ' · Casa' : ''}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Caricamento...' : [
              `${products.length} prodotti${hasFilters ? ` (su ${allProducts.length})` : ''}`,
              `${products.filter(p => p.isActive).length} attivi`,
              `${products.filter(p => !p.isActive).length} non attivi`,
              `${products.filter(p => !p.imageUrl && !p.imageUrl2 && !p.imageUrl3 && !p.imageUrl4 && !p.imageUrl5).length} senza foto`,
            ].join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="secondary" icon={<Upload size={13} />} onClick={() => setShowImport(true)}>
            <span className="hidden sm:inline">Importa da Excel</span>
          </Button>
          <Button variant="secondary" icon={<ImagePlus size={13} />} onClick={() => setShowBulkImages(true)}>
            <span className="hidden sm:inline">Carica foto in blocco</span>
          </Button>
          <Button variant="secondary" icon={<Languages size={13} />} onClick={() => setShowTranslateConfirm(true)}>
            <span className="hidden sm:inline">Traduci tutti</span>
          </Button>
          {lockedSection === 'moda' && (
            <Button variant="secondary" icon={isDeriving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} onClick={handleDeriveLinea} disabled={isDeriving}>
              <span className="hidden sm:inline">Deriva Linea</span>
            </Button>
          )}
          <Button icon={<Plus size={13} />} onClick={() => {
            if (lockedSection) { setCreateCollectionHint(lockedSection); setShowCreateForm(true); }
            else setShowCollectionPicker(true);
          }}>
            <span className="hidden sm:inline">Aggiungi Prodotto</span>
            <span className="sm:hidden">Aggiungi</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 space-y-1.5">
        {/* Riga 1 — Ricerca · Stato · Foto */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-56">
            <Input placeholder="Codice, descrizione, produttore..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <button
            onClick={() => {
              if (sortField === 'createdAt' && sortDir === 'desc') { setSortField(null); setSortDir('asc'); }
              else { setSortField('createdAt'); setSortDir('desc'); }
            }}
            className={`flex items-center gap-1 h-8 px-2 text-xs border rounded transition-colors ${sortField === 'createdAt' ? 'border-accent text-accent bg-accent/5' : 'border-border text-gray-500 hover:text-primary hover:bg-cream'}`}
          >
            Ultimi caricati
          </button>
          <div className="h-5 w-px bg-border/60 flex-shrink-0" />
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as ActiveFilter)} className={selectClass}>
            <option value="all">Stato: Tutti</option>
            <option value="active">Solo attivi</option>
            <option value="inactive">Solo non attivi</option>
          </select>
          <select value={filterFoto} onChange={(e) => setFilterFoto(e.target.value as FotoFilter)} className={selectClass}>
            <option value="all">Foto: Tutti</option>
            <option value="con-foto">Con foto</option>
            <option value="senza-foto">Senza foto</option>
            <option value="foto-multiple">Foto multiple</option>
          </select>
          <div className="h-5 w-px bg-border/60 flex-shrink-0" />
          <button
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`flex items-center gap-1 h-8 px-2 text-xs border rounded transition-colors ${showAdvancedFilters || hasAdvancedFilters ? 'border-accent text-accent bg-accent/5' : 'border-border text-gray-500 hover:text-primary hover:bg-cream'}`}
          >
            {showAdvancedFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {hasAdvancedFilters ? `Altri filtri (${[filterPaese,filterConferente,filterModello,filterDettaglio,filterForma,filterTaglia,filterMisura,filterColore,filterColore2,filterColore3,filterTemaColore,filterMateriale1,filterMateriale2,filterMateriale3,filterComposizione,filterFantasia,filterLavorazione,filterBloccoColore,filterIva,filterCostoConFascia,filterCostoSenzaFascia,filterRetailFascia,filterFasciaSconto,filterFasciaRicarico,filterPrezzoCosto].filter(Boolean).length + (filterTemaColorePresenza !== 'all' ? 1 : 0) + (filterPantoneSource !== 'all' ? 1 : 0)})` : 'Altri filtri'}
          </button>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 h-8 px-2 text-xs text-gray-500 hover:text-primary border border-border rounded hover:bg-cream transition-colors">
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>

        {/* Riga 2 — Catalogo */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterCollezione} onChange={(e) => setFilterCollezione(e.target.value)} className={selectClass}>
            <option value="">Collezione</option>
            <option value="__empty__">(nessuna)</option>
            {collezioneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterStagione} onChange={(e) => setFilterStagione(e.target.value)} className={selectClass}>
            <option value="">Stagione</option>
            {stagioneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterTranche} onChange={(e) => setFilterTranche(e.target.value)} className={selectClass}>
            <option value="">Tranche</option>
            {trancheOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterLinea} onChange={(e) => setFilterLinea(e.target.value)} className={selectClass}>
            <option value="">Linea</option>
            {lineaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {/* Riga 3 — Classificazione */}
        <div className="flex flex-wrap gap-2 items-center">
          {!lockedSection && (
            <select value={filterGruppo} onChange={(e) => setFilterGruppo(e.target.value)} className={selectClass}>
              <option value="">Gruppo merc.</option>
              {gruppoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          <select value={filterFamiglia} onChange={(e) => setFilterFamiglia(e.target.value)} className={selectClass}>
            <option value="">Famiglia</option>
            {famigliaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className={selectClass}>
            <option value="">Classe</option>
            {classeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterSottoclasse} onChange={(e) => setFilterSottoclasse(e.target.value)} className={selectClass}>
            <option value="">Sottoclasse</option>
            {sottoclasseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterGruppoOmogeneo} onChange={(e) => setFilterGruppoOmogeneo(e.target.value)} className={selectClass}>
            <option value="">Gr. omogeneo</option>
            {gruppoOmogeneoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {/* Filtri avanzati — ordinati come la scheda prodotto */}
        {showAdvancedFilters && (
          <div className="p-3 bg-gray-50 rounded border border-border space-y-2">

            {/* Anagrafica */}
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Anagrafica</p>
            <div className="flex flex-wrap gap-2">
              <select value={filterProduttore} onChange={(e) => setFilterProduttore(e.target.value)} className={selectClass}>
                <option value="">Produttore</option>
                {produttoreOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterConferente} onChange={(e) => setFilterConferente(e.target.value)} className={selectClass}>
                <option value="">Conferente</option>
                {conferenteOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterPaese} onChange={(e) => setFilterPaese(e.target.value)} className={selectClass}>
                <option value="">Paese</option>
                {paeseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterMisura} onChange={(e) => setFilterMisura(e.target.value)} className={selectClass}>
                <option value="">Misura</option>
                {misuraOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterIva} onChange={(e) => setFilterIva(e.target.value)} className={selectClass}>
                <option value="">IVA</option>
                {ivaOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>

            {/* Prezzi */}
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 pt-1">Prezzi</p>
            <div className="flex flex-wrap gap-2">
              <select value={filterPrezzoCosto} onChange={(e) => setFilterPrezzoCosto(e.target.value)} className={selectClass}>
                <option value="">Costo i.e. senza reso</option>
                <option value="0-5">0–5 €</option>
                <option value="5-10">5–10 €</option>
                <option value="10-20">10–20 €</option>
                <option value="20-50">20–50 €</option>
                <option value="50+">&gt; 50 €</option>
              </select>
              <select value={filterCostoSenzaFascia} onChange={(e) => setFilterCostoSenzaFascia(e.target.value)} className={selectClass}>
                <option value="">Costo i.e. con reso</option>
                <option value="0-5">0–5 €</option>
                <option value="5-10">5–10 €</option>
                <option value="10-20">10–20 €</option>
                <option value="20-50">20–50 €</option>
                <option value="50+">&gt; 50 €</option>
              </select>
              <select value={filterRetailFascia} onChange={(e) => setFilterRetailFascia(e.target.value)} className={selectClass}>
                <option value="">Prezzo vendita</option>
                <option value="0-20">0–20 €</option>
                <option value="20-50">20–50 €</option>
                <option value="50-100">50–100 €</option>
                <option value="100-200">100–200 €</option>
                <option value="200+">&gt; 200 €</option>
              </select>
              <select value={filterFasciaSconto} onChange={(e) => setFilterFasciaSconto(e.target.value)} className={selectClass}>
                <option value="">Fascia sconto</option>
                <option value="0-30">&lt; 30%</option>
                <option value="30-40">30–40%</option>
                <option value="40-50">40–50%</option>
                <option value="50-60">50–60%</option>
                <option value="60+">&gt; 60%</option>
              </select>
              <select value={filterFasciaRicarico} onChange={(e) => setFilterFasciaRicarico(e.target.value)} className={selectClass}>
                <option value="">Fascia ricarico</option>
                <option value="0-50">&lt; 50%</option>
                <option value="50-100">50–100%</option>
                <option value="100-150">100–150%</option>
                <option value="150+">&gt; 150%</option>
              </select>
            </div>

            {/* Dettagli */}
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 pt-1">Dettagli</p>
            <div className="flex flex-wrap gap-2">
              <select value={filterDettaglio} onChange={(e) => setFilterDettaglio(e.target.value)} className={selectClass}>
                <option value="">Tipo</option>
                {dettaglioOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterModello} onChange={(e) => setFilterModello(e.target.value)} className={selectClass}>
                <option value="">Modello</option>
                {modelloOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterForma} onChange={(e) => setFilterForma(e.target.value)} className={selectClass}>
                <option value="">Forma</option>
                {formaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterTaglia} onChange={(e) => setFilterTaglia(e.target.value)} className={selectClass}>
                <option value="">Taglia</option>
                {tagliaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={filterMateriale1} onChange={(e) => setFilterMateriale1(e.target.value)} className={selectClass}>
                <option value="">Materiale 1</option>
                {materiale1Options.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterMateriale2} onChange={(e) => setFilterMateriale2(e.target.value)} className={selectClass}>
                <option value="">Materiale 2</option>
                {materiale2Options.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterMateriale3} onChange={(e) => setFilterMateriale3(e.target.value)} className={selectClass}>
                <option value="">Materiale 3</option>
                {materiale3Options.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterComposizione} onChange={(e) => setFilterComposizione(e.target.value)} className={selectClass}>
                <option value="">Composizione</option>
                {composizioneOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterFantasia} onChange={(e) => setFilterFantasia(e.target.value)} className={selectClass}>
                <option value="">Fantasia</option>
                {fantasiaOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterLavorazione} onChange={(e) => setFilterLavorazione(e.target.value)} className={selectClass}>
                <option value="">Lavorazione</option>
                {lavorazioneOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
            </div>

            {/* Colori */}
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 pt-1">Colori</p>
            <div className="flex flex-wrap gap-2">
              <select value={filterColore} onChange={(e) => setFilterColore(e.target.value)} className={selectClass}>
                <option value="">Colore 1</option>
                {coloreOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterColore2} onChange={(e) => setFilterColore2(e.target.value)} className={selectClass}>
                <option value="">Colore 2</option>
                {colore2Options.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterColore3} onChange={(e) => setFilterColore3(e.target.value)} className={selectClass}>
                <option value="">Colore 3</option>
                {colore3Options.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterTemaColore} onChange={(e) => setFilterTemaColore(e.target.value)} className={selectClass}>
                <option value="">Tema colore</option>
                {temaColoreOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
              <select value={filterTemaColorePresenza} onChange={(e) => setFilterTemaColorePresenza(e.target.value as TemaColorePresenzaFilter)} className={selectClass}>
                <option value="all">Tema: Tutti</option>
                <option value="con-tema">Con tema</option>
                <option value="senza-tema">Senza tema</option>
              </select>
              <select value={filterBloccoColore} onChange={(e) => setFilterBloccoColore(e.target.value)} className={selectClass}>
                <option value="">Blocco colore</option>
                {bloccoColoreOptions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}
              </select>
            </div>

            {/* Pantone */}
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 pt-1">Pantone</p>
            <div className="flex flex-wrap gap-2">
              <select value={filterPantoneSource} onChange={(e) => setFilterPantoneSource(e.target.value as PantoneSourceFilter)} className={selectClass}>
                <option value="all">Pantone: Tutti</option>
                <option value="auto">Inserito automaticamente</option>
                <option value="manual">Inserito da admin</option>
              </select>
            </div>
          </div>
        )}

        {hasFilters && (
          <p className="text-xs text-gray-400">{products.length} risultat{products.length === 1 ? 'o' : 'i'} su {allProducts.length}</p>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded">
          <span className="text-xs font-medium text-primary">
            {selectedIds.size} prodott{selectedIds.size === 1 ? 'o selezionato' : 'i selezionati'}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={() => { const sel = allProducts.filter((p) => selectedIds.has(p.id)); setBulkEditValues(computeCommonBulkValues(sel)); setShowBulkEdit(true); }}>
              Modifica selezionati
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => setShowBulkDeleteConfirm(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              Elimina selezionati
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1 text-gray-400 hover:text-primary" title="Deseleziona tutto">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Riepilogo tema colore */}
      {!isLoading && (
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          <button
            onClick={() => setFilterTemaColorePresenza(filterTemaColorePresenza === 'con-tema' ? 'all' : 'con-tema')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${filterTemaColorePresenza === 'con-tema' ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium' : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 text-gray-500'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="font-medium text-emerald-700">{allProducts.filter(hasTemaColore).length}</span>
            &nbsp;con tema colore
          </button>
          <button
            onClick={() => setFilterTemaColorePresenza(filterTemaColorePresenza === 'senza-tema' ? 'all' : 'senza-tema')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${filterTemaColorePresenza === 'senza-tema' ? 'border-gray-400 bg-gray-100 text-gray-700 font-medium' : 'border-border hover:border-gray-300 hover:bg-gray-50 text-gray-500'}`}
          >
            <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
            <span className="font-medium text-gray-600">{allProducts.filter(p => !hasTemaColore(p)).length}</span>
            &nbsp;senza tema colore
          </button>
        </div>
      )}

      {/* Table header row: column picker */}
      <div className="flex items-center justify-end mb-1.5">
        <div className="relative">
          <button
            onClick={() => setShowColPicker((v) => !v)}
            className="flex items-center gap-1.5 h-7 px-2.5 text-xs text-gray-500 border border-border rounded hover:bg-cream hover:text-primary transition-colors"
          >
            <Columns2 size={12} />
            Colonne
          </button>
          {showColPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColPicker(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded shadow-lg w-56 max-h-[70vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-border px-3 py-2 flex items-center justify-between">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Colonne</p>
                  <button
                    onClick={() => {
                      const next = new Set(DEFAULT_COLS);
                      setVisibleCols(next);
                      try { localStorage.setItem('admin-products-cols-v2', JSON.stringify([...next])); } catch {}
                      setShowColPicker(false);
                    }}
                    className="text-2xs text-accent hover:underline"
                  >
                    Predefinite
                  </button>
                </div>
                <div className="p-2 space-y-3">
                  {COL_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-1 px-1">{group.label}</p>
                      {group.cols.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-600 px-1 py-0.5 rounded select-none">
                          <input
                            type="checkbox"
                            checked={visibleCols.has(key)}
                            onChange={() => toggleCol(key)}
                            className="w-3.5 h-3.5 accent-accent cursor-pointer flex-shrink-0"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5 accent-accent cursor-pointer" disabled={products.length === 0} />
              </th>
              <th className="w-24">{thBtn('code', 'Codice')}</th>
              <th className="min-w-[140px]">{thBtn('name', 'Descrizione')}</th>
              {/* Prezzi */}
              {visibleCols.has('costPrice')        && <th className="w-24">{thBtn('costPrice', 'Costo i.e.')}</th>}
              {visibleCols.has('costoIeConReso')   && <th className="w-24">Con reso</th>}
              {visibleCols.has('costoIeSenzaReso') && <th className="w-24">Senza reso</th>}
              {visibleCols.has('retailPrice')      && <th className="w-24">{thBtn('retailPrice', 'Vendita')}</th>}
              {visibleCols.has('sconto')           && <th className="w-16 text-center">% Sc.</th>}
              {visibleCols.has('ricarico')         && <th className="w-16 text-center">% Ric.</th>}
              {visibleCols.has('iva')              && <th className="w-14">IVA</th>}
              {visibleCols.has('lotSize')          && <th className="w-16">Conf.</th>}
              {visibleCols.has('stock')            && <th className="w-14">Stock</th>}
              {/* Anagrafica */}
              {visibleCols.has('produttore')  && <th className="w-28">{thBtn('produttore', 'Produttore')}</th>}
              {visibleCols.has('conferente')  && <th className="w-24">Conferente</th>}
              {visibleCols.has('paese')       && <th className="w-20">Paese</th>}
              {visibleCols.has('misura')      && <th className="w-20">Misura</th>}
              {visibleCols.has('stagione')    && <th className="w-20">Stagione</th>}
              {visibleCols.has('tranche')     && <th className="w-20">Tranche</th>}
              {visibleCols.has('nomLinea')    && <th className="w-24">Linea</th>}
              {visibleCols.has('collezione')  && <th className="w-24">{thBtn('collezione', 'Collezione')}</th>}
              {/* Classificazione */}
              {visibleCols.has('gruppoMerceologico') && <th className="w-28">Gruppo</th>}
              {visibleCols.has('famiglia')           && <th className="w-24">Famiglia</th>}
              {visibleCols.has('classe')             && <th className="w-24">Classe</th>}
              {visibleCols.has('sottoclasse')        && <th className="w-24">Sottoclasse</th>}
              {visibleCols.has('gruppoOmogeneo')     && <th className="w-24">Gr. omog.</th>}
              {/* MODA */}
              {visibleCols.has('modello')      && <th className="w-24">Modello</th>}
              {visibleCols.has('dettaglio')    && <th className="w-24">Tipo</th>}
              {visibleCols.has('forma')        && <th className="w-20">Forma</th>}
              {visibleCols.has('taglia')       && <th className="w-16">Taglia</th>}
              {visibleCols.has('materiale1')   && <th className="w-24">Mat. 1</th>}
              {visibleCols.has('materiale2')   && <th className="w-24">Mat. 2</th>}
              {visibleCols.has('materiale3')   && <th className="w-24">Mat. 3</th>}
              {visibleCols.has('composizione') && <th className="w-24">Composiz.</th>}
              {visibleCols.has('fantasia')     && <th className="w-24">Fantasia</th>}
              {visibleCols.has('lavorazione')  && <th className="w-24">Lavoraz.</th>}
              {visibleCols.has('bloccoColore') && <th className="w-24">Blocco col.</th>}
              {/* Colori */}
              {visibleCols.has('colore')      && <th className="w-20">Colore 1</th>}
              {visibleCols.has('colore2')     && <th className="w-20">Colore 2</th>}
              {visibleCols.has('colore3')     && <th className="w-20">Colore 3</th>}
              {visibleCols.has('altriColori') && <th className="w-24">Altri col.</th>}
              {visibleCols.has('temaColore')  && <th className="w-28">Tema colore</th>}
              {/* Certificazioni */}
              {visibleCols.has('certificazione1') && <th className="w-20">Cert. 1</th>}
              {visibleCols.has('certificazione2') && <th className="w-20">Cert. 2</th>}
              {visibleCols.has('certificazione3') && <th className="w-20">Cert. 3</th>}
              {/* Stato */}
              {visibleCols.has('foto')  && <th className="w-12 text-center">Foto</th>}
              {visibleCols.has('stato') && <th className="w-16">Stato</th>}
              <th className="w-28 sticky right-0 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const colCount = 4 + visibleCols.size;
              if (isLoading) return (
                <tr><td colSpan={colCount} className="py-12 text-center"><LoadingSpinner className="mx-auto" /></td></tr>
              );
              if (products.length === 0) return (
                <tr><td colSpan={colCount} className="py-12 text-center text-gray-400 text-sm">Nessun prodotto trovato</td></tr>
              );
              return products.map((product) => {
                const ivaFactor = 1 + (product.iva ?? 22) / 100;
                const pvn = product.retailPrice / ivaFactor;
                const ricarico = product.costPrice > 0 ? ((pvn - product.costPrice) / product.costPrice) * 100 : null;
                const p = product as any;
                return (
                  <tr key={product.id} className={selectedIds.has(product.id) ? 'bg-accent/5' : undefined}>
                    <td><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="w-3.5 h-3.5 accent-accent cursor-pointer" /></td>
                    <td><span className="font-mono text-xs text-gray-500">{product.code}</span></td>
                    <td className="max-w-[200px]"><p className="font-medium text-primary text-xs truncate" title={product.name}>{product.name}</p></td>
                    {/* Prezzi */}
                    {visibleCols.has('costPrice')        && <td className="font-medium text-xs">{formatCurrency(product.costPrice)}</td>}
                    {visibleCols.has('costoIeConReso')   && <td className="text-xs">{p.costoIeConReso != null ? formatCurrency(p.costoIeConReso) : <span className="text-gray-300">—</span>}</td>}
                    {visibleCols.has('costoIeSenzaReso') && <td className="text-xs">{p.costoIeSenzaReso != null ? formatCurrency(p.costoIeSenzaReso) : <span className="text-gray-300">—</span>}</td>}
                    {visibleCols.has('retailPrice')      && <td className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</td>}
                    {visibleCols.has('sconto')           && (
                      <td className="text-xs text-center">
                        {(() => {
                          const sc = computeSconto(product);
                          const color = sc > 40 ? 'text-green-600' : sc >= 30 ? 'text-yellow-600' : 'text-red-500';
                          return <span className={color}>{sc.toFixed(1)}%</span>;
                        })()}
                      </td>
                    )}
                    {visibleCols.has('ricarico')         && (
                      <td className="text-xs text-center">
                        {ricarico !== null ? (
                          <span className={ricarico >= 0 ? 'text-green-600' : 'text-red-500'}>
                            {ricarico >= 0 ? '+' : ''}{ricarico.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    )}
                    {visibleCols.has('iva')              && <td className="text-xs text-gray-500">{product.iva != null ? `${product.iva}%` : '—'}</td>}
                    {visibleCols.has('lotSize')          && <td className="text-xs text-gray-500">{product.lotSize > 1 ? product.lotSize : '—'}</td>}
                    {visibleCols.has('stock')            && <td className="text-xs text-gray-500">{product.stock ?? '—'}</td>}
                    {/* Anagrafica */}
                    {visibleCols.has('produttore')  && <td><span className="text-xs text-gray-500 truncate block max-w-[110px]">{product.produttore || '—'}</span></td>}
                    {visibleCols.has('conferente')  && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.conferente || '—'}</span></td>}
                    {visibleCols.has('paese')       && <td><span className="text-xs text-gray-500">{p.paese || '—'}</span></td>}
                    {visibleCols.has('misura')      && <td><span className="text-xs text-gray-500">{p.misura || '—'}</span></td>}
                    {visibleCols.has('stagione')    && <td><span className="text-xs text-gray-500">{p.stagione || '—'}</span></td>}
                    {visibleCols.has('tranche')     && <td><span className="text-xs text-gray-500">{p.tranche || '—'}</span></td>}
                    {visibleCols.has('nomLinea')    && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.nomLinea || '—'}</span></td>}
                    {visibleCols.has('collezione')  && <td><span className="text-xs text-gray-500">{product.collezione || '—'}</span></td>}
                    {/* Classificazione */}
                    {visibleCols.has('gruppoMerceologico') && <td><span className="text-xs text-gray-500 truncate block max-w-[110px]">{p.gruppoMerceologico || '—'}</span></td>}
                    {visibleCols.has('famiglia')           && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.famiglia || '—'}</span></td>}
                    {visibleCols.has('classe')             && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.classe || '—'}</span></td>}
                    {visibleCols.has('sottoclasse')        && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.sottoclasse || '—'}</span></td>}
                    {visibleCols.has('gruppoOmogeneo')     && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.gruppoOmogeneo || '—'}</span></td>}
                    {/* MODA */}
                    {visibleCols.has('modello')      && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.modello || '—'}</span></td>}
                    {visibleCols.has('dettaglio')    && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{p.dettaglio || '—'}</span></td>}
                    {visibleCols.has('forma')        && <td><span className="text-xs text-gray-500">{p.forma || '—'}</span></td>}
                    {visibleCols.has('taglia')       && <td><span className="text-xs text-gray-500">{p.taglia || '—'}</span></td>}
                    {visibleCols.has('materiale1')   && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.materiale1) || '—'}</span></td>}
                    {visibleCols.has('materiale2')   && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.materiale2) || '—'}</span></td>}
                    {visibleCols.has('materiale3')   && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.materiale3) || '—'}</span></td>}
                    {visibleCols.has('composizione') && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.composizione) || '—'}</span></td>}
                    {visibleCols.has('fantasia')     && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.fantasia) || '—'}</span></td>}
                    {visibleCols.has('lavorazione')  && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.lavorazione) || '—'}</span></td>}
                    {visibleCols.has('bloccoColore') && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.bloccoColore) || '—'}</span></td>}
                    {/* Colori */}
                    {visibleCols.has('colore')      && <td><span className="text-xs text-gray-500">{capitalize(product.colore) || '—'}</span></td>}
                    {visibleCols.has('colore2')     && <td><span className="text-xs text-gray-500">{capitalize(p.colore2) || '—'}</span></td>}
                    {visibleCols.has('colore3')     && <td><span className="text-xs text-gray-500">{capitalize(p.colore3) || '—'}</span></td>}
                    {visibleCols.has('altriColori') && <td><span className="text-xs text-gray-500 truncate block max-w-[90px]">{capitalize(p.altriColori) || '—'}</span></td>}
                    {visibleCols.has('temaColore')  && (
                      <td>
                        {hasTemaColore(product)
                          ? <span className="inline-flex items-center gap-1 text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded max-w-[110px] truncate" title={[product.temaColore, product.temaColore2, product.temaColore3, product.temaColore4, product.temaColore5].filter(Boolean).map(capitalize).join(', ')}>{capitalize(product.temaColore)}</span>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                    )}
                    {/* Certificazioni */}
                    {visibleCols.has('certificazione1') && <td><span className="text-xs text-gray-500">{p.certificazione1 || '—'}</span></td>}
                    {visibleCols.has('certificazione2') && <td><span className="text-xs text-gray-500">{p.certificazione2 || '—'}</span></td>}
                    {visibleCols.has('certificazione3') && <td><span className="text-xs text-gray-500">{p.certificazione3 || '—'}</span></td>}
                    {/* Stato */}
                    {visibleCols.has('foto')        && (
                      <td className="text-center whitespace-nowrap">
                        {(() => {
                          const cnt = [product.imageUrl, product.imageUrl2, product.imageUrl3, product.imageUrl4].filter(Boolean).length;
                          return cnt > 0
                            ? <span className="text-xs text-green-600">📷 {cnt}</span>
                            : <span className="text-xs text-gray-300">📷</span>;
                        })()}
                      </td>
                    )}
                    {visibleCols.has('stato')       && <td><Badge variant={product.isActive ? 'success' : 'default'} size="xs">{product.isActive ? 'Attivo' : 'Inattivo'}</Badge></td>}
                    <td className={`sticky right-0 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] ${selectedIds.has(product.id) ? 'bg-accent/5' : 'bg-white'}`}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreviewProduct(product)} className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors" title="Anteprima"><Eye size={13} /></button>
                        <button onClick={() => setEditingProduct(product)} className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Modifica"><Pencil size={13} /></button>
                        <button onClick={() => setDuplicatingProduct(product)} className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors" title="Duplica"><Copy size={13} /></button>
                        <button onClick={() => handleToggleActive(product)} className={`p-1.5 rounded transition-colors ${product.isActive ? 'text-green-500 hover:text-gray-400 hover:bg-gray-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`} title={product.isActive ? 'Disattiva' : 'Attiva'}>
                          {product.isActive ? <Power size={13} /> : <PowerOff size={13} />}
                        </button>
                        <button onClick={() => handleDelete(product)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Elimina"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Anteprima prodotto" size="lg">
        {previewProduct && (() => {
          const p = previewProduct;
          const ivaFactor = 1 + (p.iva ?? 22) / 100;
          const pvn = p.retailPrice / ivaFactor;
          const ricarico = p.costPrice > 0 ? ((pvn - p.costPrice) / p.costPrice) * 100 : null;
          const margine = pvn > 0 ? ((pvn - p.costPrice) / pvn) * 100 : null;
          return (
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Foto */}
                <div className="w-36 h-36 flex-shrink-0 rounded border border-border bg-cream overflow-hidden">
                  {p.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Nessuna foto</div>
                  }
                </div>
                {/* Dati principali */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{p.code}</span>
                    <Badge variant={p.isActive ? 'success' : 'default'} size="xs">{p.isActive ? 'Attivo' : 'Non attivo'}</Badge>
                  </div>
                  <h3 className="font-semibold text-primary text-sm mb-2 leading-snug">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 leading-relaxed mb-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {p.produttore && <span className="text-xs text-gray-500"><span className="text-gray-400">Produttore:</span> {p.produttore}</span>}
                    {p.paese && <span className="text-xs text-gray-500"><span className="text-gray-400">Paese:</span> {p.paese}</span>}
                    {p.misura && <span className="text-xs text-gray-500"><span className="text-gray-400">Misure:</span> {p.misura}</span>}
                    {p.lotSize > 1 && <span className="text-xs text-gray-500"><span className="text-gray-400">Confezione:</span> {p.lotSize} pz</span>}
                  </div>
                </div>
              </div>

              {/* Classificazione */}
              {(p.gruppoMerceologico || p.famiglia || p.classe || p.sottoclasse || p.gruppoOmogeneo || p.nomLinea || p.collezione || p.colore || p.stagione || p.tranche) && (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Classificazione</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                    {p.gruppoMerceologico && <span className="text-xs text-gray-600"><span className="text-gray-400">Gruppo:</span> {p.gruppoMerceologico}</span>}
                    {p.famiglia && <span className="text-xs text-gray-600"><span className="text-gray-400">Famiglia:</span> {p.famiglia}</span>}
                    {p.classe && <span className="text-xs text-gray-600"><span className="text-gray-400">Classe:</span> {p.classe}</span>}
                    {p.sottoclasse && <span className="text-xs text-gray-600"><span className="text-gray-400">Sottoclasse:</span> {p.sottoclasse}</span>}
                    {p.gruppoOmogeneo && <span className="text-xs text-gray-600"><span className="text-gray-400">Gr. omogeneo:</span> {p.gruppoOmogeneo}</span>}
                    {p.nomLinea && <span className="text-xs text-gray-600"><span className="text-gray-400">Linea:</span> {p.nomLinea}</span>}
                    {p.collezione && <span className="text-xs text-gray-600"><span className="text-gray-400">Collezione:</span> {p.collezione}</span>}
                    {p.colore && <span className="text-xs text-gray-600"><span className="text-gray-400">Colore:</span> {p.colore}</span>}
                    {(p as any).stagione && <span className="text-xs text-gray-600"><span className="text-gray-400">Stagione:</span> {(p as any).stagione}</span>}
                    {p.tranche && <span className="text-xs text-gray-600"><span className="text-gray-400">Tranche:</span> {p.tranche}</span>}
                  </div>
                </div>
              )}

              {/* Lavorazione */}
              {(p as any).lavorazione && (
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Lavorazione:</span>
                  <span className="text-xs text-primary capitalize">{(p as any).lavorazione}</span>
                  <a
                    href={`https://www.perplexity.ai/search?q=${encodeURIComponent(`Cos'è la lavorazione tessile "${capitalize((p as any).lavorazione)}"?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Chiedi all'AI cos'è "${(p as any).lavorazione}"`}
                    className="flex items-center gap-1 text-2xs text-accent/70 hover:text-accent transition-colors"
                  >
                    <Sparkles size={10} />
                    <span>Cos'è?</span>
                  </a>
                </div>
              )}

              {/* Prezzi */}
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Prezzi</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Costo i.e.</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(p.costPrice)}</p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">PVP i.i.</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(p.retailPrice)}</p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Ricarico</p>
                    <p className={`text-sm font-semibold ${ricarico !== null && ricarico >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {ricarico !== null ? `${ricarico >= 0 ? '+' : ''}${ricarico.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Margine</p>
                    <p className={`text-sm font-semibold ${margine !== null && margine >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {margine !== null ? `${margine >= 0 ? '+' : ''}${margine.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                </div>
                {((p as any).fasciaSconto != null || (p as any).fasciaRicarico) && (
                  <div className="flex gap-3 mt-2">
                    {(p as any).fasciaSconto != null && <span className="text-xs text-gray-500"><span className="text-gray-400">Fascia sconto:</span> {(p as any).fasciaSconto}%</span>}
                    {(p as any).fasciaRicarico && <span className="text-xs text-gray-500"><span className="text-gray-400">Fascia ricarico:</span> {(p as any).fasciaRicarico}</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setPreviewProduct(null); setEditingProduct(p); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Pencil size={12} />
                  Modifica
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importa / aggiorna prodotti da Excel" size="xl">
        <ProductImport onSuccess={() => { setShowImport(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} />
      </Modal>

      {/* Bulk Images Modal */}
      <Modal isOpen={showBulkImages} onClose={() => setShowBulkImages(false)} title="Carica foto in blocco" size="lg">
        <BulkImageUpload onSuccess={() => { setShowBulkImages(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Modifica Prodotto" size="2xl">
        {editingProduct && (
          <ProductForm product={editingProduct} onSuccess={() => { setEditingProduct(null); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} onCancel={() => setEditingProduct(null)} />
        )}
      </Modal>

      {/* Collection picker */}
      <Modal isOpen={showCollectionPicker} onClose={() => setShowCollectionPicker(false)} title="Aggiungi prodotto" size="sm">
        <p className="text-sm text-gray-500 mb-4">Scegli la collezione del nuovo prodotto.</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { hint: 'moda' as const, icon: Shirt,    label: 'Moda' },
            { hint: 'casa' as const, icon: Home,     label: 'Casa'  },
          ]).map(({ hint, icon: Icon, label }) => (
            <button
              key={hint}
              onClick={() => { setCreateCollectionHint(hint); setShowCollectionPicker(false); setShowCreateForm(true); }}
              className="flex flex-col items-center gap-3 py-8 border-2 border-border rounded-xl hover:border-accent/50 hover:bg-cream transition-all group"
            >
              <Icon size={22} className="text-gray-400 group-hover:text-accent transition-colors" />
              <span className="font-medium text-primary text-sm">{label}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); setCreateCollectionHint(null); }} title="Aggiungi Prodotto" size="2xl">
        <ProductForm
          key={createCollectionHint ?? 'default'}
          initialValues={createCollectionHint === 'moda' ? { gruppoMerceologico: 'Moda' } : undefined}
          onSuccess={() => { setShowCreateForm(false); setCreateCollectionHint(null); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }}
          onCancel={() => { setShowCreateForm(false); setCreateCollectionHint(null); }}
        />
      </Modal>

      {/* Duplicate Modal */}
      <Modal isOpen={!!duplicatingProduct} onClose={() => setDuplicatingProduct(null)} title="Duplica prodotto" size="2xl">
        {duplicatingProduct && (
          <ProductForm
            key={`dup-${duplicatingProduct.id}`}
            duplicateSource={duplicatingProduct}
            onSuccess={() => { setDuplicatingProduct(null); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }}
            onCancel={() => setDuplicatingProduct(null)}
          />
        )}
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal isOpen={showBulkEdit} onClose={() => setShowBulkEdit(false)} title={`Modifica ${selectedIds.size} prodott${selectedIds.size === 1 ? 'o' : 'i'}`} size="xl">
        <div className="space-y-2">
          <p className="text-xs text-gray-400 pb-1">Solo i campi compilati verranno aggiornati.</p>

          <p className={bulkSectionClass}>Anagrafica</p>
          <div>
            <label className={bulkLabelClass}>Descrizione</label>
            <textarea value={bulkEditValues.description} onChange={(e) => setBulk('description', e.target.value)} placeholder="—" rows={2} className="w-full border border-border rounded px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={bulkLabelClass}>Produttore</label>
              <input value={bulkEditValues.produttore} onChange={(e) => setBulk('produttore', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Conferente</label>
              <select value={bulkEditValues.conferente} onChange={(e) => setBulk('conferente', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {CONFERENTE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Misure</label>
              <input value={bulkEditValues.misura} onChange={(e) => setBulk('misura', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
          </div>
          <PaeseSelect label="Paese" value={bulkEditValues.paese} onChange={(v) => setBulk('paese', v)} placeholder="— non modificare —" />

          <p className={bulkSectionClass}>Classificazione</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={bulkLabelClass}>Gruppo merceologico</label>
              <select value={bulkEditValues.gruppoMerceologico} onChange={(e) => setBulk('gruppoMerceologico', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {gruppoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Famiglia</label>
              <select value={bulkEditValues.famiglia} onChange={(e) => setBulk('famiglia', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {famigliaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Classe</label>
              <select value={bulkEditValues.classe} onChange={(e) => setBulk('classe', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {classeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Sottoclasse</label>
              <select value={bulkEditValues.sottoclasse} onChange={(e) => setBulk('sottoclasse', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {sottoclasseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Gruppo omogeneo</label>
              <select value={bulkEditValues.gruppoOmogeneo} onChange={(e) => setBulk('gruppoOmogeneo', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {gruppoOmogeneoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {([
              ['nomLinea', 'Linea'], ['tranche', 'Tranche'], ['dettaglio', 'Tipo'], ['forma', 'Forma'],
            ] as [keyof BulkEditValues, string][]).map(([k, label]) => (
              <div key={k as string}>
                <label className={bulkLabelClass}>{label}</label>
                <input value={bulkEditValues[k] as string} onChange={(e) => setBulk(k, e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
            ))}
            <div>
              <label className={bulkLabelClass}>Stagione</label>
              <select value={bulkEditValues.stagione} onChange={(e) => setBulk('stagione', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {STAGIONE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Collezione</label>
              <select value={bulkEditValues.collezione} onChange={(e) => setBulk('collezione', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {collezioneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Taglia</label>
              <select value={bulkEditValues.taglia} onChange={(e) => setBulk('taglia', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {TAGLIA_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <p className={bulkSectionClass}>Colori</p>
          <div className="grid grid-cols-2 gap-3">
            {(['colore', 'colore2', 'colore3'] as const).map((k, i) => (
              <div key={k}>
                <label className={bulkLabelClass}>Colore {i + 1}</label>
                <select value={bulkEditValues[k]} onChange={(e) => setBulk(k, e.target.value)} className={bulkSelectClass}>
                  <option value="">— non modificare —</option>
                  {[...COLORE_OPTIONS].sort((a, b) => a.localeCompare(b, 'it')).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className={bulkLabelClass}>Altri colori</label>
              <input value={bulkEditValues.altriColori} onChange={(e) => setBulk('altriColori', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Blocco colore</label>
              <input value={bulkEditValues.bloccoColore} onChange={(e) => setBulk('bloccoColore', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
          </div>

          {/* Tema colore — Sostituisci / Aggiungi */}
          <div className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className={bulkLabelClass + ' mb-0'}>Tema colore</label>
              <div className="flex gap-1">
                {(['sostituisci', 'aggiungi'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setBulk('temaColoreBulkMode', mode)} className={`text-2xs px-2 py-0.5 rounded transition-colors ${bulkEditValues.temaColoreBulkMode === mode ? 'bg-primary text-white' : 'border border-border text-gray-500 hover:bg-cream'}`}>
                    {mode === 'sostituisci' ? 'Sostituisci' : 'Aggiungi'}
                  </button>
                ))}
              </div>
            </div>
            {bulkEditValues.temaColoreBulkMode === 'sostituisci' ? (
              <div className="grid grid-cols-2 gap-2">
                {(['temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5'] as const).map((k, i) => (
                  <input key={k} value={bulkEditValues[k]} onChange={(e) => setBulk(k, e.target.value)} placeholder={i === 0 ? 'Valore 1' : `Valore ${i + 1} (opz.)`} className={bulkInputClass} />
                ))}
              </div>
            ) : (
              <div>
                <input value={bulkEditValues.temaColore} onChange={(e) => setBulk('temaColore', e.target.value)} placeholder="Valore da aggiungere al primo slot libero" className={bulkInputClass} />
                <p className="text-2xs text-gray-400 mt-1">Aggiunge il valore al primo campo temaColore vuoto di ogni prodotto selezionato.</p>
              </div>
            )}
          </div>

          <p className={bulkSectionClass}>Materiali e Tessuti</p>
          <div className="space-y-3">
            <BulkMaterialRow label="Materiale 1" value={bulkEditValues.materiale1} bioValue={bulkEditValues.materiale1Bio} onChangeValue={(v) => setBulk('materiale1', v)} onChangeBio={(v) => setBulk('materiale1Bio', v as '' | 'true' | 'false')} />
            <BulkMaterialRow label="Materiale 2" value={bulkEditValues.materiale2} bioValue={bulkEditValues.materiale2Bio} onChangeValue={(v) => setBulk('materiale2', v)} onChangeBio={(v) => setBulk('materiale2Bio', v as '' | 'true' | 'false')} />
            <BulkMaterialRow label="Materiale 3" value={bulkEditValues.materiale3} bioValue={bulkEditValues.materiale3Bio} onChangeValue={(v) => setBulk('materiale3', v)} onChangeBio={(v) => setBulk('materiale3Bio', v as '' | 'true' | 'false')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={bulkLabelClass}>Composizione</label>
                <input value={bulkEditValues.composizione} onChange={(e) => setBulk('composizione', e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
              <div>
                <label className={bulkLabelClass}>Fantasia</label>
                <select value={bulkEditValues.fantasia} onChange={(e) => setBulk('fantasia', e.target.value)} className={bulkSelectClass}>
                  <option value="">— non modificare —</option>
                  {FANTASIA_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={bulkLabelClass}>Lavorazione</label>
                <input value={bulkEditValues.lavorazione} onChange={(e) => setBulk('lavorazione', e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
              <div>
                <label className={bulkLabelClass}>Materiale bottoni</label>
                <input value={bulkEditValues.materialeBottoni} onChange={(e) => setBulk('materialeBottoni', e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
              <div>
                <label className={bulkLabelClass}>Nome stampa</label>
                <input value={bulkEditValues.nomeStampa} onChange={(e) => setBulk('nomeStampa', e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
            </div>
          </div>

          <p className={bulkSectionClass}>Certificazioni</p>
          <div className="grid grid-cols-3 gap-3">
            {(['certificazione1', 'certificazione2', 'certificazione3'] as const).map((k, i) => (
              <div key={k}>
                <label className={bulkLabelClass}>Certificazione {i + 1}</label>
                <input value={bulkEditValues[k]} onChange={(e) => setBulk(k, e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
            ))}
          </div>

          <p className={bulkSectionClass}>Prezzi e Logistica</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={bulkLabelClass}>Prezzo costo i.e. (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.costPrice} onChange={(e) => setBulk('costPrice', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Prezzo vendita i.i. (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.retailPrice} onChange={(e) => setBulk('retailPrice', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Costo i.e. con reso (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.costoIeConReso} onChange={(e) => setBulk('costoIeConReso', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Costo i.e. senza reso (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.costoIeSenzaReso} onChange={(e) => setBulk('costoIeSenzaReso', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Fascia di ricarico</label>
              <input value={bulkEditValues.fasciaRicarico} onChange={(e) => setBulk('fasciaRicarico', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Fascia di sconto (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={bulkEditValues.fasciaSconto} onChange={(e) => setBulk('fasciaSconto', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Confezione (pz)</label>
              <input type="number" min="1" step="1" value={bulkEditValues.lotSize} onChange={(e) => setBulk('lotSize', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>IVA (%)</label>
              <select value={bulkEditValues.iva} onChange={(e) => setBulk('iva', e.target.value)} className={bulkSelectClass}>
                <option value="">— non modificare —</option>
                {[0, 4, 5, 10, 22].map((v) => <option key={v} value={String(v)}>{v}%</option>)}
              </select>
            </div>
          </div>

          <p className={bulkSectionClass}>Altri</p>
          <div>
            <label className={bulkLabelClass}>Note</label>
            <textarea value={bulkEditValues.notes} onChange={(e) => setBulk('notes', e.target.value)} placeholder="—" rows={2} className="w-full border border-border rounded px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300 resize-none" />
          </div>
          <div>
            <label className={bulkLabelClass}>Stato</label>
            <select value={bulkEditValues.isActive} onChange={(e) => setBulk('isActive', e.target.value as BulkEditValues['isActive'])} className={bulkSelectClass}>
              <option value="">— non modificare —</option>
              <option value="true">Attivo</option>
              <option value="false">Non attivo</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setShowBulkEdit(false)}>Annulla</Button>
            <Button onClick={handleBulkUpdate} loading={isBulkUpdating}>Applica modifiche</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirm */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Conferma eliminazione" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-primary">
            Sei sicuro di voler eliminare <strong>{selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}</strong>?
            Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Annulla</Button>
            <Button onClick={handleBulkDelete} loading={isBulkDeleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
              Elimina {selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODA Excel Import Modal */}
      <Modal isOpen={showModaImport} onClose={() => !isModaImporting && setShowModaImport(false)} title="Importa prodotti MODA da Excel" size="sm">
        <div className="space-y-4">
          {!modaImportResult ? (
            <>
              <p className="text-sm text-gray-600">
                Carica il file Excel compilato (template scaricabile con <strong>Template MODA</strong>).
                I prodotti esistenti (per codice) verranno aggiornati; quelli nuovi verranno creati.
              </p>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isModaImporting ? 'opacity-50 pointer-events-none' : 'hover:bg-cream border-border'}`}>
                {isModaImporting ? (
                  <><Loader2 size={24} className="animate-spin text-accent mb-2" /><span className="text-sm text-gray-500">Importazione in corso...</span></>
                ) : (
                  <><Upload size={24} className="text-gray-400 mb-2" /><span className="text-sm text-gray-500">Clicca per selezionare il file .xlsx</span></>
                )}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleModaImport(f); }} disabled={isModaImporting} />
              </label>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setShowModaImport(false)} disabled={isModaImporting}>Chiudi</Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-green-700 font-medium">✓ {modaImportResult.created} creati</span>
                <span className="text-blue-700 font-medium">↺ {modaImportResult.updated} aggiornati</span>
                {modaImportResult.errors.length > 0 && (
                  <span className="text-red-600 font-medium">✕ {modaImportResult.errors.length} errori</span>
                )}
              </div>
              {modaImportResult.errors.length > 0 && (
                <div className="bg-red-50 rounded p-3 max-h-48 overflow-y-auto">
                  {modaImportResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">Riga {e.row} — {e.code || '(vuoto)'}: {e.error}</p>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setModaImportResult(null)}>Importa un altro file</Button>
                <Button onClick={() => setShowModaImport(false)}>Chiudi</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Translate Confirm Modal */}
      <Modal isOpen={showTranslateConfirm} onClose={() => !isTranslatingAll && setShowTranslateConfirm(false)} title="Traduci descrizioni prodotti" size="sm">
        <div className="space-y-4">
          {!isTranslatingAll ? (
            <>
              <p className="text-sm text-gray-600">
                Tradurre automaticamente <strong>{allProducts.filter((p) => !(p as any).descrizioneEn).length} prodotti</strong> con traduzioni mancanti?
                Il servizio è gratuito ma potrebbe richiedere alcuni minuti.
              </p>
              <p className="text-xs text-gray-400">Lingue: EN · DE · FR · ES (via MyMemory API)</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowTranslateConfirm(false)}>Annulla</Button>
                <Button icon={<Languages size={13} />} onClick={handleTranslateAll}>
                  Avvia traduzione
                </Button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <Loader2 size={24} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm font-medium text-primary">
                {translateProgress
                  ? `Tradotti ${translateProgress.done} di ${translateProgress.total} prodotti...`
                  : 'Avvio traduzione...'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Non chiudere questa pagina.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
