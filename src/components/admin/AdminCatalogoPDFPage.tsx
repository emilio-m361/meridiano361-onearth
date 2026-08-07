'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  Eye,
  Save,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pencil,
  GripVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  CatalogFields,
  FieldStyle,
  CardFieldStyles,
  SeparatorStyle,
  PageHeaderStyle,
  PageFooterStyle,
  CardBoxStyle,
  CoverTypography,
  FinalPageTypography,
  CustomSection,
} from '@/components/admin/CatalogoPDFDocument';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  fontFamiglia: string;
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  sottoclasse: string;
  gruppoOmogeneo: string;
  nomLinea: string;
  collezione: string;
  colore: string;
  produttore: string;
  tranche: string;
  soloAttivi: boolean;
  raggruppa: string;
  ordina: string;
  campi: CatalogFields;
  titolo: string;
  mostraLogo: boolean;
  mostraData: boolean;
  mostraPagina: boolean;
  // New fields
  formato: 'A4-P' | 'A4-L' | 'A3-P' | 'A3-L';
  colonne: number;
  righe: number;
  margine: 'stretto' | 'normale' | 'ampio';
  colori: {
    sfondoPagina: string;
    sfondoFoto: string;
    testoPrimario: string;
    testoSecondario: string;
  };
  modalitaSeparatore: 'pagina-intera' | 'inline' | 'nuova-riga';
  copertina: {
    attiva: boolean;
    immagineBase64: string | null;
    immagineUrl?: string | null; // persisted URL of uploaded cover image
    titolo: string;
    sottotitolo: string;
    sottotitolo2: string;
    sottotitolo2Allineamento: 'left' | 'center' | 'right';
    layout: 'full-overlay' | 'half' | 'solo-testo';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    logoCustomH: number;
    // ITEM 4: grid logo position
    logoPosX: 'left' | 'center' | 'right';
    logoPosY: 'top' | 'middle' | 'bottom';
    logoPosizione: 'top-left' | 'top-center' | 'top-right';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    titoloAllineamento: 'left' | 'center' | 'right';
    sottotitoloAllineamento: 'left' | 'center' | 'right';
    // ITEM 3: image controls
    imgOffsetX: number;
    imgOffsetY: number;
    imgScale: number;
    imgOpacity: number;
    logo2Tipo?: 'custom' | 'none';
    logo2CustomBase64?: string | null;
    logo2PosX?: 'left' | 'center' | 'right';
    logo2PosY?: 'top' | 'middle' | 'bottom';
    logo2Dimensione?: 'piccolo' | 'medio' | 'grande';
  };
  // ITEM 6: custom sections
  useSezioniPersonalizzate: boolean;
  sezioniPersonalizzate: CustomSection[];
  includiProdottiNonAssegnati: boolean;
  paginaFinale: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
    immagineUrl?: string | null;
    immagineBase64?: string | null;
    immaginePosition?: 'top' | 'center' | 'bottom' | 'background';
    immagineDimensione?: 'small' | 'medium' | 'large' | 'full';
    imgOffsetX: number;
    imgOffsetY: number;
    imgScale: number;
    imgOpacity: number;
    layout: 'full-overlay' | 'img-top' | 'img-bottom' | 'img-left' | 'background' | 'img-only';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    logoPosX: 'left' | 'center' | 'right';
    logoPosY: 'top' | 'middle' | 'bottom';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    sezioneFinale3Attiva: boolean;
    sezioneFinale3Html: string;
    sezioneFinale3FontSize: number;
    sezioneFinale3Colore: string;
    sezioneFinale3Align: 'left' | 'center' | 'right';
    testoSfondoColore: string;
    logo2Tipo: 'custom' | 'none';
    logo2CustomBase64: string | null;
    logo2PosX: 'left' | 'center' | 'right';
    logo2Posizione: 'above-title' | 'between' | 'below-text';
    logo2Dimensione: 'piccolo' | 'medio' | 'grande';
  };
  paginaPenultima: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
    immagineUrl?: string | null;
    immagineBase64?: string | null;
    imgOffsetX: number;
    imgOffsetY: number;
    imgScale: number;
    imgOpacity: number;
    layout: 'full-overlay' | 'img-top' | 'img-bottom' | 'img-left' | 'background' | 'img-only';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    logoPosX: 'left' | 'center' | 'right';
    logoPosY: 'top' | 'middle' | 'bottom';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    sezioneFinale3Attiva: boolean;
    sezioneFinale3Html: string;
    sezioneFinale3FontSize: number;
    sezioneFinale3Colore: string;
    sezioneFinale3Align: 'left' | 'center' | 'right';
    testoSfondoColore: string;
    logo2Tipo: 'custom' | 'none';
    logo2CustomBase64: string | null;
    logo2PosX: 'left' | 'center' | 'right';
    logo2Posizione: 'above-title' | 'between' | 'below-text';
    logo2Dimensione: 'piccolo' | 'medio' | 'grande';
  };
  cardFieldStyles: CardFieldStyles;
  separatoreStyle: SeparatorStyle;
  headerStyle: PageHeaderStyle;
  footerStyle: PageFooterStyle;
  cardBoxStyle: CardBoxStyle;
  copertinaTypo: CoverTypography;
  paginaFinaleTypo: FinalPageTypography;
  paginaPenultimaTypo: FinalPageTypography;
  nuovoBadge: {
    attivo: boolean;
    testo: string;
    bgColor: string;
    textColor: string;
    posizione: 'image-top-right' | 'next-to-code';
  };
  fotoConfig: {
    numero: 'solo-principale' | 'tutte' | 'scegli';
    quantita: number;
    layout: 'grande-thumbnail' | 'griglia-2x2' | 'prima-disponibile';
  };
  suddividiPerTranche: boolean;
  ordineTranche: 'az' | 'za' | 'custom';
  trancheOrder: string[];
  includeTrancheSenzaNome: boolean;
  productOrder: string[];
  fieldOrder: string[];
  separatoreTrancheAttivo: boolean;
  stileSeparatoreTranche: {
    bgColor: string;
    color: string;
    fontSize: number;
    bold: boolean;
    uppercase: boolean;
    mostraNProdotti: boolean;
  };
}

interface Template {
  id: string;
  nome: string;
  configurazione: FormState;
  createdAt: string;
}

