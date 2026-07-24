'use client';

import { useState, useMemo, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Loader2, Trash2, Plus, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DisplayGroup, DisplayGroupSchedule, SpazioEspositivo } from '@/types';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const WEEKS_COUNT = 52;
const COL_W = 30;   // px per colonna settimana
const ROW_H = 40;   // px altezza riga spazio
const NAME_W = 120; // px colonna nomi

// Prima settimana di ogni mese (0-based)
const MONTH_STARTS = [1, 5, 9, 14, 18, 22, 27, 31, 36, 40, 44, 48];

// Raggruppa mesi → settimane per intestazione
const MONTH_GROUPS = MONTH_STARTS.map((start, i) => ({
  month: i,
  start,
  end: i < MONTH_STARTS.length - 1 ? MONTH_STARTS[i + 1] - 1 : WEEKS_COUNT,
  span: (i < MONTH_STARTS.length - 1 ? MONTH_STARTS[i + 1] - 1 : WEEKS_COUNT) - start + 1,
}));

const FALLBACK_COLOR = '#D4C4B0';
const ALL_WEEKS = Array.from({ length: WEEKS_COUNT }, (_, i) => i + 1);

function getTextColor(bgHex: string): string {
  if (!bgHex || bgHex.length < 7) return '#111827';
  const r = parseInt(bgHex.slice(1, 3), 16) / 255;
  const g = parseInt(bgHex.slice(3, 5), 16) / 255;
  const b = parseInt(bgHex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#111827' : '#FFFFFF';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarioEsposizioneProps { orderId: string; }

interface PopoverState {
  type: 'empty' | 'schedule';
  spazioId: string;
  spazioNome: string;
  week: number;
  schedule?: DisplayGroupSchedule;
}

// ─── CalendarioEsposizione ────────────────────────────────────────────────────

export default function CalendarioEsposizione({ orderId }: CalendarioEsposizioneProps) {
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [editingSpazioId, setEditingSpazioId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [addingSpazio, setAddingSpazio] = useState(false);
  const [newSpazioName, setNewSpazioName] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: groupsData } = useQuery<{ groups: DisplayGroup[] }>({
    queryKey: ['display-groups', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups`).then(r => r.json()),
    staleTime: 10_000,
  });

  const { data: scheduleData, refetch: refetchSchedules } = useQuery<{ schedules: DisplayGroupSchedule[] }>({
    queryKey: ['display-group-schedules', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`).then(r => r.json()),
    staleTime: 5_000,
  });

  const { data: spaziData, refetch: refetchSpazi } = useQuery<{ spazi: SpazioEspositivo[] }>({
    queryKey: ['spazi-espositivi'],
    queryFn: () => fetch('/api/catalog/spazi-espositivi').then(r => r.json()),
    staleTime: 30_000,
  });

  const groups = groupsData?.groups ?? [];
  const allSchedules = scheduleData?.schedules ?? [];
  const spazi = spaziData?.spazi ?? [];


  // ─── Spazi CRUD ───────────────────────────────────────────────────────────

  async function addSpazio() {
    if (!newSpazioName.trim()) return;
    try {
      const res = await fetch('/api/catalog/spazi-espositivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newSpazioName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewSpazioName('');
      setAddingSpazio(false);
      refetchSpazi();
    } catch { toast.error('Errore nella creazione'); }
  }

  async function renameSpazio(id: string, nome: string) {
    if (!nome.trim()) return;
    try {
      await fetch(`/api/catalog/spazi-espositivi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      setEditingSpazioId(null);
      refetchSpazi();
    } catch { toast.error('Errore nel rinomina'); }
  }

  async function deleteSpazio(id: string) {
    const hasSchedules = allSchedules.some(s => s.spazioId === id);
    const msg = hasSchedules
      ? 'Questo spazio ha pianificazioni associate. Eliminarlo rimuoverà anche le pianificazioni. Continuare?'
      : 'Eliminare questo spazio?';
    if (!confirm(msg)) return;
    try {
      await fetch(`/api/catalog/spazi-espositivi/${id}`, { method: 'DELETE' });
      refetchSpazi();
      refetchSchedules();
    } catch { toast.error('Errore nella cancellazione'); }
  }

  // ─── Schedule CRUD ────────────────────────────────────────────────────────

  async function createSchedule(spazioId: string, groupId: string, settimanaIn: number, settimanaFn: number, nota: string) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, spazioId, anno, settimanaIn, settimanaFn: Math.max(settimanaIn, settimanaFn), nota: nota || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pianificazione aggiunta');
      refetchSchedules();
    } catch { toast.error('Errore nella creazione'); }
    setPopover(null);
  }

  async function updateSchedule(scheduleId: string, data: { settimanaIn?: number; settimanaFn?: number; nota?: string | null }) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      refetchSchedules();
    } catch { toast.error('Errore nel salvataggio'); }
    setPopover(null);
  }

  async function deleteSchedule(scheduleId: string) {
    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, { method: 'DELETE' });
      toast.success('Pianificazione rimossa');
      refetchSchedules();
    } catch { toast.error('Errore nella cancellazione'); }
    setPopover(null);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getScheduleForCell(spazioId: string, week: number): DisplayGroupSchedule | null {
    return allSchedules.find(s =>
      s.spazioId === spazioId && s.anno === anno && week >= s.settimanaIn && week <= s.settimanaFn
    ) ?? null;
  }

  function groupColor(groupId: string): string {
    return groups.find(g => g.id === groupId)?.coloreTag ?? FALLBACK_COLOR;
  }

  function groupName(groupId: string): string {
    return groups.find(g => g.id === groupId)?.nome ?? '';
  }

  function handleCellClick(_e: React.MouseEvent, spazioId: string, spazioNome: string, week: number) {
    const schedule = getScheduleForCell(spazioId, week);
    setPopover({
      type: schedule ? 'schedule' : 'empty',
      spazioId, spazioNome, week,
      schedule: schedule ?? undefined,
    });
  }

  // ─── Stats legenda ────────────────────────────────────────────────────────

  const groupStats = useMemo(() => groups.map(g => {
    const slots = new Set<string>();
    allSchedules.filter(s => s.groupId === g.id && s.anno === anno).forEach(s => {
      for (let w = s.settimanaIn; w <= s.settimanaFn; w++) slots.add(`${s.spazioId}-${w}`);
    });
    return { group: g, slots: slots.size };
  }), [groups, allSchedules, anno]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 py-6 pb-32 lg:pb-24">

      {/* Anno selector */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-semibold text-primary flex-1">Calendario Esposizione</h2>
        <div className="flex items-center gap-2 bg-cream border border-border rounded px-3 py-1.5">
          <button onClick={() => setAnno(y => y - 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-primary w-10 text-center">{anno}</span>
          <button onClick={() => setAnno(y => y + 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          Nessun gruppo espositivo. Creane uno nella vista Mondi Espositivi.
        </p>
      ) : (
        /* Tabella con scroll orizzontale */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: NAME_W + WEEKS_COUNT * COL_W }}>
            <thead>
              {/* Riga 1: etichette mese */}
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 20, background: 'white',
                  width: NAME_W, minWidth: NAME_W,
                  borderBottom: '1px solid #E8DDD0',
                }} />
                {MONTH_GROUPS.map(({ month, span }) => (
                  <th
                    key={month}
                    colSpan={span}
                    style={{
                      textAlign: 'center',
                      fontSize: 11, fontWeight: 700, color: '#C17A5A',
                      padding: '4px 0',
                      borderBottom: '1px solid #E8DDD0',
                      borderLeft: '1px solid #E8DDD0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {MONTHS[month]}
                  </th>
                ))}
              </tr>
              {/* Riga 2: S1...S52 */}
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 20, background: 'white',
                  borderBottom: '2px solid #E8DDD0',
                }} />
                {ALL_WEEKS.map(w => (
                  <th
                    key={w}
                    style={{
                      width: COL_W, minWidth: COL_W, maxWidth: COL_W,
                      fontSize: 10, fontWeight: 400, color: '#9CA3AF',
                      textAlign: 'center',
                      padding: '3px 0 4px',
                      borderBottom: '2px solid #E8DDD0',
                      borderLeft: MONTH_STARTS.includes(w) ? '1px solid #E8DDD0' : '1px solid #F3F4F6',
                    }}
                  >
                    {w}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {spazi.map(spazio => (
                <tr key={spazio.id} style={{ height: ROW_H }}>
                  {/* Nome spazio (sticky) */}
                  <td
                    style={{
                      position: 'sticky', left: 0, zIndex: 10, background: 'white',
                      width: NAME_W, minWidth: NAME_W,
                      borderBottom: '1px solid #F3F4F6',
                      borderRight: '1px solid #E8DDD0',
                      padding: '0 8px',
                    }}
                  >
                    {editingSpazioId === spazio.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingNome}
                          onChange={e => setEditingNome(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameSpazio(spazio.id, editingNome);
                            if (e.key === 'Escape') setEditingSpazioId(null);
                          }}
                          style={{ fontSize: 12, width: '100%', border: '1px solid #E8DDD0', borderRadius: 4, padding: '2px 6px' }}
                        />
                        <button onClick={() => renameSpazio(spazio.id, editingNome)} className="text-[#8FAF8F] flex-shrink-0">
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/name overflow-hidden">
                        <span
                          style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={spazio.nome}
                        >
                          {spazio.nome}
                        </span>
                        <button
                          onClick={() => { setEditingSpazioId(spazio.id); setEditingNome(spazio.nome); }}
                          className="opacity-0 group-hover/name:opacity-100 transition-opacity text-gray-400 hover:text-primary flex-shrink-0"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => deleteSpazio(spazio.id)}
                          className="opacity-0 group-hover/name:opacity-100 transition-opacity text-gray-400 hover:text-[#C17A5A] flex-shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Celle settimane */}
                  {ALL_WEEKS.map(w => {
                    const sched = getScheduleForCell(spazio.id, w);
                    const color = sched ? groupColor(sched.groupId) : null;
                    const isFirst = !!sched && w === sched.settimanaIn;
                    const isLast = !!sched && w === sched.settimanaFn;
                    const isMonthBound = MONTH_STARTS.includes(w);
                    const name = sched ? groupName(sched.groupId) : '';
                    const textCol = color ? getTextColor(color) : '#111827';

                    return (
                      <td
                        key={w}
                        onClick={e => handleCellClick(e, spazio.id, spazio.nome, w)}
                        title={name || undefined}
                        style={{
                          width: COL_W, minWidth: COL_W, maxWidth: COL_W,
                          height: ROW_H,
                          padding: 0,
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F3F4F6',
                          borderLeft: isMonthBound ? '1px solid #E8DDD0' : '1px solid #F9F9F9',
                        }}
                        className={!color ? 'hover:bg-[#F5F0E8]' : 'hover:opacity-90'}
                      >
                        {color && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 4, bottom: 4,
                              left: isFirst ? 2 : 0,
                              right: isLast ? 2 : 0,
                              backgroundColor: color,
                              borderTopLeftRadius: isFirst ? 4 : 0,
                              borderBottomLeftRadius: isFirst ? 4 : 0,
                              borderTopRightRadius: isLast ? 4 : 0,
                              borderBottomRightRadius: isLast ? 4 : 0,
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: isFirst ? 5 : 0,
                              overflow: 'hidden',
                            }}
                          >
                            {isFirst && (
                              <span style={{
                                fontSize: 10, fontWeight: 500,
                                color: textCol,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1,
                              }}>
                                {name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Riga "+ Aggiungi spazio" */}
              <tr style={{ height: 40 }}>
                <td
                  style={{
                    position: 'sticky', left: 0, zIndex: 10, background: 'white',
                    width: NAME_W, minWidth: NAME_W,
                    borderTop: '1px dashed #E8DDD0',
                    borderRight: '1px solid #E8DDD0',
                    padding: '0 8px',
                  }}
                >
                  {addingSpazio ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={newSpazioName}
                        placeholder="Nome spazio…"
                        onChange={e => setNewSpazioName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') addSpazio();
                          if (e.key === 'Escape') { setAddingSpazio(false); setNewSpazioName(''); }
                        }}
                        style={{ fontSize: 12, width: '100%', border: '1px solid #E8DDD0', borderRadius: 4, padding: '2px 6px' }}
                      />
                      <button onClick={addSpazio} className="text-[#8FAF8F] flex-shrink-0"><Check size={13} /></button>
                      <button onClick={() => { setAddingSpazio(false); setNewSpazioName(''); }} className="text-gray-400 flex-shrink-0"><X size={13} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSpazio(true)}
                      className="flex items-center gap-1 transition-colors"
                      style={{ fontSize: 13, color: '#9CA3AF' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                    >
                      <Plus size={13} />
                      Aggiungi spazio
                    </button>
                  )}
                </td>
                {ALL_WEEKS.map(w => (
                  <td key={w} style={{ borderTop: '1px dashed #E8DDD0', borderLeft: MONTH_STARTS.includes(w) ? '1px solid #E8DDD0' : undefined }} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      {groups.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Gruppi</p>
          <div className="flex flex-wrap gap-3">
            {groupStats.map(({ group, slots }) => (
              <div key={group.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: group.coloreTag || FALLBACK_COLOR }} />
                <span className="text-xs text-gray-600">{group.nome}</span>
                {slots > 0 && <span className="text-xs text-gray-400">({slots} celle)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <SchedulePopover
          popover={popover}
          groups={groups}
          anno={anno}
          onClose={() => setPopover(null)}
          onCreate={createSchedule}
          onSave={(data) => { if (popover.schedule) updateSchedule(popover.schedule.id, data); }}
          onDelete={() => { if (popover.schedule) deleteSchedule(popover.schedule.id); }}
          groupColor={groupColor}
          groupName={groupName}
        />
      )}
    </div>
  );
}

// ─── ScheduleModal ────────────────────────────────────────────────────────────

function SchedulePopover({
  popover, groups, onClose, onCreate, onSave, onDelete, groupColor, groupName,
}: {
  popover: PopoverState;
  groups: DisplayGroup[];
  anno: number;
  onClose: () => void;
  onCreate: (spazioId: string, groupId: string, sIn: number, sFn: number, nota: string) => void;
  onSave: (data: { settimanaIn?: number; settimanaFn?: number; nota?: string | null }) => void;
  onDelete: () => void;
  groupColor: (id: string) => string;
  groupName: (id: string) => string;
}) {
  const isNew = popover.type === 'empty';
  const [selectedGroupId, setSelectedGroupId] = useState(popover.schedule?.groupId ?? groups[0]?.id ?? '');
  const [settimanaIn, setSettimanaIn] = useState(popover.schedule?.settimanaIn ?? popover.week);
  const [settimanaFn, setSettimanaFn] = useState(popover.schedule?.settimanaFn ?? popover.week);
  const [nota, setNota] = useState(popover.schedule?.nota ?? '');
  const [saving, setSaving] = useState(false);

  // Blocca scroll del body
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  // Chiudi con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSubmit() {
    setSaving(true);
    const fn = Math.max(settimanaIn, settimanaFn);
    if (isNew) {
      await onCreate(popover.spazioId, selectedGroupId, settimanaIn, fn, nota);
    } else {
      onSave({ settimanaIn, settimanaFn: fn, nota: nota || null });
    }
    setSaving(false);
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      {/* Modal — bottom sheet su mobile, centrato su desktop */}
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (solo mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-3 gap-2 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary leading-tight">
              {isNew ? `Assegna a ${popover.spazioNome}` : 'Modifica pianificazione'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Settimana S{popover.week}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-0.5 flex-shrink-0 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 overflow-y-auto flex-1 space-y-4 pb-2">
          {/* Selezione gruppo (solo nuova pianificazione) */}
          {isNew && (
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-2">Gruppo espositivo</label>
              {groups.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nessun gruppo. Creane uno nella vista Esposizione.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto border border-border rounded-lg">
                  {groups.map(g => {
                    const col = groupColor(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedGroupId === g.id ? 'bg-cream' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
                        <span className="text-xs text-primary flex-1 truncate">{g.nome}</span>
                        {selectedGroupId === g.id && <Check size={11} className="text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Gruppo selezionato (modifica) */}
          {!isNew && popover.schedule && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-cream">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: groupColor(popover.schedule.groupId) }} />
              <span className="text-xs font-semibold text-primary">{groupName(popover.schedule.groupId)}</span>
            </div>
          )}

          {/* Range settimane */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Da settimana</label>
              <input
                type="number" min={1} max={52}
                value={settimanaIn}
                onChange={e => setSettimanaIn(Number(e.target.value))}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">A settimana</label>
              <input
                type="number" min={1} max={52}
                value={settimanaFn}
                onChange={e => setSettimanaFn(Number(e.target.value))}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Nota (opzionale)</label>
            <input
              type="text"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Es. campagna estiva…"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Sticky action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-border px-6 py-4 flex-shrink-0">
          {isNew ? (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs border border-border rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !selectedGroupId}
                className="flex-1 py-2.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Conferma
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Salva
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 text-xs border rounded-lg transition-colors"
                style={{ borderColor: '#C17A5A', color: '#C17A5A' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FDF5F0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                Rimuovi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
