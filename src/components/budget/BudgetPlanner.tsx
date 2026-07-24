'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart2, Layers, Package2, TrendingUp, Pencil, Check, X, AlertTriangle, ChevronDown, ChevronRight, Loader2, Store, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MODA_FAMIGLIE, MODA_SUBCLASSES,
  computeFamily, computeSubclass, computeSummary,
  fmt, fmtPct, fmtCov,
  type FamilyInput, type SubclassRow, type OrderAggRow,
} from '@/lib/budget';

// ─── Types for API response ────────────────────────────────────────────────────

interface Settore {
  id?: string;
  nome: string;
  incidenza: number;  // 0-100
  margine: number;    // 0-100
  posizione: number;
}

interface ScenarioSummary {
  id: string;
  nome: string;
  sourceType: string | null;
  sourceOrderId: string | null;
  createdAt: string;
}

interface ScenarioData {
  meta: {
    id: string; nome: string; seasonCode: string;
    sourceType: string | null;
    sourceOrderId: string | null;
    obiettivoTotale: number | null;
    costiNegozio: number | null;
    obiettivoRicavoSviluppo: number | null;
  };
  famiglie: string[];
  subclassesByFamiglia: Record<string, string[]>;
  familyInputs: FamilyInput[];
  subclassData: SubclassRow[];
  settori: Settore[];
}

type View = 'negozio' | 'obiettivi' | 'fabbisogno' | 'sintesi-ordine' | 'sintesi';

