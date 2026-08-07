'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Building2, Users, LogIn, Monitor, Smartphone, Tablet,
  MailCheck, KeyRound, RefreshCw, Search, CheckSquare, Square,
  ChevronDown, ChevronUp, X, Send, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  stats: {
    totalOrgs: number;
    orgsWithAccess: number;
    orgsNeverAccessed: number;
    totalOperators: number;
    operatorsWithAccess: number;
    accessesToday: number;
    accesses7d: number;
    accesses30d: number;
  };
  dailyChart: { date: string; count: number }[];
  weeklyChart: { week: string; count: number }[];
  monthlyChart: { month: string; count: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  orgsAccessedList: {
    id: string; nome: string; operatoriAttivi: number;
    firstAccess: string | null; lastAccess: string | null;
    totalAccesses: number; dispositivoPrev: string; ordini: number;
  }[];
  orgsNeverList: {
    id: string; nome: string;
    operatori: { id: string; nome: string; cognome: string; email: string; attivo: boolean }[];
    operatoriCount: number;
    createdAt: string;
    giorniDaCreazione: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(parseISO(d), 'dd MMM yyyy', { locale: it });
}

function deviceIcon(d: string) {
  if (d === 'mobile') return <Smartphone size={13} className="text-blue-500" />;
  if (d === 'tablet') return <Tablet size={13} className="text-purple-500" />;
  return <Monitor size={13} className="text-gray-400" />;
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: '#3B82F6',
  tablet: '#8B5CF6',
  desktop: '#6B7280',
};

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-lg px-5 py-4 ${accent ? 'border-accent/40' : 'border-border'}`}>
      <p className="text-2xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-primary'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── ReminderModal ────────────────────────────────────────────────────────────

function ReminderModal({
  org,
  onClose,
  onSent,
}: {
  org: AnalyticsData['orgsNeverList'][0] | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  if (!org) return null;

  const attivi = org.operatori.filter(o => o.attivo);

  async function send() {
    setSending(true);
    try {
      const res = await fetch('/api/admin/analytics/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorIds: attivi.map(o => o.id), messaggioPersonalizzato: msg || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Email inviata a ${data.sent} operatore/i`);
      onSent();
    } catch { toast.error('Errore invio email'); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Invia promemoria — {org.nome}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1"><X size={16} /></button>
        </div>

        <div className="bg-cream rounded-lg p-3 space-y-1">
          <p className="text-2xs text-gray-400 uppercase tracking-wider mb-2">Destinatari ({attivi.length})</p>
          {attivi.map(op => (
            <div key={op.id} className="flex items-center gap-2 text-xs text-gray-700">
              <MailCheck size={12} className="text-accent flex-shrink-0" />
              <span>{op.nome} {op.cognome}</span>
              <span className="text-gray-400">— {op.email}</span>
            </div>
          ))}
          {attivi.length === 0 && <p className="text-xs text-gray-400 italic">Nessun operatore attivo</p>}
        </div>

        <div>
          <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">
            Messaggio personalizzato (opzionale)
          </label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={4}
            placeholder="Es: Sono disponibili le nuove collezioni SS27..."
            className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">
            Annulla
          </button>
          <button
            onClick={send}
            disabled={sending || attivi.length === 0}
            className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send size={12} />
            {sending ? 'Invio...' : `Invia a ${attivi.length} operatore/i`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BulkReminderModal ────────────────────────────────────────────────────────

function BulkReminderModal({
  selectedOrgIds,
  orgsNeverList,
  onClose,
  onSent,
}: {
  selectedOrgIds: Set<string>;
  orgsNeverList: AnalyticsData['orgsNeverList'];
  onClose: () => void;
  onSent: () => void;
}) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const selectedOrgs = orgsNeverList.filter(o => selectedOrgIds.has(o.id));
  const allOperatorIds = selectedOrgs.flatMap(o => o.operatori.filter(op => op.attivo).map(op => op.id));
  const recipientCount = allOperatorIds.length;

  async function send() {
    setSending(true);
    try {
      const res = await fetch('/api/admin/analytics/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorIds: allOperatorIds, messaggioPersonalizzato: msg || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Email inviata a ${data.sent} operatore/i`);
      onSent();
    } catch { toast.error('Errore invio email'); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">
            Promemoria massivo — {selectedOrgIds.size} organizzazioni
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1"><X size={16} /></button>
        </div>

        <div className="bg-cream rounded-lg px-3 py-2 text-xs text-gray-600">
          Verranno contattati <strong>{recipientCount}</strong> operatori attivi appartenenti alle{' '}
          {selectedOrgIds.size} organizzazioni selezionate.
        </div>

        <div>
          <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">
            Messaggio personalizzato (opzionale)
          </label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={4}
            placeholder="Es: Sono disponibili le nuove collezioni SS27..."
            className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">
            Annulla
          </button>
          <button
            onClick={send}
            disabled={sending || recipientCount === 0}
            className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send size={12} />
            {sending ? 'Invio...' : `Invia a ${recipientCount} operatore/i`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

function ResetPasswordModal({
  operator,
  onClose,
}: {
  operator: { id: string; nome: string; cognome: string; email: string } | null;
  onClose: () => void;
}) {
  const [result, setResult] = useState<{ password: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [showPwd, setShowPwd] = useState(false);

  if (!operator) return null;

  async function reset() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: operator!.id, sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setResult(data);
      toast.success('Password reimpostata');
    } catch { toast.error('Errore nel reset password'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Reset password — {operator.nome} {operator.cognome}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1"><X size={16} /></button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-gray-600">
              Verrà generata una nuova password per <strong>{operator.email}</strong>.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="accent-primary"
              />
              Invia email con nuove credenziali all'operatore
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">
                Annulla
              </button>
              <button
                onClick={reset}
                disabled={loading}
                className="flex-1 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <KeyRound size={12} />
                {loading ? 'Reset...' : 'Reimposta password'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-xs text-green-700 font-medium">Password reimpostata con successo</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm font-mono font-bold text-primary bg-white border border-border rounded px-3 py-2 tracking-widest">
                  {showPwd ? result.password : '••••••••'}
                </code>
                <button
                  onClick={() => setShowPwd(v => !v)}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Per: {result.email}</p>
              {sendEmail && <p className="text-xs text-green-600">Email con credenziali inviata.</p>}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs bg-primary text-white rounded hover:bg-primary/90"
            >
              Chiudi
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTabState] = useState<'panoramica' | 'acceduto' | 'mai'>(
    () => (searchParams.get('tab') as 'panoramica' | 'acceduto' | 'mai') ?? 'panoramica'
  );

  function setTab(next: 'panoramica' | 'acceduto' | 'mai') {
    setTabState(next);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }
  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('day');
  const [searchAcceduto, setSearchAcceduto] = useState('');
  const [searchMai, setSearchMai] = useState('');
  const [periodoAcceduto, setPeriodoAcceduto] = useState<'7d' | '30d' | 'all'>('all');
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [reminderOrg, setReminderOrg] = useState<AnalyticsData['orgsNeverList'][0] | null>(null);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [resetOp, setResetOp] = useState<{ id: string; nome: string; cognome: string; email: string } | null>(null);
  const [expandedNeverOrg, setExpandedNeverOrg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: () => fetch('/api/admin/analytics').then(r => r.json()),
    staleTime: 5 * 60_000,
  });

  // Filtered orgsAccessedList by period and search
  const orgsAccessedFiltered = useMemo(() => {
    if (!data) return [];
    const cutoff = periodoAcceduto === '7d'
      ? new Date(Date.now() - 7 * 86_400_000)
      : periodoAcceduto === '30d'
      ? new Date(Date.now() - 30 * 86_400_000)
      : null;
    return data.orgsAccessedList
      .filter(o => {
        if (cutoff && o.lastAccess && new Date(o.lastAccess) < cutoff) return false;
        if (searchAcceduto && !o.nome.toLowerCase().includes(searchAcceduto.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.lastAccess) return 1;
        if (!b.lastAccess) return -1;
        return new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime();
      });
  }, [data, periodoAcceduto, searchAcceduto]);

  const orgsNeverFiltered = useMemo(() => {
    if (!data) return [];
    return data.orgsNeverList.filter(o =>
      !searchMai || o.nome.toLowerCase().includes(searchMai.toLowerCase())
    );
  }, [data, searchMai]);

  function toggleSelectOrg(id: string) {
    setSelectedOrgIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectedOrgIds.size === orgsNeverFiltered.length) {
      setSelectedOrgIds(new Set());
    } else {
      setSelectedOrgIds(new Set(orgsNeverFiltered.map(o => o.id)));
    }
  }

  const deviceData = data
    ? [
        { name: 'Desktop', value: data.devices.desktop, color: DEVICE_COLORS.desktop },
        { name: 'Mobile', value: data.devices.mobile, color: DEVICE_COLORS.mobile },
        { name: 'Tablet', value: data.devices.tablet, color: DEVICE_COLORS.tablet },
      ].filter(d => d.value > 0)
    : [];

  const chartData = useMemo(() => {
    if (!data) return [];
    if (chartView === 'day') {
      return data.dailyChart.map(d => ({
        label: format(parseISO(d.date), 'd MMM', { locale: it }),
        value: d.count,
      }));
    }
    if (chartView === 'week') {
      return data.weeklyChart.map((d, i) => ({ label: `S${i + 1}`, value: d.count }));
    }
    return data.monthlyChart.map(d => ({
      label: format(parseISO(d.month + '-01'), 'MMM yy', { locale: it }),
      value: d.count,
    }));
  }, [data, chartView]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  const s = data?.stats;

  return (
    <>
      {reminderOrg && (
        <ReminderModal
          org={reminderOrg}
          onClose={() => setReminderOrg(null)}
          onSent={() => { setReminderOrg(null); refetch(); }}
        />
      )}
      {bulkReminderOpen && data && (
        <BulkReminderModal
          selectedOrgIds={selectedOrgIds}
          orgsNeverList={data.orgsNeverList}
          onClose={() => setBulkReminderOpen(false)}
          onSent={() => { setBulkReminderOpen(false); setSelectedOrgIds(new Set()); refetch(); }}
        />
      )}
      {resetOp && (
        <ResetPasswordModal operator={resetOp} onClose={() => setResetOp(null)} />
      )}

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-primary">Analytics accessi</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitoraggio attività clienti sulla piattaforma</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary border border-border rounded px-3 py-1.5 hover:bg-cream transition-colors"
          >
            <RefreshCw size={12} />Aggiorna
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {([
            { id: 'panoramica', label: 'Panoramica' },
            { id: 'acceduto', label: `Chi ha acceduto (${data?.orgsAccessedList.length ?? 0})` },
            { id: 'mai', label: `Chi non ha mai acceduto (${data?.orgsNeverList.length ?? 0})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB PANORAMICA ──────────────────────────────────────────────── */}
        {tab === 'panoramica' && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Organizzazioni totali" value={s?.totalOrgs ?? 0} />
              <StatCard
                label="Org. che hanno acceduto"
                value={s?.orgsWithAccess ?? 0}
                sub={s ? `${Math.round((s.orgsWithAccess / (s.totalOrgs || 1)) * 100)}% del totale` : undefined}
                accent
              />
              <StatCard label="Org. mai accedute" value={s?.orgsNeverAccessed ?? 0} />
              <StatCard label="Operatori totali" value={s?.totalOperators ?? 0} />
              <StatCard
                label="Operatori che hanno acceduto"
                value={s?.operatorsWithAccess ?? 0}
                sub={s ? `${Math.round((s.operatorsWithAccess / (s.totalOperators || 1)) * 100)}% del totale` : undefined}
                accent
              />
              <StatCard label="Accessi oggi" value={s?.accessesToday ?? 0} />
              <StatCard label="Accessi ultimi 7 giorni" value={s?.accesses7d ?? 0} />
              <StatCard label="Accessi ultimi 30 giorni" value={s?.accesses30d ?? 0} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar chart */}
              <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-primary">Accessi nel tempo</h2>
                  <div className="flex items-center bg-cream rounded border border-border overflow-hidden">
                    {(['day', 'week', 'month'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setChartView(v)}
                        className={`px-3 py-1 text-xs transition-colors ${chartView === v ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}
                      >
                        {v === 'day' ? 'Giorno' : v === 'week' ? 'Settimana' : 'Mese'}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={chartView === 'day' ? 8 : 18}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={chartView === 'day' ? 4 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DEDAD7' }}
                      formatter={(v) => [v, 'Accessi']}
                      labelFormatter={l => l}
                    />
                    <Bar dataKey="value" fill="#111827" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div className="bg-white border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-primary mb-4">Dispositivi utilizzati</h2>
                {deviceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-sm text-gray-300">
                    Nessun dato
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {deviceData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Legend
                        iconSize={10}
                        iconType="circle"
                        formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DEDAD7' }}
                        formatter={(v) => [v, 'accessi']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-2 space-y-1">
                  {deviceData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-medium text-primary">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CHI HA ACCEDUTO ─────────────────────────────────────────── */}
        {tab === 'acceduto' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-accent transition-colors w-72">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchAcceduto}
                  onChange={e => setSearchAcceduto(e.target.value)}
                  placeholder="Cerca organizzazione…"
                  className="flex-1 text-sm outline-none bg-transparent placeholder-gray-300"
                />
              </div>
              <div className="flex items-center bg-cream rounded border border-border overflow-hidden">
                {([
                  { v: 'all', l: 'Sempre' },
                  { v: '30d', l: 'Ultimi 30 gg' },
                  { v: '7d', l: 'Ultimi 7 gg' },
                ] as const).map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setPeriodoAcceduto(v)}
                    className={`px-3 py-1.5 text-xs transition-colors ${periodoAcceduto === v ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400">{orgsAccessedFiltered.length} organizzazioni</span>
            </div>

            {/* Table */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="table-luxury w-full">
                <thead>
                  <tr>
                    <th>Organizzazione</th>
                    <th>Op. attivi</th>
                    <th>Primo accesso</th>
                    <th>Ultimo accesso</th>
                    <th>Tot. accessi</th>
                    <th>Dispositivo</th>
                    <th>Ordini</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsAccessedFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-10 text-sm italic">
                        Nessun risultato
                      </td>
                    </tr>
                  ) : (
                    orgsAccessedFiltered.map(org => (
                      <tr key={org.id}>
                        <td className="font-medium text-primary">{org.nome}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-gray-300" />
                            {org.operatoriAttivi}
                          </div>
                        </td>
                        <td className="text-gray-500">{fmtDate(org.firstAccess)}</td>
                        <td className="text-gray-500">{fmtDate(org.lastAccess)}</td>
                        <td>
                          <span className="font-semibold text-primary">{org.totalAccesses}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 capitalize">
                            {deviceIcon(org.dispositivoPrev)}
                            <span className="text-gray-500 text-xs">{DEVICE_LABELS[org.dispositivoPrev] ?? org.dispositivoPrev}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-gray-500">{org.ordini}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB CHI NON HA MAI ACCEDUTO ─────────────────────────────────── */}
        {tab === 'mai' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-accent transition-colors w-72">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchMai}
                  onChange={e => setSearchMai(e.target.value)}
                  placeholder="Cerca organizzazione…"
                  className="flex-1 text-sm outline-none bg-transparent placeholder-gray-300"
                />
              </div>
              <span className="text-xs text-gray-400">{orgsNeverFiltered.length} organizzazioni</span>
              <div className="ml-auto flex items-center gap-2">
                {selectedOrgIds.size > 0 && (
                  <button
                    onClick={() => setBulkReminderOpen(true)}
                    className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
                  >
                    <Send size={12} />
                    Invia promemoria ({selectedOrgIds.size})
                  </button>
                )}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-border rounded px-3 py-1.5 hover:bg-cream transition-colors"
                >
                  {selectedOrgIds.size === orgsNeverFiltered.length && orgsNeverFiltered.length > 0
                    ? <CheckSquare size={13} />
                    : <Square size={13} />
                  }
                  {selectedOrgIds.size === orgsNeverFiltered.length && orgsNeverFiltered.length > 0
                    ? 'Deseleziona tutti'
                    : 'Seleziona tutti'
                  }
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="table-luxury w-full">
                <thead>
                  <tr>
                    <th className="w-8">
                      <button onClick={toggleSelectAll}>
                        {selectedOrgIds.size === orgsNeverFiltered.length && orgsNeverFiltered.length > 0
                          ? <CheckSquare size={14} className="text-primary" />
                          : <Square size={14} className="text-gray-300" />
                        }
                      </button>
                    </th>
                    <th>Organizzazione</th>
                    <th>Operatori</th>
                    <th>Data creazione</th>
                    <th>Giorni dalla creazione</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsNeverFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-10 text-sm italic">
                        {data?.orgsNeverList.length === 0
                          ? 'Tutte le organizzazioni hanno acceduto!'
                          : 'Nessun risultato'
                        }
                      </td>
                    </tr>
                  ) : (
                    orgsNeverFiltered.map(org => {
                      const isExpanded = expandedNeverOrg === org.id;
                      return (
                        <>
                          <tr key={org.id} className={selectedOrgIds.has(org.id) ? 'bg-cream/50' : ''}>
                            <td>
                              <button onClick={() => toggleSelectOrg(org.id)}>
                                {selectedOrgIds.has(org.id)
                                  ? <CheckSquare size={14} className="text-primary" />
                                  : <Square size={14} className="text-gray-300" />
                                }
                              </button>
                            </td>
                            <td>
                              <button
                                onClick={() => setExpandedNeverOrg(isExpanded ? null : org.id)}
                                className="flex items-center gap-1.5 font-medium text-primary hover:text-accent transition-colors"
                              >
                                {org.nome}
                                {isExpanded
                                  ? <ChevronUp size={12} className="text-gray-400" />
                                  : <ChevronDown size={12} className="text-gray-400" />
                                }
                              </button>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <Users size={12} className="text-gray-300" />
                                {org.operatoriCount}
                              </div>
                            </td>
                            <td className="text-gray-500">{fmtDate(org.createdAt)}</td>
                            <td>
                              <span className={`font-medium ${org.giorniDaCreazione > 30 ? 'text-red-500' : 'text-gray-600'}`}>
                                {org.giorniDaCreazione} gg
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setReminderOrg(org)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary px-2 py-1 rounded hover:bg-cream transition-colors"
                                  title="Invia promemoria"
                                >
                                  <MailCheck size={12} />Promemoria
                                </button>
                                {org.operatori.filter(o => o.attivo).map(op => (
                                  <button
                                    key={op.id}
                                    onClick={() => setResetOp(op)}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                    title={`Reset password — ${op.nome} ${op.cognome}`}
                                  >
                                    <KeyRound size={12} />
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${org.id}-detail`} className="bg-cream/30">
                              <td colSpan={6} className="px-8 py-3">
                                <div className="space-y-1">
                                  {org.operatori.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Nessun operatore</p>
                                  ) : org.operatori.map(op => (
                                    <div key={op.id} className="flex items-center gap-3 text-xs">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${op.attivo ? 'bg-green-400' : 'bg-gray-300'}`} />
                                      <span className="text-gray-700 font-medium">{op.nome} {op.cognome}</span>
                                      <span className="text-gray-400">{op.email}</span>
                                      {!op.attivo && <span className="text-2xs text-gray-400 italic">inattivo</span>}
                                      {op.attivo && (
                                        <button
                                          onClick={() => setResetOp(op)}
                                          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                                        >
                                          <KeyRound size={11} />Reset password
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