interface PreviewResult {
  count: number;
  pages: number;
  productPages: number;
  groupPages: number;
  trancheSepPages?: number;
  trancheStats?: { tranche: string; count: number }[] | null;
  fotoStats?: { senza: number; una: number; multiple: number } | null;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_STATE: FormState = {
  fontFamiglia: 'helvetica',
  gruppoMerceologico: '',
  famiglia: '',
  classe: '',
  sottoclasse: '',
  gruppoOmogeneo: '',
  nomLinea: '',
  collezione: '',
  colore: '',
  produttore: '',
  tranche: '',
  soloAttivi: true,
  raggruppa: '',
  ordina: 'code',
  campi: {
    foto: true,
    codice: true,
    descrizione: true,
    misure: true,
    produttore: true,
    paese: true,
    prezzoCosto: true,
    pvp: true,
    linea: false,
    collezione: false,
    confezione: false,
    iva: false,
    campoNome: 'descrizione' as const,
  },
  titolo: 'Collezione CASA 2027',
  mostraLogo: true,
  mostraData: true,
  mostraPagina: true,
  formato: 'A4-P',
  colonne: 4,
  righe: 6,
  margine: 'normale',
  colori: {
    sfondoPagina: '#E8DDD0',
    sfondoFoto: '#FFFFFF',
    testoPrimario: '#1C1C1C',
    testoSecondario: '#9CA3AF',
  },
  modalitaSeparatore: 'pagina-intera',
  copertina: {
    attiva: false,
    immagineBase64: null,
    titolo: 'Collezione CASA 2027',
    sottotitolo: '',
    sottotitolo2: '',
    sottotitolo2Allineamento: 'center' as const,
    layout: 'full-overlay',
    logoTipo: 'onearth',
    logoCustomBase64: null,
    logoCustomH: 28,
    logoPosX: 'left',
    logoPosY: 'top',
    logoPosizione: 'top-left',
    logoDimensione: 'medio',
    titoloAllineamento: 'center',
    sottotitoloAllineamento: 'center',
    imgOffsetX: 0,
    imgOffsetY: 0,
    imgScale: 100,
    imgOpacity: 100,
    logo2Tipo: 'none' as const,
    logo2CustomBase64: null,
    logo2PosX: 'right' as const,
    logo2PosY: 'bottom' as const,
    logo2Dimensione: 'medio' as const,
  },
  paginaFinale: {
    attiva: false,
    titolo: '',
    testo: '',
    mostraLogo: true,
    titoloAllineamento: 'center',
    testoAllineamento: 'center',
    imgOffsetX: 0,
    imgOffsetY: 0,
    imgScale: 100,
    imgOpacity: 100,
    layout: 'img-top',
    logoTipo: 'onearth',
    logoCustomBase64: null,
    logoPosX: 'center',
    logoPosY: 'bottom',
    logoDimensione: 'medio',
    sezioneFinale3Attiva: false,
    sezioneFinale3Html: '',
    sezioneFinale3FontSize: 8,
    sezioneFinale3Colore: '#9CA3AF',
    sezioneFinale3Align: 'center',
    testoSfondoColore: '',
    logo2Tipo: 'none' as const,
    logo2CustomBase64: null,
    logo2PosX: 'center' as const,
    logo2Posizione: 'below-text' as const,
    logo2Dimensione: 'medio' as const,
  },
  paginaPenultima: {
    attiva: false,
    titolo: '',
    testo: '',
    mostraLogo: true,
    titoloAllineamento: 'center',
    testoAllineamento: 'center',
    imgOffsetX: 0,
    imgOffsetY: 0,
    imgScale: 100,
    imgOpacity: 100,
    layout: 'img-top',
    logoTipo: 'onearth',
    logoCustomBase64: null,
    logoPosX: 'center',
    logoPosY: 'bottom',
    logoDimensione: 'medio',
    sezioneFinale3Attiva: false,
    sezioneFinale3Html: '',
    sezioneFinale3FontSize: 8,
    sezioneFinale3Colore: '#9CA3AF',
    sezioneFinale3Align: 'center',
    testoSfondoColore: '',
    logo2Tipo: 'none' as const,
    logo2CustomBase64: null,
    logo2PosX: 'center' as const,
    logo2Posizione: 'below-text' as const,
    logo2Dimensione: 'medio' as const,
  },
  cardFieldStyles: {
    codice:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    descrizione: { fontSize: 7,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    misure:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    produttore:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    paese:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    prezzoCosto: { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    pvp:         { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    linea:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    collezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    confezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    iva:         { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
  },
  separatoreStyle: {
    fontSize: 16, bold: true, italic: false, color: '#1C1C1C', bgColor: '#E8DDD0',
    align: 'center', height: 36, uppercase: true,
  },
  headerStyle: {
    titleFontSize: 8, titleBold: false, titleItalic: false, titleColor: '#1C1C1C',
    titleAlign: 'center', showSeparator: true, separatorColor: '#D4CEC7',
  },
  footerStyle: {
    fontSize: 6.5, color: '#9CA3AF', align: 'center', customText: '', showSeparator: true,
  },
  cardBoxStyle: {
    borderWidth: 0.5, borderColor: '#D4CEC7', borderRadius: 0, padding: 4,
  },
  copertinaTypo: {
    titoloFontSize: 28, titoloBold: true, titoloItalic: false, titoloColor: '#FFFFFF',
    titoloUppercase: true, titoloFontFamily: 'Helvetica' as const,
    sottotitoloFontSize: 13, sottotitoloBold: false, sottotitoloItalic: false,
    sottotitoloColor: '#FFFFFF', sottotitoloFontFamily: 'Helvetica' as const,
    bgColor: '#E8DDD0',
    sottotitolo2FontSize: 11, sottotitolo2Bold: false, sottotitolo2Italic: false,
    sottotitolo2Color: '#FFFFFF', sottotitolo2FontFamily: 'Helvetica' as const,
    spacingTitoloSottotitolo: 6, spacingSottotitoloSottotitolo2: 4,
  },
  paginaFinaleTypo: {
    titoloFontSize: 20, titoloBold: true, titoloItalic: false, titoloColor: '#1C1C1C',
    titoloFontFamily: 'helvetica', titoloUppercase: false, titoloUnderline: false, titoloHighlight: '',
    testoFontSize: 10, testoColor: '#9CA3AF',
    testoFontFamily: 'helvetica', testoBold: false, testoItalic: false, testoUnderline: false, testoUppercase: false,
    titoloMarginBottom: 12, sezione1MarginBottom: 16, sezione2MarginBottom: 16, marginTop: 20,
  },
  paginaPenultimaTypo: {
    titoloFontSize: 20, titoloBold: true, titoloItalic: false, titoloColor: '#1C1C1C',
    titoloFontFamily: 'helvetica', titoloUppercase: false, titoloUnderline: false, titoloHighlight: '',
    testoFontSize: 10, testoColor: '#9CA3AF',
    testoFontFamily: 'helvetica', testoBold: false, testoItalic: false, testoUnderline: false, testoUppercase: false,
    titoloMarginBottom: 12, sezione1MarginBottom: 16, sezione2MarginBottom: 16, marginTop: 20,
  },
  useSezioniPersonalizzate: false,
  sezioniPersonalizzate: [],
  includiProdottiNonAssegnati: true,
  nuovoBadge: {
    attivo: true,
    testo: 'NUOVO',
    bgColor: '#000000',
    textColor: '#FFFFFF',
    posizione: 'image-top-right',
  },
  fotoConfig: {
    numero: 'solo-principale' as const,
    quantita: 1,
    layout: 'grande-thumbnail' as const,
  },
  suddividiPerTranche: false,
  ordineTranche: 'az' as const,
  trancheOrder: [] as string[],
  includeTrancheSenzaNome: false,
  productOrder: [] as string[],
  fieldOrder: ['codice', 'descrizione', 'misure'] as string[],
  separatoreTrancheAttivo: true,
  stileSeparatoreTranche: {
    bgColor: '#1C1C1C',
    color: '#FFFFFF',
    fontSize: 36,
    bold: true,
    uppercase: true,
    mostraNProdotti: true,
  },
};

// Merge a saved (possibly old) template config with DEFAULT_STATE so that
// fields added after the template was saved always have safe default values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeWithDefaults(saved: any): FormState {
  return {
    ...DEFAULT_STATE,
    ...saved,
    campi: { ...DEFAULT_STATE.campi, ...saved?.campi },
    colori: { ...DEFAULT_STATE.colori, ...saved?.colori },
    copertina: { ...DEFAULT_STATE.copertina, ...saved?.copertina },
    paginaFinale: { ...DEFAULT_STATE.paginaFinale, ...saved?.paginaFinale },
    paginaPenultima: { ...DEFAULT_STATE.paginaPenultima, ...saved?.paginaPenultima },
    cardFieldStyles: { ...DEFAULT_STATE.cardFieldStyles, ...saved?.cardFieldStyles },
    separatoreStyle: { ...DEFAULT_STATE.separatoreStyle, ...saved?.separatoreStyle },
    headerStyle: { ...DEFAULT_STATE.headerStyle, ...saved?.headerStyle },
    footerStyle: { ...DEFAULT_STATE.footerStyle, ...saved?.footerStyle },
    cardBoxStyle: { ...DEFAULT_STATE.cardBoxStyle, ...saved?.cardBoxStyle },
    copertinaTypo: { ...DEFAULT_STATE.copertinaTypo, ...saved?.copertinaTypo },
    paginaFinaleTypo: { ...DEFAULT_STATE.paginaFinaleTypo, ...saved?.paginaFinaleTypo },
    paginaPenultimaTypo: { ...DEFAULT_STATE.paginaPenultimaTypo, ...saved?.paginaPenultimaTypo },
    nuovoBadge: { ...DEFAULT_STATE.nuovoBadge, ...saved?.nuovoBadge },
    fotoConfig: { ...DEFAULT_STATE.fotoConfig, ...saved?.fotoConfig },
    sezioniPersonalizzate: saved?.sezioniPersonalizzate ?? DEFAULT_STATE.sezioniPersonalizzate,
    stileSeparatoreTranche: { ...DEFAULT_STATE.stileSeparatoreTranche, ...saved?.stileSeparatoreTranche },
    trancheOrder: saved?.trancheOrder ?? DEFAULT_STATE.trancheOrder,
    productOrder: saved?.productOrder ?? DEFAULT_STATE.productOrder,
    fieldOrder: (() => { const fo = saved?.fieldOrder ?? DEFAULT_STATE.fieldOrder; return fo.includes('misure') ? fo : [...fo, 'misure']; })(),
  };
}

// ── Local storage persistence ─────────────────────────────────────────────────

const LS_PDF_CONFIG = 'catalogo-pdf-config-v1';
const LS_PDF_LOGOS  = 'catalogo-pdf-logos-v1';

interface StoredLogos {
  copertinaLogo:        string | null;
  paginaFinaleLogo:     string | null;
  paginaPenultimaLogo:  string | null;
  copertinaLogo2:       string | null;
  paginaFinaleLogo2:    string | null;
  paginaPenultimaLogo2: string | null;
}

function loadLogosFromStorage(): StoredLogos {
  try {
    const raw = localStorage.getItem(LS_PDF_LOGOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        copertinaLogo:        parsed.copertinaLogo        ?? null,
        paginaFinaleLogo:     parsed.paginaFinaleLogo     ?? null,
        paginaPenultimaLogo:  parsed.paginaPenultimaLogo  ?? null,
        copertinaLogo2:       parsed.copertinaLogo2       ?? null,
        paginaFinaleLogo2:    parsed.paginaFinaleLogo2    ?? null,
        paginaPenultimaLogo2: parsed.paginaPenultimaLogo2 ?? null,
      };
    }
  } catch {}
  return { copertinaLogo: null, paginaFinaleLogo: null, paginaPenultimaLogo: null, copertinaLogo2: null, paginaFinaleLogo2: null, paginaPenultimaLogo2: null };
}

function saveLogosToStorage(c: FormState) {
  try {
    const logos: StoredLogos = {
      copertinaLogo:        c.copertina.logoCustomBase64       ?? null,
      paginaFinaleLogo:     c.paginaFinale.logoCustomBase64    ?? null,
      paginaPenultimaLogo:  c.paginaPenultima.logoCustomBase64 ?? null,
      copertinaLogo2:       c.copertina.logo2CustomBase64       ?? null,
      paginaFinaleLogo2:    c.paginaFinale.logo2CustomBase64    ?? null,
      paginaPenultimaLogo2: c.paginaPenultima.logo2CustomBase64 ?? null,
    };
    localStorage.setItem(LS_PDF_LOGOS, JSON.stringify(logos));
  } catch {}
}

function loadConfigFromStorage(): FormState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(LS_PDF_CONFIG);
    const base = raw ? mergeWithDefaults(JSON.parse(raw)) : { ...DEFAULT_STATE };
    const logos = loadLogosFromStorage();
    return {
      ...base,
      copertina:       { ...base.copertina,       logoCustomBase64: logos.copertinaLogo,       logo2CustomBase64: logos.copertinaLogo2 },
      paginaFinale:    { ...base.paginaFinale,    logoCustomBase64: logos.paginaFinaleLogo,    logo2CustomBase64: logos.paginaFinaleLogo2 },
      paginaPenultima: { ...base.paginaPenultima, logoCustomBase64: logos.paginaPenultimaLogo, logo2CustomBase64: logos.paginaPenultimaLogo2 },
    };
  } catch {}
  return DEFAULT_STATE;
}

function saveConfigToStorage(c: FormState) {
  try {
    // Strip all base64 blobs from main config key (logos and images go to their own key)
    const toSave: FormState = {
      ...c,
      copertina:       { ...c.copertina,       immagineBase64: null, logoCustomBase64: null, logo2CustomBase64: null },
      paginaFinale:    { ...c.paginaFinale,    immagineBase64: null, logoCustomBase64: null, logo2CustomBase64: null },
      paginaPenultima: { ...c.paginaPenultima, immagineBase64: null, logoCustomBase64: null, logo2CustomBase64: null },
    };
    localStorage.setItem(LS_PDF_CONFIG, JSON.stringify(toSave));
  } catch {}
  saveLogosToStorage(c);
}

// ── ON EARTH palette ──────────────────────────────────────────────────────────

const PALETTE = [
  { nome: 'Bianco', hex: '#FFFFFF' },
  { nome: 'Tortora chiaro', hex: '#F5F0EA' },
  { nome: 'Tortora', hex: '#E8DDD0' },
  { nome: 'Beige', hex: '#D4C4B0' },
  { nome: 'Grigio chiaro', hex: '#E5E5E5' },
  { nome: 'Grigio', hex: '#9CA3AF' },
  { nome: 'Nero', hex: '#000000' },
  { nome: 'Verde salvia', hex: '#8FAF8F' },
  { nome: 'Terracotta', hex: '#C17A5A' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({
  children,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-border rounded text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
    >
      {children}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Tutti',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border accent-primary"
      />
      <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function ColorSwatchPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 items-center">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.nome}
            onClick={() => onChange(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={`w-7 h-7 rounded transition-all ${
              value.toLowerCase() === c.hex.toLowerCase()
                ? 'border-2 border-primary ring-1 ring-primary/30 scale-110'
                : 'border-2 border-transparent hover:border-gray-300'
            } ${c.hex === '#FFFFFF' ? 'border-gray-200' : ''}`}
          />
        ))}
        {/* Swatch del colore corrente se non è nella palette */}
        {!PALETTE.some(c => c.hex.toLowerCase() === value.toLowerCase()) && (
          <div style={{ backgroundColor: value }} className="w-7 h-7 rounded border-2 border-primary ring-1 ring-primary/30 scale-110 flex-shrink-0" />
        )}
        {/* Pulsante + per color picker libero */}
        <button
          type="button"
          title="Colore personalizzato"
          onClick={() => inputRef.current?.click()}
          className="w-7 h-7 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors text-xs font-bold"
        >
          +
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
      <p className="text-2xs text-gray-400 mt-1">{PALETTE.find(c => c.hex.toLowerCase() === value.toLowerCase())?.nome ?? value}</p>
    </div>
  );
}

function AlignToggle({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right';
  onChange: (v: 'left' | 'center' | 'right') => void;
}) {
  const opts: { v: 'left' | 'center' | 'right'; Icon: typeof AlignLeft }[] = [
    { v: 'left', Icon: AlignLeft },
    { v: 'center', Icon: AlignCenter },
    { v: 'right', Icon: AlignRight },
  ];
  return (
    <div className="flex border border-border rounded overflow-hidden">
      {opts.map(({ v, Icon }, i) => (
        <button
          key={v}
          type="button"
          title={v === 'left' ? 'Sinistra' : v === 'center' ? 'Centro' : 'Destra'}
          onClick={() => onChange(v)}
          className={`flex items-center justify-center w-8 h-8 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${value === v ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded text-xs border transition-colors ${
        active ? 'bg-primary text-white border-primary' : 'border-border text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function MiniColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {PALETTE.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.nome}
          onClick={() => onChange(c.hex)}
          style={{ backgroundColor: c.hex }}
          className={`w-5 h-5 rounded-sm transition-all border ${
            value.toLowerCase() === c.hex.toLowerCase()
              ? 'ring-2 ring-primary scale-110 border-primary'
              : 'border-gray-200 hover:scale-110'
          }`}
        />
      ))}
      {!PALETTE.some(c => c.hex.toLowerCase() === value.toLowerCase()) && (
        <div style={{ backgroundColor: value }} className="w-5 h-5 rounded-sm border-2 border-primary flex-shrink-0" />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-5 h-5 rounded-sm border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary text-xs"
      >
        +
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  );
}

function FieldStyleRow({
  label,
  value,
  onChange,
  showSpacing = false,
}: {
  label: string;
  value: FieldStyle;
  onChange: (fs: FieldStyle) => void;
  showSpacing?: boolean;
}) {
  const upd = (patch: Partial<FieldStyle>) => onChange({ ...value, ...patch });
  return (
    <div className="py-2.5 space-y-1.5">
      {label && <p className="text-xs font-medium text-gray-700">{label}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min={5}
          max={24}
          step={0.5}
          value={value.fontSize}
          onChange={(e) => upd({ fontSize: parseFloat(e.target.value) || 7 })}
          title="Dimensione font (pt)"
          className="w-14 h-8 border border-border rounded px-1.5 text-xs bg-white text-center focus:outline-none"
        />
        <ToggleBtn active={value.bold} onClick={() => upd({ bold: !value.bold })}><span className="font-bold">B</span></ToggleBtn>
        <ToggleBtn active={value.italic} onClick={() => upd({ italic: !value.italic })}><span className="italic">I</span></ToggleBtn>
        <ToggleBtn active={value.uppercase} onClick={() => upd({ uppercase: !value.uppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
        <AlignToggle value={value.align} onChange={(v) => upd({ align: v })} />
        {showSpacing && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-2xs text-gray-400">↕</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={value.marginBottom ?? 0}
              onChange={(e) => upd({ marginBottom: parseFloat(e.target.value) || 0 })}
              title="Spaziatura inferiore in pt"
              className="w-12 h-8 border border-border rounded px-1.5 text-xs bg-white text-center focus:outline-none"
            />
          </div>
        )}
      </div>
      <MiniColorPicker value={value.color} onChange={(v) => upd({ color: v })} />
    </div>
  );
}

function CardPreview({ config, scale = 1 }: { config: FormState; scale?: number }) {
  const cfs = config.cardFieldStyles;
  const box = config.cardBoxStyle;
  const f = config.campi;
  const S = 14; // scale factor: 1pt → S/595 * W

  function fs2px(pt: number) { return pt * 0.75; }

  function fieldCSS(fld: FieldStyle): React.CSSProperties {
    return {
      fontSize: fs2px(fld.fontSize),
      fontWeight: fld.bold ? 'bold' : 'normal',
      fontStyle: fld.italic ? 'italic' : 'normal',
      color: fld.color,
      textAlign: fld.align,
      textTransform: fld.uppercase ? 'uppercase' : undefined,
      margin: 0,
      lineHeight: 1.2,
    };
  }

  const cardEl = (
    <div style={{ transformOrigin: 'top left' }}>
      <div
        style={{
          width: 110,
          backgroundColor: config.colori.sfondoPagina,
          border: box.borderWidth > 0 ? `${Math.max(0.5, box.borderWidth * 0.4)}px solid ${box.borderColor}` : 'none',
          borderRadius: box.borderRadius * 0.4,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {f.foto && (
          <div style={{ height: 55, backgroundColor: config.colori.sfondoFoto, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 7, color: '#ccc', fontFamily: 'monospace' }}>foto</span>
          </div>
        )}
        <div style={{ padding: box.padding * 0.4 }}>
          {f.codice && <p style={{ ...fieldCSS(cfs.codice), marginBottom: 2 }}>COD-001</p>}
          {f.descrizione && <p style={{ ...fieldCSS(cfs.descrizione), marginBottom: 2, lineHeight: 1.25 }}>Nome prodotto esempio</p>}
          {(f.misure || f.linea || f.collezione || f.confezione || f.iva) && (
            <p style={{ ...fieldCSS(cfs.misure), marginBottom: 2 }}>10×5 cm</p>
          )}
          {(f.prezzoCosto || f.pvp || f.produttore || f.paese) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3, gap: 2 }}>
              {(f.produttore || f.paese) && (
                <div style={{ flex: 1 }}>
                  {f.produttore && <p style={{ ...fieldCSS(cfs.produttore), margin: 0, lineHeight: 1.3 }}>Produttore</p>}
                  {f.paese && <p style={{ ...fieldCSS(cfs.paese), margin: 0, lineHeight: 1.3 }}>Italia</p>}
                </div>
              )}
              {(f.prezzoCosto || f.pvp) && (
                <div style={{ flex: 1 }}>
                  {f.prezzoCosto && (
                    <>
                      <p style={{ fontSize: fs2px(5), margin: 0, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: 0.3, color: cfs.prezzoCosto.color, textAlign: cfs.prezzoCosto.align }}>COSTO I.E.</p>
                      <p style={{ ...fieldCSS(cfs.prezzoCosto), margin: 0, marginBottom: f.pvp ? 2 : 0, lineHeight: 1.2 }}>€12,50</p>
                    </>
                  )}
                  {f.pvp && (
                    <>
                      <p style={{ fontSize: fs2px(5), margin: 0, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: 0.3, color: cfs.pvp.color, textAlign: cfs.pvp.align }}>PVP I.I.</p>
                      <p style={{ ...fieldCSS(cfs.pvp), margin: 0, lineHeight: 1.2 }}>€29,90</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if (scale === 1) return cardEl;
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 110 * scale, height: 'auto' }}>
      {cardEl}
    </div>
  );
}

const PREVIEW_SCALE = 200 / 595; // PDF A4 = 595pt wide

// CSS that resets browser default styles inside preview text containers to match PDF renderHtmlBlocks output
const S = PREVIEW_SCALE;
const PDF_TEXT_PREVIEW_CSS = `
  .pdf-text-preview p { margin: 0 0 ${(3 * S).toFixed(2)}px 0; line-height: 1.6; }
  .pdf-text-preview h1 { margin: 0 0 ${(6 * S).toFixed(2)}px 0; font-size: 1.6em; font-weight: bold; line-height: 1.4; }
  .pdf-text-preview h2 { margin: 0 0 ${(4 * S).toFixed(2)}px 0; font-size: 1.3em; font-weight: bold; line-height: 1.4; }
  .pdf-text-preview ul, .pdf-text-preview ol { margin: 0 0 ${(3 * S).toFixed(2)}px 0; padding-left: ${(12 * S).toFixed(2)}px; }
  .pdf-text-preview li { margin-bottom: ${(2 * S).toFixed(2)}px; }
  .pdf-text-preview strong { font-weight: bold; }
  .pdf-text-preview em { font-style: italic; }
  .pdf-text-preview u { text-decoration: underline; }
  .pdf-text-preview s { text-decoration: line-through; }
`;

function CoverPreview({ config }: { config: { copertina: FormState['copertina']; colori: FormState['colori']; copertinaTypo: FormState['copertinaTypo']; mostraLogo: boolean } }) {
  const cov = config.copertina;
  const typo = config.copertinaTypo;
  if (!cov.attiva) return null;

  const W = 200;
  const H = Math.round(W * 842 / 595);
  const S = PREVIEW_SCALE;

  // Logo — mirrors PDF logic exactly
  const posX = cov.logoPosX ?? 'left';
  const posY = cov.logoPosY ?? 'top';
  const justifyLogo = posX === 'left' ? 'flex-start' : posX === 'center' ? 'center' : 'flex-end';
  const COVER_LOGO_H_PT: Record<string, number> = { piccolo: 18, medio: 28, grande: 42 };
  const rawLogoH = (cov.logoTipo === 'custom' && cov.logoCustomH) ? cov.logoCustomH : (COVER_LOGO_H_PT[cov.logoDimensione] ?? 28);
  const logoH = Math.round(rawLogoH * S);
  const logoSrc = cov.logoTipo === 'onearth' ? (config.mostraLogo ? '/logo-on-earth/onearth_solo.png' : null)
    : cov.logoTipo === 'custom' ? cov.logoCustomBase64
    : null;
  // Logo vertical position mirrors PDF logoVertical map (LOGO_MARGIN=28pt, but cover uses 28pt)
  const logoTopPx = posY === 'top' ? 28 * S : posY === 'middle' ? H / 2 - logoH / 2 : H - logoH - 28 * S;

  // Image transforms — same formula as PDF
  const imgSrc      = cov.immagineBase64 ?? cov.immagineUrl ?? null;
  const imgScalePct = cov.imgScale ?? 100;
  const imgOffsetX  = cov.imgOffsetX ?? 0;
  const imgOffsetY  = cov.imgOffsetY ?? 0;
  const imgOpacity  = (cov.imgOpacity ?? 100) / 100;

  // Typography
  const titleFontSize  = typo.titoloFontSize * S;
  const titleColor     = typo.titoloColor;
  const titleUppercase = typo.titoloUppercase ? 'uppercase' as const : 'none' as const;
  const titleBold      = typo.titoloBold;
  const subtitleFontSize  = typo.sottotitoloFontSize * S;
  const subtitleColor     = typo.sottotitoloColor;
  const subtitle2FontSize = (typo.sottotitolo2FontSize ?? 11) * S;
  const subtitle2Color    = typo.sottotitolo2Color ?? typo.sottotitoloColor;
  const spacingTS  = (typo.spacingTitoloSottotitolo ?? 6) * S;
  const spacingSS2 = (typo.spacingSottotitoloSottotitolo2 ?? 4) * S;
  const titleAlign = cov.titoloAllineamento ?? 'center';
  const titoloText = typo.titoloUppercase ? (cov.titolo ?? '').toUpperCase() : cov.titolo;
  const subtitle2  = cov.sottotitolo2 ?? '';

  // Logo2
  const FINAL_LOGO_H_PT: Record<string, number> = { piccolo: 16, medio: 22, grande: 32 };
  const logo2Src = (cov.logo2Tipo ?? 'none') === 'custom' ? (cov.logo2CustomBase64 ?? null) : null;
  const logo2H = Math.round((FINAL_LOGO_H_PT[cov.logo2Dimensione ?? 'medio'] ?? 22) * S);
  const logo2PosX = cov.logo2PosX ?? 'right';
  const logo2PosY = cov.logo2PosY ?? 'bottom';
  const justifyLogo2 = logo2PosX === 'left' ? 'flex-start' : logo2PosX === 'center' ? 'center' : 'flex-end';
  const MARGIN = 30 * S;
  const logo2Top = logo2PosY === 'top' ? MARGIN : logo2PosY === 'middle' ? H / 2 - logo2H / 2 : H - logo2H - MARGIN;
  const logo2El = logo2Src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <div style={{ position: 'absolute', top: logo2Top, left: MARGIN, right: MARGIN, display: 'flex', justifyContent: justifyLogo2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo2Src} alt="logo2" style={{ height: logo2H, objectFit: 'contain' }} />
    </div>
  ) : null;

  // Shared text block — subOpacity/sub2Opacity for full-overlay (PDF: 0.85/0.75), subLS for subtitle letterSpacing (solo-testo uses 1.5)
  const textBlock = (ls: number, subOpacity = 1, sub2Opacity = 1, subLS = 1 * S) => (
    <>
      {cov.titolo && <p style={{ color: titleColor, fontSize: titleFontSize, fontWeight: titleBold ? 'bold' : 'normal', margin: 0, textAlign: titleAlign, textTransform: titleUppercase, letterSpacing: ls, whiteSpace: 'pre-wrap', marginBottom: spacingTS }}>{titoloText}</p>}
      {cov.sottotitolo && <p style={{ color: subtitleColor, fontSize: subtitleFontSize, margin: 0, textAlign: cov.sottotitoloAllineamento ?? 'center', whiteSpace: 'pre-wrap', marginBottom: subtitle2 ? spacingSS2 : 0, letterSpacing: subLS, opacity: subOpacity }}>{cov.sottotitolo}</p>}
      {subtitle2 && <p style={{ color: subtitle2Color, fontSize: subtitle2FontSize, margin: 0, textAlign: cov.sottotitolo2Allineamento ?? 'center', whiteSpace: 'pre-wrap', letterSpacing: subLS, opacity: sub2Opacity }}>{subtitle2}</p>}
    </>
  );

  let inner: React.ReactNode;

  if (cov.layout === 'full-overlay') {
    const imgW = W * imgScalePct / 100;
    const imgHH = H * imgScalePct / 100;
    const imgLeft = (W - imgW) / 2 + (W * imgOffsetX / 100);
    const imgTop  = (H - imgHH) / 2 + (H * imgOffsetY / 100);
    const overlayH = 160 * S;

    inner = (
      <>
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="" style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgHH, objectFit: 'cover', opacity: imgOpacity }} />
        )}
        {logoSrc && (
          <div style={{ position: 'absolute', top: logoTopPx, left: 32 * S, right: 32 * S, display: 'flex', justifyContent: justifyLogo }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
          </div>
        )}
        {/* Solid dark overlay — matches PDF opacity: 0.55 rectangle */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `0 ${40 * S}px ${44 * S}px` }}>
          {textBlock(3 * S, 0.85, 0.75)}
        </div>
        {logo2El}
      </>
    );
  } else if (cov.layout === 'half') {
    const halfH = H / 2;
    const imgW = W * imgScalePct / 100;
    const imgHH = halfH * imgScalePct / 100;
    const imgLeft = (W - imgW) / 2 + (W * imgOffsetX / 100);
    const imgTop  = (halfH - imgHH) / 2 + (halfH * imgOffsetY / 100);

    inner = (
      <>
        {/* Top half: image */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: halfH, overflow: 'hidden', backgroundColor: config.colori.sfondoPagina }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgHH, objectFit: 'cover', opacity: imgOpacity }} />
          )}
        </div>
        {/* Bottom half: typo.bgColor + logo + text */}
        <div style={{ position: 'absolute', top: halfH, left: 0, right: 0, bottom: 0, backgroundColor: typo.bgColor ?? '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${40 * S}px` }}>
          {logoSrc && (
            <div style={{ display: 'flex', justifyContent: justifyLogo, marginBottom: 16 * S }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
            </div>
          )}
          {textBlock(3 * S)}
        </div>
        {logo2El}
      </>
    );
  } else {
    // solo-testo — PDF uses typo.bgColor as full background
    inner = (
      <>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: typo.bgColor ?? config.colori.sfondoPagina, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${60 * S}px` }}>
          {logoSrc && (
            <div style={{ display: 'flex', justifyContent: justifyLogo, marginBottom: 24 * S }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
            </div>
          )}
          {/* Accent line — 50×1.5pt in PDF */}
          <div style={{ width: 50 * S, height: Math.max(1, 1.5 * S), backgroundColor: '#8B7355', alignSelf: 'center', marginBottom: 20 * S, flexShrink: 0 }} />
          {textBlock(4 * S, 1, 1, 1.5 * S)}
        </div>
        {logo2El}
      </>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima copertina</p>
      <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', backgroundColor: config.colori.sfondoPagina, border: '1px solid #e5e7eb', borderRadius: 4 }} className="shadow-sm flex-shrink-0">
        {inner}
      </div>
    </div>
  );
}

// ── TipTap Rich Text Editor ───────────────────────────────────────────────────

function TBtn({
  active, onClick, title, children, disabled,
}: {
  active: boolean; onClick: () => void; title?: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-6 min-w-[22px] px-1 rounded text-2xs flex items-center justify-center transition-colors ${active ? 'bg-primary/15 text-primary' : 'hover:bg-gray-100 text-gray-600'} disabled:opacity-35 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

const TIPTAP_STYLES = `
  .tiptap-editor { padding: 8px 12px; min-height: 96px; font-size: 12px; color: #374151; outline: none; }
  .tiptap-editor p { margin: 0 0 3px; }
  .tiptap-editor h1 { font-size: 18px; font-weight: bold; margin: 0 0 6px; }
  .tiptap-editor h2 { font-size: 14px; font-weight: bold; margin: 0 0 4px; }
  .tiptap-editor ul { list-style-type: disc; padding-left: 18px; margin: 0 0 3px; }
  .tiptap-editor ol { list-style-type: decimal; padding-left: 18px; margin: 0 0 3px; }
  .tiptap-editor li { margin-bottom: 2px; }
  .tiptap-editor u { text-decoration: underline; }
  .tiptap-editor s { text-decoration: line-through; }
  .tiptap-mini-editor { padding: 6px 12px; min-height: 36px; font-size: 12px; color: #374151; outline: none; }
  .tiptap-mini-editor p { margin: 0; }
  .tiptap-mini-editor u { text-decoration: underline; }
`;

function RichTextEditor({
  content, onChange, placeholder,
}: {
  content: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const lastSynced = useRef(content);
  const suppress = useRef(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    onUpdate: ({ editor: e }) => {
      if (suppress.current) return;
      const html = e.getHTML();
      lastSynced.current = html;
      onChange(html);
    },
    editorProps: { attributes: { class: 'tiptap-editor' } },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== lastSynced.current) {
      lastSynced.current = content;
      suppress.current = true;
      editor.commands.setContent(content || '');
      suppress.current = false;
    }
  }, [editor, content]);

  if (!editor) return <div className="border border-border rounded h-24 bg-white" />;

  return (
    <div className="border border-border rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-primary/30">
      <style>{TIPTAP_STYLES}</style>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border bg-gray-50 flex-wrap">
        <select
          value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : 'p'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
          className="h-6 border border-border rounded text-2xs px-1 bg-white mr-1 focus:outline-none"
        >
          <option value="p">Normale</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
        </select>
        <TBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Grassetto"><span className="font-bold">B</span></TBtn>
        <TBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Corsivo"><span className="italic">I</span></TBtn>
        <TBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sottolineato"><span className="underline">U</span></TBtn>
        <TBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barrato"><span className="line-through">S</span></TBtn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <TBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Sinistra"><AlignLeft size={10} /></TBtn>
        <TBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centro"><AlignCenter size={10} /></TBtn>
        <TBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Destra"><AlignRight size={10} /></TBtn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Elenco puntato">•≡</TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Elenco numerato">1≡</TBtn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <TBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Annulla" disabled={!editor.can().undo()}>↩</TBtn>
        <TBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Ripristina" disabled={!editor.can().redo()}>↪</TBtn>
      </div>
      <EditorContent editor={editor} />
      {placeholder && !editor.getText() && (
        <p className="absolute top-9 left-3 text-2xs text-gray-400 pointer-events-none">{placeholder}</p>
      )}
    </div>
  );
}

function MiniRichTextEditor({
  content, onChange, placeholder,
}: {
  content: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const lastSynced = useRef(content);
  const suppress = useRef(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false,
        blockquote: false, codeBlock: false, horizontalRule: false, code: false,
      }),
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor: e }) => {
      if (suppress.current) return;
      const html = e.getHTML();
      lastSynced.current = html;
      onChange(html);
    },
    editorProps: { attributes: { class: 'tiptap-mini-editor' } },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== lastSynced.current) {
      lastSynced.current = content;
      suppress.current = true;
      editor.commands.setContent(content || '');
      suppress.current = false;
    }
  }, [editor, content]);

  if (!editor) return <div className="border border-border rounded h-9 bg-white" />;

  return (
    <div className="border border-border rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-primary/30">
      <style>{TIPTAP_STYLES}</style>
      <div className="flex items-center gap-0.5 px-1.5 py-0.5 border-b border-border bg-gray-50">
        <TBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Grassetto"><span className="font-bold">B</span></TBtn>
        <TBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Corsivo"><span className="italic">I</span></TBtn>
        <TBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sottolineato"><span className="underline">U</span></TBtn>
      </div>
      <EditorContent editor={editor} />
      {placeholder && !editor.getText() && (
        <p className="absolute top-8 left-3 text-2xs text-gray-400 pointer-events-none">{placeholder}</p>
      )}
    </div>
  );
}

function LogoPosGrid({
  posX,
  posY,
  onChange,
}: {
  posX: 'left' | 'center' | 'right';
  posY: 'top' | 'middle' | 'bottom';
  onChange: (x: 'left' | 'center' | 'right', y: 'top' | 'middle' | 'bottom') => void;
}) {
  const rows: Array<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];
  const cols: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
  return (
    <div className="inline-grid grid-cols-3 gap-0.5 border border-border rounded overflow-hidden bg-gray-100 p-0.5">
      {rows.map((y) =>
        cols.map((x) => {
          const active = x === posX && y === posY;
          return (
            <button
              key={`${y}-${x}`}
              type="button"
              onClick={() => onChange(x, y)}
              className={`w-7 h-7 rounded-sm text-2xs flex items-center justify-center transition-colors ${active ? 'bg-primary text-white' : 'bg-white hover:bg-primary/10 text-gray-400'}`}
              title={`${y === 'top' ? 'In alto' : y === 'middle' ? 'A metà' : 'In basso'} ${x === 'left' ? 'sinistra' : x === 'center' ? 'centro' : 'destra'}`}
            >
              ·
            </button>
          );
        })
      )}
    </div>
  );
}

function FinalPagePreview({ config }: { config: FormState }) {
  const pf = config.paginaFinale;
  if (!pf.attiva) return null;

  const W = 200;
  const H = Math.round(W * 842 / 595);
  const scale = PREVIEW_SCALE;

  const bg = config.colori.sfondoPagina;
  const typo = config.paginaFinaleTypo;
  const imgSrc = pf.immagineBase64 ?? pf.immagineUrl ?? null;
  const layout = pf.layout ?? 'img-top';
  const offsetX = pf.imgOffsetX ?? 0;
  const offsetY = pf.imgOffsetY ?? 0;
  const imgScale = pf.imgScale ?? 100;
  const opacity = (pf.imgOpacity ?? 100) / 100;
  const posX = pf.logoPosX ?? 'center';
  const posY = pf.logoPosY ?? 'bottom';
  const logoDim = pf.logoDimensione ?? 'medio';
  // Logo height: matches PDF FINAL_LOGO_H = { piccolo: 14, medio: 22, grande: 34 } scaled
  const logoH = (logoDim === 'piccolo' ? 14 : logoDim === 'medio' ? 22 : 34) * scale;
  const logoTipo = pf.logoTipo ?? (pf.mostraLogo ? 'onearth' : 'none');
  const logoSrc = logoTipo === 'onearth' ? (config.mostraLogo ? '/logo-on-earth/onearth_solo.png' : null)
    : logoTipo === 'custom' ? pf.logoCustomBase64 : null;

  // Image position — same formula as PDF fullImgStyle
  function imgPos(areaW: number, areaH: number): React.CSSProperties {
    const iw = areaW * imgScale / 100;
    const ih = areaH * imgScale / 100;
    const left = (areaW - iw) / 2 + (areaW * offsetX / 100);
    const top = (areaH - ih) / 2 + (areaH * offsetY / 100);
    return { position: 'absolute', top, left, width: iw, height: ih, objectFit: 'cover', opacity };
  }

  // Logo position — matches PDF: LOGO_MARGIN=30pt, full-width row with justifyContent
  const LOGO_MARGIN_PX = 30 * scale;
  const logoTopPx = posY === 'top' ? LOGO_MARGIN_PX : posY === 'middle' ? H / 2 - logoH / 2 : H - logoH - LOGO_MARGIN_PX;
  const justifyLogo = posX === 'left' ? 'flex-start' : posX === 'center' ? 'center' : 'flex-end';
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    top: logoTopPx,
    left: LOGO_MARGIN_PX,
    right: LOGO_MARGIN_PX,
    display: 'flex',
    justifyContent: justifyLogo,
    pointerEvents: 'none',
  };

  const PAD_H = 60 * scale;
  const PAD_V = 48 * scale;
  const mt = (typo.marginTop ?? 48) * scale;
  const textBg = pf.testoSfondoColore || undefined;

  const titleEl = pf.titolo ? (
    <div
      style={{ fontSize: typo.titoloFontSize * scale, color: typo.titoloColor, textAlign: pf.titoloAllineamento, marginBottom: (typo.titoloMarginBottom ?? 12) * scale, letterSpacing: 2 * scale }}
      dangerouslySetInnerHTML={{ __html: pf.titolo }}
    />
  ) : null;

  const textEl = pf.testo ? (
    <div
      className="pdf-text-preview"
      style={{ fontSize: typo.testoFontSize * scale, color: typo.testoColor, lineHeight: 1.6, textAlign: pf.testoAllineamento ?? 'center' }}
      dangerouslySetInnerHTML={{ __html: pf.testo }}
    />
  ) : null;

  const logoEl = logoSrc ? (
    <div style={logoStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
    </div>
  ) : null;

  let inner: React.ReactNode;

  if (layout === 'full-overlay') {
    const overlayH = H * 0.45;
    inner = (
      <>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `0 ${PAD_H}px ${PAD_V}px`, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </>
    );
  } else if (layout === 'background') {
    inner = (
      <>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </>
    );
  } else if (layout === 'img-only') {
    inner = (
      <>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        {logoEl}
      </>
    );
  } else if (layout === 'img-left') {
    const imgAreaW = W * 0.45;
    inner = (
      <div style={{ display: 'flex', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ width: imgAreaW, height: H, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(imgAreaW, H)} />
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: 32 * scale, paddingRight: 32 * scale, position: 'relative', backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </div>
    );
  } else if (layout === 'img-bottom') {
    const imgAreaH = H * 0.4;
    const textAreaH = H - imgAreaH;
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ height: textAreaH, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        <div style={{ height: imgAreaH, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(W, imgAreaH)} />
          )}
        </div>
        {logoEl}
      </div>
    );
  } else {
    // img-top (default)
    const imgAreaH = H * 0.4;
    const textAreaH = H - imgAreaH;
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ height: imgAreaH, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(W, imgAreaH)} />
          )}
        </div>
        <div style={{ height: textAreaH, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima pagina finale</p>
      <div
        style={{ width: W, height: H, position: 'relative', overflow: 'hidden', backgroundColor: bg, border: '1px solid #e5e7eb', borderRadius: 4 }}
        className="shadow-sm flex-shrink-0"
      >
        {inner}
      </div>
    </div>
  );
}

function PenultimaPagePreview({ config }: { config: FormState }) {
  const pp = config.paginaPenultima;
  if (!pp?.attiva) return null;

  const W = 200;
  const H = Math.round(W * 842 / 595);
  const scale = PREVIEW_SCALE;

  const bg = config.colori.sfondoPagina;
  const typo = config.paginaPenultimaTypo ?? DEFAULT_STATE.paginaPenultimaTypo;
  const imgSrc = pp.immagineBase64 ?? pp.immagineUrl ?? null;
  const layout = pp.layout ?? 'img-top';
  const offsetX = pp.imgOffsetX ?? 0;
  const offsetY = pp.imgOffsetY ?? 0;
  const imgScale = pp.imgScale ?? 100;
  const opacity = (pp.imgOpacity ?? 100) / 100;
  const posX = pp.logoPosX ?? 'center';
  const posY = pp.logoPosY ?? 'bottom';
  const logoDim = pp.logoDimensione ?? 'medio';
  const logoH = (logoDim === 'piccolo' ? 14 : logoDim === 'medio' ? 22 : 34) * scale;
  const logoTipo = pp.logoTipo ?? (pp.mostraLogo ? 'onearth' : 'none');
  const logoSrc = logoTipo === 'onearth' ? (config.mostraLogo ? '/logo-on-earth/onearth_solo.png' : null)
    : logoTipo === 'custom' ? pp.logoCustomBase64 : null;

  function imgPos(areaW: number, areaH: number): React.CSSProperties {
    const iw = areaW * imgScale / 100;
    const ih = areaH * imgScale / 100;
    const left = (areaW - iw) / 2 + (areaW * offsetX / 100);
    const top = (areaH - ih) / 2 + (areaH * offsetY / 100);
    return { position: 'absolute', top, left, width: iw, height: ih, objectFit: 'cover', opacity };
  }

  const LOGO_MARGIN_PX = 30 * scale;
  const logoTopPx = posY === 'top' ? LOGO_MARGIN_PX : posY === 'middle' ? H / 2 - logoH / 2 : H - logoH - LOGO_MARGIN_PX;
  const justifyLogo = posX === 'left' ? 'flex-start' : posX === 'center' ? 'center' : 'flex-end';
  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    top: logoTopPx,
    left: LOGO_MARGIN_PX,
    right: LOGO_MARGIN_PX,
    display: 'flex',
    justifyContent: justifyLogo,
    pointerEvents: 'none',
  };

  const PAD_H = 60 * scale;
  const PAD_V = 48 * scale;
  const mt = (typo.marginTop ?? 48) * scale;
  const textBg = pp.testoSfondoColore || undefined;

  const titleEl = pp.titolo ? (
    <div
      style={{ fontSize: typo.titoloFontSize * scale, color: typo.titoloColor, textAlign: pp.titoloAllineamento, marginBottom: (typo.titoloMarginBottom ?? 12) * scale, letterSpacing: 2 * scale }}
      dangerouslySetInnerHTML={{ __html: pp.titolo }}
    />
  ) : null;

  const textEl = pp.testo ? (
    <div
      className="pdf-text-preview"
      style={{ fontSize: typo.testoFontSize * scale, color: typo.testoColor, lineHeight: 1.6, textAlign: pp.testoAllineamento ?? 'center' }}
      dangerouslySetInnerHTML={{ __html: pp.testo }}
    />
  ) : null;

  const logoEl = logoSrc ? (
    <div style={logoStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
    </div>
  ) : null;

  let inner: React.ReactNode;

  if (layout === 'full-overlay') {
    const overlayH = H * 0.45;
    inner = (
      <>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: overlayH, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `0 ${PAD_H}px ${PAD_V}px`, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </>
    );
  } else if (layout === 'background') {
    inner = (
      <>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </>
    );
  } else if (layout === 'img-only') {
    inner = (
      <>
        {imgSrc && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={imgPos(W, H)} />
          </div>
        )}
        {logoEl}
      </>
    );
  } else if (layout === 'img-left') {
    const imgAreaW = W * 0.45;
    inner = (
      <div style={{ display: 'flex', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ width: imgAreaW, height: H, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(imgAreaW, H)} />
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: 32 * scale, paddingRight: 32 * scale, position: 'relative', backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </div>
    );
  } else if (layout === 'img-bottom') {
    const imgAreaH = H * 0.4;
    const textAreaH = H - imgAreaH;
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ height: textAreaH, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        <div style={{ height: imgAreaH, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(W, imgAreaH)} />
          )}
        </div>
        {logoEl}
      </div>
    );
  } else {
    // img-top (default)
    const imgAreaH = H * 0.4;
    const textAreaH = H - imgAreaH;
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <style>{PDF_TEXT_PREVIEW_CSS}</style>
        <div style={{ height: imgAreaH, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="" style={imgPos(W, imgAreaH)} />
          )}
        </div>
        <div style={{ height: textAreaH, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: mt, paddingBottom: PAD_V, paddingLeft: PAD_H, paddingRight: PAD_H, backgroundColor: textBg }}>
          {titleEl}
          {textEl}
        </div>
        {logoEl}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima penultima pagina</p>
      <div
        style={{ width: W, height: H, position: 'relative', overflow: 'hidden', backgroundColor: bg, border: '1px solid #e5e7eb', borderRadius: 4 }}
        className="shadow-sm flex-shrink-0"
      >
        {inner}
      </div>
    </div>
  );
}

// ── Custom Sections UI Components ─────────────────────────────────────────────

function MultiSelectCriteria({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="max-h-32 overflow-y-auto border border-border rounded p-2 space-y-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, opt] : selected.filter((x) => x !== opt))
              }
              className="accent-primary"
            />
            <span className="text-xs text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const EMPTY_SECTION: Omit<CustomSection, 'id'> = {
  nome: '',
  descrizione: '',
  criteri: { classe: [], sottoclasse: [], famiglia: [], gruppoOmogeneo: [], nomLinea: [], colore: [], produttore: [] },
  mostraSottosezioni: false,
  ordinamento: 'code',
};

function SortableSection({
  sezione,
  index,
  onEdit,
  onDelete,
}: {
  sezione: CustomSection;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sezione.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border border-border rounded">
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 select-none text-base leading-none"
        title="Trascina per riordinare"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary truncate">{sezione.nome || `Sezione ${index + 1}`}</p>
        {sezione.descrizione && <p className="text-2xs text-gray-400 truncate">{sezione.descrizione}</p>}
      </div>
      <button type="button" onClick={onEdit} className="text-2xs px-2 py-0.5 border border-border rounded hover:bg-gray-50 text-gray-600">Modifica</button>
      <button type="button" onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function SortableTranche({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border border-border rounded">
      <span {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 select-none text-base leading-none" title="Trascina per riordinare">⠿</span>
      <p className="flex-1 text-xs font-medium text-primary">{label}</p>
    </div>
  );
}

// ── SortableProductRow ────────────────────────────────────────────────────────

function SortableProductRow({ product }: { product: { id: string; code: string; name: string | null; modello: string | null } }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border border-border rounded">
      <span {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 select-none text-base leading-none" title="Trascina">⠿</span>
      <span className="font-mono text-2xs text-gray-400 w-20 flex-shrink-0">{product.code}</span>
      {product.modello && <span className="text-2xs text-gray-400 italic flex-shrink-0">{product.modello}</span>}
      <span className="text-xs text-primary truncate flex-1">{product.name ?? ''}</span>
    </div>
  );
}

// ── SortableFieldStyleRow ─────────────────────────────────────────────────────

const FIELD_ORDER_LABELS: Record<string, string> = {
  codice: 'Codice prodotto',
  descrizione: 'Descrizione / Nome',
  misure: 'Dettagli (misure, linea, ecc.)',
};

function SortableFieldStyleRow({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: FieldStyle;
  onChange: (fs: FieldStyle) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldKey });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded bg-white">
      <div className="flex items-center gap-2 px-3 pt-2">
        <button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 flex-shrink-0">
          <GripVertical size={14} />
        </button>
        <span className="text-xs font-semibold text-gray-700">{FIELD_ORDER_LABELS[fieldKey] ?? fieldKey}</span>
      </div>
      <div className="px-3 pb-2">
        <FieldStyleRow label="" value={value} onChange={onChange} showSpacing />
      </div>
    </div>
  );
}

// ── TypoToolbar ───────────────────────────────────────────────────────────────

interface TypoBlockProps {
  fontFamily?: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  color: string;
  highlight?: string;
  align?: 'left' | 'center' | 'right';
}

function TypoToolbar({
  value,
  onChange,
  showAlign = true,
  minSize = 6,
  maxSize = 72,
  showTimesRomanCourier = false,
}: {
  value: TypoBlockProps;
  onChange: (patch: Partial<TypoBlockProps>) => void;
  showAlign?: boolean;
  minSize?: number;
  maxSize?: number;
  showTimesRomanCourier?: boolean;
}) {
  const btnCls = (active?: boolean) =>
    `h-6 w-6 text-xs rounded flex items-center justify-center hover:bg-gray-200 flex-shrink-0 ${active ? 'bg-gray-300 text-gray-900' : 'text-gray-500'}`;
  return (
    <div className="flex items-center gap-0.5 flex-wrap bg-gray-50 border border-border rounded-t px-1.5 py-0.5">
      <select
        value={value.fontFamily ?? 'helvetica'}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        className="h-6 text-2xs border border-border rounded px-1 bg-white max-w-[80px] focus:outline-none"
      >
        <option value="helvetica">Helvetica</option>
        <option value="inter">Inter</option>
        <option value="lato">Lato</option>
        <option value="montserrat">Montserrat</option>
        <option value="playfair">Playfair</option>
        <option value="nova">Nova</option>
        {showTimesRomanCourier && <option value="times-roman">Times Roman</option>}
        {showTimesRomanCourier && <option value="courier">Courier</option>}
      </select>
      <input
        type="number" min={minSize} max={maxSize} value={value.fontSize}
        onChange={(e) => onChange({ fontSize: parseFloat(e.target.value) || minSize })}
        className="w-10 h-6 text-2xs border border-border rounded px-1 text-center bg-white focus:outline-none"
      />
      <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
      <button type="button" onClick={() => onChange({ bold: !value.bold })} title="Grassetto" className={btnCls(value.bold)}>
        <span className="font-bold">B</span>
      </button>
      <button type="button" onClick={() => onChange({ italic: !value.italic })} title="Corsivo" className={btnCls(value.italic)}>
        <span className="italic">I</span>
      </button>
      <button type="button" onClick={() => onChange({ underline: !value.underline })} title="Sottolineato" className={btnCls(value.underline)}>
        <span className="underline">U</span>
      </button>
      <button type="button" onClick={() => onChange({ uppercase: !value.uppercase })} title="Maiuscolo"
        className={`h-6 px-1 text-2xs font-semibold rounded flex items-center justify-center hover:bg-gray-200 flex-shrink-0 ${value.uppercase ? 'bg-gray-300 text-gray-900' : 'text-gray-500'}`}>
        AA
      </button>
      <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
      <label className="relative flex flex-col items-center cursor-pointer flex-shrink-0" title="Colore testo">
        <span className="text-xs font-bold leading-none" style={{ color: value.color }}>A</span>
        <div className="h-1 w-5 rounded-sm" style={{ backgroundColor: value.color }} />
        <input type="color" value={value.color} onChange={(e) => onChange({ color: e.target.value })}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>
      <div className="flex items-center gap-0.5 flex-shrink-0" title="Sfondo / evidenziatore">
        <label className="relative flex flex-col items-center cursor-pointer">
          <span className="text-2xs leading-none px-0.5 rounded-sm" style={{ backgroundColor: value.highlight || 'transparent', color: value.highlight ? '#000' : '#9CA3AF' }}>ab</span>
          <div className="h-1 w-5 rounded-sm" style={{ backgroundColor: value.highlight || '#E5E7EB' }} />
          <input type="color" value={value.highlight || '#ffffff'} onChange={(e) => onChange({ highlight: e.target.value })}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>
        {value.highlight && (
          <button type="button" onClick={() => onChange({ highlight: '' })} className="text-2xs text-red-400 hover:text-red-600 leading-none">✕</button>
        )}
      </div>
      {showAlign && (
        <>
          <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
          <AlignToggle value={value.align ?? 'center'} onChange={(v) => onChange({ align: v })} />
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminCatalogoPDFPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<FormState>(loadConfigFromStorage);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<'generale' | 'scheda' | 'copertina' | 'ultima' | 'penultima'>(
    () => (searchParams.get('tab') as 'generale' | 'scheda' | 'copertina' | 'ultima' | 'penultima') ?? 'generale'
  );

  function setActiveTab(next: 'generale' | 'scheda' | 'copertina' | 'ultima' | 'penultima') {
    setActiveTabState(next);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const copertinaLogo2FileInputRef = useRef<HTMLInputElement>(null);
  const finalImgFileInputRef = useRef<HTMLInputElement>(null);
  const finalLogoFileInputRef = useRef<HTMLInputElement>(null);
  const finalLogo2FileInputRef = useRef<HTMLInputElement>(null);
  const penultimaImgFileInputRef = useRef<HTMLInputElement>(null);
  const penultimaLogoFileInputRef = useRef<HTMLInputElement>(null);
  const penultimaLogo2FileInputRef = useRef<HTMLInputElement>(null);

  // Section open/close
  const [sections, setSections] = useState({
    font: false,
    filtri: false,
    formato: false,
    colori: false,
    raggruppamento: false,
    separatoreStile: false,
    campi: false,
    campiStile: false,
    riquadro: false,
    intestazione: false,
    headerStile: false,
    footerStile: false,
    copertina: false,
    paginaPenultima: false,
    paginaFinale: false,
    sezioniPersonalizzate: false,
    nuovoBadge: false,
    fotoConfig: false,
    tranche: false,
    stileSeparatoreTrancheSection: false,
  });

  // Custom sections editing state
  const [editingSection, setEditingSection] = useState<(CustomSection & { isNew?: boolean }) | null>(null);

  const toggleSection = (k: keyof typeof sections) =>
    setSections((s) => ({ ...s, [k]: !s[k] }));

  // Auto-save config to localStorage (debounced 800ms)
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveConfigToStorage(config), 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [config]);

  // ── Classification data ────────────────────────────────────────────────────

  const { data: classData } = useQuery({
    queryKey: ['classificazione'],
    queryFn: () => fetch('/api/classificazione').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: produttoriData } = useQuery({
    queryKey: ['produttori'],
    queryFn: () => fetch('/api/admin/produttori').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: optionsData } = useQuery({
    queryKey: ['catalogo-pdf-options'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/options').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['catalogo-templates'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/templates').then((r) => r.json()),
  });

  const prodottiFiltriKey = [
    config.gruppoMerceologico, config.famiglia, config.classe, config.sottoclasse,
    config.gruppoOmogeneo, config.nomLinea, config.collezione, config.colore,
    config.produttore, config.tranche, config.soloAttivi,
  ];
  const { data: prodottiOrdinabili, isLoading: isLoadingProdotti } = useQuery<{ products: { id: string; code: string; name: string | null; modello: string | null }[] }>({
    queryKey: ['catalogo-prodotti-ordine', ...prodottiFiltriKey],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (!config.soloAttivi) sp.set('soloAttivi', 'false');
      if (config.gruppoMerceologico) sp.set('gruppoMerceologico', config.gruppoMerceologico);
      if (config.famiglia) sp.set('famiglia', config.famiglia);
      if (config.classe) sp.set('classe', config.classe);
      if (config.sottoclasse) sp.set('sottoclasse', config.sottoclasse);
      if (config.gruppoOmogeneo) sp.set('gruppoOmogeneo', config.gruppoOmogeneo);
      if (config.nomLinea) sp.set('nomLinea', config.nomLinea);
      if (config.collezione) sp.set('collezione', config.collezione);
      if (config.colore) sp.set('colore', config.colore);
      if (config.produttore) sp.set('produttore', config.produttore);
      if (config.tranche) sp.set('tranche', config.tranche);
      return fetch(`/api/admin/catalogo-pdf/prodotti?${sp}`).then((r) => r.json());
    },
    enabled: config.ordina === 'custom',
    staleTime: 30_000,
  });

  // Derived option lists — deduplicate case-insensitively but preserve original value
  const byType = (tipo: string): string[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: string[] = classData?.data?.filter((v: any) => v.tipo === tipo).map((v: any) => v.nome as string) ?? [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const n of raw) {
      const key = n.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(n.trim());
      }
    }
    return result.sort((a, b) => a.localeCompare(b, 'it'));
  };

  const gruppiMerceologici = byType('gruppoMerceologico');
  const famiglie = byType('famiglia');
  const classi = byType('classe');
  const sottoclassi = byType('sottoclasse');
  const gruppiOmogenei = byType('gruppoOmogeneo');
  const linee = byType('nomLinea');
  const collezioni = byType('collezione');
  const colori = byType('colore');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produttori = produttoriData?.data?.map((p: any) => p.nome) ?? [];
  const tranches = optionsData?.tranches ?? [];

  const templates: Template[] = templatesData?.data ?? [];

  // ── Field updaters ─────────────────────────────────────────────────────────

  const set = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState, value: any) =>
      setConfig((c) => ({ ...c, [key]: value })),
    []
  );

  const setField = useCallback(
    (key: keyof CatalogFields, value: boolean) =>
      setConfig((c) => ({ ...c, campi: { ...c.campi, [key]: value } })),
    []
  );

  const setColore = useCallback(
    (key: keyof FormState['colori'], value: string) =>
      setConfig((c) => ({ ...c, colori: { ...c.colori, [key]: value } })),
    []
  );

  const setCopertina = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['copertina'], value: any) =>
      setConfig((c) => ({ ...c, copertina: { ...c.copertina, [key]: value } })),
    []
  );

  const setPaginaFinale = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['paginaFinale'], value: any) =>
      setConfig((c) => ({ ...c, paginaFinale: { ...c.paginaFinale, [key]: value } })),
    []
  );

  const setCardFieldStyle = useCallback(
    (field: keyof CardFieldStyles, fs: FieldStyle) =>
      setConfig((c) => ({ ...c, cardFieldStyles: { ...c.cardFieldStyles, [field]: fs } })),
    []
  );

  const setSeparatoreStyle = useCallback(
    (patch: Partial<SeparatorStyle>) =>
      setConfig((c) => ({ ...c, separatoreStyle: { ...c.separatoreStyle, ...patch } })),
    []
  );

  const setHeaderStyle = useCallback(
    (patch: Partial<PageHeaderStyle>) =>
      setConfig((c) => ({ ...c, headerStyle: { ...c.headerStyle, ...patch } })),
    []
  );

  const setFooterStyle = useCallback(
    (patch: Partial<PageFooterStyle>) =>
      setConfig((c) => ({ ...c, footerStyle: { ...c.footerStyle, ...patch } })),
    []
  );

  const setCardBoxStyle = useCallback(
    (patch: Partial<CardBoxStyle>) =>
      setConfig((c) => ({ ...c, cardBoxStyle: { ...c.cardBoxStyle, ...patch } })),
    []
  );

  const setCopertinaTypo = useCallback(
    (patch: Partial<CoverTypography>) =>
      setConfig((c) => ({ ...c, copertinaTypo: { ...c.copertinaTypo, ...patch } })),
    []
  );

  const setPaginaFinaleTypo = useCallback(
    (patch: Partial<FinalPageTypography>) =>
      setConfig((c) => ({ ...c, paginaFinaleTypo: { ...c.paginaFinaleTypo, ...patch } })),
    []
  );

  const setPaginaPenultima = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['paginaPenultima'], value: any) =>
      setConfig((c) => ({ ...c, paginaPenultima: { ...c.paginaPenultima, [key]: value } })),
    []
  );

  const setPaginaPenultimaTypo = useCallback(
    (patch: Partial<FinalPageTypography>) =>
      setConfig((c) => ({ ...c, paginaPenultimaTypo: { ...c.paginaPenultimaTypo, ...patch } })),
    []
  );

  const setSezioniPersonalizzate = useCallback(
    (sezioni: CustomSection[]) =>
      setConfig((c) => ({ ...c, sezioniPersonalizzate: sezioni })),
    []
  );

  const setNuovoBadge = useCallback(
    (patch: Partial<FormState['nuovoBadge']>) =>
      setConfig((c) => ({ ...c, nuovoBadge: { ...c.nuovoBadge, ...patch } })),
    []
  );

  const setSepTranche = useCallback(
    (patch: Partial<FormState['stileSeparatoreTranche']>) =>
      setConfig((c) => ({ ...c, stileSeparatoreTranche: { ...c.stileSeparatoreTranche, ...patch } })),
    []
  );

  // ── Image upload handlers ──────────────────────────────────────────────────

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 2 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCopertina('immagineBase64', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo troppo grande (max 5 MB)');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCopertina('logoCustomBase64', dataUrl);
      // Save immediately — don't rely on debounce (can be cancelled on navigation)
      try {
        const logos = loadLogosFromStorage();
        localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...logos, copertinaLogo: dataUrl }));
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handlePreview() {
    setIsPreviewing(true);
    setPreview(null);
    try {
      // Pass colonne/righe to preview so it can compute the right page count
      const res = await fetch('/api/admin/catalogo-pdf/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setPreview(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore anteprima');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleGeneraPDF() {
    if (!preview) {
      toast.error("Esegui prima l'anteprima");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/catalogo-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const filter = config.raggruppa || 'completo';
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalogo-ON-EARTH-${date}-${filter}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF generato con successo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione PDF');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast.error('Inserisci un nome per il template');
      return;
    }
    setIsSaving(true);
    try {
      // Strip only background images (can be 1-2 MB); logos stay in the template
      const configToSave = {
        ...config,
        copertina:       { ...config.copertina,       immagineBase64: null },
        paginaFinale:    { ...config.paginaFinale,    immagineBase64: null },
        paginaPenultima: { ...config.paginaPenultima, immagineBase64: null },
      };
      const trimmedName = templateName.trim();

      // Check if a template with this name already exists
      const existingTemplate = templates.find(t => t.nome === trimmedName);
      if (existingTemplate) {
        const overwrite = confirm(`Esiste già un template di nome "${trimmedName}". Vuoi sovrascriverlo?`);
        if (!overwrite) { setIsSaving(false); return; }
        const res = await fetch(`/api/admin/catalogo-pdf/templates/${existingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configurazione: configToSave }),
        });
        if (!res.ok) throw new Error('Errore aggiornamento');
        toast.success('Template aggiornato');
        setTemplateName('');
        refetchTemplates();
        return;
      }

      const res = await fetch('/api/admin/catalogo-pdf/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: trimmedName, configurazione: configToSave }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Configurazione salvata');
      setTemplateName('');
      refetchTemplates();
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadTemplate(t: Template) {
    setConfig(mergeWithDefaults(t.configurazione));
    setPreview(null);
    toast.success(`Template "${t.nome}" caricato`);
  }

  async function handleDeleteTemplate(id: string, nome: string) {
    if (!confirm(`Eliminare il template "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/admin/catalogo-pdf/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Template eliminato');
      refetchTemplates();
    } catch {
      toast.error('Errore eliminazione template');
    }
  }

  async function handleRenameTemplate(id: string, nomeAttuale: string) {
    const nuovoNome = window.prompt('Nuovo nome:', nomeAttuale);
    if (!nuovoNome || nuovoNome === nomeAttuale) return;
    const res = await fetch(`/api/admin/catalogo-pdf/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nuovoNome }),
    });
    if (res.ok) { toast.success('Rinominato'); refetchTemplates(); }
    else toast.error('Errore rinomina');
  }

  async function handleDuplicateTemplate(t: Template) {
    const res = await fetch('/api/admin/catalogo-pdf/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: t.id, nome: 'Copia di ' + t.nome }),
    });
    if (res.ok) { toast.success('Duplicato'); refetchTemplates(); }
    else toast.error('Errore duplica');
  }

  function handleEditTemplate(t: Template) {
    setConfig(mergeWithDefaults(t.configurazione));
    setEditingTemplateId(t.id);
    setTemplateName(t.nome);
    setPreview(null);
    toast.success(`Modifica: "${t.nome}"`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveEditingTemplate() {
    if (!editingTemplateId) return;
    setIsSaving(true);
    try {
      const configToSave = {
        ...config,
        copertina:       { ...config.copertina,       immagineBase64: null },
        paginaFinale:    { ...config.paginaFinale,    immagineBase64: null },
        paginaPenultima: { ...config.paginaPenultima, immagineBase64: null },
      };
      const res = await fetch(`/api/admin/catalogo-pdf/templates/${editingTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: templateName.trim() || undefined, configurazione: configToSave }),
      });
      if (!res.ok) throw new Error();
      toast.success('Template aggiornato');
      setEditingTemplateId(null);
      refetchTemplates();
    } catch {
      toast.error('Errore aggiornamento');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Left: form */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-accent" />
          <div>
            <h1 className="text-lg font-bold text-primary">Generatore Catalogo PDF</h1>
            <p className="text-xs text-gray-500">Configura e scarica il catalogo prodotti in formato PDF</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border overflow-x-auto flex-shrink-0 -mb-px">
          {([
            { id: 'generale',  label: 'Generale' },
            { id: 'copertina', label: 'Copertina' },
            { id: 'scheda',    label: 'Prodotti' },
            { id: 'penultima', label: 'Penultima Pagina' },
            { id: 'ultima',    label: 'Ultima Pagina' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-2xs font-semibold tracking-widest uppercase whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-2">

          {/* ══ GENERALE ══ */}
          {activeTab === 'generale' && <>
        {/* ── Formato pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.formato} onToggle={() => toggleSection('formato')}>
            Formato pagina
          </SectionTitle>
          {sections.formato && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
                  <select
                    value={config.formato}
                    onChange={(e) => set('formato', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="A4-P">A4 Verticale</option>
                    <option value="A4-L">A4 Orizzontale</option>
                    <option value="A3-P">A3 Verticale</option>
                    <option value="A3-L">A3 Orizzontale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Margini</label>
                  <select
                    value={config.margine}
                    onChange={(e) => set('margine', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="stretto">Stretto (10 pt)</option>
                    <option value="normale">Normale (20 pt)</option>
                    <option value="ampio">Ampio (30 pt)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Colonne</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={config.colonne}
                    onChange={(e) => set('colonne', Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Righe</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.righe}
                    onChange={(e) => set('righe', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="pb-0.5">
                  <p className="text-xs text-gray-500 font-medium">
                    = <span className="text-primary font-bold">{config.colonne * config.righe}</span> prodotti/pagina
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Intestazione ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.intestazione} onToggle={() => toggleSection('intestazione')}>
            Intestazione
          </SectionTitle>
          {sections.intestazione && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo catalogo</label>
                <input
                  type="text"
                  value={config.titolo}
                  onChange={(e) => set('titolo', e.target.value)}
                  className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="es. Collezione CASA 2027"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CheckboxField label="Mostra logo ON EARTH" checked={config.mostraLogo} onChange={(v) => set('mostraLogo', v)} />
                <CheckboxField label="Mostra data generazione" checked={config.mostraData} onChange={(v) => set('mostraData', v)} />
                <CheckboxField label="Numero di pagina" checked={config.mostraPagina} onChange={(v) => set('mostraPagina', v)} />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Stile intestazione</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                      <input type="number" min={5} max={20} value={config.headerStyle.titleFontSize}
                        onChange={(e) => setHeaderStyle({ titleFontSize: parseFloat(e.target.value) || 8 })}
                        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div className="flex items-end gap-1.5">
                      <ToggleBtn active={config.headerStyle.titleBold} onClick={() => setHeaderStyle({ titleBold: !config.headerStyle.titleBold })}><span className="font-bold">B</span></ToggleBtn>
                      <ToggleBtn active={config.headerStyle.titleItalic} onClick={() => setHeaderStyle({ titleItalic: !config.headerStyle.titleItalic })}><span className="italic">I</span></ToggleBtn>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-24">Allineamento</span>
                    <AlignToggle value={config.headerStyle.titleAlign} onChange={(v) => setHeaderStyle({ titleAlign: v })} />
                  </div>
                  <ColorSwatchPicker label="Colore titolo" value={config.headerStyle.titleColor}
                    onChange={(v) => setHeaderStyle({ titleColor: v })} />
                  <CheckboxField label="Mostra linea separatrice" checked={config.headerStyle.showSeparator}
                    onChange={(v) => setHeaderStyle({ showSeparator: v })} />
                  {config.headerStyle.showSeparator && (
                    <ColorSwatchPicker label="Colore linea" value={config.headerStyle.separatorColor}
                      onChange={(v) => setHeaderStyle({ separatorColor: v })} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ── Piè di pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.footerStile} onToggle={() => toggleSection('footerStile')}>
            Piè di pagina
          </SectionTitle>
          {sections.footerStile && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                  <input type="number" min={5} max={12} value={config.footerStyle.fontSize}
                    onChange={(e) => setFooterStyle({ fontSize: parseFloat(e.target.value) || 6.5 })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <AlignToggle value={config.footerStyle.align} onChange={(v) => setFooterStyle({ align: v })} />
                </div>
              </div>
              <ColorSwatchPicker label="Colore testo" value={config.footerStyle.color}
                onChange={(v) => setFooterStyle({ color: v })} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Testo personalizzato <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input type="text" value={config.footerStyle.customText}
                  onChange={(e) => setFooterStyle({ customText: e.target.value })}
                  placeholder="es. ON EARTH — Catalogo riservato"
                  className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <p className="text-2xs text-gray-400 mt-1">Verrà mostrato prima del numero pagina</p>
              </div>
              <CheckboxField label="Mostra linea separatrice" checked={config.footerStyle.showSeparator}
                onChange={(v) => setFooterStyle({ showSeparator: v })} />
            </div>
          )}
        </div>

        {/* ── Filtri ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.filtri} onToggle={() => toggleSection('filtri')}>
            Filtri prodotti
          </SectionTitle>
          {sections.filtri && (
            <div className="p-4 grid grid-cols-2 gap-3">
              <SelectField label="Gruppo merceologico" value={config.gruppoMerceologico}
                onChange={(v) => set('gruppoMerceologico', v)} options={gruppiMerceologici} />
              <SelectField label="Famiglia" value={config.famiglia}
                onChange={(v) => set('famiglia', v)} options={famiglie} />
              <SelectField label="Classe" value={config.classe}
                onChange={(v) => set('classe', v)} options={classi} />
              <SelectField label="Sottoclasse" value={config.sottoclasse}
                onChange={(v) => set('sottoclasse', v)} options={sottoclassi} />
              <SelectField label="Gruppo omogeneo" value={config.gruppoOmogeneo}
                onChange={(v) => set('gruppoOmogeneo', v)} options={gruppiOmogenei} />
              <SelectField label="Linea" value={config.nomLinea}
                onChange={(v) => set('nomLinea', v)} options={linee} />
              <SelectField label="Collezione" value={config.collezione}
                onChange={(v) => set('collezione', v)} options={collezioni} />
              <SelectField label="Colore" value={config.colore}
                onChange={(v) => set('colore', v)} options={colori} />
              <SelectField label="Produttore" value={config.produttore}
                onChange={(v) => set('produttore', v)} options={produttori} />
              <SelectField label="Tranche" value={config.tranche}
                onChange={(v) => set('tranche', v)} options={tranches} />
              <div className="col-span-2 pt-1">
                <CheckboxField
                  label="Solo prodotti attivi"
                  checked={config.soloAttivi}
                  onChange={(v) => set('soloAttivi', v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Raggruppamento e ordinamento ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.raggruppamento} onToggle={() => toggleSection('raggruppamento')}>
            Raggruppamento e ordinamento
          </SectionTitle>
          {sections.raggruppamento && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Raggruppa per</label>
                  <select
                    value={config.raggruppa}
                    onChange={(e) => set('raggruppa', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">Nessun raggruppamento</option>
                    <option value="nomLinea">Linea</option>
                    <option value="classe">Classe</option>
                    <option value="sottoclasse">Sottoclasse</option>
                    <option value="famiglia">Famiglia</option>
                    <option value="gruppoOmogeneo">Gruppo omogeneo</option>
                    <option value="collezione">Collezione</option>
                    <option value="produttore">Produttore</option>
                    <option value="paese">Paese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ordina per</label>
                  <select
                    value={config.ordina}
                    onChange={(e) => set('ordina', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="code">Codice A→Z</option>
                    <option value="name">Descrizione A→Z</option>
                    <option value="costPrice_asc">Prezzo crescente</option>
                    <option value="costPrice_desc">Prezzo decrescente</option>
                    <option value="nomLinea">Linea</option>
                    <option value="collezione">Collezione</option>
                    <option value="modello">Modello (parure)</option>
                    <option value="custom">Ordine personalizzato</option>
                  </select>
                </div>
              </div>

              {/* Ordine personalizzato prodotti */}
              {config.ordina === 'custom' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600">Ordine prodotti nel PDF</p>
                    {config.productOrder.length > 0 && (
                      <button
                        type="button"
                        onClick={() => set('productOrder', [])}
                        className="text-2xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Azzera ordine
                      </button>
                    )}
                  </div>
                  {isLoadingProdotti ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                      <Loader2 size={12} className="animate-spin" /> Caricamento prodotti...
                    </div>
                  ) : (prodottiOrdinabili?.products?.length ?? 0) === 0 ? (
                    <p className="text-xs text-gray-400">Nessun prodotto con i filtri correnti.</p>
                  ) : (() => {
                    const raw = prodottiOrdinabili!.products;
                    const ordered = config.productOrder.length > 0
                      ? [
                          ...config.productOrder.map((id) => raw.find((p) => p.id === id)).filter(Boolean) as typeof raw,
                          ...raw.filter((p) => !config.productOrder.includes(p.id)),
                        ]
                      : raw;
                    return (
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={({ active, over }) => {
                          if (!over || active.id === over.id) return;
                          const oldIdx = ordered.findIndex((p) => p.id === active.id);
                          const newIdx = ordered.findIndex((p) => p.id === over.id);
                          if (oldIdx >= 0 && newIdx >= 0) {
                            set('productOrder', arrayMove(ordered, oldIdx, newIdx).map((p) => p.id));
                          }
                        }}
                      >
                        <SortableContext items={ordered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                            {ordered.map((p) => (
                              <SortableProductRow key={p.id} product={p} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    );
                  })()}
                </div>
              )}

              {/* Separator mode — shown only when grouping is active */}
              {config.raggruppa && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Modalità raggruppamento</p>
                  <div className="space-y-2">
                    {(
                      [
                        { value: 'pagina-intera', label: 'Pagina intera per sezione', desc: 'Ogni gruppo ha una pagina separatore dedicata' },
                        { value: 'inline', label: 'Intestazione inline', desc: 'Intestazione compatta, tutti i gruppi sulla stessa pagina' },
                        { value: 'nuova-riga', label: 'Vai a capo, stessa pagina', desc: 'Intestazione prominente con linea, tutti sulla stessa pagina' },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="modalitaSeparatore"
                          value={opt.value}
                          checked={config.modalitaSeparatore === opt.value}
                          onChange={() => set('modalitaSeparatore', opt.value)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">
                            {opt.label}
                          </span>
                          <p className="text-2xs text-gray-400">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stile e separazione ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.colori} onToggle={() => toggleSection('colori')}>
            Stile e separazione
          </SectionTitle>
          {sections.colori && (
            <div className="p-4 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ColorSwatchPicker label="Sfondo pagina" value={config.colori.sfondoPagina} onChange={(v) => setColore('sfondoPagina', v)} />
                <ColorSwatchPicker label="Sfondo foto" value={config.colori.sfondoFoto} onChange={(v) => setColore('sfondoFoto', v)} />
                <ColorSwatchPicker label="Testo primario" value={config.colori.testoPrimario} onChange={(v) => setColore('testoPrimario', v)} />
                <ColorSwatchPicker label="Testo secondario" value={config.colori.testoSecondario} onChange={(v) => setColore('testoSecondario', v)} />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Stile separatori sezioni</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                      <input type="number" min={8} max={40} value={config.separatoreStyle.fontSize}
                        onChange={(e) => setSeparatoreStyle({ fontSize: parseFloat(e.target.value) || 16 })}
                        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Altezza (pt)</label>
                      <input type="number" min={20} max={120} value={config.separatoreStyle.height}
                        onChange={(e) => setSeparatoreStyle({ height: parseInt(e.target.value) || 36 })}
                        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 w-20">Stile testo</span>
                    <ToggleBtn active={config.separatoreStyle.bold} onClick={() => setSeparatoreStyle({ bold: !config.separatoreStyle.bold })}><span className="font-bold">B</span></ToggleBtn>
                    <ToggleBtn active={config.separatoreStyle.italic} onClick={() => setSeparatoreStyle({ italic: !config.separatoreStyle.italic })}><span className="italic">I</span></ToggleBtn>
                    <ToggleBtn active={config.separatoreStyle.uppercase} onClick={() => setSeparatoreStyle({ uppercase: !config.separatoreStyle.uppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
                    <AlignToggle value={config.separatoreStyle.align} onChange={(v) => setSeparatoreStyle({ align: v })} />
                  </div>
                  <ColorSwatchPicker label="Colore testo" value={config.separatoreStyle.color} onChange={(v) => setSeparatoreStyle({ color: v })} />
                  <ColorSwatchPicker label="Colore sfondo" value={config.separatoreStyle.bgColor} onChange={(v) => setSeparatoreStyle({ bgColor: v })} />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ── Struttura sezioni personalizzata ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.sezioniPersonalizzate} onToggle={() => toggleSection('sezioniPersonalizzate')}>
            Struttura sezioni personalizzata
          </SectionTitle>
          {sections.sezioniPersonalizzate && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Usa struttura sezioni personalizzata"
                checked={config.useSezioniPersonalizzate}
                onChange={(v) => set('useSezioniPersonalizzate', v)}
              />
              {config.useSezioniPersonalizzate && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* DnD list of sections */}
                  {config.sezioniPersonalizzate.length > 0 && (
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIdx = config.sezioniPersonalizzate.findIndex(s => s.id === active.id);
                        const newIdx = config.sezioniPersonalizzate.findIndex(s => s.id === over.id);
                        setSezioniPersonalizzate(arrayMove(config.sezioniPersonalizzate, oldIdx, newIdx));
                      }}
                    >
                      <SortableContext items={config.sezioniPersonalizzate.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {config.sezioniPersonalizzate.map((sezione, idx) => (
                            <SortableSection
                              key={sezione.id}
                              sezione={sezione}
                              index={idx}
                              onEdit={() => setEditingSection(sezione)}
                              onDelete={() => setSezioniPersonalizzate(config.sezioniPersonalizzate.filter(s => s.id !== sezione.id))}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Add section button */}
                  <button
                    type="button"
                    onClick={() => setEditingSection({ id: crypto.randomUUID(), isNew: true, ...EMPTY_SECTION })}
                    className="w-full h-8 border border-dashed border-border rounded text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors"
                  >
                    + Nuova sezione
                  </button>

                  {/* Section editor */}
                  {editingSection && (
                    <div className="border border-primary/20 rounded p-3 space-y-3 bg-primary/5">
                      <p className="text-xs font-semibold text-primary">{editingSection.isNew ? 'Nuova sezione' : `Modifica: ${editingSection.nome}`}</p>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nome sezione *</label>
                        <input
                          type="text"
                          value={editingSection.nome}
                          onChange={(e) => setEditingSection({ ...editingSection, nome: e.target.value })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                          placeholder="es. Cucina, Bagno, Outdoor…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione <span className="text-gray-400 font-normal">(opzionale)</span></label>
                        <input
                          type="text"
                          value={editingSection.descrizione ?? ''}
                          onChange={(e) => setEditingSection({ ...editingSection, descrizione: e.target.value })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Criteri (OR — basta uno)</p>
                        <div className="space-y-2">
                          <MultiSelectCriteria label="Classe" options={classi} selected={editingSection.criteri.classe}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, classe: v } })} />
                          <MultiSelectCriteria label="Sottoclasse" options={sottoclassi} selected={editingSection.criteri.sottoclasse}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, sottoclasse: v } })} />
                          <MultiSelectCriteria label="Famiglia" options={famiglie} selected={editingSection.criteri.famiglia}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, famiglia: v } })} />
                          <MultiSelectCriteria label="Gruppo omogeneo" options={gruppiOmogenei} selected={editingSection.criteri.gruppoOmogeneo}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, gruppoOmogeneo: v } })} />
                          <MultiSelectCriteria label="Linea" options={linee} selected={editingSection.criteri.nomLinea}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, nomLinea: v } })} />
                          <MultiSelectCriteria label="Colore" options={colori} selected={editingSection.criteri.colore}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, colore: v } })} />
                          <MultiSelectCriteria label="Produttore" options={produttori} selected={editingSection.criteri.produttore}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, produttore: v } })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Ordinamento</label>
                          <select
                            value={editingSection.ordinamento}
                            onChange={(e) => setEditingSection({ ...editingSection, ordinamento: e.target.value as CustomSection['ordinamento'] })}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                          >
                            <option value="code">Codice A→Z</option>
                            <option value="name">Descrizione A→Z</option>
                            <option value="costPrice_asc">Prezzo crescente</option>
                            <option value="costPrice_desc">Prezzo decrescente</option>
                            <option value="nomLinea">Linea</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-0.5">
                          <CheckboxField
                            label="Mostra sottosezioni"
                            checked={editingSection.mostraSottosezioni}
                            onChange={(v) => setEditingSection({ ...editingSection, mostraSottosezioni: v })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={!editingSection.nome.trim()}
                          onClick={() => {
                            if (!editingSection.nome.trim()) return;
                            const { isNew, ...sez } = editingSection;
                            if (isNew) {
                              setSezioniPersonalizzate([...config.sezioniPersonalizzate, sez]);
                            } else {
                              setSezioniPersonalizzate(config.sezioniPersonalizzate.map(s => s.id === sez.id ? sez : s));
                            }
                            setEditingSection(null);
                          }}
                          className="flex-1 h-8 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          Salva sezione
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSection(null)}
                          className="px-3 h-8 rounded text-xs border border-border text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}

                  <CheckboxField
                    label="Includi prodotti non assegnati a nessuna sezione"
                    checked={config.includiProdottiNonAssegnati}
                    onChange={(v) => set('includiProdottiNonAssegnati', v)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Suddivisione per tranche ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.tranche} onToggle={() => toggleSection('tranche')}>
            Suddivisione per tranche
          </SectionTitle>
          {sections.tranche && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Suddividi il catalogo per tranche"
                checked={config.suddividiPerTranche}
                onChange={(v) => set('suddividiPerTranche', v)}
              />
              {config.suddividiPerTranche && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  <CheckboxField
                    label="Includi prodotti senza tranche assegnata"
                    checked={config.includeTrancheSenzaNome}
                    onChange={(v) => set('includeTrancheSenzaNome', v)}
                  />
                  <CheckboxField
                    label="Mostra pagina separatrice per ogni tranche"
                    checked={config.separatoreTrancheAttivo}
                    onChange={(v) => set('separatoreTrancheAttivo', v)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ordine tranche</label>
                    <select
                      value={config.ordineTranche}
                      onChange={(e) => set('ordineTranche', e.target.value as 'az' | 'za' | 'custom')}
                      className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="az">Alfabetico A→Z</option>
                      <option value="za">Alfabetico Z→A</option>
                      <option value="custom">Personalizzato (drag &amp; drop)</option>
                    </select>
                  </div>
                  {config.ordineTranche === 'custom' && tranches.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-2xs text-gray-500 mb-1">Trascina per riordinare</p>
                      {(() => {
                        const list = config.trancheOrder.length > 0 ? config.trancheOrder : [...tranches].sort();
                        return (
                          <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={({ active, over }) => {
                              if (!over || active.id === over.id) return;
                              const oldIdx = list.indexOf(active.id as string);
                              const newIdx = list.indexOf(over.id as string);
                              if (oldIdx >= 0 && newIdx >= 0) set('trancheOrder', arrayMove(list, oldIdx, newIdx));
                            }}
                          >
                            <SortableContext items={list} strategy={verticalListSortingStrategy}>
                              <div className="space-y-1">
                                {list.map((t) => (
                                  <SortableTranche key={t} id={t} label={t} />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        );
                      })()}
                    </div>
                  )}
                  {config.separatoreTrancheAttivo && (
                    <div className="border-t border-border pt-3">
                      <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Stile separatore tranche</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                          <input type="number" min={16} max={60} value={config.stileSeparatoreTranche.fontSize}
                            onChange={(e) => setSepTranche({ fontSize: parseFloat(e.target.value) || 36 })}
                            className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500 w-20">Stile testo</span>
                          <ToggleBtn active={config.stileSeparatoreTranche.bold} onClick={() => setSepTranche({ bold: !config.stileSeparatoreTranche.bold })}><span className="font-bold">B</span></ToggleBtn>
                          <ToggleBtn active={config.stileSeparatoreTranche.uppercase} onClick={() => setSepTranche({ uppercase: !config.stileSeparatoreTranche.uppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
                        </div>
                        <CheckboxField label="Mostra numero prodotti" checked={config.stileSeparatoreTranche.mostraNProdotti} onChange={(v) => setSepTranche({ mostraNProdotti: v })} />
                        <ColorSwatchPicker label="Colore sfondo" value={config.stileSeparatoreTranche.bgColor} onChange={(v) => setSepTranche({ bgColor: v })} />
                        <ColorSwatchPicker label="Colore testo" value={config.stileSeparatoreTranche.color} onChange={(v) => setSepTranche({ color: v })} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {/* ── Font ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.font} onToggle={() => toggleSection('font')}>
            Font
          </SectionTitle>
          {sections.font && (
            <div className="p-4 space-y-2">
              {[
                { value: 'helvetica', label: 'Helvetica (predefinito)', sample: 'Sans-serif classico' },
                { value: 'nova',      label: 'Nova Flat',               sample: 'Geometrico decorativo' },
                { value: 'inter',     label: 'Inter',                   sample: 'Sans-serif moderno' },
                { value: 'playfair',  label: 'Playfair Display',        sample: 'Serif elegante' },
                { value: 'montserrat', label: 'Montserrat',             sample: 'Geometrico pulito' },
                { value: 'lato',      label: 'Lato',                    sample: 'Umanistico e caldo' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-2.5 border rounded cursor-pointer transition-colors ${
                    config.fontFamiglia === opt.value ? 'border-primary bg-cream/30' : 'border-border hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="fontFamiglia"
                    value={opt.value}
                    checked={config.fontFamiglia === opt.value}
                    onChange={() => set('fontFamiglia', opt.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-xs font-medium text-primary">{opt.label}</p>
                    <p className="text-2xs text-gray-400">{opt.sample}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

          </>}

          {/* ══ SCHEDA PRODOTTO ══ */}
          {activeTab === 'scheda' && <>
        {/* ── Foto prodotto ── */}
        {config.campi.foto && (
          <div className="border border-border rounded overflow-hidden">
            <SectionTitle open={sections.fotoConfig} onToggle={() => toggleSection('fotoConfig')}>
              Foto prodotto
            </SectionTitle>
            {sections.fotoConfig && (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Numero foto per prodotto</p>
                  <div className="space-y-1.5">
                    {([
                      { value: 'solo-principale', label: 'Solo foto principale' },
                      { value: 'tutte', label: 'Tutte le foto disponibili (max 4)' },
                      { value: 'scegli', label: 'Scegli quante' },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="fotoNumero"
                          value={opt.value}
                          checked={config.fotoConfig.numero === opt.value}
                          onChange={() => setConfig((c) => ({ ...c, fotoConfig: { ...c.fotoConfig, numero: opt.value } }))}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {config.fotoConfig.numero === 'scegli' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-600">Numero massimo di foto:</span>
                      <select
                        value={config.fotoConfig.quantita}
                        onChange={(e) => setConfig((c) => ({ ...c, fotoConfig: { ...c.fotoConfig, quantita: Number(e.target.value) } }))}
                        className="border border-border rounded text-xs px-2 py-1 bg-white"
                      >
                        {[2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {config.fotoConfig.numero !== 'solo-principale' && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Layout foto multiple</p>
                    <div className="space-y-1.5">
                      {([
                        { value: 'grande-thumbnail', label: 'Grande + thumbnail laterali' },
                        { value: 'griglia-2x2', label: 'Griglia 2×2' },
                        { value: 'prima-disponibile', label: 'Solo la prima disponibile' },
                      ] as const).map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="fotoLayout"
                            value={opt.value}
                            checked={config.fotoConfig.layout === opt.value}
                            onChange={() => setConfig((c) => ({ ...c, fotoConfig: { ...c.fotoConfig, layout: opt.value } }))}
                            className="accent-primary"
                          />
                          <span className="text-xs text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Informazioni da mostrare ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.campi} onToggle={() => toggleSection('campi')}>
            Informazioni da mostrare
          </SectionTitle>
          {sections.campi && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <CheckboxField label="Foto prodotto" checked={config.campi.foto} onChange={(v) => setField('foto', v)} />
                <CheckboxField label="Codice" checked={config.campi.codice} onChange={(v) => setField('codice', v)} />
                <CheckboxField label="Descrizione" checked={config.campi.descrizione} onChange={(v) => setField('descrizione', v)} />
                <CheckboxField label="Misure" checked={config.campi.misure} onChange={(v) => setField('misure', v)} />
                <CheckboxField label="Produttore" checked={config.campi.produttore} onChange={(v) => setField('produttore', v)} />
                <CheckboxField label="Paese" checked={config.campi.paese} onChange={(v) => setField('paese', v)} />
                <CheckboxField label="Prezzo costo i.e." checked={config.campi.prezzoCosto} onChange={(v) => setField('prezzoCosto', v)} />
                <CheckboxField label="PVP i.i." checked={config.campi.pvp} onChange={(v) => setField('pvp', v)} />
                <CheckboxField label="Linea" checked={config.campi.linea} onChange={(v) => setField('linea', v)} />
                <CheckboxField label="Collezione" checked={config.campi.collezione} onChange={(v) => setField('collezione', v)} />
                <CheckboxField label="Confezione" checked={config.campi.confezione} onChange={(v) => setField('confezione', v)} />
                <CheckboxField label="IVA" checked={config.campi.iva} onChange={(v) => setField('iva', v)} />
              </div>
              {config.campi.descrizione && (
                <div className="pt-1 border-t border-border">
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Campo nome</p>
                  <div className="flex gap-4">
                    {([
                      { value: 'descrizione', label: 'Descrizione (preferita)' },
                      { value: 'nome', label: 'Nome (codice interno)' },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="campoNome"
                          value={opt.value}
                          checked={(config.campi.campoNome ?? 'descrizione') === opt.value}
                          onChange={() => setConfig((c) => ({ ...c, campi: { ...c.campi, campoNome: opt.value } }))}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Riquadro prodotto ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.riquadro} onToggle={() => toggleSection('riquadro')}>
            Riquadro prodotto
          </SectionTitle>
          {sections.riquadro && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bordo</label>
                  <select value={config.cardBoxStyle.borderWidth}
                    onChange={(e) => setCardBoxStyle({ borderWidth: parseFloat(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="0">Nessuno</option>
                    <option value="0.5">Sottile (0.5)</option>
                    <option value="1">Normale (1)</option>
                    <option value="2">Spesso (2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Angoli</label>
                  <select value={config.cardBoxStyle.borderRadius}
                    onChange={(e) => setCardBoxStyle({ borderRadius: parseInt(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="0">Nessuno</option>
                    <option value="4">Arrotondati</option>
                    <option value="8">Molto arrotondati</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Padding interno</label>
                  <select value={config.cardBoxStyle.padding}
                    onChange={(e) => setCardBoxStyle({ padding: parseInt(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="2">Stretto (2)</option>
                    <option value="4">Normale (4)</option>
                    <option value="6">Ampio (6)</option>
                    <option value="8">Molto ampio (8)</option>
                  </select>
                </div>
              </div>
              {config.cardBoxStyle.borderWidth > 0 && (
                <ColorSwatchPicker label="Colore bordo" value={config.cardBoxStyle.borderColor}
                  onChange={(v) => setCardBoxStyle({ borderColor: v })} />
              )}
            </div>
          )}
        </div>

        {/* ── Tipografia ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.campiStile} onToggle={() => toggleSection('campiStile')}>
            Tipografia
          </SectionTitle>
          {sections.campiStile && (
            <div className="p-4 space-y-3">
              {(() => {
                const reorderableKeys = ['codice', 'descrizione', 'misure'];
                const enabledReorderable = (config.fieldOrder ?? reorderableKeys).filter(k => {
                  if (k === 'codice') return config.campi.codice;
                  if (k === 'descrizione') return config.campi.descrizione;
                  if (k === 'misure') return config.campi.misure || config.campi.linea || config.campi.collezione || config.campi.confezione || config.campi.iva;
                  return false;
                });
                if (enabledReorderable.length === 0) return null;
                return (
                  <>
                    <p className="text-2xs text-gray-400">Trascina ⠿ per riordinare i campi nel riquadro. ↕ = spaziatura inferiore in pt.</p>
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const base = config.fieldOrder ?? reorderableKeys;
                        const oldIdx = base.indexOf(active.id as string);
                        const newIdx = base.indexOf(over.id as string);
                        if (oldIdx >= 0 && newIdx >= 0) set('fieldOrder', arrayMove(base, oldIdx, newIdx));
                      }}
                    >
                      <SortableContext items={enabledReorderable} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {enabledReorderable.map(k => (
                            <SortableFieldStyleRow
                              key={k}
                              fieldKey={k}
                              value={config.cardFieldStyles[k as keyof typeof config.cardFieldStyles]}
                              onChange={(fs) => setCardFieldStyle(k as keyof typeof config.cardFieldStyles, fs)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                );
              })()}
              {(config.campi.prezzoCosto || config.campi.pvp || config.campi.produttore || config.campi.paese) && (
                <div className="border-t border-border pt-3">
                  <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Prezzi e fornitore (sempre in fondo)</p>
                  <div className="divide-y divide-border/50">
                    {config.campi.prezzoCosto && (
                      <FieldStyleRow label="Prezzo costo" value={config.cardFieldStyles.prezzoCosto}
                        onChange={(fs) => setCardFieldStyle('prezzoCosto', fs)} showSpacing />
                    )}
                    {config.campi.pvp && (
                      <FieldStyleRow label="PVP" value={config.cardFieldStyles.pvp}
                        onChange={(fs) => setCardFieldStyle('pvp', fs)} showSpacing />
                    )}
                    {config.campi.produttore && (
                      <FieldStyleRow label="Produttore" value={config.cardFieldStyles.produttore}
                        onChange={(fs) => setCardFieldStyle('produttore', fs)} showSpacing />
                    )}
                    {config.campi.paese && (
                      <FieldStyleRow label="Paese" value={config.cardFieldStyles.paese}
                        onChange={(fs) => setCardFieldStyle('paese', fs)} showSpacing />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* ── Badge NUOVO ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.nuovoBadge} onToggle={() => toggleSection('nuovoBadge')}>
            Badge NUOVO
          </SectionTitle>
          {sections.nuovoBadge && (
            <div className="p-4 space-y-3">
              <CheckboxField
                label="Mostra badge su tutti i prodotti"
                checked={config.nuovoBadge.attivo}
                onChange={(v) => setNuovoBadge({ attivo: v })}
              />
              {config.nuovoBadge.attivo && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Testo badge</label>
                    <input
                      type="text"
                      value={config.nuovoBadge.testo}
                      onChange={(e) => setNuovoBadge({ testo: e.target.value })}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. NUOVO"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Posizione nel PDF</label>
                    <select
                      value={config.nuovoBadge.posizione}
                      onChange={(e) => setNuovoBadge({ posizione: e.target.value as 'image-top-right' | 'next-to-code' })}
                      className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none"
                    >
                      <option value="image-top-right">In alto a destra sull&apos;immagine</option>
                      <option value="next-to-code">Accanto al codice prodotto</option>
                    </select>
                  </div>
                  <ColorSwatchPicker label="Colore sfondo badge" value={config.nuovoBadge.bgColor} onChange={(v) => setNuovoBadge({ bgColor: v })} />
                  <ColorSwatchPicker label="Colore testo badge" value={config.nuovoBadge.textColor} onChange={(v) => setNuovoBadge({ textColor: v })} />
                </div>
              )}
            </div>
          )}
        </div>

          </>}

          {/* ══ COPERTINA ══ */}
          {activeTab === 'copertina' && <>
        {/* ── Copertina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.copertina} onToggle={() => toggleSection('copertina')}>
            Copertina
          </SectionTitle>
          {sections.copertina && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi copertina"
                checked={config.copertina.attiva}
                onChange={(v) => setCopertina('attiva', v)}
              />
              {config.copertina.attiva && (
                <div className="space-y-4 pl-2 border-l-2 border-border">
                  {/* Image upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Immagine di copertina
                    </label>
                    <p className="text-2xs text-gray-400 mb-2">
                      Carica sul server (consigliato — l&apos;immagine viene salvata con il template) oppure scegli un file locale per la sessione corrente (max 2 MB).
                    </p>
                    {/* Upload to server */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('Immagine troppo grande (max 10 MB)');
                            e.target.value = '';
                            return;
                          }
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await fetch('/api/admin/catalogo-pdf/upload-cover', { method: 'POST', body: fd });
                            if (!res.ok) throw new Error((await res.json()).error);
                            const { url } = await res.json();
                            setCopertina('immagineUrl', url);
                            // Also load as base64 for live preview
                            const reader = new FileReader();
                            reader.onload = (ev) => setCopertina('immagineBase64', ev.target?.result as string);
                            reader.readAsDataURL(file);
                            e.target.value = '';
                            toast.success('Immagine caricata sul server');
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : 'Errore upload');
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                      <span className="text-2xs text-gray-400 flex-shrink-0">Carica sul server</span>
                    </div>
                    {/* Or local only (no persistence) */}
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 cursor-pointer"
                      />
                      <span className="text-2xs text-gray-400 flex-shrink-0">Solo sessione</span>
                    </div>
                    {/* Preview: server URL takes priority over base64 */}
                    {(config.copertina.immagineUrl || config.copertina.immagineBase64) && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={config.copertina.immagineBase64 ?? config.copertina.immagineUrl ?? ''}
                          alt="Anteprima copertina"
                          className="h-16 w-24 object-cover rounded border border-border"
                        />
                        <div className="space-y-1">
                          {config.copertina.immagineUrl && (
                            <p className="text-2xs text-green-600">Immagine salvata sul server</p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCopertina('immagineBase64', null);
                              setCopertina('immagineUrl', null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-2xs text-red-500 hover:text-red-700 underline"
                          >
                            Rimuovi immagine
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Layout */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Layout copertina</label>
                    <select
                      value={config.copertina.layout}
                      onChange={(e) => setCopertina('layout', e.target.value)}
                      className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="full-overlay">Immagine piena con testo sovrapposto</option>
                      <option value="half">Metà immagine, metà testo</option>
                      <option value="solo-testo">Solo testo (nessuna immagine)</option>
                    </select>
                  </div>

                  {/* ITEM 3C: Image position/scale/opacity controls */}
                  {config.copertina.layout !== 'solo-testo' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-600">Posizione e scala immagine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset X (%)</label>
                          <input type="range" min={-50} max={50} value={config.copertina.imgOffsetX ?? 0}
                            onChange={(e) => setCopertina('imgOffsetX', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOffsetX ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset Y (%)</label>
                          <input type="range" min={-50} max={50} value={config.copertina.imgOffsetY ?? 0}
                            onChange={(e) => setCopertina('imgOffsetY', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOffsetY ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Scala (%)</label>
                          <input type="range" min={50} max={200} value={config.copertina.imgScale ?? 100}
                            onChange={(e) => setCopertina('imgScale', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgScale ?? 100}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Opacità (%)</label>
                          <input type="range" min={10} max={100} value={config.copertina.imgOpacity ?? 100}
                            onChange={(e) => setCopertina('imgOpacity', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOpacity ?? 100}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Logo in copertina</p>
                    {(
                      [
                        { value: 'onearth', label: 'Logo ON EARTH (automatico)' },
                        { value: 'custom', label: 'Carica logo personalizzato' },
                        { value: 'none', label: 'Nessun logo' },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoTipo"
                          value={opt.value}
                          checked={config.copertina.logoTipo === opt.value}
                          onChange={() => setCopertina('logoTipo', opt.value)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}

                    {config.copertina.logoTipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleLogoUpload}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        {config.copertina.logoCustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.copertina.logoCustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setCopertina('logoCustomBase64', null); if (logoFileInputRef.current) logoFileInputRef.current.value = ''; }} className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {config.copertina.logoTipo !== 'none' && (
                      <div className="grid grid-cols-2 gap-3 pl-5">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo X</label>
                          <select
                            value={config.copertina.logoPosX ?? 'left'}
                            onChange={(e) => setCopertina('logoPosX', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="left">Sinistra</option>
                            <option value="center">Centro</option>
                            <option value="right">Destra</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo Y</label>
                          <select
                            value={config.copertina.logoPosY ?? 'top'}
                            onChange={(e) => setCopertina('logoPosY', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="top">In alto</option>
                            <option value="middle">A metà</option>
                            <option value="bottom">In basso</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                          {config.copertina.logoTipo === 'custom' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={8}
                                max={150}
                                step={1}
                                value={config.copertina.logoCustomH ?? 28}
                                onChange={(e) => setCopertina('logoCustomH', Number(e.target.value))}
                                className="flex-1 accent-primary h-1"
                              />
                              <input
                                type="number"
                                min={8}
                                max={150}
                                value={config.copertina.logoCustomH ?? 28}
                                onChange={(e) => setCopertina('logoCustomH', Math.min(150, Math.max(8, Number(e.target.value) || 28)))}
                                className="w-12 h-8 border border-border rounded px-1.5 text-xs bg-white text-center focus:outline-none"
                              />
                              <span className="text-2xs text-gray-400">pt</span>
                            </div>
                          ) : (
                            <select
                              value={config.copertina.logoDimensione}
                              onChange={(e) => setCopertina('logoDimensione', e.target.value)}
                              className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                            >
                              <option value="piccolo">Piccolo</option>
                              <option value="medio">Medio</option>
                              <option value="grande">Grande</option>
                            </select>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Logo aggiuntivo copertina */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Logo aggiuntivo</p>
                    {(['none', 'custom'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="copertina-logo2tipo" value={v}
                          checked={(config.copertina.logo2Tipo ?? 'none') === v}
                          onChange={() => setCopertina('logo2Tipo', v)} className="accent-primary" />
                        <span className="text-xs text-gray-700">{v === 'none' ? 'Nessun logo aggiuntivo' : 'Carica logo aggiuntivo'}</span>
                      </label>
                    ))}
                    {config.copertina.logo2Tipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input ref={copertinaLogo2FileInputRef} type="file" accept="image/png,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Logo troppo grande (max 5 MB)');
                              if (copertinaLogo2FileInputRef.current) copertinaLogo2FileInputRef.current.value = '';
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setCopertina('logo2CustomBase64', dataUrl);
                              try {
                                const logos = loadLogosFromStorage();
                                localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...logos, copertinaLogo2: dataUrl }));
                              } catch {}
                              if (copertinaLogo2FileInputRef.current) copertinaLogo2FileInputRef.current.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                        {config.copertina.logo2CustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.copertina.logo2CustomBase64} alt="Logo2" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setCopertina('logo2CustomBase64', null); if (copertinaLogo2FileInputRef.current) copertinaLogo2FileInputRef.current.value = ''; }}
                                className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Posizione X</label>
                            <select value={config.copertina.logo2PosX ?? 'right'} onChange={(e) => setCopertina('logo2PosX', e.target.value)}
                              className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none">
                              <option value="left">Sinistra</option>
                              <option value="center">Centro</option>
                              <option value="right">Destra</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Posizione Y</label>
                            <select value={config.copertina.logo2PosY ?? 'bottom'} onChange={(e) => setCopertina('logo2PosY', e.target.value)}
                              className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none">
                              <option value="top">In alto</option>
                              <option value="middle">A metà</option>
                              <option value="bottom">In basso</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                            <select value={config.copertina.logo2Dimensione ?? 'medio'} onChange={(e) => setCopertina('logo2Dimensione', e.target.value)}
                              className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none">
                              <option value="piccolo">Piccolo</option>
                              <option value="medio">Medio</option>
                              <option value="grande">Grande</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Titolo copertina */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Titolo copertina</label>
                    <TypoToolbar
                      value={{ fontFamily: config.copertinaTypo.titoloFontFamily ?? 'helvetica', fontSize: config.copertinaTypo.titoloFontSize, bold: config.copertinaTypo.titoloBold, italic: config.copertinaTypo.titoloItalic, underline: false, uppercase: config.copertinaTypo.titoloUppercase, color: config.copertinaTypo.titoloColor, highlight: '', align: config.copertina.titoloAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setCopertinaTypo({ titoloFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setCopertinaTypo({ titoloFontSize: v.fontSize });
                        if (v.bold !== undefined) setCopertinaTypo({ titoloBold: v.bold });
                        if (v.italic !== undefined) setCopertinaTypo({ titoloItalic: v.italic });
                        if (v.uppercase !== undefined) setCopertinaTypo({ titoloUppercase: v.uppercase });
                        if (v.color !== undefined) setCopertinaTypo({ titoloColor: v.color });
                        if (v.align !== undefined) setCopertina('titoloAllineamento', v.align);
                      }}
                      showAlign showTimesRomanCourier minSize={10} maxSize={60}
                    />
                    <textarea
                      rows={3}
                      value={config.copertina.titolo}
                      onChange={(e) => setCopertina('titolo', e.target.value)}
                      className="w-full border border-border border-t-0 rounded-b px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-vertical"
                      placeholder={"es. Collezione\nCASA 2027\n(Invio per andare a capo)"}
                    />
                  </div>

                  {/* Sottotitolo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Sottotitolo <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <TypoToolbar
                      value={{ fontFamily: config.copertinaTypo.sottotitoloFontFamily ?? 'helvetica', fontSize: config.copertinaTypo.sottotitoloFontSize, bold: config.copertinaTypo.sottotitoloBold, italic: config.copertinaTypo.sottotitoloItalic, underline: false, uppercase: false, color: config.copertinaTypo.sottotitoloColor, highlight: '', align: config.copertina.sottotitoloAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setCopertinaTypo({ sottotitoloFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setCopertinaTypo({ sottotitoloFontSize: v.fontSize });
                        if (v.bold !== undefined) setCopertinaTypo({ sottotitoloBold: v.bold });
                        if (v.italic !== undefined) setCopertinaTypo({ sottotitoloItalic: v.italic });
                        if (v.color !== undefined) setCopertinaTypo({ sottotitoloColor: v.color });
                        if (v.align !== undefined) setCopertina('sottotitoloAllineamento', v.align);
                      }}
                      showAlign showTimesRomanCourier minSize={8} maxSize={32}
                    />
                    <textarea
                      rows={2}
                      value={config.copertina.sottotitolo}
                      onChange={(e) => setCopertina('sottotitolo', e.target.value)}
                      className="w-full border border-border border-t-0 rounded-b px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-vertical"
                      placeholder={"es. Primavera / Estate 2027\n(Invio per andare a capo)"}
                    />
                  </div>

                  {/* Sottotitolo 2 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Sottotitolo 2 <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <TypoToolbar
                      value={{ fontFamily: config.copertinaTypo.sottotitolo2FontFamily ?? 'helvetica', fontSize: config.copertinaTypo.sottotitolo2FontSize ?? 11, bold: config.copertinaTypo.sottotitolo2Bold ?? false, italic: config.copertinaTypo.sottotitolo2Italic ?? false, underline: false, uppercase: false, color: config.copertinaTypo.sottotitolo2Color ?? config.copertinaTypo.sottotitoloColor, highlight: '', align: config.copertina.sottotitolo2Allineamento ?? 'center' }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setCopertinaTypo({ sottotitolo2FontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setCopertinaTypo({ sottotitolo2FontSize: v.fontSize });
                        if (v.bold !== undefined) setCopertinaTypo({ sottotitolo2Bold: v.bold });
                        if (v.italic !== undefined) setCopertinaTypo({ sottotitolo2Italic: v.italic });
                        if (v.color !== undefined) setCopertinaTypo({ sottotitolo2Color: v.color });
                        if (v.align !== undefined) setCopertina('sottotitolo2Allineamento', v.align);
                      }}
                      showAlign showTimesRomanCourier minSize={8} maxSize={32}
                    />
                    <textarea
                      rows={2}
                      value={config.copertina.sottotitolo2 ?? ''}
                      onChange={(e) => setCopertina('sottotitolo2', e.target.value)}
                      className="w-full border border-border border-t-0 rounded-b px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-vertical"
                      placeholder={"es. Showroom Milano · Aprile 2027\n(Invio per andare a capo)"}
                    />
                  </div>

                  {/* Spaziatura e margini */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-600 flex items-center gap-1 select-none">
                      <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                      Spaziatura e margini
                    </summary>
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="block text-2xs text-gray-500 mb-0.5">Titolo → Sottotitolo ({config.copertinaTypo.spacingTitoloSottotitolo ?? 6} pt)</label>
                        <input type="range" min={0} max={40} value={config.copertinaTypo.spacingTitoloSottotitolo ?? 6}
                          onChange={(e) => setCopertinaTypo({ spacingTitoloSottotitolo: parseInt(e.target.value) })}
                          className="w-full" />
                      </div>
                      {config.copertina.sottotitolo2 && (
                        <div>
                          <label className="block text-2xs text-gray-500 mb-0.5">Sottotitolo → Sottotitolo 2 ({config.copertinaTypo.spacingSottotitoloSottotitolo2 ?? 4} pt)</label>
                          <input type="range" min={0} max={40} value={config.copertinaTypo.spacingSottotitoloSottotitolo2 ?? 4}
                            onChange={(e) => setCopertinaTypo({ spacingSottotitoloSottotitolo2: parseInt(e.target.value) })}
                            className="w-full" />
                        </div>
                      )}
                      <div>
                        <label className="block text-2xs text-gray-500 mb-0.5">Spaziatura lettere — titolo ({config.copertinaTypo.titoloLetterSpacing ?? 3} pt)</label>
                        <input type="range" min={0} max={12} step={0.5} value={config.copertinaTypo.titoloLetterSpacing ?? 3}
                          onChange={(e) => setCopertinaTypo({ titoloLetterSpacing: parseFloat(e.target.value) })}
                          className="w-full" />
                      </div>
                      <div>
                        <label className="block text-2xs text-gray-500 mb-0.5">Spaziatura lettere — sottotitolo ({config.copertinaTypo.sottotitoloLetterSpacing ?? 1} pt)</label>
                        <input type="range" min={0} max={12} step={0.5} value={config.copertinaTypo.sottotitoloLetterSpacing ?? 1}
                          onChange={(e) => setCopertinaTypo({ sottotitoloLetterSpacing: parseFloat(e.target.value) })}
                          className="w-full" />
                      </div>
                    </div>
                  </details>

                  {config.copertina.layout !== 'full-overlay' && (
                    <ColorSwatchPicker label="Colore sfondo (layout testo / metà)" value={config.copertinaTypo.bgColor}
                      onChange={(v) => setCopertinaTypo({ bgColor: v })} />
                  )}

                  {/* Preview moved to side panel */}
                </div>
              )}
            </div>
          )}
        </div>

          </>}

          {/* ══ ULTIMA PAGINA ══ */}
          {activeTab === 'ultima' && <>
        {/* ── Pagina finale ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.paginaFinale} onToggle={() => toggleSection('paginaFinale')}>
            Pagina finale
          </SectionTitle>
          {sections.paginaFinale && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi pagina finale"
                checked={config.paginaFinale.attiva}
                onChange={(v) => setPaginaFinale('attiva', v)}
              />
              {config.paginaFinale.attiva && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* Titolo con toolbar Word-like */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Titolo pagina <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <TypoToolbar
                      value={{ fontFamily: config.paginaFinaleTypo.titoloFontFamily, fontSize: config.paginaFinaleTypo.titoloFontSize, bold: config.paginaFinaleTypo.titoloBold, italic: config.paginaFinaleTypo.titoloItalic, underline: config.paginaFinaleTypo.titoloUnderline, uppercase: config.paginaFinaleTypo.titoloUppercase, color: config.paginaFinaleTypo.titoloColor, highlight: config.paginaFinaleTypo.titoloHighlight || '', align: config.paginaFinale.titoloAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setPaginaFinaleTypo({ titoloFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setPaginaFinaleTypo({ titoloFontSize: v.fontSize });
                        if (v.bold !== undefined) setPaginaFinaleTypo({ titoloBold: v.bold });
                        if (v.italic !== undefined) setPaginaFinaleTypo({ titoloItalic: v.italic });
                        if (v.underline !== undefined) setPaginaFinaleTypo({ titoloUnderline: v.underline });
                        if (v.uppercase !== undefined) setPaginaFinaleTypo({ titoloUppercase: v.uppercase });
                        if (v.color !== undefined) setPaginaFinaleTypo({ titoloColor: v.color });
                        if (v.highlight !== undefined) setPaginaFinaleTypo({ titoloHighlight: v.highlight });
                        if (v.align !== undefined) setPaginaFinale('titoloAllineamento', v.align);
                      }}
                      showAlign
                      minSize={8}
                      maxSize={72}
                    />
                    <MiniRichTextEditor
                      content={config.paginaFinale.titolo}
                      onChange={(html) => setPaginaFinale('titolo', html)}
                      placeholder="es. Grazie per la tua scelta"
                    />
                  </div>

                  {/* Testo libero con toolbar Word-like */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Testo libero</label>
                    <TypoToolbar
                      value={{ fontFamily: config.paginaFinaleTypo.testoFontFamily, fontSize: config.paginaFinaleTypo.testoFontSize, bold: config.paginaFinaleTypo.testoBold, italic: config.paginaFinaleTypo.testoItalic, underline: config.paginaFinaleTypo.testoUnderline, uppercase: config.paginaFinaleTypo.testoUppercase, color: config.paginaFinaleTypo.testoColor, highlight: config.paginaFinale.testoSfondoColore || '', align: config.paginaFinale.testoAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setPaginaFinaleTypo({ testoFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setPaginaFinaleTypo({ testoFontSize: v.fontSize });
                        if (v.bold !== undefined) setPaginaFinaleTypo({ testoBold: v.bold });
                        if (v.italic !== undefined) setPaginaFinaleTypo({ testoItalic: v.italic });
                        if (v.underline !== undefined) setPaginaFinaleTypo({ testoUnderline: v.underline });
                        if (v.uppercase !== undefined) setPaginaFinaleTypo({ testoUppercase: v.uppercase });
                        if (v.color !== undefined) setPaginaFinaleTypo({ testoColor: v.color });
                        if (v.highlight !== undefined) setPaginaFinale('testoSfondoColore', v.highlight);
                        if (v.align !== undefined) setPaginaFinale('testoAllineamento', v.align);
                      }}
                      showAlign
                    />
                    <RichTextEditor
                      content={config.paginaFinale.testo}
                      onChange={(html) => setPaginaFinale('testo', html)}
                      placeholder="Testo da mostrare nella pagina finale del catalogo…"
                    />
                  </div>

                  {/* Spaziatura */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-600 flex items-center gap-1 select-none">
                      <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                      Spaziatura
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Margine superiore (pt)</label>
                        <input type="range" min={0} max={80} value={config.paginaFinaleTypo.marginTop ?? 20}
                          onChange={(e) => setPaginaFinaleTypo({ marginTop: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaFinaleTypo.marginTop ?? 20}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo titolo (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaFinaleTypo.titoloMarginBottom ?? 12}
                          onChange={(e) => setPaginaFinaleTypo({ titoloMarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaFinaleTypo.titoloMarginBottom ?? 12}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo sez. 1 (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaFinaleTypo.sezione1MarginBottom ?? 16}
                          onChange={(e) => setPaginaFinaleTypo({ sezione1MarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaFinaleTypo.sezione1MarginBottom ?? 16}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo sez. 2 (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaFinaleTypo.sezione2MarginBottom ?? 16}
                          onChange={(e) => setPaginaFinaleTypo({ sezione2MarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaFinaleTypo.sezione2MarginBottom ?? 16}pt</span>
                      </div>
                    </div>
                  </details>

                  {/* Logo aggiuntivo */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Logo aggiuntivo</p>
                    {(['none', 'custom'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="finale-logo2tipo" value={v}
                          checked={(config.paginaFinale.logo2Tipo ?? 'none') === v}
                          onChange={() => setPaginaFinale('logo2Tipo', v)} className="accent-primary" />
                        <span className="text-xs text-gray-700">{v === 'none' ? 'Nessun logo aggiuntivo' : 'Carica logo aggiuntivo'}</span>
                      </label>
                    ))}
                    {config.paginaFinale.logo2Tipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input ref={finalLogo2FileInputRef} type="file" accept="image/png,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Logo troppo grande (max 5 MB)');
                              if (finalLogo2FileInputRef.current) finalLogo2FileInputRef.current.value = '';
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setPaginaFinale('logo2CustomBase64', dataUrl);
                              try {
                                const logos = loadLogosFromStorage();
                                localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...logos, paginaFinaleLogo2: dataUrl }));
                              } catch {}
                              if (finalLogo2FileInputRef.current) finalLogo2FileInputRef.current.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                        {config.paginaFinale.logo2CustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.paginaFinale.logo2CustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setPaginaFinale('logo2CustomBase64', null); if (finalLogo2FileInputRef.current) finalLogo2FileInputRef.current.value = ''; }}
                                className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Posizione nel layout</label>
                            <select value={config.paginaFinale.logo2Posizione ?? 'below-text'} onChange={(e) => setPaginaFinale('logo2Posizione', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="above-title">Sopra il titolo</option>
                              <option value="between">Tra titolo e testo</option>
                              <option value="below-text">Sotto il testo</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Allineamento</label>
                            <select value={config.paginaFinale.logo2PosX ?? 'center'} onChange={(e) => setPaginaFinale('logo2PosX', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="left">Sinistra</option>
                              <option value="center">Centro</option>
                              <option value="right">Destra</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                            <select value={config.paginaFinale.logo2Dimensione ?? 'medio'} onChange={(e) => setPaginaFinale('logo2Dimensione', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="piccolo">Piccolo</option>
                              <option value="medio">Medio</option>
                              <option value="grande">Grande</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sezione in fondo (sezione 3) */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Sezione in fondo alla pagina</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={config.paginaFinale.sezioneFinale3Attiva}
                        onChange={(e) => setPaginaFinale('sezioneFinale3Attiva', e.target.checked)}
                        className="accent-primary" />
                      <span className="text-xs text-gray-700">Includi sezione in fondo</span>
                    </label>
                    {config.paginaFinale.sezioneFinale3Attiva && (
                      <div className="space-y-2 pl-2 border-l-2 border-border">
                        <RichTextEditor
                          content={config.paginaFinale.sezioneFinale3Html}
                          onChange={(html) => setPaginaFinale('sezioneFinale3Html', html)}
                          placeholder="es. www.on-earth.it | info@on-earth.it | Tel. +39 XXX"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Font (pt)</label>
                            <input type="range" min={8} max={20} value={config.paginaFinale.sezioneFinale3FontSize}
                              onChange={(e) => setPaginaFinale('sezioneFinale3FontSize', parseInt(e.target.value))}
                              className="w-full" />
                            <span className="text-2xs text-gray-400">{config.paginaFinale.sezioneFinale3FontSize}pt</span>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Allineamento</label>
                            <AlignToggle value={config.paginaFinale.sezioneFinale3Align} onChange={(v) => setPaginaFinale('sezioneFinale3Align', v)} />
                          </div>
                        </div>
                        <ColorSwatchPicker label="Colore testo" value={config.paginaFinale.sezioneFinale3Colore} onChange={(v) => setPaginaFinale('sezioneFinale3Colore', v)} />
                      </div>
                    )}
                  </div>

                  {/* Immagine pagina finale */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-600">Immagine</p>
                    <div>
                      <p className="text-2xs text-gray-400 mb-2">
                        Carica sul server (consigliato) o solo per la sessione corrente (max 10 MB).
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error('Immagine troppo grande (max 10 MB)'); e.target.value = ''; return; }
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                              const res = await fetch('/api/admin/catalogo-pdf/upload-cover', { method: 'POST', body: fd });
                              if (!res.ok) throw new Error((await res.json()).error);
                              const { url } = await res.json();
                              setPaginaFinale('immagineUrl', url);
                              const reader = new FileReader();
                              reader.onload = (ev) => setPaginaFinale('immagineBase64', ev.target?.result as string);
                              reader.readAsDataURL(file);
                              e.target.value = '';
                              toast.success('Immagine caricata sul server');
                            } catch (err: unknown) {
                              toast.error(err instanceof Error ? err.message : 'Errore upload');
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        <span className="text-2xs text-gray-400 flex-shrink-0">Carica sul server</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={finalImgFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error('Immagine troppo grande (max 10 MB)'); e.target.value = ''; return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setPaginaFinale('immagineBase64', ev.target?.result as string);
                              if (finalImgFileInputRef.current) finalImgFileInputRef.current.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 cursor-pointer"
                        />
                        <span className="text-2xs text-gray-400 flex-shrink-0">Solo sessione</span>
                      </div>
                      {(config.paginaFinale.immagineUrl || config.paginaFinale.immagineBase64) && (
                        <div className="mt-2 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={config.paginaFinale.immagineBase64 ?? config.paginaFinale.immagineUrl ?? ''}
                            alt="Anteprima"
                            className="h-12 w-20 object-cover rounded border border-border"
                          />
                          <div className="space-y-1">
                            {config.paginaFinale.immagineUrl && (
                              <p className="text-2xs text-green-600">Salvata sul server</p>
                            )}
                            <button
                              type="button"
                              onClick={() => { setPaginaFinale('immagineBase64', null); setPaginaFinale('immagineUrl', null); if (finalImgFileInputRef.current) finalImgFileInputRef.current.value = ''; }}
                              className="text-2xs text-red-500 hover:text-red-700 underline"
                            >
                              Rimuovi immagine
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Layout */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Layout pagina finale</label>
                      <select
                        value={config.paginaFinale.layout ?? 'img-top'}
                        onChange={(e) => setPaginaFinale('layout', e.target.value)}
                        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="img-top">Immagine in alto, testo in basso</option>
                        <option value="img-bottom">Immagine in basso, testo in alto</option>
                        <option value="img-left">Immagine a sinistra, testo a destra</option>
                        <option value="full-overlay">Immagine piena con testo sovrapposto</option>
                        <option value="background">Immagine a sfondo intera pagina</option>
                        <option value="img-only">Solo immagine (nessun testo)</option>
                      </select>
                    </div>

                    {/* Image controls */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600">Posizione e scala immagine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset X (%)</label>
                          <input type="range" min={-100} max={100} value={config.paginaFinale.imgOffsetX ?? 0}
                            onChange={(e) => setPaginaFinale('imgOffsetX', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaFinale.imgOffsetX ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset Y (%)</label>
                          <input type="range" min={-100} max={100} value={config.paginaFinale.imgOffsetY ?? 0}
                            onChange={(e) => setPaginaFinale('imgOffsetY', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaFinale.imgOffsetY ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Scala (%)</label>
                          <input type="range" min={50} max={200} value={config.paginaFinale.imgScale ?? 100}
                            onChange={(e) => setPaginaFinale('imgScale', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaFinale.imgScale ?? 100}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Opacità (%)</label>
                          <input type="range" min={10} max={100} value={config.paginaFinale.imgOpacity ?? 100}
                            onChange={(e) => setPaginaFinale('imgOpacity', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaFinale.imgOpacity ?? 100}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logo principale */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Logo principale</p>
                    {(
                      [
                        { value: 'onearth', label: 'Logo ON EARTH (automatico)' },
                        { value: 'custom', label: 'Carica logo personalizzato' },
                        { value: 'none', label: 'Nessun logo' },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paginaFinaleLogoTipo"
                          value={opt.value}
                          checked={(config.paginaFinale.logoTipo ?? (config.paginaFinale.mostraLogo ? 'onearth' : 'none')) === opt.value}
                          onChange={() => setPaginaFinale('logoTipo', opt.value)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}

                    {config.paginaFinale.logoTipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input
                          ref={finalLogoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setPaginaFinale('logoCustomBase64', dataUrl);
                              if (finalLogoFileInputRef.current) finalLogoFileInputRef.current.value = '';
                              try { const l = loadLogosFromStorage(); localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...l, paginaFinaleLogo: dataUrl })); } catch {}
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        {config.paginaFinale.logoCustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.paginaFinale.logoCustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setPaginaFinale('logoCustomBase64', null); if (finalLogoFileInputRef.current) finalLogoFileInputRef.current.value = ''; }} className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(config.paginaFinale.logoTipo ?? 'onearth') !== 'none' && (
                      <div className="pl-5 space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Posizione logo</label>
                          <LogoPosGrid
                            posX={config.paginaFinale.logoPosX ?? 'center'}
                            posY={config.paginaFinale.logoPosY ?? 'bottom'}
                            onChange={(x, y) => { setPaginaFinale('logoPosX', x); setPaginaFinale('logoPosY', y); }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione logo</label>
                          <select
                            value={config.paginaFinale.logoDimensione ?? 'medio'}
                            onChange={(e) => setPaginaFinale('logoDimensione', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="piccolo">Piccolo</option>
                            <option value="medio">Medio</option>
                            <option value="grande">Grande</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

          </>}

          {/* ══ PENULTIMA PAGINA ══ */}
          {activeTab === 'penultima' && <>
        {/* ── Penultima pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.paginaPenultima} onToggle={() => toggleSection('paginaPenultima')}>
            Penultima pagina
          </SectionTitle>
          {sections.paginaPenultima && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi penultima pagina"
                checked={config.paginaPenultima.attiva}
                onChange={(v) => setPaginaPenultima('attiva', v)}
              />
              {config.paginaPenultima.attiva && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* Titolo con toolbar Word-like */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Titolo pagina <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <TypoToolbar
                      value={{ fontFamily: config.paginaPenultimaTypo.titoloFontFamily, fontSize: config.paginaPenultimaTypo.titoloFontSize, bold: config.paginaPenultimaTypo.titoloBold, italic: config.paginaPenultimaTypo.titoloItalic, underline: config.paginaPenultimaTypo.titoloUnderline, uppercase: config.paginaPenultimaTypo.titoloUppercase, color: config.paginaPenultimaTypo.titoloColor, highlight: config.paginaPenultimaTypo.titoloHighlight || '', align: config.paginaPenultima.titoloAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setPaginaPenultimaTypo({ titoloFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setPaginaPenultimaTypo({ titoloFontSize: v.fontSize });
                        if (v.bold !== undefined) setPaginaPenultimaTypo({ titoloBold: v.bold });
                        if (v.italic !== undefined) setPaginaPenultimaTypo({ titoloItalic: v.italic });
                        if (v.underline !== undefined) setPaginaPenultimaTypo({ titoloUnderline: v.underline });
                        if (v.uppercase !== undefined) setPaginaPenultimaTypo({ titoloUppercase: v.uppercase });
                        if (v.color !== undefined) setPaginaPenultimaTypo({ titoloColor: v.color });
                        if (v.highlight !== undefined) setPaginaPenultimaTypo({ titoloHighlight: v.highlight });
                        if (v.align !== undefined) setPaginaPenultima('titoloAllineamento', v.align);
                      }}
                      showAlign
                      minSize={8}
                      maxSize={72}
                    />
                    <MiniRichTextEditor
                      content={config.paginaPenultima.titolo}
                      onChange={(html) => setPaginaPenultima('titolo', html)}
                      placeholder="es. Scopri la collezione completa"
                    />
                  </div>

                  {/* Testo libero con toolbar Word-like */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Testo libero</label>
                    <TypoToolbar
                      value={{ fontFamily: config.paginaPenultimaTypo.testoFontFamily, fontSize: config.paginaPenultimaTypo.testoFontSize, bold: config.paginaPenultimaTypo.testoBold, italic: config.paginaPenultimaTypo.testoItalic, underline: config.paginaPenultimaTypo.testoUnderline, uppercase: config.paginaPenultimaTypo.testoUppercase, color: config.paginaPenultimaTypo.testoColor, highlight: config.paginaPenultima.testoSfondoColore || '', align: config.paginaPenultima.testoAllineamento }}
                      onChange={(v) => {
                        if (v.fontFamily !== undefined) setPaginaPenultimaTypo({ testoFontFamily: v.fontFamily });
                        if (v.fontSize !== undefined) setPaginaPenultimaTypo({ testoFontSize: v.fontSize });
                        if (v.bold !== undefined) setPaginaPenultimaTypo({ testoBold: v.bold });
                        if (v.italic !== undefined) setPaginaPenultimaTypo({ testoItalic: v.italic });
                        if (v.underline !== undefined) setPaginaPenultimaTypo({ testoUnderline: v.underline });
                        if (v.uppercase !== undefined) setPaginaPenultimaTypo({ testoUppercase: v.uppercase });
                        if (v.color !== undefined) setPaginaPenultimaTypo({ testoColor: v.color });
                        if (v.highlight !== undefined) setPaginaPenultima('testoSfondoColore', v.highlight);
                        if (v.align !== undefined) setPaginaPenultima('testoAllineamento', v.align);
                      }}
                      showAlign
                    />
                    <RichTextEditor
                      content={config.paginaPenultima.testo}
                      onChange={(html) => setPaginaPenultima('testo', html)}
                      placeholder="Testo da mostrare nella penultima pagina del catalogo…"
                    />
                  </div>

                  {/* Spaziatura */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-600 flex items-center gap-1 select-none">
                      <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                      Spaziatura
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Margine superiore (pt)</label>
                        <input type="range" min={0} max={80} value={config.paginaPenultimaTypo.marginTop ?? 20}
                          onChange={(e) => setPaginaPenultimaTypo({ marginTop: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaPenultimaTypo.marginTop ?? 20}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo titolo (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaPenultimaTypo.titoloMarginBottom ?? 12}
                          onChange={(e) => setPaginaPenultimaTypo({ titoloMarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaPenultimaTypo.titoloMarginBottom ?? 12}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo sez. 1 (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaPenultimaTypo.sezione1MarginBottom ?? 16}
                          onChange={(e) => setPaginaPenultimaTypo({ sezione1MarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaPenultimaTypo.sezione1MarginBottom ?? 16}pt</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Spazio dopo sez. 2 (pt)</label>
                        <input type="range" min={0} max={40} value={config.paginaPenultimaTypo.sezione2MarginBottom ?? 16}
                          onChange={(e) => setPaginaPenultimaTypo({ sezione2MarginBottom: parseInt(e.target.value) })} className="w-full" />
                        <span className="text-2xs text-gray-400">{config.paginaPenultimaTypo.sezione2MarginBottom ?? 16}pt</span>
                      </div>
                    </div>
                  </details>

                  {/* Logo aggiuntivo */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Logo aggiuntivo</p>
                    {(['none', 'custom'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="penultima-logo2tipo" value={v}
                          checked={(config.paginaPenultima.logo2Tipo ?? 'none') === v}
                          onChange={() => setPaginaPenultima('logo2Tipo', v)} className="accent-primary" />
                        <span className="text-xs text-gray-700">{v === 'none' ? 'Nessun logo aggiuntivo' : 'Carica logo aggiuntivo'}</span>
                      </label>
                    ))}
                    {config.paginaPenultima.logo2Tipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input ref={penultimaLogo2FileInputRef} type="file" accept="image/png,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Logo troppo grande (max 5 MB)');
                              if (penultimaLogo2FileInputRef.current) penultimaLogo2FileInputRef.current.value = '';
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setPaginaPenultima('logo2CustomBase64', dataUrl);
                              try {
                                const logos = loadLogosFromStorage();
                                localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...logos, paginaPenultimaLogo2: dataUrl }));
                              } catch {}
                              if (penultimaLogo2FileInputRef.current) penultimaLogo2FileInputRef.current.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                        {config.paginaPenultima.logo2CustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.paginaPenultima.logo2CustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setPaginaPenultima('logo2CustomBase64', null); if (penultimaLogo2FileInputRef.current) penultimaLogo2FileInputRef.current.value = ''; }}
                                className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Posizione nel layout</label>
                            <select value={config.paginaPenultima.logo2Posizione ?? 'below-text'} onChange={(e) => setPaginaPenultima('logo2Posizione', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="above-title">Sopra il titolo</option>
                              <option value="between">Tra titolo e testo</option>
                              <option value="below-text">Sotto il testo</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Allineamento</label>
                            <select value={config.paginaPenultima.logo2PosX ?? 'center'} onChange={(e) => setPaginaPenultima('logo2PosX', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="left">Sinistra</option>
                              <option value="center">Centro</option>
                              <option value="right">Destra</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                            <select value={config.paginaPenultima.logo2Dimensione ?? 'medio'} onChange={(e) => setPaginaPenultima('logo2Dimensione', e.target.value)}
                              className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                              <option value="piccolo">Piccolo</option>
                              <option value="medio">Medio</option>
                              <option value="grande">Grande</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sezione in fondo (sezione 3) */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Sezione in fondo alla pagina</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={config.paginaPenultima.sezioneFinale3Attiva}
                        onChange={(e) => setPaginaPenultima('sezioneFinale3Attiva', e.target.checked)}
                        className="accent-primary" />
                      <span className="text-xs text-gray-700">Includi sezione in fondo</span>
                    </label>
                    {config.paginaPenultima.sezioneFinale3Attiva && (
                      <div className="space-y-2 pl-2 border-l-2 border-border">
                        <RichTextEditor
                          content={config.paginaPenultima.sezioneFinale3Html}
                          onChange={(html) => setPaginaPenultima('sezioneFinale3Html', html)}
                          placeholder="es. www.on-earth.it | info@on-earth.it | Tel. +39 XXX"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Font (pt)</label>
                            <input type="range" min={8} max={20} value={config.paginaPenultima.sezioneFinale3FontSize}
                              onChange={(e) => setPaginaPenultima('sezioneFinale3FontSize', parseInt(e.target.value))}
                              className="w-full" />
                            <span className="text-2xs text-gray-400">{config.paginaPenultima.sezioneFinale3FontSize}pt</span>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Allineamento</label>
                            <AlignToggle value={config.paginaPenultima.sezioneFinale3Align} onChange={(v) => setPaginaPenultima('sezioneFinale3Align', v)} />
                          </div>
                        </div>
                        <ColorSwatchPicker label="Colore testo" value={config.paginaPenultima.sezioneFinale3Colore} onChange={(v) => setPaginaPenultima('sezioneFinale3Colore', v)} />
                      </div>
                    )}
                  </div>

                  {/* Immagine */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-600">Immagine</p>
                    <div>
                      <p className="text-2xs text-gray-400 mb-2">
                        Carica sul server (consigliato) o solo per la sessione corrente (max 10 MB).
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error('Immagine troppo grande (max 10 MB)'); e.target.value = ''; return; }
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                              const res = await fetch('/api/admin/catalogo-pdf/upload-cover', { method: 'POST', body: fd });
                              if (!res.ok) throw new Error((await res.json()).error);
                              const { url } = await res.json();
                              setPaginaPenultima('immagineUrl', url);
                              const reader = new FileReader();
                              reader.onload = (ev) => setPaginaPenultima('immagineBase64', ev.target?.result as string);
                              reader.readAsDataURL(file);
                              e.target.value = '';
                              toast.success('Immagine caricata sul server');
                            } catch (err: unknown) {
                              toast.error(err instanceof Error ? err.message : 'Errore upload');
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        <span className="text-2xs text-gray-400 flex-shrink-0">Carica sul server</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={penultimaImgFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { toast.error('Immagine troppo grande (max 10 MB)'); e.target.value = ''; return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setPaginaPenultima('immagineBase64', ev.target?.result as string);
                              if (penultimaImgFileInputRef.current) penultimaImgFileInputRef.current.value = '';
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 cursor-pointer"
                        />
                        <span className="text-2xs text-gray-400 flex-shrink-0">Solo sessione</span>
                      </div>
                      {(config.paginaPenultima.immagineUrl || config.paginaPenultima.immagineBase64) && (
                        <div className="mt-2 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={config.paginaPenultima.immagineBase64 ?? config.paginaPenultima.immagineUrl ?? ''}
                            alt="Anteprima"
                            className="h-12 w-20 object-cover rounded border border-border"
                          />
                          <div className="space-y-1">
                            {config.paginaPenultima.immagineUrl && (
                              <p className="text-2xs text-green-600">Salvata sul server</p>
                            )}
                            <button
                              type="button"
                              onClick={() => { setPaginaPenultima('immagineBase64', null); setPaginaPenultima('immagineUrl', null); if (penultimaImgFileInputRef.current) penultimaImgFileInputRef.current.value = ''; }}
                              className="text-2xs text-red-500 hover:text-red-700 underline"
                            >
                              Rimuovi immagine
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Layout */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Layout penultima pagina</label>
                      <select
                        value={config.paginaPenultima.layout ?? 'img-top'}
                        onChange={(e) => setPaginaPenultima('layout', e.target.value)}
                        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="img-top">Immagine in alto, testo in basso</option>
                        <option value="img-bottom">Immagine in basso, testo in alto</option>
                        <option value="img-left">Immagine a sinistra, testo a destra</option>
                        <option value="full-overlay">Immagine piena con testo sovrapposto</option>
                        <option value="background">Immagine a sfondo intera pagina</option>
                        <option value="img-only">Solo immagine (nessun testo)</option>
                      </select>
                    </div>

                    {/* Image controls */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600">Posizione e scala immagine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset X (%)</label>
                          <input type="range" min={-100} max={100} value={config.paginaPenultima.imgOffsetX ?? 0}
                            onChange={(e) => setPaginaPenultima('imgOffsetX', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaPenultima.imgOffsetX ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset Y (%)</label>
                          <input type="range" min={-100} max={100} value={config.paginaPenultima.imgOffsetY ?? 0}
                            onChange={(e) => setPaginaPenultima('imgOffsetY', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaPenultima.imgOffsetY ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Scala (%)</label>
                          <input type="range" min={50} max={200} value={config.paginaPenultima.imgScale ?? 100}
                            onChange={(e) => setPaginaPenultima('imgScale', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaPenultima.imgScale ?? 100}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Opacità (%)</label>
                          <input type="range" min={10} max={100} value={config.paginaPenultima.imgOpacity ?? 100}
                            onChange={(e) => setPaginaPenultima('imgOpacity', parseInt(e.target.value))} className="w-full" />
                          <span className="text-2xs text-gray-400">{config.paginaPenultima.imgOpacity ?? 100}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logo principale */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Logo principale</p>
                    {(
                      [
                        { value: 'onearth', label: 'Logo ON EARTH (automatico)' },
                        { value: 'custom', label: 'Carica logo personalizzato' },
                        { value: 'none', label: 'Nessun logo' },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="paginaPenultimaLogoTipo"
                          value={opt.value}
                          checked={(config.paginaPenultima.logoTipo ?? (config.paginaPenultima.mostraLogo ? 'onearth' : 'none')) === opt.value}
                          onChange={() => setPaginaPenultima('logoTipo', opt.value)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}

                    {config.paginaPenultima.logoTipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input
                          ref={penultimaLogoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setPaginaPenultima('logoCustomBase64', dataUrl);
                              if (penultimaLogoFileInputRef.current) penultimaLogoFileInputRef.current.value = '';
                              try { const l = loadLogosFromStorage(); localStorage.setItem(LS_PDF_LOGOS, JSON.stringify({ ...l, paginaPenultimaLogo: dataUrl })); } catch {}
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        {config.paginaPenultima.logoCustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.paginaPenultima.logoCustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <div className="space-y-0.5">
                              <p className="text-2xs text-blue-600">Logo caricato in locale</p>
                              <button type="button" onClick={() => { setPaginaPenultima('logoCustomBase64', null); if (penultimaLogoFileInputRef.current) penultimaLogoFileInputRef.current.value = ''; }} className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(config.paginaPenultima.logoTipo ?? 'onearth') !== 'none' && (
                      <div className="pl-5 space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Posizione logo</label>
                          <LogoPosGrid
                            posX={config.paginaPenultima.logoPosX ?? 'center'}
                            posY={config.paginaPenultima.logoPosY ?? 'bottom'}
                            onChange={(x, y) => { setPaginaPenultima('logoPosX', x); setPaginaPenultima('logoPosY', y); }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione logo</label>
                          <select
                            value={config.paginaPenultima.logoDimensione ?? 'medio'}
                            onChange={(e) => setPaginaPenultima('logoDimensione', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="piccolo">Piccolo</option>
                            <option value="medio">Medio</option>
                            <option value="grande">Grande</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

          </>}

        </div>

        {/* Salva configurazione — always visible */}
        {/* ── Salva configurazione ── */}
        <div className="border border-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Salva configurazione</p>
            {editingTemplateId && (
              <button
                type="button"
                onClick={() => { setEditingTemplateId(null); setTemplateName(''); }}
                className="text-2xs text-gray-500 hover:text-primary underline"
              >
                Annulla modifica
              </button>
            )}
          </div>

          {editingTemplateId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <Pencil size={11} className="flex-shrink-0" />
              <span>Stai modificando: <strong>{templateName}</strong></span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome template (es. Catalogo Linea Braided)"
              className="flex-1 h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingTemplateId) handleSaveEditingTemplate();
                  else handleSaveTemplate();
                }
              }}
            />
            {editingTemplateId ? (
              <button
                type="button"
                onClick={handleSaveEditingTemplate}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Salva modifiche
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSaving || !templateName.trim()}
                className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Salva
              </button>
            )}
          </div>

          {editingTemplateId && (
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving || !templateName.trim()}
              className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium border border-border text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
            >
              <Save size={11} />
              Salva come nuovo template
            </button>
          )}
        </div>
      </div>

      {/* Right: generate + contextual preview or templates */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-3 lg:self-start lg:sticky lg:top-4">

        {/* ── Generate — always at top ── */}
        <div className="border border-border rounded p-4 space-y-3 bg-gray-50/50">
          <p className="text-2xs font-semibold tracking-widest uppercase text-gray-500">Generazione</p>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="flex items-center justify-center gap-2 w-full h-9 rounded border border-border bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isPreviewing ? <><Loader2 size={13} className="animate-spin" /> Calcolo…</> : <><Eye size={13} /> Anteprima</>}
          </button>
          {preview && (
            <div className="bg-white border border-border rounded px-3 py-2.5 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Prodotti trovati</span><span className="font-semibold text-primary">{preview.count}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Pagine prodotti</span><span className="font-semibold text-primary">~{preview.productPages}</span></div>
              {preview.groupPages > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Pag. sep. sezioni</span><span className="font-semibold text-primary">{preview.groupPages}</span></div>}
              {(preview.trancheSepPages ?? 0) > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Pag. sep. tranche</span><span className="font-semibold text-primary">{preview.trancheSepPages}</span></div>}
              {preview.trancheStats && preview.trancheStats.length > 0 && (
                <div className="border-t border-border pt-1 mt-1 space-y-0.5">
                  <p className="text-2xs text-gray-400 font-medium uppercase tracking-wide">{preview.trancheStats.length} tranche</p>
                  {preview.trancheStats.map((ts) => (
                    <div key={ts.tranche} className="flex justify-between text-xs">
                      <span className="text-gray-500 truncate mr-2">{ts.tranche}</span>
                      <span className="font-semibold text-primary flex-shrink-0">{ts.count}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                <span className="text-gray-500 font-medium">Totale pagine stimate</span>
                <span className="font-bold text-primary">{preview.pages}</span>
              </div>
              {preview.fotoStats && (
                <div className="border-t border-border pt-1 mt-1 space-y-0.5">
                  <p className="text-2xs text-gray-400 font-medium uppercase tracking-wide">Foto</p>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Con 2+ foto</span><span className="font-semibold text-primary">{preview.fotoStats.multiple}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Con 1 foto</span><span className="font-semibold text-primary">{preview.fotoStats.una}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Senza foto</span><span className={`font-semibold ${preview.fotoStats.senza > 0 ? 'text-amber-500' : 'text-primary'}`}>{preview.fotoStats.senza}</span></div>
                </div>
              )}
              {preview.count === 0 && <p className="text-xs text-amber-600 mt-1">Nessun prodotto con i filtri selezionati</p>}
            </div>
          )}
          <button
            type="button"
            onClick={handleGeneraPDF}
            disabled={isGenerating || !preview || preview.count === 0}
            className="flex items-center justify-center gap-2 w-full h-9 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? <><Loader2 size={13} className="animate-spin" /> Generazione…</> : <><Download size={13} /> Genera PDF</>}
          </button>
          {isGenerating && <p className="text-2xs text-gray-400 text-center">Elaborazione immagini in corso, potrebbe richiedere alcuni minuti…</p>}
          {!preview && <p className="text-2xs text-gray-400 text-center">Esegui prima l&apos;anteprima per stimare il numero di pagine</p>}
        </div>

        {/* ── Configurazioni salvate — solo su tab Generale ── */}
        {activeTab === 'generale' && (
          <div className="border border-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTemplates((s) => !s)}
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={13} />
                Configurazioni salvate
                {templates.length > 0 && (
                  <span className="bg-primary text-white text-2xs px-1.5 py-0.5 rounded-full">{templates.length}</span>
                )}
              </span>
              {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTemplates && (
              <div className="divide-y divide-border">
                {templates.length === 0 ? (
                  <p className="px-4 py-5 text-xs text-gray-400 text-center">Nessuna configurazione salvata</p>
                ) : (
                  templates.map((t) => (
                    <div key={t.id} className="px-4 py-3 hover:bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary truncate">{t.nome}</p>
                          <p className="text-2xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <button type="button" onClick={() => handleLoadTemplate(t)} title="Carica configurazione" className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"><FolderOpen size={12} /></button>
                        <button type="button" onClick={() => handleEditTemplate(t)} title="Modifica template" className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Pencil size={12} /></button>
                        <button type="button" onClick={() => handleDeleteTemplate(t.id, t.nome)} title="Elimina configurazione" className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        <button type="button" onClick={() => handleRenameTemplate(t.id, t.nome)} className="text-2xs text-gray-500 hover:text-primary underline">Rinomina</button>
                        <span className="text-2xs text-gray-300">·</span>
                        <button type="button" onClick={() => handleDuplicateTemplate(t)} className="text-2xs text-gray-500 hover:text-primary underline">Duplica</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Anteprima live — sulle altre schede, flottante grazie allo sticky della colonna ── */}
        {activeTab !== 'generale' && (
          <div className="border border-border rounded overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-border flex items-center justify-between">
              <p className="text-2xs font-semibold tracking-widest uppercase text-gray-500">Anteprima live</p>
              <span className="text-2xs text-gray-400 bg-white border border-border px-2 py-0.5 rounded-full">
                {activeTab === 'copertina' ? 'Copertina' : activeTab === 'ultima' ? 'Ultima pag.' : activeTab === 'penultima' ? 'Penultima pag.' : 'Scheda'}
              </span>
            </div>
            <div className="p-4 flex flex-col items-start gap-2 bg-white min-h-[180px]">
              {activeTab === 'scheda' && (
                <div style={{ transform: 'scale(1.5)', transformOrigin: 'top left', marginBottom: `${110 * 0.5}px` }}>
                  <CardPreview config={config} />
                </div>
              )}
              {activeTab === 'copertina' && (
                config.copertina.attiva
                  ? <CoverPreview config={config} />
                  : <div className="w-full py-10 text-center"><p className="text-2xs text-gray-400">Copertina non attiva</p><p className="text-2xs text-gray-300 mt-1">Attivala in questa sezione</p></div>
              )}
              {activeTab === 'ultima' && (
                config.paginaFinale.attiva
                  ? <FinalPagePreview config={config} />
                  : <div className="w-full py-10 text-center"><p className="text-2xs text-gray-400">Pagina finale non attiva</p><p className="text-2xs text-gray-300 mt-1">Attivala in questa sezione</p></div>
              )}
              {activeTab === 'penultima' && (
                config.paginaPenultima.attiva
                  ? <PenultimaPagePreview config={config} />
                  : <div className="w-full py-10 text-center"><p className="text-2xs text-gray-400">Pagina non attiva</p><p className="text-2xs text-gray-300 mt-1">Attivala in questa sezione</p></div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
