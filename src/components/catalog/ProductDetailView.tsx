'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Check, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency, isValidLotQuantity, capitalize } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import QuantitySelector from './QuantitySelector';
import { ProductImage } from '@/components/ui/ProductImage';
import { useSettings } from '@/contexts/SettingsContext';
import type { Product } from '@/types';
import AccessoriSuggeriti from './AccessoriSuggeriti';

const PRODUTTORE_URLS: Record<string, string> = {
  'Allpa':                      'https://shop.meridiano361.it/pages/allpa',
  'Asha':                       'https://shop.meridiano361.it/pages/asha',
  'Assisi Garments':            'https://shop.meridiano361.it/pages/assisi-garments',
  'Auromira':                   'https://shop.meridiano361.it/pages/auromira',
  'Base':                       'https://shop.meridiano361.it/pages/base',
  'Camari':                     'https://shop.meridiano361.it/pages/camari',
  'Copavic':                    'https://shop.meridiano361.it/pages/copavic-guatemala',
  'Corr':                       'https://shop.meridiano361.it/pages/corr',
  'Craft Link':                 'https://shop.meridiano361.it/pages/craft-link',
  'Crc':                        'https://shop.meridiano361.it/pages/crc-india',
  'Creative Handicrafts':       'https://shop.meridiano361.it/pages/creative-handicrafts',
  'Dhaka Handicrafts':          'https://shop.meridiano361.it/pages/dhaka-handicrafts',
  'Ema':                        'https://shop.meridiano361.it/pages/ema',
  'Manjeen':                    'https://shop.meridiano361.it/pages/manjeen',
  'Mks':                        'https://shop.meridiano361.it/pages/mks',
  'Nepali Craft Trading (Acp)': 'https://shop.meridiano361.it/pages/acp',
  'Paru':                       'https://shop.meridiano361.it/pages/copy-of-crc-india',
  'Prokritee':                  'https://shop.meridiano361.it/pages/prokritee-bangladesh',
  'Sana Hastakala':             'https://shop.meridiano361.it/pages/sana-hastakala',
  'Sang Arun':                  'https://shop.meridiano361.it/pages/sang-arun',
  'Sasha':                      'https://shop.meridiano361.it/pages/sasha-india',
  'Selyn':                      'https://shop.meridiano361.it/pages/selyn',
};

