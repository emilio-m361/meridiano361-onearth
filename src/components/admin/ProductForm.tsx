'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Loader2, AlertTriangle, X, Plus, Link, Search, ChevronUp, ChevronDown, Wand2, RotateCcw, RotateCw } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import PaeseSelect from '@/components/ui/PaeseSelect';
import Combobox from '@/components/ui/Combobox';
import toast from 'react-hot-toast';
import type { Product, ProductPantoneEntry } from '@/types';
import {
  MODA_GRUPPO_MERCEOLOGICO,
  MODA_FAMIGLIE,
  getModaClassi,
  getModaSottoclassi,
  getModaGruppiOmogenei,
} from '@/lib/modaTassonomia';
import {
  MATERIALE_OPTIONS,
  TAGLIA_OPTIONS,
  CONFERENTE_OPTIONS,
  STAGIONE_OPTIONS,
} from '@/lib/productConstants';
import { splitColori, hasColorSeparator } from '@/lib/coloriUtils';
import { inferHueFromColore } from '@/lib/colorHarmony';
import ProductPantoneForm from './ProductPantoneForm';

const IVA_OPTIONS = [0, 4, 5, 10, 22];

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
}
function rgbDist(h1: string, h2: string) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}
function nearestPantone(targetHex: string, colors: PantoneColor[]): PantoneColor | null {
  let best: PantoneColor | null = null, bestDist = Infinity;
  for (const c of colors) {
    const d = rgbDist(targetHex, c.hex_code);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

function sortedPantones(targetHex: string, colors: PantoneColor[], limit = 20): PantoneColor[] {
  return [...colors]
    .sort((a, b) => rgbDist(targetHex, a.hex_code) - rgbDist(targetHex, b.hex_code))
    .slice(0, limit);
}

interface PantoneColor {
  id: number;
  code: string;
  name: string;
  hex_code: string;
  system_type: string;
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const lbl = 'block text-xs font-medium text-gray-600 mb-1';
const sel = 'w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
const pri = 'w-full h-9 border border-border rounded pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent';

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-2xs font-semibold tracking-widest text-gray-400 mb-3 pt-2">{children}</p>;
}

function Divider() {
  return <div className="border-t border-border/40 my-1" />;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={lbl}>{label}</p>
      <div className="h-9 bg-gray-50 border border-dashed border-border rounded px-3 flex items-center text-sm font-semibold text-accent">
        {value}
      </div>
    </div>
  );
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function canonicalizeMaterial(raw: string): string {
  const lower = raw.toLowerCase();
  return (MATERIALE_OPTIONS as readonly string[]).find((m) => m.toLowerCase() === lower) ?? raw;
}

// Materiale con percentuale (es. "10% Lino") — usato sia per Moda che Casa
function MaterialFieldWithPct({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    const m = (v || '').match(/^(\d+(?:\.\d+)?)\s*%\s+(.+)$/);
    if (m) return { pct: m[1], mat: canonicalizeMaterial(m[2]) };
    const mat = v ? canonicalizeMaterial(v) : '';
    return { pct: '', mat };
  };
  const init = parse(value);
  const isCustomMat = !!init.mat && !(MATERIALE_OPTIONS as readonly string[]).includes(init.mat);
  const [pct, setPct] = useState(init.pct);
  const [selectVal, setSelectVal] = useState(isCustomMat ? 'Altro' : init.mat);
  const [custom, setCustom] = useState(isCustomMat ? init.mat : '');

  function emit(newPct: string, matName: string) {
    if (!matName) { onChange(''); return; }
    onChange(newPct ? `${newPct}% ${matName}` : matName);
  }
  const matName = selectVal === 'Altro' ? custom : selectVal;

  return (
    <div>
      <label className={lbl}>{label}</label>
      <div className="flex gap-1.5">
        <div className="relative w-20 flex-shrink-0">
          <input
            type="number" min="0" max="100" step="1"
            value={pct}
            onChange={(e) => { setPct(e.target.value); emit(e.target.value, matName); }}
            placeholder="0"
            className="w-full h-9 border border-border rounded pl-2 pr-5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
        </div>
        <div className="flex-1">
          <select
            value={selectVal}
            onChange={(e) => {
              const v = e.target.value;
              setSelectVal(v);
              if (v !== 'Altro') { setCustom(''); emit(pct, v); }
            }}
            className={sel}
          >
            <option value="">— nessuno —</option>
            {MATERIALE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="Altro">Altro</option>
          </select>
          {selectVal === 'Altro' && (
            <input
              type="text" value={custom}
              onChange={(e) => { setCustom(e.target.value); emit(pct, e.target.value); }}
              onBlur={(e) => { const n = capitalizeFirst(e.target.value); setCustom(n); emit(pct, n); }}
              placeholder="Specifica materiale…"
              className="mt-1.5 w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z
  .object({
    code: z.string().min(1, 'Codice obbligatorio'),
    name: z.string().min(1, 'Nome obbligatorio'),
    description: z.string().optional(),
    misura: z.string().optional(),
    forma: z.string().optional(),
    taglia: z.string().optional(),
    produttore: z.string().optional(),
    paese: z.string().optional(),
    collezione: z.string().optional(),
    stagione: z.string().optional(),
    gruppoMerceologico: z.string().optional(),
    famiglia: z.string().optional(),
    classe: z.string().optional(),
    sottoclasse: z.string().optional(),
    gruppoOmogeneo: z.string().optional(),
    dettaglio: z.string().optional(),
    nomLinea: z.string().optional(),
    modello: z.string().optional(),
    colore: z.string().optional(),
    colore2: z.string().optional(),
    colore3: z.string().optional(),
    altriColori: z.string().optional(),
    lavorazione: z.string().optional(),
    materiale1: z.string().optional(),
    materiale2: z.string().optional(),
    materiale3: z.string().optional(),
    composizione: z.string().optional(),
    certificazione1: z.string().optional(),
    certificazione2: z.string().optional(),
    certificazione3: z.string().optional(),
    fantasia: z.string().optional(),
    materialeBottoni: z.string().optional(),
    nomeStampa: z.string().optional(),
    materiale1Bio: z.boolean().default(false),
    materiale2Bio: z.boolean().default(false),
    materiale3Bio: z.boolean().default(false),
    temaColore:   z.string().optional(),
    temaColore2:  z.string().optional(),
    temaColore3:  z.string().optional(),
    temaColore4:  z.string().optional(),
    temaColore5:  z.string().optional(),
    temaColore6:  z.string().optional(),
    temaColore7:  z.string().optional(),
    temaColore8:  z.string().optional(),
    temaColore9:  z.string().optional(),
    temaColore10: z.string().optional(),
    costoIeSenzaReso: z.string().min(1, 'Obbligatorio'),
    costoIeConReso: z.string().optional(),
    costPrice: z.string().optional().transform((v) => (v ? Number(v) : 0)),
    iva: z.string().default('22').transform(Number),
    retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    fasciaRicarico: z.string().optional(),
    fasciaSconto: z.string().optional(),
    conferente: z.string().optional(),
    lotSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    tranche: z.string().optional(),
    notes: z.string().optional(),
    imageUrl:  z.string().optional(),
    imageUrl2: z.string().optional(),
    imageUrl3: z.string().optional(),
    imageUrl4: z.string().optional(),
    imageUrl5: z.string().optional(),
    isActive: z.boolean().default(true),
    isContinuativo: z.boolean().default(false),
  })
  .refine(
    (d) => {
      const cost = d.costoIeSenzaReso ? Number(d.costoIeSenzaReso) : 0;
      if (!cost || !d.retailPrice) return true;
      return d.retailPrice >= cost * (1 + d.iva / 100) - 0.001;
    },
    { message: 'Prezzo di vendita i.i. inferiore al costo × (1 + IVA%)', path: ['retailPrice'] }
  );

type FormValues = z.input<typeof schema>;

interface ProductFormProps {
  product?: Product;
  initialValues?: { gruppoMerceologico?: string };
  duplicateSource?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

type SizeVariant = { taglia: string; codice: string };

const TEMA_FIELDS = [
  'temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5',
  'temaColore6', 'temaColore7', 'temaColore8', 'temaColore9', 'temaColore10',
] as const;

function extractMatName(raw: string): string {
  const m = (raw || '').match(/^(?:\d+(?:\.\d+)?\s*%\s+)?(.+)$/);
  return m ? m[1].toLowerCase() : '';
}

function extractPct(raw: string): number {
  const m = (raw || '').match(/^(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : 0;
}

function buildComposizione(mat1: string, mat2: string, mat3: string): string {
  const mats = [mat1, mat2, mat3].filter(Boolean);
  if (mats.length === 1) return '100%';
  return mats.join(', ');
}

function buildModaName(
  dettaglio: string, modello: string,
  mat1: string, mat2: string, mat3: string,
  colore: string, taglia: string, forma: string
): string {
  const mats = [mat1, mat2, mat3].map(extractMatName).filter(Boolean).join(' ');
  const parts = [
    dettaglio ? (dettaglio.charAt(0).toUpperCase() + dettaglio.slice(1).toLowerCase()) : '',
    modello ? modello.toUpperCase() : '',
    mats,
    colore ? colore.toLowerCase() : '',
    forma ? forma.toLowerCase() : '',
    taglia ? taglia.toUpperCase() : '',
  ].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export default function ProductForm({ product, initialValues, duplicateSource, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const queryClient = useQueryClient();
  const p = product as any;
  const dup = duplicateSource as any;
  const src = p ?? dup; // source for pre-filling (edit or duplicate)
  const isModaInit = (src?.gruppoMerceologico ?? initialValues?.gruppoMerceologico ?? '').toLowerCase() === MODA_GRUPPO_MERCEOLOGICO.toLowerCase();

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const fileInputRef4 = useRef<HTMLInputElement>(null);
  const fileInputRef5 = useRef<HTMLInputElement>(null);
  const [imagePreview,  setImagePreview]  = useState<string>(product?.imageUrl || '');
  const [isUploading,   setIsUploading]   = useState(false);
  const [isUploading2,  setIsUploading2]  = useState(false);
  const [isUploading3,  setIsUploading3]  = useState(false);
  const [isUploading4,  setIsUploading4]  = useState(false);
  const [isUploading5,  setIsUploading5]  = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedColorBlocks, setSelectedColorBlocks] = useState<Set<number>>(
    () => new Set<number>(src?.colorBlockIds ?? [])
  );
  // Casa: flat array managed by ProductPantoneForm
  const [selectedPantones, setSelectedPantones] = useState<ProductPantoneEntry[]>(
    () => isModaInit ? [] : (src?.pantoneColors ?? [])
  );
  // Moda: 3 fixed slots, one per colore
  const [pantoneSlots, setPantoneSlots] = useState<(ProductPantoneEntry | null)[]>(() => {
    const existing = isModaInit ? ((src?.pantoneColors ?? []) as ProductPantoneEntry[]) : [];
    return [existing[0] ?? null, existing[1] ?? null, existing[2] ?? null];
  });
  const [pantoneError, setPantoneError] = useState<string | null>(null);
  const [pantoneProposal, setPantoneProposal] = useState<{
    candidates: PantoneColor[];
    idx: number;
    pendingValues: any;
  } | null>(null);
  const forcedPantoneRef = useRef<ProductPantoneEntry[] | null>(null);
  // true = filled automatically (from color match or migration); false = manually chosen or empty
  const [pantoneAutoFilled, setPantoneAutoFilled] = useState<[boolean, boolean, boolean]>(() => {
    const existing = isModaInit ? (src?.pantoneColors ?? []) : [];
    return [
      !!(existing[0] as any)?.isAutoFilled,
      !!(existing[1] as any)?.isAutoFilled,
      !!(existing[2] as any)?.isAutoFilled,
    ] as [boolean, boolean, boolean];
  });
  // true = user manually touched this slot → don't auto-override
  const [pantoneManuallySet, setPantoneManuallySet] = useState<[boolean, boolean, boolean]>(() => {
    const existing = isModaInit ? (src?.pantoneColors ?? []) : [];
    return [!!existing[0], !!existing[1], !!existing[2]] as [boolean, boolean, boolean];
  });

  function setPantoneSlot(i: number, entry: ProductPantoneEntry | null) {
    setPantoneSlots((prev) => { const n = [...prev] as (ProductPantoneEntry | null)[]; n[i] = entry; return n; });
    if (entry) setPantoneError(null);
  }

  function handleManualPantone(i: number, entry: ProductPantoneEntry | null) {
    setPantoneSlot(i, entry);
    setPantoneManuallySet((prev) => { const n = [...prev] as [boolean, boolean, boolean]; n[i] = true; return n; });
    setPantoneAutoFilled((prev) => { const n = [...prev] as [boolean, boolean, boolean]; n[i] = false; return n; });
  }

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  type Snapshot = {
    values: Record<string, any>;
    pantoneSlots: (ProductPantoneEntry | null)[];
    colorBlocks: number[];
    sizeVariants: SizeVariant[];
    selectedPantones: ProductPantoneEntry[];
    pantoneManuallySet: [boolean, boolean, boolean];
  };
  const historyRef    = useRef<Snapshot[]>([]);
  const historyIdxRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [noLinea, setNoLinea] = useState(false);

  const [fotoPicker, setFotoPicker] = useState<{
    slot: 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5' | null;
    options: { url: string; name: string }[];
    loading: boolean;
  }>({ slot: null, options: [], loading: false });
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>(() => {
    const raw = src?.sizeVariants;
    if (!Array.isArray(raw)) return [];
    if (duplicateSource) return raw.map((v: SizeVariant) => ({ taglia: v.taglia, codice: '' }));
    return raw;
  });

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: colorBlocks } = useQuery<{ id: number; name: string; sort_order: number }[]>({
    queryKey: ['color-blocks'],
    queryFn: async () => (await (await fetch('/api/color-blocks')).json()).data,
    staleTime: 300_000,
  });

  const { data: gmOptions } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['cls-gm-options'],
    queryFn: async () => (await (await fetch('/api/classificazione/gruppoMerceologico')).json()).data,
    staleTime: 60_000,
  });

  // Same query key as SinglePantoneField → cache hit; isModaInit avoids forward-reference to isModa
  const { data: allPantoneColors = [] } = useQuery<PantoneColor[]>({
    queryKey: ['pantone-colors-fhi-tcx'],
    queryFn: async () => (await (await fetch('/api/pantone-colors')).json()).data ?? [],
    staleTime: 600_000,
    enabled: isModaInit,
  });

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: src ? {
      code: product ? product.code : '',
      name: src.name || '',
      description: src.description || '',
      misura: src.misura || '',
      forma: src.forma || '',
      taglia: src.taglia || '',
      produttore: src.produttore || '',
      paese: src.paese || '',
      collezione: src.collezione || '',
      stagione: src.stagione || '',
      gruppoMerceologico: src.gruppoMerceologico || '',
      famiglia: src.famiglia || '',
      classe: src.classe || '',
      sottoclasse: src.sottoclasse || '',
      gruppoOmogeneo: src.gruppoOmogeneo || '',
      dettaglio: src.dettaglio || '',
      nomLinea: src.nomLinea || '',
      modello: src.modello || '',
      // Auto-split combined colors (e.g. "avorio/giallo/blu"): slash in colore1 is always wrong, always split.
      ...(() => {
        const raw1 = src.colore || '';
        const raw2 = src.colore2 || '';
        const raw3 = src.colore3 || '';
        if (raw1 && hasColorSeparator(raw1)) {
          const [c1, c2, c3] = splitColori(raw1);
          return { colore: capitalizeFirst(c1), colore2: capitalizeFirst(c2), colore3: capitalizeFirst(c3) };
        }
        return { colore: raw1, colore2: raw2, colore3: raw3 };
      })(),
      altriColori: src.altriColori || '',
      lavorazione: src.lavorazione || '',
      materiale1: src.materiale1 || '',
      materiale2: src.materiale2 || '',
      materiale3: src.materiale3 || '',
      composizione: src.composizione || '',
      certificazione1: src.certificazione1 || '',
      certificazione2: src.certificazione2 || '',
      certificazione3: src.certificazione3 || '',
      fantasia: src.fantasia || (isModaInit ? 'TINTA UNITA' : ''),
      materialeBottoni: src.materialeBottoni || '',
      nomeStampa: src.nomeStampa || '',
      materiale1Bio: src.materiale1Bio ?? false,
      materiale2Bio: src.materiale2Bio ?? false,
      materiale3Bio: src.materiale3Bio ?? false,
      temaColore:   src.temaColore   || '',
      temaColore2:  src.temaColore2  || '',
      temaColore3:  src.temaColore3  || '',
      temaColore4:  src.temaColore4  || '',
      temaColore5:  src.temaColore5  || '',
      temaColore6:  src.temaColore6  || '',
      temaColore7:  src.temaColore7  || '',
      temaColore8:  src.temaColore8  || '',
      temaColore9:  src.temaColore9  || '',
      temaColore10: src.temaColore10 || '',
      costoIeSenzaReso: src.costoIeSenzaReso != null ? String(src.costoIeSenzaReso) : String(src.costPrice ?? ''),
      costoIeConReso: src.costoIeConReso != null ? String(src.costoIeConReso) : '',
      costPrice: src.costoIeSenzaReso != null ? String(src.costoIeSenzaReso) : String(src.costPrice ?? ''),
      iva: String(src.iva ?? 22),
      retailPrice: String(src.retailPrice ?? ''),
      fasciaRicarico: src.fasciaRicarico || '',
      fasciaSconto: src.fasciaSconto != null ? String(src.fasciaSconto) : '',
      conferente: src.conferente || '',
      lotSize: String(src.lotSize ?? 1),
      tranche: src.tranche || '',
      notes: src.notes || '',
      // photos cleared when duplicating
      imageUrl:  product ? (product.imageUrl  || '') : '',
      imageUrl2: product ? (product.imageUrl2 || '') : '',
      imageUrl3: product ? (product.imageUrl3 || '') : '',
      imageUrl4: product ? (product.imageUrl4 || '') : '',
      imageUrl5: product ? (product.imageUrl5 || '') : '',
      isActive: src.isActive ?? true,
      isContinuativo: src.isContinuativo ?? false,
    } : { isActive: true, isContinuativo: false, lotSize: '1', iva: '22', gruppoMerceologico: initialValues?.gruppoMerceologico ?? '' },
  });

  // ── Watchers ─────────────────────────────────────────────────────────────
  const watchedGm             = watch('gruppoMerceologico');
  const watchedFamiglia       = watch('famiglia');
  const watchedClasse         = watch('classe');
  const watchedSottoclasse    = watch('sottoclasse');
  const watchedGruppoOmogeneo = watch('gruppoOmogeneo');
  const watchedImageUrl       = watch('imageUrl');
  const watchedProduttore     = watch('produttore');
  const watchedCost           = watch('costPrice');
  const watchedRetail         = watch('retailPrice');
  const watchedIva            = watch('iva');
  const watchedCostoConReso   = watch('costoIeConReso');
  const watchedCode           = watch('code');
  // Moda auto-name sources
  const watchedDettaglio = watch('dettaglio');
  const watchedModello   = watch('modello');
  const watchedColore    = watch('colore');
  const watchedColore2   = watch('colore2');
  const watchedColore3   = watch('colore3');
  const watchedTaglia    = watch('taglia');
  const watchedForma     = watch('forma');
  const watchedCollezione = watch('collezione');
  const watchedMat1      = watch('materiale1');
  const watchedMat2      = watch('materiale2');
  const watchedMat3      = watch('materiale3');

  const isModa = ((isEdit ? (watchedGm ?? product?.gruppoMerceologico) : watchedGm) ?? '').toLowerCase() === MODA_GRUPPO_MERCEOLOGICO.toLowerCase();
  const codeChanged = isEdit && !!product && watchedCode !== product.code;

  const modaClassi         = isModa ? getModaClassi(watchedFamiglia || '') : [];
  const modaSottoclassi    = isModa ? getModaSottoclassi(watchedFamiglia || '', watchedClasse || '') : [];
  const modaGruppiOmogenei = isModa ? getModaGruppiOmogenei(watchedFamiglia || '', watchedClasse || '', watchedSottoclasse || '') : [];

  useEffect(() => {
    setImagePreview((prev) => {
      if (watchedImageUrl && watchedImageUrl !== prev) return watchedImageUrl;
      if (!watchedImageUrl) return '';
      return prev;
    });
  }, [watchedImageUrl]);

  // Auto-fill Pantone slots from Italian color names when pantone colors are loaded
  useEffect(() => {
    if (!isModa || !allPantoneColors.length || !watchedColore?.trim() || pantoneManuallySet[0]) return;
    const hue = inferHueFromColore(watchedColore);
    if (!hue) return;
    const match = nearestPantone(hue.hex, allPantoneColors);
    if (!match) return;
    setPantoneSlot(0, { pantoneColorId: match.id, code: match.code, name: match.name, hex_code: match.hex_code, system_type: match.system_type, sortOrder: 0, isPrimary: true, isAutoFilled: true });
    setPantoneAutoFilled(prev => { const n = [...prev] as [boolean, boolean, boolean]; n[0] = true; return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedColore, allPantoneColors.length]);

  useEffect(() => {
    if (!isModa || !allPantoneColors.length || !watchedColore2?.trim() || pantoneManuallySet[1]) return;
    const hue = inferHueFromColore(watchedColore2);
    if (!hue) return;
    const match = nearestPantone(hue.hex, allPantoneColors);
    if (!match) return;
    setPantoneSlot(1, { pantoneColorId: match.id, code: match.code, name: match.name, hex_code: match.hex_code, system_type: match.system_type, sortOrder: 1, isPrimary: false, isAutoFilled: true });
    setPantoneAutoFilled(prev => { const n = [...prev] as [boolean, boolean, boolean]; n[1] = true; return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedColore2, allPantoneColors.length]);

  useEffect(() => {
    if (!isModa || !allPantoneColors.length || !watchedColore3?.trim() || pantoneManuallySet[2]) return;
    const hue = inferHueFromColore(watchedColore3);
    if (!hue) return;
    const match = nearestPantone(hue.hex, allPantoneColors);
    if (!match) return;
    setPantoneSlot(2, { pantoneColorId: match.id, code: match.code, name: match.name, hex_code: match.hex_code, system_type: match.system_type, sortOrder: 2, isPrimary: false, isAutoFilled: true });
    setPantoneAutoFilled(prev => { const n = [...prev] as [boolean, boolean, boolean]; n[2] = true; return n; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedColore3, allPantoneColors.length]);

  // ── Undo/Redo effects ────────────────────────────────────────────────────
  // Debounced snapshot: fires 800ms after any form value or external state changes
  const formJson = JSON.stringify(watch());
  useEffect(() => {
    if (isRestoringRef.current) return;
    const timer = setTimeout(() => {
      const snap: Snapshot = {
        values: getValues(),
        pantoneSlots: pantoneSlots,
        colorBlocks: Array.from(selectedColorBlocks),
        sizeVariants: sizeVariants,
        selectedPantones: selectedPantones,
        pantoneManuallySet: pantoneManuallySet,
      };
      historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
      if (historyRef.current.length >= 50) historyRef.current.shift();
      else historyIdxRef.current++;
      historyRef.current[historyIdxRef.current] = snap;
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(false);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formJson, pantoneSlots, selectedColorBlocks, sizeVariants, selectedPantones]);

  // Initial snapshot (empty history → index 0 = "pristine" state)
  useEffect(() => {
    const timer = setTimeout(() => {
      const snap: Snapshot = {
        values: getValues(),
        pantoneSlots: pantoneSlots,
        colorBlocks: Array.from(selectedColorBlocks),
        sizeVariants: sizeVariants,
        selectedPantones: selectedPantones,
        pantoneManuallySet: pantoneManuallySet,
      };
      historyRef.current = [snap];
      historyIdxRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === 'z' && !e.shiftKey) {
        if (historyIdxRef.current <= 0) return;
        e.preventDefault();
        historyIdxRef.current--;
        const snap = historyRef.current[historyIdxRef.current];
        isRestoringRef.current = true;
        reset(snap.values as any);
        setPantoneSlots(snap.pantoneSlots);
        setSelectedColorBlocks(new Set(snap.colorBlocks));
        setSizeVariants(snap.sizeVariants);
        setSelectedPantones(snap.selectedPantones);
        setPantoneManuallySet(snap.pantoneManuallySet);
        setPantoneAutoFilled([false, false, false]);
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
        setTimeout(() => { isRestoringRef.current = false; }, 100);
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        if (historyIdxRef.current >= historyRef.current.length - 1) return;
        e.preventDefault();
        historyIdxRef.current++;
        const snap = historyRef.current[historyIdxRef.current];
        isRestoringRef.current = true;
        reset(snap.values as any);
        setPantoneSlots(snap.pantoneSlots);
        setSelectedColorBlocks(new Set(snap.colorBlocks));
        setSizeVariants(snap.sizeVariants);
        setSelectedPantones(snap.selectedPantones);
        setPantoneManuallySet(snap.pantoneManuallySet);
        setPantoneAutoFilled([false, false, false]);
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
        setTimeout(() => { isRestoringRef.current = false; }, 100);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modaNameMountRef = useRef(true);
  useEffect(() => {
    if (modaNameMountRef.current) { modaNameMountRef.current = false; return; }
    if (!isModa) return;
    const tagliaForName = sizeVariants.length > 0 ? '' : (watchedTaglia || '');
    const auto = buildModaName(
      watchedDettaglio || '', watchedModello || '',
      watchedMat1 || '', watchedMat2 || '', watchedMat3 || '',
      watchedColore || '', tagliaForName, watchedForma || ''
    );
    if (auto) setValue('name', auto, { shouldDirty: true });
  }, [watchedDettaglio, watchedModello, watchedMat1, watchedMat2, watchedMat3, watchedColore, watchedTaglia, watchedForma, sizeVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  const composizioneMountRef = useRef(true);
  useEffect(() => {
    if (composizioneMountRef.current) { composizioneMountRef.current = false; return; }
    if (!isModa) return;
    setValue('composizione', buildComposizione(watchedMat1 || '', watchedMat2 || '', watchedMat3 || ''), { shouldDirty: true });
  }, [watchedMat1, watchedMat2, watchedMat3]); // eslint-disable-line react-hooks/exhaustive-deps

  // Imposta fantasia di default TINTA UNITA per prodotti MODA senza fantasia
  useEffect(() => {
    if (!isModa) return;
    if (!getValues('fantasia')?.trim()) setValue('fantasia', 'TINTA UNITA', { shouldDirty: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModa]);

  // Deduce la stagione dal prefisso della collezione (pe → PE, ai → AI)
  useEffect(() => {
    const prefix = (watchedCollezione || '').trim().slice(0, 2).toLowerCase();
    if (prefix === 'pe') setValue('stagione', 'PE', { shouldDirty: true });
    else if (prefix === 'ai') setValue('stagione', 'AI', { shouldDirty: true });
  }, [watchedCollezione]); // eslint-disable-line react-hooks/exhaustive-deps

  // In multi-taglia mode, il campo `code` si sincronizza dal codice della prima variante
  const svCodeMountRef = useRef(true);
  useEffect(() => {
    if (svCodeMountRef.current) { svCodeMountRef.current = false; return; }
    if (!isModa || sizeVariants.length === 0) return;
    const firstCode = sizeVariants[0]?.codice;
    if (firstCode) setValue('code', firstCode, { shouldDirty: true });
  }, [sizeVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!watchedProduttore?.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/produttori/paese?nome=${encodeURIComponent(watchedProduttore.trim())}`);
        const { paese } = await res.json();
        if (paese) setValue('paese', paese, { shouldDirty: true });
      } catch { /* silently ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedProduttore]); // eslint-disable-line react-hooks/exhaustive-deps

  function normalizeProduttore(v: string) {
    const t = v.trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  // ── Computed price values ─────────────────────────────────────────────────
  const costNum         = parseFloat(String(watchedCost || 0)) || 0;
  const retailNum       = parseFloat(String(watchedRetail || 0)) || 0;
  const ivaNum          = parseInt(String(watchedIva || 22), 10) || 0;
  const pvn             = retailNum > 0 ? retailNum / (1 + ivaNum / 100) : 0;
  const ricarico        = costNum > 0 && pvn > 0 ? ((pvn - costNum) / costNum) * 100 : null;
  const margine         = pvn > 0 && costNum > 0 ? ((pvn - costNum) / pvn) * 100 : null;
  const guadagno        = pvn > 0 && costNum > 0 ? pvn - costNum : null;
  const costoConReso    = parseFloat(String(watchedCostoConReso || 0)) || 0;
  const ricaricoConReso = costoConReso > 0 && pvn > 0 ? ((pvn - costoConReso) / costoConReso) * 100 : null;
  const margineConReso  = pvn > 0 && costoConReso > 0 ? ((pvn - costoConReso) / pvn) * 100 : null;
  const guadagnoConReso = pvn > 0 && costoConReso > 0 ? pvn - costoConReso : null;

  const fmtPct  = (v: number | null) => v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const fmtEuro = (v: number | null) => v === null ? '—' : `€ ${v.toFixed(2).replace('.', ',')}`;

  // ── Register refs ─────────────────────────────────────────────────────────
  const costPriceReg      = register('costPrice');
  const retailPriceReg    = register('retailPrice');
  const ivaReg            = register('iva');
  const fasciaScReg       = register('fasciaSconto');
  const fasciaRicaricoReg = register('fasciaRicarico');
  const costoSenzaResoReg = register('costoIeSenzaReso');

  // ── Price handlers ────────────────────────────────────────────────────────
  function handleCostoChange(e: React.ChangeEvent<HTMLInputElement>) {
    costoSenzaResoReg.onChange(e);
    const cost = parseFloat(e.target.value);
    setValue('costPrice', e.target.value || '');
    if (!isNaN(cost) && pvn > 0) {
      setValue('fasciaRicarico', ((pvn - cost) / cost * 100).toFixed(1));
      setValue('fasciaSconto',   ((1 - cost / pvn) * 100).toFixed(2));
    } else if (!e.target.value) {
      setValue('fasciaRicarico', '');
      setValue('fasciaSconto', '');
    }
  }

  function handleRetailChange(e: React.ChangeEvent<HTMLInputElement>) {
    retailPriceReg.onChange(e);
    const newRetail = parseFloat(e.target.value);
    const sconto = parseFloat(String(getValues('fasciaSconto') || ''));
    if (!isNaN(sconto) && !isNaN(newRetail) && newRetail > 0) {
      const newPvn  = newRetail / (1 + ivaNum / 100);
      const newCost = Math.max(0, newPvn * (1 - sconto / 100));
      setValue('costPrice', newCost.toFixed(2));
      setValue('costoIeSenzaReso', newCost.toFixed(2));
      if (newCost > 0) setValue('fasciaRicarico', ((newPvn - newCost) / newCost * 100).toFixed(1));
    }
  }

  function handleIvaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    ivaReg.onChange(e);
    const newIva  = parseInt(e.target.value, 10) || 0;
    const sconto  = parseFloat(String(getValues('fasciaSconto') || ''));
    if (!isNaN(sconto) && retailNum > 0) {
      const newPvn  = retailNum / (1 + newIva / 100);
      const newCost = Math.max(0, newPvn * (1 - sconto / 100));
      setValue('costPrice', newCost.toFixed(2));
      setValue('costoIeSenzaReso', newCost.toFixed(2));
      if (newCost > 0) setValue('fasciaRicarico', ((newPvn - newCost) / newCost * 100).toFixed(1));
    }
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  async function uploadFile(
    file: File,
    field: 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5',
    setLoading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Caricamento fallito');
      const { url } = await res.json();
      setValue(field, url, { shouldDirty: true });
      toast.success('Immagine caricata');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const handleFile  = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl',  setIsUploading,  fileInputRef); };
  const handleFile2 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl2', setIsUploading2, fileInputRef2); };
  const handleFile3 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl3', setIsUploading3, fileInputRef3); };
  const handleFile4 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl4', setIsUploading4, fileInputRef4); };
  const handleFile5 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl5', setIsUploading5, fileInputRef5); };

  // ── Foto swap / compact ──────────────────────────────────────────────────
  const PHOTO_FIELDS = ['imageUrl', 'imageUrl2', 'imageUrl3', 'imageUrl4', 'imageUrl5'] as const;
  function swapPhotos(i: number, j: number) {
    const urlA = watch(PHOTO_FIELDS[i]) || '';
    const urlB = watch(PHOTO_FIELDS[j]) || '';
    setValue(PHOTO_FIELDS[i], urlB, { shouldDirty: true });
    setValue(PHOTO_FIELDS[j], urlA, { shouldDirty: true });
  }
  function compactPhotos() {
    const filled = PHOTO_FIELDS.map((f) => watch(f)).filter(Boolean) as string[];
    PHOTO_FIELDS.forEach((f, i) => setValue(f, filled[i] ?? '', { shouldDirty: true }));
  }
  function removePhoto(field: typeof PHOTO_FIELDS[number]) {
    setValue(field, '', { shouldDirty: true });
    // Defer so the cleared value is committed before compacting
    setTimeout(compactPhotos, 0);
  }

  // ── Foto picker ──────────────────────────────────────────────────────────
  async function openFotoPicker(field: 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5') {
    const code = watch('code');
    setFotoPicker({ slot: field, options: [], loading: true });
    try {
      const res = await fetch('/api/admin/foto');
      if (!res.ok) throw new Error();
      const { data } = await res.json() as { data: { url: string; name: string; parsedCode: string | null; status: string }[] };
      const matching = data.filter((f) =>
        f.status !== 'in-uso' &&
        (!code || f.parsedCode?.toUpperCase() === code.toUpperCase())
      );
      setFotoPicker({ slot: field, options: matching.map((f) => ({ url: f.url, name: f.name })), loading: false });
    } catch {
      setFotoPicker({ slot: null, options: [], loading: false });
      toast.error('Errore nel caricamento delle foto');
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    const v = values as unknown as z.output<typeof schema>;

    // Compact photos: eliminate gaps (e.g. slot1 empty + slot3 filled → move to slot1)
    const compactedPhotos = (
      [v.imageUrl, v.imageUrl2, v.imageUrl3, v.imageUrl4, v.imageUrl5].filter(Boolean) as string[]
    );
    v.imageUrl  = compactedPhotos[0] ?? '';
    v.imageUrl2 = compactedPhotos[1] ?? '';
    v.imageUrl3 = compactedPhotos[2] ?? '';
    v.imageUrl4 = compactedPhotos[3] ?? '';
    v.imageUrl5 = compactedPhotos[4] ?? '';
    // Reflect compaction back to form so the UI shows the correct order
    PHOTO_FIELDS.forEach((f, i) => setValue(f, compactedPhotos[i] ?? '', { shouldDirty: false }));

    const isModaProduct = (v.gruppoMerceologico ?? '').toLowerCase() === 'moda';
    const forced = forcedPantoneRef.current;
    forcedPantoneRef.current = null;
    const finalPantones: ProductPantoneEntry[] = forced ?? (isModaProduct
      ? (pantoneSlots.filter(Boolean) as ProductPantoneEntry[]).map((p, i) => ({ ...p, sortOrder: i, isPrimary: i === 0 }))
      : selectedPantones);
    setPantoneError(null);

    if (isModaProduct) {
      const missing: string[] = [];
      if (!(v as any).dettaglio?.trim())  missing.push('Tipo');
      if (!noLinea && !v.nomLinea?.trim())  missing.push('Linea');
      if (!(v as any).materiale1?.trim()) missing.push('Materiale 1');
      if (!v.colore?.trim())              missing.push('Colore');
      if (v.famiglia === 'Abbigliamento' && sizeVariants.length === 0 && !(v as any).taglia?.trim()) missing.push('Taglia');
      if (missing.length > 0) {
        toast.error(`Campi obbligatori per MODA mancanti: ${missing.join(', ')}`);
        return;
      }

      // Se nessun Pantone selezionato, proponi il migliore automaticamente
      if (finalPantones.length === 0 && !forced && allPantoneColors.length > 0) {
        const hue = inferHueFromColore(v.colore || '');
        const candidates = sortedPantones(hue?.hex ?? '#888888', allPantoneColors, 20);
        if (candidates.length > 0) {
          setPantoneProposal({ candidates, idx: 0, pendingValues: values });
          return;
        }
      }
    }

    try {
      const url    = isEdit ? `/api/products/${product!.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...v,
          skipNameNormalization: isEdit,
          description:    (v as any).description    || null,
          misura:         v.misura         || null,
          forma:          (v as any).forma          || null,
          altriColori:    (v as any).altriColori    || null,
          taglia:         (v as any).taglia         || null,
          produttore:     v.produttore     || null,
          paese:          v.paese          || null,
          collezione:     v.collezione     || null,
          stagione:       v.stagione       || null,
          gruppoMerceologico: v.gruppoMerceologico || null,
          famiglia:       v.famiglia       || null,
          classe:         v.classe         || null,
          sottoclasse:    v.sottoclasse    || null,
          gruppoOmogeneo: v.gruppoOmogeneo || null,
          dettaglio:      (v as any).dettaglio      || null,
          nomLinea:       v.nomLinea       || null,
          modello:        (v as any).modello        || null,
          colore:         v.colore         || null,
          lavorazione:    (v as any).lavorazione    || null,
          materiale1:     (v as any).materiale1     || null,
          materiale2:     (v as any).materiale2     || null,
          materiale3:     (v as any).materiale3     || null,
          composizione:   (v as any).composizione   || null,
          certificazione1:(v as any).certificazione1|| null,
          certificazione2:(v as any).certificazione2|| null,
          certificazione3:(v as any).certificazione3|| null,
          fantasia:       (v as any).fantasia       || null,
          materialeBottoni: (v as any).materialeBottoni || null,
          nomeStampa:       (v as any).nomeStampa       || null,
          materiale1Bio:    (v as any).materiale1Bio    ?? false,
          materiale2Bio:    (v as any).materiale2Bio    ?? false,
          materiale3Bio:    (v as any).materiale3Bio    ?? false,
          temaColore:     v.temaColore     || null,
          temaColore2:    (v as any).temaColore2    || null,
          temaColore3:    (v as any).temaColore3    || null,
          temaColore4:    (v as any).temaColore4    || null,
          temaColore5:    (v as any).temaColore5    || null,
          temaColore6:    (v as any).temaColore6    || null,
          temaColore7:    (v as any).temaColore7    || null,
          temaColore8:    (v as any).temaColore8    || null,
          temaColore9:    (v as any).temaColore9    || null,
          temaColore10:   (v as any).temaColore10   || null,
          costoIeSenzaReso: (v as any).costoIeSenzaReso ? parseFloat((v as any).costoIeSenzaReso) || null : null,
          costoIeConReso:   (v as any).costoIeConReso  ? parseFloat((v as any).costoIeConReso)  || null : null,
          fasciaRicarico: v.fasciaRicarico || null,
          fasciaSconto:   v.fasciaSconto   ? parseFloat(v.fasciaSconto) || null : null,
          conferente:     (v as any).conferente     || null,
          tranche:        v.tranche        || null,
          notes:          v.notes          || null,
          imageUrl:       v.imageUrl       || null,
          imageUrl2:      v.imageUrl2      || null,
          imageUrl3:      v.imageUrl3      || null,
          imageUrl4:      v.imageUrl4      || null,
          imageUrl5:      v.imageUrl5      || null,
          colorBlockIds:   [...selectedColorBlocks],
          pantoneColorIds: finalPantones.map((p) => p.pantoneColorId),
          pantoneAutoFilledFlags: isModaProduct
            ? (() => {
                const filledIndices = pantoneSlots.map((s, i) => s ? i : null).filter((i) => i !== null) as number[];
                return filledIndices.map((si) => pantoneAutoFilled[si]);
              })()
            : undefined,
          sizeVariants:    sizeVariants.filter((sv) => sv.taglia && sv.codice),
          isContinuativo:  (v as any).isContinuativo ?? false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Prodotto aggiornato' : 'Prodotto creato');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Impossibile salvare il prodotto');
    }
  }

  function clearTemaFrom(n: number) {
    for (let i = n - 1; i < TEMA_FIELDS.length; i++) setValue(TEMA_FIELDS[i], '');
  }

  function handleApproveProposal() {
    if (!pantoneProposal) return;
    const c = pantoneProposal.candidates[pantoneProposal.idx];
    const entry: ProductPantoneEntry = {
      pantoneColorId: c.id, code: c.code, name: c.name,
      hex_code: c.hex_code, system_type: c.system_type,
      sortOrder: 0, isPrimary: true, isAutoFilled: true,
    };
    setPantoneSlot(0, entry);
    setPantoneAutoFilled((prev) => { const n = [...prev] as [boolean, boolean, boolean]; n[0] = true; return n; });
    forcedPantoneRef.current = [entry];
    setPantoneProposal(null);
    handleSubmit(onSubmit)();
  }

  function handleNextProposal() {
    if (!pantoneProposal) return;
    const next = pantoneProposal.idx + 1;
    if (next >= pantoneProposal.candidates.length) {
      toast('Nessun altro Pantone disponibile. Selezionane uno manualmente.');
      setPantoneProposal(null);
      return;
    }
    setPantoneProposal((prev) => prev ? { ...prev, idx: next } : null);
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-2">

      {/* ════════════════════════════════════════════════════════════
          ANAGRAFICA
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Anagrafica</SectionLabel>

      {/* Codice + Nome — in Moda con taglia/varianti il codice si sposta accanto alla taglia */}
      {isModa && (watchedTaglia || sizeVariants.length > 0) ? (
        <Input label="Nome *" {...register('name')} error={errors.name?.message} className="bg-gray-50" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Codice *</label>
            <input
              {...register('code')}
              placeholder="OE-CAT-001"
              className="w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
          </div>
          <Input label="Nome *" {...register('name')} error={errors.name?.message} className="bg-gray-50" placeholder={isModa ? '' : 'es. Copritavolo GEOMETRIC 140×240'} />
        </div>
      )}

      {codeChanged && (!isModa || (sizeVariants.length === 0 && !watchedTaglia)) && (
        <div className="flex gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={14} className="flex-shrink-0 text-amber-500 mt-px" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Stai modificando il codice prodotto</p>
            <p>Le immagini già caricate mantengono il vecchio codice nel filename. Futuri import e caricamenti foto devono usare il <span className="font-semibold">nuovo codice</span>.</p>
          </div>
        </div>
      )}

      {/* Moda: Tipo + Modello */}
      {isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Combobox label="Tipo *" field="dettaglio" value={watch('dettaglio') || ''} onChange={(v) => setValue('dettaglio', v)} />
          <div className="space-y-1">
            <Combobox label={noLinea ? 'Linea' : 'Linea *'} field="nomLinea" value={watch('nomLinea') || ''} onChange={(v) => setValue('nomLinea', v)} disabled={noLinea} />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={noLinea} onChange={(e) => { setNoLinea(e.target.checked); if (e.target.checked) setValue('nomLinea', ''); }} className="rounded" />
              Senza linea
            </label>
          </div>
        </div>
      )}

      {/* Casa: Linea */}
      {!isModa && (
        <Combobox label="Linea" field="nomLinea" value={watch('nomLinea') || ''} onChange={(v) => setValue('nomLinea', v)} />
      )}

      {/* Moda: Taglie e codici + Misure | Casa: Misure */}
      {isModa ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className={lbl}>Taglie e codici</p>
              <button
                type="button"
                onClick={() => {
                  if (sizeVariants.length === 0 && watchedTaglia) {
                    // Promuovi a multi-taglia: prima riga con taglia+codice correnti
                    setSizeVariants([
                      { taglia: watchedTaglia, codice: watchedCode || '' },
                      { taglia: '', codice: '' },
                    ]);
                    setValue('taglia', '');
                  } else {
                    setSizeVariants((prev) => [...prev, { taglia: '', codice: '' }]);
                  }
                }}
                className="flex items-center gap-1 text-xs text-accent hover:text-primary transition-colors"
              >
                <Plus size={11} /> Aggiungi
              </button>
            </div>
            {sizeVariants.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Taglia{watchedFamiglia === 'Abbigliamento' ? ' *' : ''}</label>
                  <select {...register('taglia')} className={sel}>
                    <option value="">— nessuna —</option>
                    {TAGLIA_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {watchedTaglia && (
                  <div>
                    <label className={lbl}>Codice *</label>
                    <input
                      {...register('code')}
                      placeholder="es. OE-001"
                      className="w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[5rem_1fr_1.5rem] gap-2">
                  <span className="text-2xs text-gray-400 uppercase tracking-wider">Taglia</span>
                  <span className="text-2xs text-gray-400 uppercase tracking-wider">Codice</span>
                  <span />
                </div>
                {sizeVariants.map((sv, i) => (
                  <div key={i} className="grid grid-cols-[5rem_1fr_1.5rem] gap-2 items-center">
                    <select
                      value={sv.taglia}
                      onChange={(e) => setSizeVariants((prev) => prev.map((v, j) => j === i ? { ...v, taglia: e.target.value } : v))}
                      className={sel}
                    >
                      <option value="">—</option>
                      {TAGLIA_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      type="text"
                      value={sv.codice}
                      onChange={(e) => setSizeVariants((prev) => prev.map((v, j) => j === i ? { ...v, codice: e.target.value } : v))}
                      placeholder="es. 123"
                      className="w-full h-9 border border-border rounded px-3 text-sm font-mono text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setSizeVariants((prev) => prev.filter((_, j) => j !== i))}
                      className="flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-[2fr_3fr] gap-3">
            <Input label="Misure" {...register('misura')} />
            <Input label="Forma" {...register('forma')} placeholder="es. tonda, rettangolare…" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[2fr_3fr] gap-3">
          <Input label="Misure" {...register('misura')} placeholder="es. 30×40 cm" />
          <Input label="Forma" {...register('forma')} placeholder="es. tonda, rettangolare…" />
        </div>
      )}

      {/* Produttore + Paese — solo Casa (Moda lo posiziona dopo lavorazione) */}
      {!isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Combobox label="Produttore" field="produttore" value={watch('produttore') || ''} onChange={(v) => setValue('produttore', normalizeProduttore(v), { shouldDirty: true })} />
          <PaeseSelect label="Paese" value={watch('paese') || ''} onChange={(v) => setValue('paese', v)} />
        </div>
      )}

      {/* ── Moda: campi specifici in Anagrafica ── */}
      {isModa && (
        <>
          {/* Materiali */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <MaterialFieldWithPct label="Materiale 1 *" value={watch('materiale1') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale1', v.slice(0, -4).trim()); setValue('materiale1Bio', true); }
                else { setValue('materiale1', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale1Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
            <div>
              <MaterialFieldWithPct label="Materiale 2" value={watch('materiale2') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale2', v.slice(0, -4).trim()); setValue('materiale2Bio', true); }
                else { setValue('materiale2', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale2Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
            <div>
              <MaterialFieldWithPct label="Materiale 3" value={watch('materiale3') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale3', v.slice(0, -4).trim()); setValue('materiale3Bio', true); }
                else { setValue('materiale3', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale3Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
          </div>

          <input type="hidden" {...register('composizione')} />
          <ReadOnlyField label="Composizione" value={watch('composizione') || '—'} />

          {(() => {
            const tot = extractPct(watchedMat1 || '') + extractPct(watchedMat2 || '') + extractPct(watchedMat3 || '');
            return tot > 0 && Math.round(tot) !== 100 ? (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <span>⚠</span> Le percentuali sommano <strong>{tot.toFixed(0)}%</strong> — devono fare 100%.
              </p>
            ) : null;
          })()}

          {/* Colori + Pantone per colore */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Combobox label="Colore 1 *" field="colore" value={watch('colore') || ''} placeholder="es. rosso" transform={capitalizeFirst}
                onChange={(v) => {
                  if (hasColorSeparator(v)) {
                    const [c1, c2, c3] = splitColori(v);
                    setValue('colore', capitalizeFirst(c1)); setValue('colore2', capitalizeFirst(c2)); setValue('colore3', capitalizeFirst(c3));
                  } else { setValue('colore', v); }
                }} />
              <SinglePantoneField label="Pantone 1 *" value={pantoneSlots[0]} onChange={(v) => handleManualPantone(0, v)} isAutoFilled={pantoneAutoFilled[0]} />
            </div>
            <div className="space-y-2">
              <Combobox label="Colore 2" field="colore" value={watchedColore2 || ''} placeholder="es. blu" transform={capitalizeFirst}
                onChange={(v) => {
                  if (hasColorSeparator(v)) {
                    const [c2, c3] = splitColori(v);
                    setValue('colore2', capitalizeFirst(c2)); setValue('colore3', capitalizeFirst(c3));
                  } else { setValue('colore2', v); }
                }} />
              <SinglePantoneField label="Pantone 2" value={pantoneSlots[1]} onChange={(v) => handleManualPantone(1, v)} isAutoFilled={pantoneAutoFilled[1]} />
            </div>
            <div className="space-y-2">
              <Combobox label="Colore 3" field="colore" value={watchedColore3 || ''} placeholder="es. bianco" transform={capitalizeFirst}
                onChange={(v) => {
                  if (hasColorSeparator(v)) { setValue('colore3', capitalizeFirst(splitColori(v)[0])); }
                  else { setValue('colore3', v); }
                }} />
              <SinglePantoneField label="Pantone 3" value={pantoneSlots[2]} onChange={(v) => handleManualPantone(2, v)} isAutoFilled={pantoneAutoFilled[2]} />
            </div>
          </div>
          <Input label="Altri colori" {...register('altriColori')} placeholder="es. oro, argento, avorio chiaro…" />
          {pantoneError && <p className="text-xs text-red-500">{pantoneError}</p>}

          <Combobox label="Fantasia" field="fantasia" value={watch('fantasia') || ''} onChange={(v) => setValue('fantasia', v)} />

          {['STAMPA', 'STAMPATO'].includes((watch('fantasia') || '').toUpperCase()) && (
            <Input label="Nome stampa" {...register('nomeStampa')} placeholder="es. Fiori selvatici, Geometrico astratto…" />
          )}

          <Combobox label="Lavorazione" field="lavorazione" value={watch('lavorazione') || ''} onChange={(v) => setValue('lavorazione', v)} />

          {watchedFamiglia === 'Abbigliamento' && (
            <Input label="Materiale bottoni" {...register('materialeBottoni')} placeholder="es. COCCO, MADREPERLA, METALLO…" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Certificazione 1" {...register('certificazione1')} placeholder="es. GOTS" />
            <Input label="Certificazione 2" {...register('certificazione2')} placeholder="es. Fair Trade" />
            <Input label="Certificazione 3" {...register('certificazione3')} placeholder="es. Oeko-Tex" />
          </div>

          {/* Produttore + Paese */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Produttore" field="produttore" value={watch('produttore') || ''} onChange={(v) => setValue('produttore', normalizeProduttore(v), { shouldDirty: true })} />
            <PaeseSelect label="Paese" value={watch('paese') || ''} onChange={(v) => setValue('paese', v)} />
          </div>

          <div>
            <label className={lbl}>Note</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Note aggiuntive…"
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
        </>
      )}

      {/* ── Casa: campi specifici in Anagrafica ── */}
      {!isModa && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Combobox label="Colore 1" field="colore" value={watch('colore') || ''} placeholder="es. rosso" transform={capitalizeFirst}
              onChange={(v) => {
                if (hasColorSeparator(v)) {
                  const [c1, c2, c3] = splitColori(v);
                  setValue('colore', capitalizeFirst(c1)); setValue('colore2', capitalizeFirst(c2)); setValue('colore3', capitalizeFirst(c3));
                } else { setValue('colore', v); }
              }} />
            <Combobox label="Colore 2" field="colore" value={watch('colore2') || ''} placeholder="es. blu" transform={capitalizeFirst}
              onChange={(v) => {
                if (hasColorSeparator(v)) {
                  const [c2, c3] = splitColori(v);
                  setValue('colore2', capitalizeFirst(c2)); setValue('colore3', capitalizeFirst(c3));
                } else { setValue('colore2', v); }
              }} />
            <Combobox label="Colore 3" field="colore" value={watch('colore3') || ''} placeholder="es. bianco" transform={capitalizeFirst}
              onChange={(v) => {
                if (hasColorSeparator(v)) { setValue('colore3', capitalizeFirst(splitColori(v)[0])); }
                else { setValue('colore3', v); }
              }} />
          </div>
          <p className="text-2xs text-gray-400 -mt-2">Al maschile: rosso, blu, nero, bianco, beige…</p>
          <Input label="Altri colori" {...register('altriColori')} placeholder="es. oro, argento, avorio chiaro…" />
          <div>
            <Combobox label="Lavorazione" field="lavorazione" value={watch('lavorazione') || ''} onChange={(v) => setValue('lavorazione', v)} />
          </div>

          <div>
            <label className={lbl}>Pantone FHI-TCX</label>
            <ProductPantoneForm
              value={selectedPantones}
              onChange={(v) => { setSelectedPantones(v); if (v.length > 0) setPantoneError(null); }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <MaterialFieldWithPct label="Materiale 1" value={watch('materiale1') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale1', v.slice(0, -4).trim()); setValue('materiale1Bio', true); }
                else { setValue('materiale1', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale1Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
            <div>
              <MaterialFieldWithPct label="Materiale 2" value={watch('materiale2') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale2', v.slice(0, -4).trim()); setValue('materiale2Bio', true); }
                else { setValue('materiale2', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale2Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
            <div>
              <MaterialFieldWithPct label="Materiale 3" value={watch('materiale3') || ''} onChange={(v) => {
                const lower = v.toLowerCase();
                if (lower.endsWith(' bio')) { setValue('materiale3', v.slice(0, -4).trim()); setValue('materiale3Bio', true); }
                else { setValue('materiale3', v); }
              }} />
              <label className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" {...register('materiale3Bio')} className="w-3.5 h-3.5 accent-accent" />
                BIO
              </label>
            </div>
          </div>

          <Input label="Composizione" {...register('composizione')} placeholder="es. 80% cotone, 20% poliestere" />

          <Combobox label="Fantasia" field="fantasia" value={watch('fantasia') || ''} onChange={(v) => setValue('fantasia', v)} />

          <div>
            <label className={lbl}>Note</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Note aggiuntive…"
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
        </>
      )}

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          CLASSIFICAZIONE
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Classificazione</SectionLabel>

      {/* Collezione + Stagione */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Combobox label="Collezione" field="collezione" value={watch('collezione') || ''} onChange={(v) => setValue('collezione', v)} />
        <div>
          <label className={lbl}>Stagione</label>
          <select {...register('stagione')} className={sel}>
            <option value="">— nessuna —</option>
            {STAGIONE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Gruppo merceologico + Famiglia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Gruppo merceologico</label>
          <select
            value={watchedGm || ''}
            onChange={(e) => {
              setValue('gruppoMerceologico', e.target.value, { shouldDirty: true });
              if (!isEdit) { setValue('famiglia', ''); setValue('classe', ''); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }
            }}
            className={sel}
          >
            <option value="">— nessuno —</option>
            {gmOptions?.map((gm) => <option key={gm.id} value={gm.nome}>{gm.nome}</option>)}
          </select>
        </div>

        {isModa ? (
          <div>
            <label className={lbl}>Famiglia</label>
            <select
              value={watchedFamiglia || ''}
              onChange={(e) => { setValue('famiglia', e.target.value); setValue('classe', ''); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }}
              className={sel}
            >
              <option value="">— seleziona —</option>
              {MODA_FAMIGLIE.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        ) : (
          <Combobox label="Famiglia" field="famiglia" value={watchedFamiglia || ''} onChange={(v) => setValue('famiglia', v, { shouldDirty: true })} />
        )}
      </div>

      {/* Moda: Classe + Sottoclasse + Gruppo omogeneo (3 colonne) */}
      {isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Classe</label>
            <select
              value={watchedClasse || ''}
              onChange={(e) => { setValue('classe', e.target.value); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }}
              disabled={!watchedFamiglia}
              className={sel}
            >
              <option value="">— seleziona —</option>
              {modaClassi.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Sottoclasse</label>
            <select
              value={watchedSottoclasse || ''}
              onChange={(e) => { setValue('sottoclasse', e.target.value); setValue('gruppoOmogeneo', ''); }}
              disabled={!watchedClasse || modaSottoclassi.length === 0}
              className={sel}
            >
              <option value="">{modaSottoclassi.length === 0 && watchedClasse ? '— nessuna —' : '— seleziona —'}</option>
              {modaSottoclassi.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Gruppo omogeneo</label>
            <select
              value={watchedGruppoOmogeneo || ''}
              onChange={(e) => setValue('gruppoOmogeneo', e.target.value)}
              disabled={!watchedSottoclasse || modaGruppiOmogenei.length === 0}
              className={sel}
            >
              <option value="">{modaGruppiOmogenei.length === 0 && watchedSottoclasse ? '— nessuno —' : '— seleziona —'}</option>
              {modaGruppiOmogenei.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Casa: Classe + Sottoclasse + Gruppo omogeneo (3 colonne) */}
      {!isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Combobox label="Classe"          field="classe"         value={watchedClasse || ''}          onChange={(v) => setValue('classe', v, { shouldDirty: true })} />
          <Combobox label="Sottoclasse"     field="sottoclasse"    value={watchedSottoclasse || ''}     onChange={(v) => setValue('sottoclasse', v, { shouldDirty: true })} />
          <Combobox label="Gruppo omogeneo" field="gruppoOmogeneo" value={watchedGruppoOmogeneo || ''} onChange={(v) => setValue('gruppoOmogeneo', v, { shouldDirty: true })} />
        </div>
      )}

      {/* Moda: Blocchi colore */}
      {isModa && colorBlocks && colorBlocks.length > 0 && (
        <div>
          <p className={lbl}>Blocchi colore</p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {colorBlocks.map((cb) => {
              const active = selectedColorBlocks.has(cb.id);
              return (
                <button
                  key={cb.id}
                  type="button"
                  onClick={() => {
                    setSelectedColorBlocks((prev) => {
                      const next = new Set(prev);
                      if (next.has(cb.id)) next.delete(cb.id); else next.add(cb.id);
                      return next;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border hover:border-gray-400'
                  }`}
                >
                  {cb.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Casa: Tema colore (cascata fino a 10) */}
      {!isModa && (
        <div>
          <p className={lbl}>Tema colore</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {TEMA_FIELDS.map((field, i) => {
              const prevField = i > 0 ? TEMA_FIELDS[i - 1] : null;
              if (prevField && !watch(prevField)) return null;
              const val = watch(field) || '';
              return (
                <div key={field} className="flex items-end gap-1">
                  <div className="flex-1">
                    <Combobox
                      label={String(i + 1)}
                      field="temaColore"
                      value={val}
                      onChange={(v) => { setValue(field, v); if (!v) clearTemaFrom(i + 1); }}
                    />
                  </div>
                  {val && (
                    <button
                      type="button"
                      onClick={() => clearTemaFrom(i + 1)}
                      className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          PREZZI
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Prezzi</SectionLabel>

      <input type="hidden" {...costPriceReg} />
      <input type="hidden" {...fasciaScReg} />
      <input type="hidden" {...fasciaRicaricoReg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Costo i.e. senza reso (€) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input type="number" step="0.01" min="0" {...costoSenzaResoReg} onChange={handleCostoChange} className={pri} placeholder="0.00" />
          </div>
          {errors.costoIeSenzaReso && <p className="mt-1 text-xs text-red-500">{errors.costoIeSenzaReso.message}</p>}
        </div>
        <div>
          <label className={lbl}>Costo i.e. con reso (€)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input {...register('costoIeConReso')} type="number" step="0.01" min="0" className={pri} placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>IVA (%)</label>
          <select {...ivaReg} onChange={handleIvaChange} className={sel}>
            {IVA_OPTIONS.map((v) => <option key={v} value={String(v)}>{v}%</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Prezzo di vendita i.i. (€) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input type="number" step="0.01" min="0" {...retailPriceReg} onChange={handleRetailChange} className={pri} placeholder="0.00" />
          </div>
          {errors.retailPrice && <p className="mt-1 text-xs text-red-500">{errors.retailPrice.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Ricarico senza reso (%)" value={fmtPct(ricarico)} />
        <ReadOnlyField label="Ricarico con reso (%)"   value={fmtPct(ricaricoConReso)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Margine senza reso (%)" value={fmtPct(margine)} />
        <ReadOnlyField label="Margine con reso (%)"   value={fmtPct(margineConReso)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Guadagno senza reso (€)" value={fmtEuro(guadagno)} />
        <ReadOnlyField label="Guadagno con reso (€)"   value={fmtEuro(guadagnoConReso)} />
      </div>

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          LOGISTICA
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Logistica</SectionLabel>

      <div>
        <label className={lbl}>Conferente</label>
        <select {...register('conferente')} className={sel}>
          <option value="">— nessuno —</option>
          {CONFERENTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Confezione" type="number" min="1" step="1" {...register('lotSize')} placeholder="1" />
        <Combobox label="Tranche" field="tranche" value={watch('tranche') || ''} onChange={(v) => setValue('tranche', v)} />
      </div>

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          FOTO
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Foto</SectionLabel>
      {(
        [
          { label: 'Foto 1 (principale)', field: 'imageUrl'  as const, ref: fileInputRef,  onChange: handleFile,  loading: isUploading,  preview: imagePreview },
          { label: 'Foto 2',              field: 'imageUrl2' as const, ref: fileInputRef2, onChange: handleFile2, loading: isUploading2, preview: watch('imageUrl2') || '' },
          { label: 'Foto 3',              field: 'imageUrl3' as const, ref: fileInputRef3, onChange: handleFile3, loading: isUploading3, preview: watch('imageUrl3') || '' },
          { label: 'Foto 4',              field: 'imageUrl4' as const, ref: fileInputRef4, onChange: handleFile4, loading: isUploading4, preview: watch('imageUrl4') || '' },
          { label: 'Foto 5',              field: 'imageUrl5' as const, ref: fileInputRef5, onChange: handleFile5, loading: isUploading5, preview: watch('imageUrl5') || '' },
        ] as const
      ).map(({ label, field, ref, onChange, loading, preview }, idx) => (
        <div key={field} className="flex gap-3 items-start">
          <div className="w-14 h-14 flex-shrink-0 border border-border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={label} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-gray-300 text-2xs text-center leading-tight px-1">{label.replace('Foto ', '')}</span>
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-2xs font-medium text-gray-500">{label}</p>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" loading={loading} onClick={() => ref.current?.click()}>
                {loading ? 'Caricamento…' : preview ? 'Cambia' : 'Carica'}
              </Button>
              <button
                type="button"
                onClick={() => fotoPicker.slot === field ? setFotoPicker({ slot: null, options: [], loading: false }) : openFotoPicker(field)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Link size={11} />
                Cerca foto
              </button>
              {preview && (
                <button type="button" onClick={() => removePhoto(field)} className="text-xs text-red-500 hover:text-red-700">
                  Rimuovi
                </button>
              )}
            </div>
            {fotoPicker.slot === field && (
              <div className="border border-border rounded-lg bg-white shadow-sm overflow-hidden">
                {fotoPicker.loading && (
                  <p className="text-2xs text-gray-400 text-center py-3">Caricamento…</p>
                )}
                {!fotoPicker.loading && fotoPicker.options.length === 0 && (
                  <p className="text-2xs text-gray-400 text-center py-3">
                    Nessuna foto da collegare trovata{watch('code') ? ` per cod. ${watch('code')}` : ''}
                  </p>
                )}
                {!fotoPicker.loading && fotoPicker.options.length > 0 && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-border">
                    {fotoPicker.options.map((opt) => (
                      <button
                        key={opt.url}
                        type="button"
                        onClick={() => {
                          setValue(field, opt.url, { shouldDirty: true });
                          setFotoPicker({ slot: null, options: [], loading: false });
                        }}
                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={opt.url} alt={opt.name} className="w-8 h-8 object-cover rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-2xs text-gray-700 truncate">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Input {...register(field)} placeholder="oppure incolla URL esterno…" />
          </div>
          <div className="flex flex-col gap-0.5 flex-shrink-0 pt-6">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => swapPhotos(idx - 1, idx)}
              className="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Sposta su"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              disabled={idx === 4}
              onClick={() => swapPhotos(idx, idx + 1)}
              className="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Sposta giù"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      ))}

      <Divider />

      {/* ── STATO + AZIONI ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-accent" />
        <label htmlFor="isActive" className="text-sm text-primary">Attivo (visibile a catalogo)</label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isContinuativo" {...register('isContinuativo')} className="w-4 h-4 accent-accent" />
        <label htmlFor="isContinuativo" className="text-sm text-primary">CO — Continuativo (prodotto non nuovo, già presente in collezioni precedenti)</label>
      </div>

      <div className="flex justify-between items-center gap-3 pt-1">
        {isEdit && (
          <button
            type="button"
            disabled={isTranslating}
            onClick={async () => {
              setIsTranslating(true);
              try {
                const res = await fetch('/api/admin/products/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productId: product!.id }),
                });
                if (!res.ok) throw new Error((await res.json()).error || 'Errore');
                toast.success('Descrizioni tradotte e salvate');
                queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              } catch (e: any) {
                toast.error(e.message || 'Errore nella traduzione');
              } finally {
                setIsTranslating(false);
              }
            }}
            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors disabled:opacity-50"
          >
            {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Traduci automaticamente
          </button>
        )}
        <div className="flex gap-3 ml-auto items-center">
          <div className="flex items-center gap-0.5 border border-border rounded px-0.5 py-0.5">
            <button
              type="button"
              onClick={() => {
                if (historyIdxRef.current <= 0) return;
                historyIdxRef.current--;
                const snap = historyRef.current[historyIdxRef.current];
                isRestoringRef.current = true;
                reset(snap.values as any);
                setPantoneSlots(snap.pantoneSlots);
                setSelectedColorBlocks(new Set(snap.colorBlocks));
                setSizeVariants(snap.sizeVariants);
                setSelectedPantones(snap.selectedPantones);
                setPantoneManuallySet(snap.pantoneManuallySet);
                setPantoneAutoFilled([false, false, false]);
                setCanUndo(historyIdxRef.current > 0);
                setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
                setTimeout(() => { isRestoringRef.current = false; }, 100);
              }}
              disabled={!canUndo}
              title="Annulla (⌘Z)"
              className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (historyIdxRef.current >= historyRef.current.length - 1) return;
                historyIdxRef.current++;
                const snap = historyRef.current[historyIdxRef.current];
                isRestoringRef.current = true;
                reset(snap.values as any);
                setPantoneSlots(snap.pantoneSlots);
                setSelectedColorBlocks(new Set(snap.colorBlocks));
                setSizeVariants(snap.sizeVariants);
                setSelectedPantones(snap.selectedPantones);
                setPantoneManuallySet(snap.pantoneManuallySet);
                setPantoneAutoFilled([false, false, false]);
                setCanUndo(historyIdxRef.current > 0);
                setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
                setTimeout(() => { isRestoringRef.current = false; }, 100);
              }}
              disabled={!canRedo}
              title="Ripristina (⌘⇧Z)"
              className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCw size={13} />
            </button>
          </div>
          <Button variant="ghost" type="button" onClick={onCancel}>Annulla</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Salva modifiche' : 'Crea prodotto'}</Button>
        </div>
      </div>

      {/* ── Proposta Pantone automatica ──────────────────────────── */}
      {pantoneProposal && (() => {
        const c = pantoneProposal.candidates[pantoneProposal.idx];
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-primary text-center">Pantone suggerito</p>
              <div
                className="w-20 h-20 rounded-full border-4 border-white shadow-md"
                style={{ backgroundColor: c.hex_code }}
              />
              <div className="text-center">
                <p className="text-xs text-gray-400 font-mono tracking-wider">{c.code}</p>
                <p className="text-sm font-medium text-primary mt-0.5">{c.name}</p>
              </div>
              <p className="text-2xs text-gray-400">{pantoneProposal.idx + 1} / {pantoneProposal.candidates.length}</p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={handleApproveProposal}
                  className="flex-1 h-9 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Approva
                </button>
                <button
                  type="button"
                  onClick={handleNextProposal}
                  className="flex-1 h-9 border border-border rounded-lg text-sm text-primary hover:bg-cream transition-colors"
                >
                  Proponi un altro
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPantoneProposal(null)}
                className="text-2xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        );
      })()}

    </form>
  );
}

// ── Single-slot Pantone picker (one per colore in Moda) ──────────────────────
function SinglePantoneField({
  label,
  value,
  onChange,
  isAutoFilled = false,
}: {
  label: string;
  value: ProductPantoneEntry | null;
  onChange: (v: ProductPantoneEntry | null) => void;
  isAutoFilled?: boolean;
}) {
  const { data: colors = [] } = useQuery<PantoneColor[]>({
    queryKey: ['pantone-colors-fhi-tcx'],
    queryFn: async () => {
      const res = await fetch('/api/pantone-colors');
      return (await res.json()).data ?? [];
    },
    staleTime: 600_000,
  });

  const [search, setSearch] = useState('');
  const [open, setOpen]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? colors.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : colors;
    return list.slice(0, 50);
  }, [colors, search]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  function select(c: PantoneColor) {
    onChange({ pantoneColorId: c.id, code: c.code, name: c.name, hex_code: c.hex_code, system_type: c.system_type, sortOrder: 0, isPrimary: false, isAutoFilled: false });
    setSearch('');
    setOpen(false);
  }

  if (value) {
    return (
      <div>
        <p className="block text-xs font-medium text-gray-600 mb-1">{label}</p>
        <div className="flex items-center gap-1.5 h-9 bg-gray-50 border border-border rounded px-2.5">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-border/60" style={{ backgroundColor: value.hex_code }} />
          <span className="text-xs font-medium text-primary">{value.code}</span>
          <span className="text-xs text-gray-500 truncate flex-1">{value.name}</span>
          {isAutoFilled && (
            <span className="flex items-center gap-0.5 text-2xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 flex-shrink-0 ml-1" title="Suggerito automaticamente dal colore — verifica e correggi se necessario">
              <Wand2 size={9} /> Auto
            </span>
          )}
          <button type="button" onClick={() => onChange(null)} className="text-gray-300 hover:text-red-400 transition-colors ml-auto flex-shrink-0">
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <p className="block text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          placeholder="Cerca Pantone…"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          className="w-full h-9 border border-border rounded pl-7 pr-3 text-xs text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((c: PantoneColor) => (
            <button
              key={c.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(c)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-cream transition-colors"
            >
              <div className="w-4 h-4 rounded flex-shrink-0 border border-border/60" style={{ backgroundColor: c.hex_code }} />
              <span className="text-xs font-medium text-primary">{c.code}</span>
              <span className="text-xs text-gray-500 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
