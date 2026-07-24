'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  order: Order;
  onExported?: () => void;
}

function download(data: string | ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function markExported(orderId: string) {
  await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ESPORTATO' }),
  });
}

const DEMETRA_STEPS = [
  { key: 1, text: <>Vai in <strong>Proposte di prenotazione › Proposte attive › Nuova prenotazione</strong>, compila i campi e clicca <strong>Crea prenotazione</strong> (Cliente: <strong>Prenotazioni dirette</strong>).</> },
  { key: 2, text: <>Inserisci la destinazione e gli altri campi, poi clicca il pulsante blu <strong>Carica da file</strong>.</> },
  { key: 3, text: <>Clicca il pulsante grigio <strong>Scegli file</strong> e seleziona il CSV o XLSX scaricato dall&apos;app.</> },
  { key: 4, text: <>Clicca il pulsante verde <strong>Carica da file</strong>, poi in fondo premi <strong>Inserisci</strong>.</> },
  { key: 5, text: <>Clicca <strong>Conferma e invia</strong> per confermare.</> },
];

export default function OrderDemetraExport({ order, onExported }: Props) {
  const queryClient = useQueryClient();
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [helpPos, setHelpPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shortId = order.orderNumber ?? order.id.slice(0, 8).toUpperCase();
  const items = order.items ?? [];
  const tranchePresenti = [...new Set(
    items.map(it => (it.product as any)?.tranche as string | undefined).filter((t): t is string => Boolean(t))
  )];
  const conferentiPresenti = [...new Set(
    items.map(it => (it.product as any)?.conferente as string | undefined).filter((c): c is string => Boolean(c))
  )];

  useEffect(() => {
    if (!pos) return;
    function onMouseDown() { setPos(null); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pos]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (pos) { setPos(null); return; }
    setHelpPos(null);
    const rect = btnRef.current!.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    if (rect.bottom > window.innerHeight / 2) {
      setPos({ bottom: window.innerHeight - rect.top + 4, right });
    } else {
      setPos({ top: rect.bottom + 4, right });
    }
  }

  function showHelp() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    if (rect.bottom > window.innerHeight / 2) {
      setHelpPos({ bottom: window.innerHeight - rect.top + 6, right });
    } else {
      setHelpPos({ top: rect.bottom + 6, right });
    }
  }

  function scheduleHideHelp() {
    hideTimer.current = setTimeout(() => setHelpPos(null), 120);
  }

  function cancelHideHelp() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  function itemCode(it: typeof items[number]) {
    if (!it.taglia) return it.product?.code ?? '';
    const sv = (it.product as any)?.sizeVariants as { taglia: string; codice: string }[] | null | undefined;
    const match = sv?.find((v) => v.taglia === it.taglia);
    return match?.codice ?? `${it.product?.code ?? ''}${it.taglia}`;
  }

  async function handleCSV(e: React.MouseEvent, filter?: { field: 'tranche' | 'conferente'; value: string }) {
    e.stopPropagation();
    setPos(null);
    const filtered = filter
      ? items.filter(it => (it.product as any)?.[filter.field] === filter.value)
      : items;
    const lines = [
      'Codice;Quantità',
      ...filtered.map((it) => `${itemCode(it)};${it.quantity}`),
    ];
    const filename = filter
      ? `Demetra-${shortId}-${filter.value}.csv`
      : `Demetra-${shortId}-completo.csv`;
    // UTF-8 BOM so Italian Excel opens it correctly
    download('﻿' + lines.join('\r\n'), filename, 'text/csv;charset=utf-8;');
    toast.success(`CSV ${filter ? filter.value : 'completo'} pronto`);
    await markExported(order.id);
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    onExported?.();
  }

  async function handleXLSX(e: React.MouseEvent) {
    e.stopPropagation();
    setPos(null);
    try {
      const XLSX = await import('xlsx');
      const rows = [
        ['Codice', 'Quantità'],
        ...items.map((it) => [itemCode(it), it.quantity]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 20 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Demetra');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      download(
        buf,
        `ordine-demetra-${shortId}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      toast.success('Excel Demetra pronto');
      await markExported(order.id);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      onExported?.();
    } catch {
      toast.error('Errore nella generazione');
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        onMouseEnter={showHelp}
        onMouseLeave={scheduleHideHelp}
        className="flex items-center gap-1.5 px-3 py-2 text-xs border border-black rounded hover:bg-gray-50 transition-colors text-black flex-shrink-0"
      >
        <Database size={11} />
        <span className="hidden sm:inline">Esporta in Demetra</span>
        <ChevronDown
          size={9}
          className={`transition-transform duration-150 ${pos ? (pos.bottom != null ? '' : 'rotate-180') : ''}`}
        />
      </button>

      {/* Export dropdown portal */}
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, right: pos.right, zIndex: 9999 }}
            className="bg-white border border-border rounded shadow-luxury overflow-hidden min-w-[160px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handleCSV(e)}
              className="flex items-center w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-cream transition-colors"
            >
              {tranchePresenti.length <= 1 && conferentiPresenti.length <= 1 ? 'CSV' : 'CSV completo'}
            </button>
            {tranchePresenti.length > 1 && tranchePresenti.map((tr) => (
              <button
                key={tr}
                onClick={(e) => handleCSV(e, { field: 'tranche', value: tr })}
                className="flex items-center w-full text-left px-4 py-2.5 text-xs text-gray-600 hover:bg-cream transition-colors"
              >
                CSV tranche {tr}
              </button>
            ))}
            {conferentiPresenti.length > 1 && conferentiPresenti.map((conf) => (
              <button
                key={conf}
                onClick={(e) => handleCSV(e, { field: 'conferente', value: conf })}
                className="flex items-center w-full text-left px-4 py-2.5 text-xs text-gray-600 hover:bg-cream transition-colors"
              >
                CSV {conf}
              </button>
            ))}
            <div className="border-t border-border/50" />
            <button
              onClick={handleXLSX}
              className="flex items-center w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-cream transition-colors"
            >
              Excel (.xlsx)
            </button>
          </div>,
          document.body
        )}

      {/* Help tooltip on hover — compact, non-interactive */}
      {helpPos && !pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: helpPos.top, bottom: helpPos.bottom, right: helpPos.right, zIndex: 9998 }}
            className="bg-gray-900 text-white rounded-lg shadow-xl p-3 w-56"
            onMouseEnter={cancelHideHelp}
            onMouseLeave={scheduleHideHelp}
          >
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Come importare in Demetra</p>
            <ol className="space-y-1.5">
              {DEMETRA_STEPS.map(({ key, text }) => (
                <li key={key} className="flex gap-2 text-[10px] text-gray-300 leading-snug">
                  <span className="flex-shrink-0 text-gray-500 font-semibold w-3">{key}.</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>,
          document.body
        )}
    </>
  );
}