function ProductGallery({ product }: { product: Product }) {
  const photos = [product.imageUrl, product.imageUrl2, product.imageUrl3, product.imageUrl4].filter(Boolean) as string[];
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="aspect-square bg-cream rounded overflow-hidden border border-border flex items-center justify-center">
        <span className="text-gray-300 text-xs">Nessuna immagine</span>
      </div>
    );
  }

  function prev() { setActive((i) => (i === 0 ? photos.length - 1 : i - 1)); }
  function next() { setActive((i) => (i === photos.length - 1 ? 0 : i + 1)); }

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div
        className="relative aspect-square bg-cream rounded overflow-hidden border border-border"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
          touchStartX.current = null;
        }}
      >
        <ProductImage src={photos[active]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        {photos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? 'bg-gray-900' : 'bg-gray-300'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${i === active ? 'border-gray-900' : 'border-border hover:border-gray-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-primary">{value}</span>
    </div>
  );
}

function PantoneSwatches({ colors }: { colors: import('@/types').ProductPantoneEntry[] }) {
  if (!colors.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {colors.map((c) => (
        <div key={c.pantoneColorId} className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2 py-1.5">
          <span
            className="w-5 h-5 rounded-sm flex-shrink-0 border border-black/10"
            style={{ backgroundColor: c.hex_code }}
          />
          <div className="leading-none">
            <p className="text-[10px] font-mono text-gray-500">{c.code}</p>
            <p className="text-[10px] text-gray-700 mt-0.5">{c.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  id: string;
}

export default function ProductDetailView({ id }: Props) {
  const router = useRouter();
  const { getItemQuantity, updateQuantity, setPendingProduct } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const tp = useTranslations('product');
  const locale = useLocale();
  const { scheda: ss } = useSettings();

  const classFields: { key: string; label: string; show?: boolean }[] = [
    { key: 'gruppoMerceologico', label: 'Gruppo merceologico' },
    { key: 'famiglia',           label: 'Famiglia' },
    { key: 'classe',             label: 'Classe' },
    { key: 'sottoclasse',        label: 'Sottoclasse' },
    { key: 'gruppoOmogeneo',     label: 'Gruppo omogeneo' },
    { key: 'stagione',           label: 'Stagione' },
    { key: 'tranche',            label: 'Tranche' },
    { key: 'nomLinea',           label: 'Linea',      show: ss.linea },
    { key: 'collezione',         label: 'Collezione', show: ss.collezione },
  ];

  const detailFields: { key: string; label: string; show?: boolean }[] = [
    { key: 'dettaglio',  label: 'Tipo' },
    { key: 'modello',    label: 'Linea' },
    { key: 'misura',     label: 'Misura',     show: ss.misure },
    { key: 'produttore', label: 'Produttore', show: ss.produttore },
    { key: 'paese',      label: 'Paese',      show: ss.paese },
    { key: 'conferente', label: 'Conferente' },
    { key: 'forma',      label: 'Forma' },
    { key: 'taglia',     label: 'Taglia' },
    { key: 'lotSize',    label: 'Confezione', show: ss.confezione },
  ];

  const colorFields: { key: string; label: string }[] = [
    { key: 'colore',       label: 'Colore 1' },
    { key: 'colore2',      label: 'Colore 2' },
    { key: 'colore3',      label: 'Colore 3' },
    { key: 'bloccoColore', label: 'Blocco colore' },
    { key: 'altriColori',  label: 'Altri colori' },
    { key: 'temaColore',   label: 'Tema colore' },
    { key: 'temaColore2',  label: 'Tema colore 2' },
    { key: 'temaColore3',  label: 'Tema colore 3' },
    { key: 'temaColore4',  label: 'Tema colore 4' },
    { key: 'temaColore5',  label: 'Tema colore 5' },
  ];

  const materialFields: { key: string; label: string }[] = [
    { key: 'materiale1',   label: 'Materiale 1' },
    { key: 'materiale2',   label: 'Materiale 2' },
    { key: 'materiale3',   label: 'Materiale 3' },
    { key: 'composizione', label: 'Composizione' },
    { key: 'fantasia',          label: 'Fantasia' },
    { key: 'nomeStampa',        label: 'Nome stampa' },
    { key: 'lavorazione',       label: 'Lavorazione' },
    { key: 'materialeBottoni',  label: 'Materiale bottoni' },
  ];

  const certFields: { key: string; label: string }[] = [
    { key: 'certificazione1', label: 'Certificazione 1' },
    { key: 'certificazione2', label: 'Certificazione 2' },
    { key: 'certificazione3', label: 'Certificazione 3' },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      return json.data as Product;
    },
  });

  const product = data;
  const isModa = product?.gruppoMerceologico?.toLowerCase() === 'moda';

  const { data: condizioni } = useQuery({
    queryKey: ['condizioni-commerciali', product?.conferente, product?.collezione],
    queryFn: async () => {
      if (!product?.conferente || !product?.collezione) return null;
      const res = await fetch(`/api/condizioni-commerciali?conferente=${encodeURIComponent(product.conferente)}&collezione=${encodeURIComponent(product.collezione)}`);
      return (await res.json()).data as {
        scontoConReso: number | null; percentualeReso: number | null; noteReso: string | null;
        scontoSenzaReso: number | null;
        extraScontoVolume: Array<{ soglia: number; extra: number }> | null;
        importoMinimoIe: number | null; consegna: string | null; pagamentoGg: number | null;
        condizioniRiordini: string | null; note: string | null;
      } | null;
    },
    enabled: !!product?.conferente && !!product?.collezione,
    staleTime: 300_000,
  });
  const cartQty = product ? getItemQuantity(product.id) : 0;
  const inCart = cartQty > 0;
  const hasLotWarning = inCart && product ? !isValidLotQuantity(cartQty, product.lotSize) : false;

  function handleAdd() {
    if (!product) return;
    setPendingProduct({ product, quantity: product.lotSize || 1 });
  }

  function handleQuantityChange(qty: number) {
    if (!product) return;
    updateQuantity(product.id, qty);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" text={tp('loading')} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-gray-400">{tp('notFound')}</p>
        <button
          onClick={() => router.push('/catalog')}
          className="text-sm text-accent hover:underline"
        >
          {tp('backToCatalog')}
        </button>
      </div>
    );
  }

  const p = product as any;
  const activeClassFields = classFields.filter(({ key, show }) => show !== false && p[key]);
  const activeDetailFields = detailFields.filter(({ key, show }) => {
    if (show === false) return false;
    const v = p[key];
    return v !== null && v !== undefined && v !== '' && v !== 1;
  });
  const activeColorFields = colorFields.filter(({ key }) => p[key]);
  const activeMaterialFields = materialFields.filter(({ key }) => p[key]);
  const activeCertFields = certFields.filter(({ key }) => p[key]);

  const localizedDescription = (() => {
    if (locale === 'en' && product.descrizioneEn) return product.descrizioneEn;
    if (locale === 'de' && product.descrizioneDe) return product.descrizioneDe;
    if (locale === 'fr' && product.descrizioneFr) return product.descrizioneFr;
    if (locale === 'es' && product.descrizioneEs) return product.descrizioneEs;
    return product.description || null;
  })();

  const hasBusinessInfo =
    (ss.fasciaSconto && product.fasciaSconto != null) ||
    (ss.fasciaRicarico && !!product.fasciaRicarico) ||
    (ss.iva && product.iva != null);

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        {tp('backToCatalog')}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
        {/* Image / Gallery */}
        <ProductGallery product={product} />

        {/* Info */}
        <div className="flex flex-col">
          {ss.codice && <p className="label-luxury text-accent mb-1">{product.code}</p>}

          <div className="flex items-start gap-2 mb-3">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl text-primary font-light leading-snug">
              {product.name}
            </h1>
            {ss.descrizione && localizedDescription && (
              <button
                onClick={() => setShowDesc((v) => !v)}
                className="flex items-center gap-1 text-2xs text-accent/70 hover:text-accent transition-colors flex-shrink-0 mt-2"
              >
                <Sparkles size={10} /><span>Scopri di più</span>
              </button>
            )}
          </div>

          {ss.descrizione && localizedDescription && showDesc && (
            <p className="text-sm text-gray-500 leading-relaxed mb-4 bg-cream/50 rounded px-3 py-2.5 border-l-2 border-accent/40">
              {localizedDescription}
            </p>
          )}

          <div className="mb-6">
            {ss.pvp && (
              <>
                <p className="text-2xs text-gray-400 uppercase tracking-widest mb-0.5">
                  {tp('retailPriceLabel')}
                </p>
                <p className="text-3xl font-semibold text-primary">
                  {formatCurrency(product.retailPrice)}
                </p>
                {product.lotSize > 1 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tp('lotPack', { lotSize: product.lotSize })}
                  </p>
                )}
              </>
            )}
            {ss.prezzoCosto && (
              <div className="mt-1 space-y-0.5">
                {(() => {
                  const conReso = Number((product as any).costoIeConReso);
                  const senzaReso = Number((product as any).costoIeSenzaReso);
                  const hasConReso = conReso > 0;
                  const hasSenzaReso = senzaReso > 0;
                  if (hasConReso) return (
                    <>
                      <p className="text-xs text-gray-400">Costo i.e. con reso: <span className="font-medium text-primary">{formatCurrency(conReso)}</span></p>
                      {hasSenzaReso && <p className="text-xs text-gray-400">Costo i.e. senza reso: <span className="font-medium text-primary">{formatCurrency(senzaReso)}</span></p>}
                    </>
                  );
                  if (hasSenzaReso) return (
                    <p className="text-xs text-gray-400">{tp('cost')}: <span className="font-medium text-primary">{formatCurrency(senzaReso)}</span></p>
                  );
                  return <p className="text-xs text-gray-400">{tp('cost')}: {formatCurrency(product.costPrice)}</p>;
                })()}
              </div>
            )}
          </div>

          {hasLotWarning && !product.sizeVariants?.length && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              {tp('adjustLot', { lotSize: product.lotSize })}
            </div>
          )}

          <div className="mt-auto">
            {product.sizeVariants && product.sizeVariants.length > 0 ? (
              /* ── Size variants: button → collapsible panel ── */
              (cartQty > 0 || showSizePanel) ? (
                <div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[48px_1fr_auto] text-2xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 bg-gray-50 border-b border-border gap-3">
                      <span>Taglia</span>
                      <span>Codice</span>
                      <span className="text-right pr-1">Qtà</span>
                    </div>
                    {product.sizeVariants.map(({ taglia, codice }) => {
                      const varQty = getItemQuantity(product.id, taglia);
                      return (
                        <div
                          key={taglia}
                          className={`grid grid-cols-[48px_1fr_auto] items-center px-3 py-2.5 border-b last:border-0 border-border gap-3 transition-colors ${varQty > 0 ? 'bg-accent/5' : ''}`}
                        >
                          <span className="text-sm font-bold text-primary">{taglia}</span>
                          <span className="text-xs font-mono text-gray-500 truncate">{codice}</span>
                          {varQty > 0 ? (
                            <QuantitySelector
                              value={varQty}
                              onChange={(q) => updateQuantity(product.id, q, taglia)}
                              lotSize={product.lotSize}
                              min={0}
                              compact
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingProduct({ product, quantity: product.lotSize || 1, taglia })}
                              className="w-7 h-7 flex items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary text-gray-400 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {cartQty > 0 && (
                    <p className="text-xs text-center text-gray-400 mt-2">
                      {tp('inCart', { qty: cartQty })}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowSizePanel(true)}
                  className="w-full py-3 text-sm font-medium rounded transition-all duration-200 flex items-center justify-center gap-2 bg-primary text-background hover:bg-warm-darker active:scale-95"
                >
                  <ShoppingBag size={14} />
                  {tp('add')}
                </button>
              )
            ) : inCart ? (
              /* ── Single product: already in cart ── */
              <div className="space-y-2">
                <QuantitySelector
                  value={cartQty}
                  onChange={handleQuantityChange}
                  lotSize={product.lotSize}
                  min={0}
                />
                <p className="text-xs text-center text-gray-400">
                  {tp('inCart', { qty: cartQty })}
                </p>
              </div>
            ) : (
              /* ── Single product: not yet in cart ── */
              <button
                onClick={handleAdd}
                className="w-full py-3 text-sm font-medium rounded transition-all duration-200 flex items-center justify-center gap-2 bg-primary text-background hover:bg-warm-darker active:scale-95"
              >
                {justAdded ? (
                  <>
                    <Check size={14} />
                    {tp('added')}
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} />
                    {tp('add')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail sections */}
      <div className="space-y-8">

        {/* Taglie disponibili */}
        {product.sizeVariants && product.sizeVariants.length > 0 && (
          <div>
            <h2 className="label-luxury text-gray-400 mb-3">Taglie disponibili</h2>
            <div className="flex flex-wrap gap-1.5">
              {product.sizeVariants.map(({ taglia }) => (
                <span key={taglia} className="px-3 py-1 border border-border rounded text-sm font-medium text-primary bg-white">
                  {taglia}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Classificazione + Dettagli prodotto */}
        {(activeClassFields.length > 0 || activeDetailFields.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {activeClassFields.length > 0 && (
              <div>
                <h2 className="label-luxury text-gray-400 mb-3">{tp('classification')}</h2>
                <div className="space-y-2">
                  {activeClassFields.map(({ key, label }) => (
                    <FieldRow key={key} label={label} value={String(p[key])} />
                  ))}
                </div>
              </div>
            )}
            {activeDetailFields.length > 0 && (
              <div>
                <h2 className="label-luxury text-gray-400 mb-3">{tp('detailsTitle')}</h2>
                <div className="space-y-2">
                  {activeDetailFields.map(({ key, label }) => {
                    if (key === 'produttore') {
                      const val = String(p[key]);
                      const url = PRODUTTORE_URLS[val];
                      return url ? (
                        <div key={key} className="flex items-baseline gap-2">
                          <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                            {val}
                          </a>
                        </div>
                      ) : (
                        <FieldRow key={key} label={label} value={val} />
                      );
                    }
                    return (
                      <FieldRow
                        key={key}
                        label={label}
                        value={key === 'lotSize' ? `${p[key]} ${tp('lotUnit')}` : String(p[key])}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Colori + Materiali — per MODA in sezione unica */}
        {isModa ? (
          (activeColorFields.length > 0 || activeMaterialFields.length > 0) && (
            <div>
              <h2 className="label-luxury text-gray-400 mb-3">Colori e composizione</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {activeColorFields.map(({ key, label }) => (
                  <FieldRow key={key} label={label} value={capitalize(String(p[key]))} />
                ))}
                {activeMaterialFields.map(({ key, label }) => {
                  const bioKey = key === 'materiale1' ? 'materiale1Bio' : key === 'materiale2' ? 'materiale2Bio' : key === 'materiale3' ? 'materiale3Bio' : null;
                  const isBio = bioKey ? !!(p as any)[bioKey] : false;
                  const val = capitalize(String(p[key])) + (isBio ? ' bio' : '');
                  const aiQuery: Record<string, string> = {
                    materiale1:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                    materiale2:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                    materiale3:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                    fantasia:    `Cos'è la fantasia tessile "${val}"?`,
                    lavorazione: `Cos'è la lavorazione tessile "${val}"?`,
                  };
                  if (aiQuery[key]) {
                    const aiUrl = `https://www.perplexity.ai/search?q=${encodeURIComponent(aiQuery[key])}`;
                    return (
                      <div key={key} className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                        <span className="text-sm text-primary">{val}</span>
                        <a href={aiUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-2xs text-accent/70 hover:text-accent transition-colors ml-1 flex-shrink-0">
                          <Sparkles size={10} /><span>Cos'è?</span>
                        </a>
                      </div>
                    );
                  }
                  return <FieldRow key={key} label={label} value={val} />;
                })}
              </div>
              <PantoneSwatches colors={product.pantoneColors ?? []} />
            </div>
          )
        ) : (
          (activeColorFields.length > 0 || activeMaterialFields.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {activeColorFields.length > 0 && (
                <div>
                  <h2 className="label-luxury text-gray-400 mb-3">Colori</h2>
                  <div className="space-y-2">
                    {activeColorFields.map(({ key, label }) => (
                      <FieldRow key={key} label={label} value={capitalize(String(p[key]))} />
                    ))}
                  </div>
                  <PantoneSwatches colors={product.pantoneColors ?? []} />
                </div>
              )}
              {activeMaterialFields.length > 0 && (
                <div>
                  <h2 className="label-luxury text-gray-400 mb-3">Materiali</h2>
                  <div className="space-y-2">
                    {activeMaterialFields.map(({ key, label }) => {
                      const bioKey = key === 'materiale1' ? 'materiale1Bio' : key === 'materiale2' ? 'materiale2Bio' : key === 'materiale3' ? 'materiale3Bio' : null;
                      const isBio = bioKey ? !!(p as any)[bioKey] : false;
                      const val = capitalize(String(p[key])) + (isBio ? ' bio' : '');
                      const aiQuery: Record<string, string> = {
                        materiale1:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                        materiale2:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                        materiale3:  `Cos'è il materiale "${val}" nel settore tessile e arredamento?`,
                        fantasia:    `Cos'è la fantasia tessile "${val}"?`,
                        lavorazione: `Cos'è la lavorazione tessile "${val}"?`,
                      };
                      if (aiQuery[key]) {
                        const aiUrl = `https://www.perplexity.ai/search?q=${encodeURIComponent(aiQuery[key])}`;
                        return (
                          <div key={key} className="flex items-baseline gap-2">
                            <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                            <span className="text-sm text-primary">{val}</span>
                            <a href={aiUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-2xs text-accent/70 hover:text-accent transition-colors ml-1 flex-shrink-0">
                              <Sparkles size={10} /><span>Cos'è?</span>
                            </a>
                          </div>
                        );
                      }
                      return <FieldRow key={key} label={label} value={val} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Certificazioni + Info commerciali + Note */}
        {(activeCertFields.length > 0 || hasBusinessInfo || (ss.note && product.notes)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {activeCertFields.length > 0 && (
              <div>
                <h2 className="label-luxury text-gray-400 mb-3">Certificazioni</h2>
                <div className="space-y-2">
                  {activeCertFields.map(({ key, label }) => (
                    <FieldRow key={key} label={label} value={String(p[key])} />
                  ))}
                </div>
              </div>
            )}
            {(hasBusinessInfo || condizioni) && (
              <div>
                <h2 className="label-luxury text-gray-400 mb-3">Informazioni commerciali</h2>
                <div className="space-y-2">
                  {ss.fasciaSconto && product.fasciaSconto != null && (
                    <FieldRow label="Fascia sconto" value={`${Number(product.fasciaSconto)}%`} />
                  )}
                  {ss.fasciaRicarico && product.fasciaRicarico && (
                    <FieldRow label="Fascia ricarico" value={product.fasciaRicarico} />
                  )}
                  {ss.iva && product.iva != null && (
                    <FieldRow label="IVA" value={`${product.iva}%`} />
                  )}
                  {condizioni && (
                    <>
                      {condizioni.scontoConReso != null && (
                        <FieldRow label="Sconto con reso" value={`${condizioni.scontoConReso}%${condizioni.noteReso ? ` (${condizioni.noteReso})` : ''}`} />
                      )}
                      {condizioni.percentualeReso != null && (
                        <FieldRow label="% reso sul totale" value={`${condizioni.percentualeReso}%`} />
                      )}
                      {condizioni.scontoSenzaReso != null && (
                        <FieldRow label="Sconto senza reso" value={`${condizioni.scontoSenzaReso}%`} />
                      )}
                      {condizioni.extraScontoVolume?.map((ev, i) => (
                        <FieldRow key={i} label={`Extra volume >€${ev.soglia.toLocaleString('it-IT')}`} value={`+${ev.extra}%`} />
                      ))}
                      {condizioni.importoMinimoIe != null && (
                        <FieldRow label="Importo minimo i.e." value={`€${condizioni.importoMinimoIe.toLocaleString('it-IT')}`} />
                      )}
                      {condizioni.consegna && <FieldRow label="Consegna" value={condizioni.consegna} />}
                      {condizioni.pagamentoGg != null && (
                        <FieldRow label="Pagamento" value={`${condizioni.pagamentoGg} gg`} />
                      )}
                      {condizioni.condizioniRiordini && (
                        <FieldRow label="Riordini" value={condizioni.condizioniRiordini} />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {ss.note && product.notes && (
              <div>
                <h2 className="label-luxury text-gray-400 mb-3">{tp('notesLabel')}</h2>
                <p className="text-sm text-gray-500 italic">{product.notes}</p>
              </div>
            )}
          </div>
        )}

      </div>

      <AccessoriSuggeriti classe={product.classe} sottofamiglia={product.sottofamiglia} name={product.name} famiglia={product.famiglia} />

    </div>
    </div>
  );
}