interface OrderSummary {
  id: string;
  orderNumber: string | null;
  status: string;
  totalItems: number;
  createdAt: string;
  canaleNome: string | null;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ok:          { label: 'Da ordinare', cls: 'bg-blue-50 text-blue-700' },
    coperto:     { label: 'Coperto',     cls: 'bg-green-50 text-green-700' },
    eccedente:   { label: 'Eccedente',   cls: 'bg-amber-50 text-amber-700' },
    no_data:     { label: 'No storico',  cls: 'bg-gray-100 text-gray-500' },
    no_obiettivo:{ label: 'No obiettivo',cls: 'bg-gray-100 text-gray-500' },
  };
  const { label, cls } = map[status] ?? map.no_data;
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-2xs font-medium ${cls}`}>{label}</span>;
}

// ─── Inline numeric input ─────────────────────────────────────────────────────

function NumInput({
  value, onChange, placeholder = '—', decimals = 0, suffix = '', prefix = '',
}: {
  value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; decimals?: number; suffix?: string; prefix?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const local = raw !== null ? raw : (value != null ? value.toFixed(decimals) : '');

  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-0 text-xs text-gray-400 pointer-events-none">{prefix}</span>}
      <input
        type="number"
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          setRaw(e.target.value);
          // Propagate valid intermediate values immediately so setSettoriLocal (and the
          // debounced save) are always current even if blur never fires (e.g. page navigation).
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onFocus={() => setRaw(value != null ? value.toFixed(decimals) : '')}
        onBlur={() => {
          const parsed = raw === '' || raw === null ? null : parseFloat(raw);
          onChange(isNaN(parsed as number) ? null : parsed);
          setRaw(null);
        }}
        className={`w-full bg-transparent text-right text-xs text-gray-900 border-b border-transparent focus:border-accent focus:outline-none py-0.5 ${suffix ? 'pr-5' : ''} ${prefix ? 'pl-3' : ''}`}
        step={decimals > 0 ? 0.1 : 1}
      />
      {suffix && <span className="absolute right-0 text-xs text-gray-400 pointer-events-none">{suffix}</span>}
    </div>
  );
}

function ColTh({ label, tip, right = true }: { label: string; tip: string; right?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [open]);

  return (
    <th className={`${right ? 'text-right' : 'text-left'} px-2 py-2 font-medium`}>
      <span className="inline-flex items-center gap-0.5">
        {label}
        <span ref={ref} className="relative inline-flex">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className="cursor-help text-gray-300 hover:text-gray-500 leading-none focus:outline-none"
          >
            *
          </button>
          {open && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-60 bg-gray-900 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2 shadow-xl">
              {tip}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
            </div>
          )}
        </span>
      </span>
    </th>
  );
}

// ─── Setup modal ──────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  ORDER:  'Ordine esistente',
  CART:   'Carrello in corso',
  MANUAL: 'Libero (nessun ordine)',
};

function BudgetSetupModal({ onSelect }: { onSelect: (id: string) => void }) {
  const [scenarios, setScenarios]     = useState<ScenarioSummary[]>([]);
  const [orders, setOrders]           = useState<OrderSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [nome, setNome]               = useState('');
  const [sourceType, setSourceType]   = useState<'ORDER' | 'CART' | 'MANUAL'>('MANUAL');
  const [sourceOrderId, setSourceOrderId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/budget/scenarios').then(r => r.json()),
      fetch('/api/budget/orders').then(r => r.json()),
    ]).then(([sc, ord]) => {
      setScenarios(sc.scenarios ?? []);
      setOrders(ord.orders ?? []);
      if ((sc.scenarios ?? []).length === 0) setShowForm(true);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!nome.trim()) { toast.error('Dai un nome al budget'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/budget/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), sourceType, sourceOrderId: sourceType === 'ORDER' ? sourceOrderId || null : null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onSelect(data.id);
    } catch {
      toast.error('Errore nella creazione del budget');
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Loader2 size={24} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-primary">Budget PE27 — Scegli o crea uno scenario</h2>

          {/* Lista scenari esistenti */}
          {scenarios.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-2xs text-gray-400 uppercase tracking-wider font-semibold">Scenari salvati</p>
              {scenarios.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => onSelect(sc.id)}
                  className="w-full flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2.5 hover:bg-cream hover:border-accent transition-colors text-left"
                >
                  <div>
                    <p className="text-xs font-semibold text-primary">{sc.nome}</p>
                    {sc.sourceType && sc.sourceType !== 'MANUAL' && (
                      <p className="text-2xs text-gray-400">{SOURCE_LABELS[sc.sourceType] ?? sc.sourceType}</p>
                    )}
                  </div>
                  <Check size={13} className="text-accent flex-shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full text-xs text-accent hover:text-accent/80 py-1.5 border border-dashed border-border rounded-lg transition-colors"
                >
                  + Crea nuovo scenario
                </button>
              )}
            </div>
          )}

          {/* Form creazione */}
          {showForm && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-2xs text-gray-400 uppercase tracking-wider font-semibold">Nuovo scenario</p>
              <div>
                <label className="text-2xs text-gray-500 mb-1 block">Nome budget</label>
                <input
                  autoFocus
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  placeholder="es. Budget PE27 Cremona"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-2xs text-gray-500 mb-1.5 block">Basato su</label>
                <div className="space-y-1">
                  {(['MANUAL', 'ORDER'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sourceType"
                        checked={sourceType === type}
                        onChange={() => setSourceType(type)}
                        className="accent-primary"
                      />
                      <span className="text-xs text-gray-700">{SOURCE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {sourceType === 'ORDER' && (
                <div>
                  <label className="text-2xs text-gray-500 mb-1 block">Seleziona ordine</label>
                  <select
                    value={sourceOrderId}
                    onChange={e => setSourceOrderId(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent transition-colors bg-white"
                  >
                    <option value="">— nessuno —</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber ?? o.id.slice(0, 8).toUpperCase()} · {o.canaleNome ?? '—'} · {o.totalItems} pz
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {scenarios.length > 0 && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 text-xs border border-border rounded-lg text-gray-500 hover:bg-cream transition-colors"
                  >
                    Annulla
                  </button>
                )}
                <button
                  onClick={handleCreate}
                  disabled={creating || !nome.trim()}
                  className="flex-1 py-2 text-xs bg-primary text-background rounded-lg hover:bg-warm-darker transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  Crea budget
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function BudgetPlanner() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>('obiettivi');
  const [selectedCanale, setSelectedCanale] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeInput, setNomeInput] = useState('');
  const [expandedFamily, setExpandedFamily] = useState<string | null>(MODA_FAMIGLIE[0]);
  const [orderResoChoices, setOrderResoChoices] = useState<Record<string, 'con' | 'senza'>>({});

  // ── Scenario selection ─────────────────────────────────────────────────────
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('budget-active-scenario-id');
  });
  const [showSetupModal, setShowSetupModal] = useState(!activeScenarioId);
  const activeScenarioIdRef = useRef(activeScenarioId);

  useEffect(() => {
    activeScenarioIdRef.current = activeScenarioId;
    if (activeScenarioId) localStorage.setItem('budget-active-scenario-id', activeScenarioId);
  }, [activeScenarioId]);

  useEffect(() => {
    if (!selectedOrderId) { setOrderResoChoices({}); return; }
    try {
      const all = JSON.parse(localStorage.getItem('reso-choices') ?? '{}');
      setOrderResoChoices(all[selectedOrderId] ?? {});
    } catch { setOrderResoChoices({}); }
  }, [selectedOrderId]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: scenario, isLoading, error: scenarioError } = useQuery<ScenarioData>({
    queryKey: ['budget-scenario', activeScenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/budget?scenarioId=${activeScenarioId}`);
      if (res.status === 404) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      return res.json();
    },
    enabled: !!activeScenarioId,
    staleTime: 60_000,
    retry: false,
  });

  // Se lo scenario non esiste più, torna alla modale
  useEffect(() => {
    if ((scenarioError as any)?.status === 404) {
      localStorage.removeItem('budget-active-scenario-id');
      setActiveScenarioId(null);
      setShowSetupModal(true);
    }
  }, [scenarioError]);

  // Pre-imposta selectedOrderId dall'ordine collegato allo scenario
  useEffect(() => {
    if (scenario?.meta.sourceOrderId && !selectedOrderId) {
      setSelectedOrderId(scenario.meta.sourceOrderId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.meta.sourceOrderId]);

  const { data: marginiSuggeriti } = useQuery<Record<string, number | null>>({
    queryKey: ['budget-margini-suggeriti'],
    queryFn: () => fetch('/api/budget/margini-suggeriti').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  // Single-order aggregate (for sintesi-ordine view + Fabbisogno ordinato column)
  const { data: singleOrderDataRaw, isFetching: singleOrderFetching } = useQuery<{ data: OrderAggRow[] }>({
    queryKey: ['budget-order-data', selectedOrderId, orderResoChoices],
    queryFn: () => {
      const params = new URLSearchParams({ orderId: selectedOrderId! });
      if (Object.keys(orderResoChoices).length > 0) params.set('resoChoices', JSON.stringify(orderResoChoices));
      return fetch(`/api/budget/order-data?${params}`).then((r) => r.json());
    },
    enabled: !!selectedOrderId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const singleOrderData: OrderAggRow[] = singleOrderDataRaw?.data ?? [];

  // Orders list for the selector
  const { data: ordersListRaw } = useQuery<{ orders: OrderSummary[] }>({
    queryKey: ['budget-orders'],
    queryFn: () => fetch('/api/budget/orders').then((r) => r.json()),
    staleTime: 60_000,
  });
  const ordersList: OrderSummary[] = ordersListRaw?.orders ?? [];

  // Unique destinations (sorted) and orders filtered by selected destination
  const uniqueCanali = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const o of ordersList) {
      const name = o.canaleNome ?? 'Senza destinazione';
      if (!seen.has(name)) { seen.add(name); out.push(name); }
    }
    return out.sort((a, b) => a.localeCompare(b, 'it'));
  }, [ordersList]);

  const filteredOrders = useMemo(
    () => ordersList.filter((o) => (o.canaleNome ?? 'Senza destinazione') === selectedCanale),
    [ordersList, selectedCanale],
  );

  // ── Local editable state (starts from server data) ─────────────────────────
  const [localFamily, setLocalFamily] = useState<Record<string, Partial<FamilyInput>>>({});
  const [localSubclass, setLocalSubclass] = useState<Record<string, Partial<SubclassRow>>>({});
  const [localObiettivoTotale, setLocalObiettivoTotale] = useState<number | null | undefined>(undefined);
  const [localCostiNegozio, setLocalCostiNegozio] = useState<number | null | undefined>(undefined);
  const [localObiettivoSviluppo, setLocalObiettivoSviluppo] = useState<number | null | undefined>(undefined);
  // settori: driven entirely by local state initialized from server on first load
  const [settoriLocal, setSettoriLocal] = useState<Settore[] | null>(null);
  // Refs to flush pending saves on unmount
  const latestSettoriRef = useRef<Settore[] | null>(null);
  const hasPendingSettoriSave = useRef(false);
  const pendingMetaRef = useRef<Record<string, number | null>>({});
  const hasPendingMetaSave = useRef(false);

  // Initialize settoriLocal from server data the first time scenario loads
  const settori: Settore[] = settoriLocal ?? (scenario?.settori ?? []);

  const costiNegozio: number | null =
    localCostiNegozio !== undefined ? localCostiNegozio : (scenario?.meta.costiNegozio ?? null);
  const obiettivoSviluppo: number | null =
    localObiettivoSviluppo !== undefined ? localObiettivoSviluppo : (scenario?.meta.obiettivoRicavoSviluppo ?? null);

  // Obiettivo totale: local override > DB value
  const obiettivoTotale: number | null =
    localObiettivoTotale !== undefined
      ? localObiettivoTotale
      : (scenario?.meta.obiettivoTotale ?? null);

  // PE26 venduto per famiglia (from subclass data sums) — used as weight for distributing total obiettivo
  const pe26VendutoPerFamiglia = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of MODA_FAMIGLIE) {
      out[f] = (scenario?.subclassData ?? [])
        .filter((sd) => sd.famiglia === f)
        .reduce((s, sd) => s + (sd.valorePE26 ?? 0), 0);
    }
    return out;
  }, [scenario?.subclassData]);

  const pe26VendutoTotale = useMemo(
    () => Object.values(pe26VendutoPerFamiglia).reduce((s, v) => s + v, 0),
    [pe26VendutoPerFamiglia],
  );

  function getFamilyInput(famiglia: string): FamilyInput {
    const db = scenario?.familyInputs.find((fi) => fi.famiglia === famiglia);
    const local = localFamily[famiglia] ?? {};

    // Auto-derive PE26 totals from fabbisogno subclass data when not manually set
    const subclassSums = scenario?.subclassData
      .filter((sd) => sd.famiglia === famiglia)
      .reduce((acc, sd) => ({
        valore: acc.valore + (sd.valorePE26 ?? 0),
        pezzi:  acc.pezzi  + (sd.pezziPE26  ?? 0),
      }), { valore: 0, pezzi: 0 });
    const autoValore = subclassSums && subclassSums.valore > 0 ? subclassSums.valore : null;
    const autoPezzi  = subclassSums && subclassSums.pezzi  > 0 ? subclassSums.pezzi  : null;

    // Distribute total obiettivo by PE26 weight (equal split if no PE26 data)
    let obiettivoFamiglia: number | null = null;
    if (obiettivoTotale != null) {
      const famValore = pe26VendutoPerFamiglia[famiglia] ?? 0;
      const weight =
        pe26VendutoTotale > 0
          ? famValore / pe26VendutoTotale
          : 1 / MODA_FAMIGLIE.length;
      obiettivoFamiglia = obiettivoTotale * weight;
    }

    return {
      famiglia,
      vendutoPrevValore: local.vendutoPrevValore !== undefined ? local.vendutoPrevValore : (db?.vendutoPrevValore ?? autoValore),
      vendutoPrevPezzi:  local.vendutoPrevPezzi  !== undefined ? local.vendutoPrevPezzi  : (db?.vendutoPrevPezzi  ?? autoPezzi),
      mesiConsuntivi:    local.mesiConsuntivi     !== undefined ? local.mesiConsuntivi    : (db?.mesiConsuntivi    ?? 4),
      obiettivo:         obiettivoFamiglia,
      marginePieno:      local.marginePieno       !== undefined ? local.marginePieno      : (db?.marginePieno      ?? null),
      scontoMese5:       local.scontoMese5        !== undefined ? local.scontoMese5       : (db?.scontoMese5       ?? null),
      scontoMese6:       local.scontoMese6        !== undefined ? local.scontoMese6       : (db?.scontoMese6       ?? null),
    };
  }

  function getSubclassRow(famiglia: string, sottoclasse: string): SubclassRow {
    const db = scenario?.subclassData.find((sd) => sd.famiglia === famiglia && sd.sottoclasse === sottoclasse);
    const key = `${famiglia}|${sottoclasse}`;
    const local = localSubclass[key] ?? {};
    return {
      famiglia,
      sottoclasse,
      pezziPE26:    local.pezziPE26    !== undefined ? local.pezziPE26    : (db?.pezziPE26    ?? null),
      valorePE26:   local.valorePE26   !== undefined ? local.valorePE26   : (db?.valorePE26   ?? null),
      continuativi: local.continuativi !== undefined ? local.continuativi : (db?.continuativi  ?? 0),
    };
  }

  // ── Mutations (debounced per field) ────────────────────────────────────────
  const saveTimer = useRef<Record<string, NodeJS.Timeout>>({});

  function saveObiettivoTotale(value: number | null) {
    qc.setQueryData<ScenarioData>(['budget-scenario', activeScenarioId], (old) =>
      old ? { ...old, meta: { ...old.meta, obiettivoTotale: value } } : old
    );
    clearTimeout(saveTimer.current['obiettivo-totale']);
    saveTimer.current['obiettivo-totale'] = setTimeout(async () => {
      try {
        const res = await fetch('/api/budget', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: activeScenarioIdRef.current, obiettivoTotale: value }),
        });
        if (!res.ok) throw new Error();
        setLocalObiettivoTotale(undefined);
      } catch {
        toast.error('Errore nel salvataggio obiettivo');
        setLocalObiettivoTotale(undefined);
      }
    }, 800);
  }

  function saveMetaField(field: string, value: number | null) {
    pendingMetaRef.current[field] = value;
    hasPendingMetaSave.current = true;

    qc.setQueryData<ScenarioData>(['budget-scenario', activeScenarioId], (old) =>
      old ? { ...old, meta: { ...old.meta, [field]: value } } : old
    );
    clearTimeout(saveTimer.current[`meta-${field}`]);
    saveTimer.current[`meta-${field}`] = setTimeout(async () => {
      try {
        const res = await fetch('/api/budget', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: activeScenarioIdRef.current, [field]: value }),
        });
        if (!res.ok) throw new Error();
        delete pendingMetaRef.current[field];
        if (Object.keys(pendingMetaRef.current).length === 0) hasPendingMetaSave.current = false;
        if (field === 'costiNegozio') setLocalCostiNegozio(undefined);
        if (field === 'obiettivoRicavoSviluppo') setLocalObiettivoSviluppo(undefined);
      } catch { toast.error('Errore nel salvataggio'); }
    }, 800);
  }

  function saveSettori(rows: Settore[]) {
    latestSettoriRef.current = rows;
    hasPendingSettoriSave.current = true;

    // Optimistic: update the cache immediately so navigating away and back shows the correct data.
    qc.setQueryData<ScenarioData>(['budget-scenario', activeScenarioId], (old) =>
      old ? { ...old, settori: rows } : old
    );

    clearTimeout(saveTimer.current['settori']);
    saveTimer.current['settori'] = setTimeout(async () => {
      try {
        const res = await fetch('/api/budget/settori', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: activeScenarioIdRef.current, rows: rows.map((r, i) => ({ ...r, posizione: i })) }),
        });
        if (!res.ok) throw new Error();
        hasPendingSettoriSave.current = false;
      } catch {
        toast.error('Errore nel salvataggio settori');
      }
    }, 600);
  }

  // Flush any pending saves immediately when navigating away
  useEffect(() => {
    return () => {
      const sid = activeScenarioIdRef.current;
      // Flush settori
      if (sid && hasPendingSettoriSave.current && latestSettoriRef.current) {
        clearTimeout(saveTimer.current['settori']);
        fetch('/api/budget/settori', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: sid,
            rows: latestSettoriRef.current.map((r, i) => ({ ...r, posizione: i })),
          }),
          keepalive: true,
        }).catch(() => {});
      }
      // Flush meta fields (costiNegozio, obiettivoRicavoSviluppo)
      if (sid && hasPendingMetaSave.current && Object.keys(pendingMetaRef.current).length > 0) {
        for (const field of Object.keys(pendingMetaRef.current)) {
          clearTimeout(saveTimer.current[`meta-${field}`]);
        }
        fetch('/api/budget', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: sid, ...pendingMetaRef.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveFamilyField(famiglia: string, field: string, value: unknown) {
    const key = `fam-${famiglia}-${field}`;
    clearTimeout(saveTimer.current[key]);
    saveTimer.current[key] = setTimeout(async () => {
      const clearField = () =>
        setLocalFamily((prev) => {
          const fam = { ...(prev[famiglia] ?? {}) };
          delete (fam as Record<string, unknown>)[field];
          return { ...prev, [famiglia]: fam };
        });
      try {
        const res = await fetch('/api/budget/family-inputs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: activeScenarioIdRef.current, famiglia, [field]: value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const updated: FamilyInput = await res.json();
        qc.setQueryData<ScenarioData>(['budget-scenario'], (old) =>
          old
            ? { ...old, familyInputs: [...old.familyInputs.filter((fi) => fi.famiglia !== famiglia), updated] }
            : old
        );
        clearField();
      } catch {
        toast.error('Errore nel salvataggio');
        clearField();
      }
    }, 800);
  }

  function updateFamily(famiglia: string, field: keyof FamilyInput, value: unknown) {
    setLocalFamily((prev) => ({
      ...prev,
      [famiglia]: { ...(prev[famiglia] ?? {}), [field]: value as never },
    }));
    saveFamilyField(famiglia, field, value);
  }

  function saveSubclassField(famiglia: string, sottoclasse: string, field: string, value: unknown) {
    const key = `sub-${famiglia}-${sottoclasse}-${field}`;
    clearTimeout(saveTimer.current[key]);
    saveTimer.current[key] = setTimeout(async () => {
      const localKey = `${famiglia}|${sottoclasse}`;
      const clearField = () =>
        setLocalSubclass((prev) => {
          const sub = { ...(prev[localKey] ?? {}) };
          delete (sub as Record<string, unknown>)[field];
          return { ...prev, [localKey]: sub };
        });
      try {
        const res = await fetch('/api/budget/subclass-data', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: activeScenarioIdRef.current, famiglia, sottoclasse, [field]: value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const updated: SubclassRow = await res.json();
        qc.setQueryData<ScenarioData>(['budget-scenario'], (old) =>
          old
            ? {
                ...old,
                subclassData: [
                  ...old.subclassData.filter(
                    (sd) => !(sd.famiglia === famiglia && sd.sottoclasse === sottoclasse),
                  ),
                  updated,
                ],
              }
            : old
        );
        clearField();
      } catch {
        toast.error('Errore nel salvataggio');
        clearField();
      }
    }, 800);
  }

  function updateSubclass(famiglia: string, sottoclasse: string, field: keyof SubclassRow, value: unknown) {
    const key = `${famiglia}|${sottoclasse}`;
    setLocalSubclass((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value as never },
    }));
    saveSubclassField(famiglia, sottoclasse, field, value);
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const familyComputed = useMemo(() => {
    return Object.fromEntries(
      MODA_FAMIGLIE.map((f) => [f, computeFamily(getFamilyInput(f))])
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, localFamily]);

  const subclassTotaliPerFamiglia = useMemo(() => {
    const result: Record<string, { pe26: number }> = {};
    for (const f of MODA_FAMIGLIE) {
      const subclasses = MODA_SUBCLASSES[f as keyof typeof MODA_SUBCLASSES] ?? [];
      let pe26 = 0;
      for (const s of subclasses) {
        const row = getSubclassRow(f, s);
        pe26 += row.pezziPE26 ?? 0;
      }
      result[f] = { pe26: pe26 || 0 };
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, localSubclass]);

  const subclassComputed = useMemo(() => {
    const result: Record<string, ReturnType<typeof computeSubclass>> = {};
    for (const f of MODA_FAMIGLIE) {
      const subclasses = MODA_SUBCLASSES[f as keyof typeof MODA_SUBCLASSES] ?? [];
      const totali = subclassTotaliPerFamiglia[f];
      const fam = familyComputed[f];
      for (const s of subclasses) {
        const row = getSubclassRow(f, s);
        const ordinato = singleOrderData
          .filter((o) => o.famiglia === f && o.sottoclasse === s)
          .reduce((sum, o) => sum + o.pezzi, 0);
        result[`${f}|${s}`] = computeSubclass(
          row,
          totali.pe26 > 0 ? totali.pe26 : null,
          fam.obiettivoPezzi,
          ordinato,
        );
      }
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, localSubclass, localFamily, singleOrderData]);

  const summary = useMemo(() => {
    const families = MODA_FAMIGLIE.map((f) => ({ input: getFamilyInput(f), computed: familyComputed[f] }));
    const subclassRows = Object.entries(subclassComputed).map(([key, comp]) => {
      const [f, s] = key.split('|');
      return { row: getSubclassRow(f, s), computed: comp };
    });
    return computeSummary(families, subclassRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subclassComputed, familyComputed]);

  // ── Scenario name save ─────────────────────────────────────────────────────
  async function saveNome() {
    const res = await fetch('/api/budget', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: activeScenarioId, nome: nomeInput }),
    });
    if (res.ok) {
      toast.success('Scenario aggiornato');
      qc.setQueryData<ScenarioData>(['budget-scenario', activeScenarioId], (old) =>
        old ? { ...old, meta: { ...old.meta, nome: nomeInput } } : old
      );
    } else {
      toast.error('Errore salvataggio');
    }
    setEditingNome(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (!activeScenarioId || showSetupModal) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <BudgetSetupModal
          onSelect={(id) => {
            setActiveScenarioId(id);
            setShowSetupModal(false);
            qc.invalidateQueries({ queryKey: ['budget-scenario'] });
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const nome = scenario?.meta.nome ?? 'Budget principale';

  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary pb-28">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-2xs text-gray-400 uppercase tracking-widest">Budget</p>
              <button
                onClick={() => setShowSetupModal(true)}
                className="text-2xs text-accent hover:text-accent/80 transition-colors"
              >
                Cambia
              </button>
            </div>
            {editingNome ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  autoFocus
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveNome(); if (e.key === 'Escape') setEditingNome(false); }}
                  className="text-sm font-semibold bg-transparent border-b border-accent focus:outline-none text-primary min-w-0 flex-1"
                />
                <button onClick={saveNome} className="text-accent"><Check size={14} /></button>
                <button onClick={() => setEditingNome(false)} className="text-gray-400"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => { setNomeInput(nome); setEditingNome(true); }}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent transition-colors group"
              >
                {nome}
                <Pencil size={11} className="text-gray-400 group-hover:text-accent" />
              </button>
            )}
          </div>

          {/* View tabs */}
          <div className="flex gap-1">
            {([
              { key: 'negozio',        icon: Store,      label: 'Negozio'        },
              { key: 'obiettivi',      icon: BarChart2,  label: 'Obiettivi'      },
              { key: 'fabbisogno',    icon: Layers,     label: 'Fabbisogno'     },
              { key: 'sintesi-ordine',icon: Package2,   label: 'Ordine'         },
              { key: 'sintesi',       icon: TrendingUp, label: 'Sintesi'        },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  view === key ? 'bg-primary text-white' : 'text-gray-500 border border-border hover:bg-white'
                }`}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── SINTESI KPI strip (always visible) ──────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Obiettivo PE27', value: fmt(summary.obiettivoTotale, 0) + ' €' },
            { label: 'Margine obiettivo', value: fmt(summary.margineObiettivoTotale, 0) + ' €' },
            { label: 'Fabbisogno pezzi', value: fmt(Math.round(summary.fabbisognoTotalePezzi)) },
            { label: 'Copertura', value: fmtCov(summary.copertura) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-border rounded-xl px-3 py-2.5">
              <p className="text-2xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* ── NEGOZIO view ─────────────────────────────────────────────────── */}
        {view === 'negozio' && (
          <div className="space-y-4">

            {/* Costo punto vendita */}
            <div className="bg-white border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Costo annuo del punto vendita</p>
                  <p className="text-2xs text-gray-400 mt-0.5">Totale costi fissi e variabili (affitto, stipendi, utenze…)</p>
                </div>
                <div className="w-44">
                  <NumInput
                    value={costiNegozio}
                    decimals={0}
                    prefix="€"
                    placeholder="es. 96000"
                    onChange={(v) => { setLocalCostiNegozio(v); saveMetaField('costiNegozio', v); }}
                  />
                </div>
              </div>
            </div>

            {/* Settori */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-gray-50/50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-700">Settori del negozio</span>
                  {(() => {
                    const totInc = settori.reduce((s, r) => s + r.incidenza, 0);
                    return settori.length > 0 ? (
                      <span className={`ml-2 text-2xs font-medium ${Math.abs(totInc - 100) < 0.1 ? 'text-green-600' : 'text-amber-500'}`}>
                        {totInc.toFixed(1)}% tot.
                      </span>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => {
                    const updated = [...settori, { nome: '', incidenza: 0, margine: 0, posizione: settori.length }];
                    setSettoriLocal(updated);
                    saveSettori(updated);
                  }}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  <Plus size={12} /> Aggiungi
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-2xs text-gray-400 uppercase tracking-wide">
                      <th className="text-left px-4 py-2 font-medium">Settore</th>
                      <ColTh label="Incidenza %" tip="✏️ Da inserire. Quota % che questo settore rappresenta sui ricavi totali del negozio. La somma deve essere 100%." />
                      <ColTh label="Margine %" tip="✏️ Da inserire. Margine medio atteso per questo settore: (ricavo − costo d'acquisto) ÷ ricavo × 100." />
                      <ColTh label="Ob. Margine Sost." tip="🔢 Calcolato. Quota di costi del negozio attribuibile a questo settore: Costo negozio × Incidenza. È il margine minimo da realizzare per la sostenibilità." />
                      <ColTh label="Ob. Ricavo Sost." tip="🔢 Calcolato. Ricavo minimo per coprire i costi attribuiti: Ob. Margine Sost. ÷ Margine. Sotto questa soglia il settore va in perdita." />
                      <ColTh label="Ob. Ricavo Svil." tip="🔢 Calcolato. Ricavo per l'obiettivo di sviluppo: Ob. Ricavo Sviluppo totale × Incidenza. Il ricavo a cui puntare per generare guadagno oltre la sostenibilità." />
                      <ColTh label="Ob. Margine Svil." tip="🔢 Calcolato. Margine prodotto dall'obiettivo sviluppo: Ob. Ricavo Svil. × Margine. Il guadagno netto atteso se si raggiunge l'obiettivo di sviluppo." />
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {settori.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">
                          Nessun settore. Clicca Aggiungi per iniziare.
                        </td>
                      </tr>
                    )}
                    {settori.map((s, i) => {
                      const margineSOST = costiNegozio != null ? costiNegozio * s.incidenza / 100 : null;
                      const ricavoSOST  = margineSOST != null && s.margine > 0 ? margineSOST / (s.margine / 100) : null;
                      const ricavoSVIL  = obiettivoSviluppo != null ? obiettivoSviluppo * s.incidenza / 100 : null;
                      const margineSVIL = ricavoSVIL != null ? ricavoSVIL * s.margine / 100 : null;

                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-1.5 min-w-[130px]">
                            <input
                              type="text"
                              value={s.nome}
                              placeholder="Nome settore"
                              onChange={(e) => {
                                const updated = settori.map((r, j) => j === i ? { ...r, nome: e.target.value } : r);
                                setSettoriLocal(updated);
                                saveSettori(updated);
                              }}
                              className="w-full bg-transparent text-xs text-gray-900 border-b border-transparent focus:border-accent focus:outline-none py-0.5"
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <NumInput
                              value={s.incidenza}
                              decimals={1}
                              suffix="%"
                              onChange={(v) => {
                                const updated = settori.map((r, j) => j === i ? { ...r, incidenza: v ?? 0 } : r);
                                setSettoriLocal(updated);
                                saveSettori(updated);
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <NumInput
                              value={s.margine}
                              decimals={1}
                              suffix="%"
                              onChange={(v) => {
                                const updated = settori.map((r, j) => j === i ? { ...r, margine: v ?? 0 } : r);
                                setSettoriLocal(updated);
                                saveSettori(updated);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">{margineSOST != null ? '€ ' + fmt(margineSOST, 0) : '—'}</td>
                          <td className="px-2 py-2 text-right text-gray-600">{ricavoSOST  != null ? '€ ' + fmt(ricavoSOST,  0) : costiNegozio == null || s.margine === 0 ? '—' : '—'}</td>
                          <td className="px-2 py-2 text-right text-gray-600">{ricavoSVIL  != null ? '€ ' + fmt(ricavoSVIL,  0) : '—'}</td>
                          <td className="px-2 py-2 text-right font-medium text-gray-800">{margineSVIL != null ? '€ ' + fmt(margineSVIL, 0) : '—'}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => {
                                const updated = settori.filter((_, j) => j !== i);
                                setSettoriLocal(updated);
                                saveSettori(updated);
                              }}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {settori.length > 0 && (
                    <tfoot>
                      {(() => {
                        const totInc      = settori.reduce((s, r) => s + r.incidenza, 0);
                        const totMargSOST = costiNegozio != null ? costiNegozio * totInc / 100 : null;
                        const totRicSOST  = costiNegozio != null
                          ? settori.reduce((s, r) => {
                              const m = costiNegozio * r.incidenza / 100;
                              return s + (r.margine > 0 ? m / (r.margine / 100) : 0);
                            }, 0)
                          : null;
                        const totRicSVIL  = obiettivoSviluppo != null ? obiettivoSviluppo * totInc / 100 : null;
                        const totMargSVIL = obiettivoSviluppo != null
                          ? settori.reduce((s, r) => {
                              const ric = obiettivoSviluppo * r.incidenza / 100;
                              return s + ric * r.margine / 100;
                            }, 0)
                          : null;
                        return (
                          <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
                            <td className="px-4 py-2">Totale</td>
                            <td className="px-2 py-2 text-right">
                              <span className={Math.abs(totInc - 100) < 0.1 ? 'text-green-700' : 'text-amber-600'}>
                                {totInc.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-2 py-2" />
                            <td className="px-2 py-2 text-right">{totMargSOST != null ? '€ ' + fmt(totMargSOST, 0) : '—'}</td>
                            <td className="px-2 py-2 text-right">{totRicSOST  != null ? '€ ' + fmt(totRicSOST,  0) : '—'}</td>
                            <td className="px-2 py-2 text-right">{totRicSVIL  != null ? '€ ' + fmt(totRicSVIL,  0) : '—'}</td>
                            <td className="px-2 py-2 text-right">{totMargSVIL != null ? '€ ' + fmt(totMargSVIL, 0) : '—'}</td>
                            <td className="px-2 py-2" />
                          </tr>
                        );
                      })()}
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Obiettivo ricavo sviluppo */}
            <div className="bg-white border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Obiettivo ricavo di sviluppo — totale negozio</p>
                  <p className="text-2xs text-gray-400 mt-0.5">
                    Ricavo complessivo a cui puntare per generare un margine al di sopra della semplice sostenibilità.
                    {' '}La quota attribuita a &ldquo;Moda PE&rdquo; alimenta l&apos;obiettivo nel tab Obiettivi.
                  </p>
                </div>
                <div className="w-44">
                  <NumInput
                    value={obiettivoSviluppo}
                    decimals={0}
                    prefix="€"
                    placeholder="es. 300000"
                    onChange={(v) => { setLocalObiettivoSviluppo(v); saveMetaField('obiettivoRicavoSviluppo', v); }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── FAMIGLIE view ────────────────────────────────────────────────── */}
        {view === 'obiettivi' && (
          <div className="space-y-3">

            {/* ── Obiettivo totale MODA PE27 ── */}
            <div className="bg-white border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Obiettivo vendite MODA — PE27</p>
                  <p className="text-2xs text-gray-400 mt-0.5">Marzo – Agosto 2027 · distribuito per famiglia in base ai pesi PE26</p>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const modaPe = settori.find((s) => s.nome.toLowerCase().replace(/\s/g, '').includes('modape'));
                    const suggerito = modaPe && obiettivoSviluppo
                      ? Math.round(obiettivoSviluppo * modaPe.incidenza / 100)
                      : null;
                    return suggerito != null ? (
                      <button
                        onClick={() => { setLocalObiettivoTotale(suggerito); saveObiettivoTotale(suggerito); }}
                        title="Valore calcolato in Negozio → Obiettivo ricavo sviluppo per Moda PE"
                        className="text-[9px] font-medium px-1.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors leading-none whitespace-nowrap"
                      >
                        {fmt(suggerito, 0)} € da Negozio
                      </button>
                    ) : null;
                  })()}
                  <div className="w-40">
                    <NumInput
                      value={obiettivoTotale}
                      decimals={0}
                      suffix="€"
                      placeholder="es. 150000"
                      onChange={(v) => {
                        setLocalObiettivoTotale(v);
                        saveObiettivoTotale(v);
                      }}
                    />
                  </div>
                </div>
              </div>
              {obiettivoTotale != null && pe26VendutoTotale > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-4">
                  {MODA_FAMIGLIE.map((f) => {
                    const w = (pe26VendutoPerFamiglia[f] ?? 0) / pe26VendutoTotale;
                    return (
                      <span key={f} className="text-2xs text-gray-400">
                        {f}: <span className="text-gray-700 font-medium">{fmt(obiettivoTotale * w, 0)} €</span>
                        <span className="ml-1 text-gray-300">({(w * 100).toFixed(0)}%)</span>
                      </span>
                    );
                  })}
                </div>
              )}
              {obiettivoTotale != null && pe26VendutoTotale === 0 && (
                <p className="mt-2 text-2xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={10} /> Inserisci i dati PE26 per sottoclasse nel Fabbisogno per distribuire l&apos;obiettivo per famiglia
                </p>
              )}
            </div>

            {MODA_FAMIGLIE.map((famiglia) => {
              const input = getFamilyInput(famiglia);
              const comp  = familyComputed[famiglia];
              const isOpen = expandedFamily === famiglia;

              return (
                <div key={famiglia} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFamily(isOpen ? null : famiglia)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cream transition-colors"
                  >
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    <span className="font-medium text-sm flex-1">{famiglia}</span>
                    <div className="flex gap-4 text-xs text-gray-500">
                      {input.obiettivo != null && <span>Ob. {fmt(input.obiettivo, 0)} €</span>}
                      {comp.margineMedioEffettivo != null && <span>Mg. eff. {pct(comp.margineMedioEffettivo)}</span>}
                      {comp.obiettivoPezzi != null && <span className="text-primary font-medium">{Math.round(comp.obiettivoPezzi)} pz</span>}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">

                        {/* Column 1: storico + proiezione */}
                        <div className="space-y-2">
                          <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium pt-1">
                            Storico PE26
                            <span className="ml-1 normal-case font-normal text-gray-300">(da Fabbisogno)</span>
                          </p>
                          <RowComputed
                            label="Venduto (€)"
                            value={input.vendutoPrevValore != null ? '€ ' + fmt(input.vendutoPrevValore, 0) : '— inserisci dati in Fabbisogno'}
                          />
                          <RowComputed
                            label="Pezzi venduti"
                            value={input.vendutoPrevPezzi != null ? input.vendutoPrevPezzi + ' pz' : '—'}
                          />
                          <Row label="Mesi consuntivi">
                            <NumInput value={input.mesiConsuntivi} decimals={0} placeholder="4"
                              onChange={(v) => updateFamily(famiglia, 'mesiConsuntivi', v ?? 4)} />
                          </Row>

                          <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium pt-2">Proiezione (su 6 mesi)</p>
                          <RowComputed label="Venduto proiettato" value={comp.vendutoProiettato != null ? fmt(comp.vendutoProiettato, 0) + ' €' : '—'} />
                          <RowComputed label="Pezzi proiettati"   value={comp.pezziProiettati != null ? fmt(Math.round(comp.pezziProiettati)) : '—'} />
                          <RowComputed label="Val. medio / pezzo"  value={comp.valoreMedioPezzo != null ? fmt(comp.valoreMedioPezzo, 2) + ' €' : '—'} />
                        </div>

                        {/* Column 2: obiettivo + margini */}
                        <div className="space-y-2">
                          <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium pt-1">Obiettivo PE27</p>
                          <RowComputed
                            label="Obiettivo vendite (€)"
                            value={input.obiettivo != null ? fmt(input.obiettivo, 0) + ' €' : obiettivoTotale == null ? 'imposta obiettivo ↑' : '—'}
                          />
                          {input.obiettivo != null && comp.valoreMedioPezzo == null && (
                            <p className="text-2xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={10} /> Inserisci storico per calcolare i pezzi obiettivo
                            </p>
                          )}
                          <RowComputed label="Pezzi obiettivo" value={comp.obiettivoPezzi != null ? Math.round(comp.obiettivoPezzi) + ' pz' : '—'} highlight />

                          <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium pt-2">Margini</p>
                          <Row label={
                            <span className="flex items-center gap-1.5">
                              Margine pieno (%)
                              {marginiSuggeriti?.[famiglia] != null && (
                                <button
                                  onClick={() => updateFamily(famiglia, 'marginePieno', marginiSuggeriti[famiglia])}
                                  title="Valore calcolato dalle condizioni commerciali dei conferenti (media ponderata per n. prodotti)"
                                  className="text-[9px] font-medium px-1 py-px rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors leading-none"
                                >
                                  {marginiSuggeriti[famiglia]!.toFixed(1)}% da CC
                                </button>
                              )}
                            </span>
                          }>
                            <NumInput value={input.marginePieno} decimals={1} suffix="%"
                              onChange={(v) => updateFamily(famiglia, 'marginePieno', v)} />
                          </Row>
                          <Row label="Sconto luglio (%)">
                            <NumInput value={input.scontoMese5} decimals={1} suffix="%"
                              onChange={(v) => updateFamily(famiglia, 'scontoMese5', v)} />
                          </Row>
                          <Row label="Sconto agosto (%)">
                            <NumInput value={input.scontoMese6} decimals={1} suffix="%"
                              onChange={(v) => updateFamily(famiglia, 'scontoMese6', v)} />
                          </Row>
                          <RowComputed label="Mg. luglio"         value={comp.margineMese5 != null ? pct(comp.margineMese5) : '—'} />
                          <RowComputed label="Mg. agosto"         value={comp.margineMese6 != null ? pct(comp.margineMese6) : '—'} />
                          <RowComputed label="Mg. medio effettivo" value={comp.margineMedioEffettivo != null ? pct(comp.margineMedioEffettivo) : '—'} highlight />
                          <RowComputed label="Margine obiettivo"  value={comp.margineObiettivo != null ? fmt(comp.margineObiettivo, 0) + ' €' : '—'} />
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── FABBISOGNO view ─────────────────────────────────────────────── */}
        {view === 'fabbisogno' && (
          <div className="space-y-4">
            {MODA_FAMIGLIE.map((famiglia) => {
              const subclasses = MODA_SUBCLASSES[famiglia as keyof typeof MODA_SUBCLASSES] ?? [];
              const fam = familyComputed[famiglia];

              return (
                <div key={famiglia} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-gray-50/50 flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700">{famiglia}</span>
                    {fam.obiettivoPezzi != null && (
                      <span className="text-2xs text-gray-400">Obiettivo: {Math.round(fam.obiettivoPezzi)} pz</span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-2xs text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-4 py-2 font-medium">Sottoclasse</th>
                          <ColTh label="Pz PE26"      tip="✏️ Da inserire. Pezzi totali venduti in questa sottoclasse nella stagione PE26 (Mar–Ago 2026). Serve a calcolare il peso % (incidenza) con cui distribuire l'obiettivo pezzi PE27." />
                          <ColTh label="Val. IE PE26" tip="✏️ Da inserire. Valore totale d'acquisto (ingresso/IE) per questa sottoclasse nel PE26, in €. Viene sommato per famiglia e usato come storico nel tab Obiettivi." />
                          <ColTh label="Inc. PE26"    tip="🔢 Calcolato automaticamente. Quota % di questa sottoclasse sui pezzi totali della famiglia in PE26 (Pz sottoclasse ÷ Pz totali famiglia). Determina come l'obiettivo pezzi viene ripartito tra le sottoclassi." />
                          <ColTh label="Continuativi" tip="✏️ Da inserire. Pezzi di questa sottoclasse disponibili da riordino continuativo (articoli non stagionali). Vengono sottratti dal fabbisogno lordo: meno pezzi continuativi = meno nuovi ordini necessari." />
                          <ColTh label="Fabb. Lordo"  tip="🔢 Calcolato. Obiettivo pezzi famiglia × Incidenza PE26 − Continuativi. Può essere negativo se i continuativi coprono già l'intero obiettivo (→ stato Eccedente)." />
                          <ColTh label="Fabb. Netto"  tip="🔢 Calcolato. Pezzi effettivi ancora da ordinare: max(0, Fabb. Lordo). Se il lordo è negativo, il netto è 0 — non si deve ordinare nulla per questa sottoclasse." />
                          <ColTh label="Ordinato"     tip="🔢 Calcolato. Pezzi già presenti negli ordini attivi PE27 per questa sottoclasse. Si aggiorna automaticamente quando ordini vengono creati o modificati." />
                          <ColTh label="Extra/Scoperto" tip="🔢 Calcolato. Ordinato − Fabb. Netto. Verde = pezzi in eccesso rispetto al fabbisogno. Rosso = pezzi ancora da ordinare per coprire il fabbisogno." />
                          <th className="text-right px-3 py-2 font-medium">Stato</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {subclasses.map((sottoclasse) => {
                          const row = getSubclassRow(famiglia, sottoclasse);
                          const comp = subclassComputed[`${famiglia}|${sottoclasse}`];
                          if (!comp) return null;

                          return (
                            <tr key={sottoclasse} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{sottoclasse}</td>

                              {/* Pezzi PE26 */}
                              <td className="px-2 py-1 text-right">
                                <NumInput value={row.pezziPE26} decimals={0}
                                  onChange={(v) => updateSubclass(famiglia, sottoclasse, 'pezziPE26', v)} />
                              </td>
                              {/* Valore IE PE26 */}
                              <td className="px-2 py-1 text-right">
                                <NumInput value={row.valorePE26} decimals={0} prefix="€"
                                  onChange={(v) => updateSubclass(famiglia, sottoclasse, 'valorePE26', v)} />
                              </td>

                              {/* Computed read-only */}
                              <td className="px-2 py-2 text-right font-medium">{fmtPct(comp.incidenzaPE26 != null ? comp.incidenzaPE26 * 100 : null)}</td>

                              {/* Continuativi */}
                              <td className="px-2 py-1 text-right">
                                <NumInput value={row.continuativi} decimals={0}
                                  onChange={(v) => updateSubclass(famiglia, sottoclasse, 'continuativi', v ?? 0)} />
                              </td>

                              <td className="px-2 py-2 text-right text-gray-500">
                                {comp.fabbisognoRaw != null ? Math.round(comp.fabbisognoRaw) : '—'}
                              </td>
                              <td className="px-2 py-2 text-right font-medium">
                                {comp.fabbisognoNetto != null ? Math.round(comp.fabbisognoNetto) : '—'}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className={comp.ordinato > 0 ? 'text-blue-700 font-medium' : 'text-gray-300'}>{comp.ordinato}</span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                {comp.extra != null
                                  ? <span className={comp.extra >= 0 ? 'text-green-700' : 'text-red-600 font-medium'}>{comp.extra >= 0 ? '+' : ''}{Math.round(comp.extra)}</span>
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">{statusBadge(comp.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        {(() => {
                          let totPz = 0, totVal = 0, totCont = 0, totFabbRaw = 0, totFabbNetto = 0, totOrdinato = 0, totExtra = 0;
                          let hasFabbRaw = false, hasExtra = false;
                          for (const s of subclasses) {
                            const row = getSubclassRow(famiglia, s);
                            const comp = subclassComputed[`${famiglia}|${s}`];
                            totPz       += row.pezziPE26 ?? 0;
                            totVal      += row.valorePE26 ?? 0;
                            totCont     += row.continuativi;
                            totOrdinato += comp?.ordinato ?? 0;
                            if (comp?.fabbisognoRaw != null) { totFabbRaw += comp.fabbisognoRaw; hasFabbRaw = true; }
                            if (comp?.fabbisognoNetto != null) totFabbNetto += comp.fabbisognoNetto;
                            if (comp?.extra != null) { totExtra += comp.extra; hasExtra = true; }
                          }
                          return (
                            <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
                              <td className="px-4 py-2">Totale</td>
                              <td className="px-2 py-2 text-right">{totPz > 0 ? totPz : '—'}</td>
                              <td className="px-2 py-2 text-right">{totVal > 0 ? '€ ' + fmt(totVal, 0) : '—'}</td>
                              <td className="px-2 py-2 text-right text-gray-400">100%</td>
                              <td className="px-2 py-2 text-right">{totCont > 0 ? totCont : '—'}</td>
                              <td className="px-2 py-2 text-right text-gray-500">{hasFabbRaw ? Math.round(totFabbRaw) : '—'}</td>
                              <td className="px-2 py-2 text-right">{hasFabbRaw ? Math.round(totFabbNetto) : '—'}</td>
                              <td className="px-2 py-2 text-right text-blue-700">{totOrdinato > 0 ? totOrdinato : '—'}</td>
                              <td className="px-2 py-2 text-right">
                                {hasExtra
                                  ? <span className={totExtra >= 0 ? 'text-green-700' : 'text-red-600'}>{totExtra >= 0 ? '+' : ''}{Math.round(totExtra)}</span>
                                  : '—'}
                              </td>
                              <td className="px-3 py-2" />
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SINTESI ORDINE view ──────────────────────────────────────────── */}
        {view === 'sintesi-ordine' && (
          <div className="space-y-3">

            {/* Step 1 — destination picker */}
            <div className="bg-white border border-border rounded-2xl px-4 py-3">
              <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium mb-2">1. Scegli destinazione</p>
              {uniqueCanali.length === 0 ? (
                <p className="text-xs text-gray-400">Nessun ordine MODA PE27 disponibile.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {uniqueCanali.map((nome) => (
                    <button
                      key={nome}
                      onClick={() => {
                        setSelectedCanale(nome);
                        setSelectedOrderId(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedCanale === nome
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-border hover:border-gray-400 hover:text-primary'
                      }`}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 — order picker for selected destination */}
            {selectedCanale && (
              <div className="bg-white border border-border rounded-2xl px-4 py-3">
                <p className="text-2xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                  2. Scegli ordine — <span className="text-primary normal-case">{selectedCanale}</span>
                </p>
                {filteredOrders.length === 0 ? (
                  <p className="text-xs text-gray-400">Nessun ordine per questa destinazione.</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredOrders.map((o) => {
                      const num  = o.orderNumber ?? `#${o.id.slice(0, 8).toUpperCase()}`;
                      const date = new Date(o.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
                      const isSelected = selectedOrderId === o.id;
                      return (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/5 border-primary/30 text-primary'
                              : 'border-border hover:bg-gray-50 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                              {num}
                            </span>
                            <span className="text-2xs text-gray-400">{date}</span>
                          </div>
                          <span className={`ml-3 text-2xs font-medium flex-shrink-0 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                            {o.totalItems} pz
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            {!selectedCanale ? null : !selectedOrderId ? (
              <div className="bg-white border border-border rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-400">Seleziona un ordine per vedere la sintesi per conferente.</p>
              </div>
            ) : singleOrderFetching ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : singleOrderData.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-400">Nessun prodotto in questo ordine.</p>
              </div>
            ) : (
              (() => {
                const byConf = new Map<string, { rows: OrderAggRow[]; totPezzi: number; totImponibile: number; totRetail: number }>();
                for (const row of singleOrderData) {
                  const conf = row.conferente;
                  if (!byConf.has(conf)) byConf.set(conf, { rows: [], totPezzi: 0, totImponibile: 0, totRetail: 0 });
                  const entry = byConf.get(conf)!;
                  entry.rows.push(row);
                  entry.totPezzi      += row.pezzi;
                  entry.totImponibile += row.imponibile;
                  entry.totRetail     += row.retailStimato;
                }

                const grandPezzi      = [...byConf.values()].reduce((s, e) => s + e.totPezzi, 0);
                const grandImponibile = [...byConf.values()].reduce((s, e) => s + e.totImponibile, 0);
                const grandRetail     = [...byConf.values()].reduce((s, e) => s + e.totRetail, 0);

                return (
                  <div className="bg-white border border-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-2xs text-gray-400 uppercase tracking-wide bg-gray-50/50">
                            <th className="text-left px-4 py-2 font-medium">Conferente</th>
                            <th className="text-left px-2 py-2 font-medium">Famiglia</th>
                            <th className="text-left px-2 py-2 font-medium">Sottoclasse</th>
                            <th className="text-right px-2 py-2 font-medium">Pz</th>
                            <th className="text-right px-2 py-2 font-medium">Imponibile</th>
                            <th className="text-right px-3 py-2 font-medium">Retail stimato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {[...byConf.entries()].map(([conf, { rows, totPezzi, totImponibile, totRetail }]) => (
                            <>
                              {rows.map((row, i) => (
                                <tr key={`${conf}-${i}`} className="hover:bg-gray-50/50">
                                  {i === 0 && (
                                    <td className="px-4 py-2 font-semibold text-gray-800 whitespace-nowrap align-top" rowSpan={rows.length}>
                                      {conf}
                                    </td>
                                  )}
                                  <td className="px-2 py-2 text-gray-600">{row.famiglia}</td>
                                  <td className="px-2 py-2 text-gray-500">{row.sottoclasse}</td>
                                  <td className="px-2 py-2 text-right">{row.pezzi}</td>
                                  <td className="px-2 py-2 text-right">{fmt(row.imponibile, 0)} €</td>
                                  <td className="px-3 py-2 text-right text-gray-500">{fmt(row.retailStimato, 0)} €</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-medium text-gray-700 border-t border-gray-200">
                                <td className="px-4 py-1.5" colSpan={3}>Totale {conf}</td>
                                <td className="px-2 py-1.5 text-right">{totPezzi}</td>
                                <td className="px-2 py-1.5 text-right">{fmt(totImponibile, 0)} €</td>
                                <td className="px-3 py-1.5 text-right">{fmt(totRetail, 0)} €</td>
                              </tr>
                            </>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold text-gray-800 text-xs">
                            <td className="px-4 py-2" colSpan={3}>Totale ordine</td>
                            <td className="px-2 py-2 text-right">{grandPezzi}</td>
                            <td className="px-2 py-2 text-right">{fmt(grandImponibile, 0)} €</td>
                            <td className="px-3 py-2 text-right">{fmt(grandRetail, 0)} €</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ── SINTESI view ─────────────────────────────────────────────────── */}
        {view === 'sintesi' && (
          <div className="space-y-4">

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Obiettivo totale',      value: fmt(summary.obiettivoTotale, 0) + ' €' },
                { label: 'Margine obiettivo tot.',  value: fmt(summary.margineObiettivoTotale, 0) + ' €' },
                { label: 'Fabbisogno pezzi',      value: fmt(Math.round(summary.fabbisognoTotalePezzi)) + ' pz' },
                { label: 'Continuativi totali',   value: fmt(summary.continuativiTotali) + ' pz' },
                { label: 'Ordinato totale',       value: fmt(summary.ordinatoTotale) + ' pz' },
                { label: 'Delta',                 value: (summary.delta >= 0 ? '+' : '') + fmt(summary.delta) + ' pz' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-border rounded-xl px-4 py-3">
                  <p className="text-2xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-base font-semibold text-primary">{value}</p>
                </div>
              ))}
            </div>

            {/* Copertura progress */}
            <div className="bg-white border border-border rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Copertura budget</span>
                <span className="text-sm font-bold text-primary">{fmtCov(summary.copertura)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min(100, (summary.copertura ?? 0) * 100)}%` }}
                />
              </div>
            </div>

            {/* Per family summary table */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-gray-50/50">
                <span className="text-xs font-semibold text-gray-700">Riepilogo per famiglia</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-2xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-2 font-medium">Famiglia</th>
                    <th className="text-right px-3 py-2 font-medium">Obiettivo €</th>
                    <th className="text-right px-3 py-2 font-medium">Ob. Pz</th>
                    <th className="text-right px-3 py-2 font-medium">Fabb. Pz</th>
                    <th className="text-right px-3 py-2 font-medium">Ordinato</th>
                    <th className="text-right px-3 py-2 font-medium">Mg eff.</th>
                    <th className="text-right px-3 py-2 font-medium">Mg Ob. €</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {MODA_FAMIGLIE.map((famiglia) => {
                    const input = getFamilyInput(famiglia);
                    const comp = familyComputed[famiglia];
                    const ordinato = singleOrderData.filter((o) => o.famiglia === famiglia).reduce((s, o) => s + o.pezzi, 0);
                    const subclasses = MODA_SUBCLASSES[famiglia as keyof typeof MODA_SUBCLASSES] ?? [];
                    const fabbisogno = subclasses.reduce((sum, s) => {
                      const c = subclassComputed[`${famiglia}|${s}`];
                      return sum + (c?.fabbisognoNetto ?? 0);
                    }, 0);

                    return (
                      <tr key={famiglia} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{famiglia}</td>
                        <td className="px-3 py-2.5 text-right">{input.obiettivo != null ? fmt(input.obiettivo, 0) + ' €' : '—'}</td>
                        <td className="px-3 py-2.5 text-right">{comp.obiettivoPezzi != null ? Math.round(comp.obiettivoPezzi) : '—'}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{Math.round(fabbisogno) || '—'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={ordinato > 0 ? 'text-blue-700 font-medium' : 'text-gray-300'}>{ordinato || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">{comp.margineMedioEffettivo != null ? pct(comp.margineMedioEffettivo) : '—'}</td>
                        <td className="px-3 py-2.5 text-right">{comp.margineObiettivo != null ? fmt(comp.margineObiettivo, 0) + ' €' : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Small layout helpers ─────────────────────────────────────────────────────

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <div className="w-28 flex-shrink-0">{children}</div>
    </div>
  );
}

function RowComputed({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-right w-28 flex-shrink-0 ${highlight ? 'font-semibold text-primary' : 'text-gray-600'}`}>{value}</span>
    </div>
  );
}
