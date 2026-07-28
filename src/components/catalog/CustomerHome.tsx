'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Globe, Mic, ChevronRight, Clock, Lock, X, FlaskConical } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useBranchStore, type ActiveBranch } from '@/store/branchStore';

const SOCIAL_SVGS: Record<string, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  ),
};

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
}

type NotificationItem = {
  id: string;
  titolo: string;
  testo: string;
  icona: string;
  coloreSfondo: string;
  coloreTesto: string;
  linkUrl?: string | null;
  linkTesto?: string | null;
  letta: boolean;
};

function NotificationPopup({ notification, onClose }: { notification: NotificationItem; onClose: () => void }) {
  const qc = useQueryClient();
  async function handleClose() {
    onClose();
    try {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
      qc.setQueryData<NotificationItem[]>(['notifications'], (prev) =>
        prev ? prev.map((n) => (n.id === notification.id ? { ...n, letta: true } : n)) : []
      );
    } catch {}
  }

  return (
    <div
      className="fixed left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-xl shadow-xl overflow-hidden"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)', backgroundColor: notification.coloreSfondo, color: notification.coloreTesto }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {notification.icona && <span className="text-2xl flex-shrink-0 leading-none">{notification.icona}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{notification.titolo}</p>
            {notification.testo && <p className="text-sm mt-1 leading-relaxed opacity-90">{notification.testo}</p>}
            {notification.linkUrl && (
              <a href={notification.linkUrl} onClick={handleClose} className="inline-block mt-2 text-sm font-medium underline underline-offset-2" style={{ color: notification.coloreTesto }}>
                {notification.linkTesto || 'Scopri di più'}
              </a>
            )}
          </div>
          <button onClick={handleClose} className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1 opacity-60 hover:opacity-100 transition-opacity" style={{ color: notification.coloreTesto }}>
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerHome({ canSeeModa }: { canSeeModa: boolean }) {
  const { social: ss, collections, home } = useSettings();
  const searchParams = useSearchParams();
  const devPreview = searchParams.get('devPreview') === '1';

  const [popupDismissed, setPopupDismissed] = useState(false);

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const popupNotification = (() => {
    if (popupDismissed || !notifications?.length) return null;
    const first = notifications.find((n) => !n.letta);
    if (!first) return null;
    if (typeof window !== 'undefined' && sessionStorage.getItem(`notif-popup-${first.id}`) === '1') return null;
    return first;
  })();

  function handlePopupClose() {
    setPopupDismissed(true);
    if (popupNotification) sessionStorage.setItem(`notif-popup-${popupNotification.id}`, '1');
  }

  const lista = (collections.lista ?? []).filter((c) => c.visibile !== false);

  type ColInfo = typeof lista[number];

  function hrefForId(id: string) { return id === 'moda' ? '/moda' : `/${id}`; }
  function branchForId(id: string): ActiveBranch {
    if (id === 'moda') return 'moda';
    if (id === 'collezione-home') return 'collezione-home';
    return 'casa';
  }

  function CollectionCard({ info, compact = false }: { info: ColInfo; compact?: boolean }) {
    const { setBranch } = useBranchStore();
    const deadline = info.dataScadenza;
    const expired = deadline ? new Date(deadline) < new Date() : false;
    const filtro = info.fotoFiltro ?? 'auto';
    const grayscale = filtro === 'biancoNero' || (filtro === 'auto' && expired);
    return (
      <Link
        href={hrefForId(info.id)}
        onClick={() => setBranch(branchForId(info.id))}
        className="block bg-black rounded-2xl overflow-hidden hover:opacity-90 transition-opacity duration-200 group"
      >
        {info.fotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.fotoUrl}
            alt={info.titolo}
            className={`w-full object-cover transition-all ${compact ? 'h-[40vh]' : 'h-[58vh]'} ${grayscale ? 'grayscale' : ''}`}
          />
        )}
        <div className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="text-2xs tracking-[0.2em] uppercase text-white/50">Collezione</p>
            <h2 className="font-display text-3xl font-light tracking-widest text-white mt-0.5">{info.titolo}</h2>
            {info.sottotitolo && <p className="text-xs text-white/60 mt-0.5">{info.sottotitolo}</p>}
            {expired ? (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 text-white/70 text-2xs tracking-widest uppercase font-medium">
                <Lock size={9} />
                Prenotazione chiusa
              </div>
            ) : deadline ? (
              <div className="mt-2 flex items-center gap-1.5 text-2xs text-white/60">
                <Clock size={10} />
                {`Prenotazioni aperte fino al ${formatDeadline(deadline)}`}
              </div>
            ) : null}
          </div>
          <ChevronRight size={20} className="text-white/30 group-hover:text-white transition-colors flex-shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-4">

        {/* Dev preview banner */}
        {devPreview && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
            <FlaskConical size={13} />
            Anteprima in sviluppo — così apparirà la home quando MODA sarà pubblica
          </div>
        )}

        {/* Collection cards */}
        {(devPreview || canSeeModa) ? (() => {
          const layout = home.layoutCard ?? 'griglia';
          if (lista.length === 0) return null;
          if (layout === 'colonna') return (
            <div className="flex flex-col gap-4">
              {lista.map((c) => <CollectionCard key={c.id} info={c} />)}
            </div>
          );
          if (layout === 'grande-prima') return (
            <div className="flex flex-col gap-4">
              {lista.map((c, i) => <CollectionCard key={c.id} info={c} compact={i > 0} />)}
            </div>
          );
          // default: griglia
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lista.map((c) => <CollectionCard key={c.id} info={c} compact />)}
            </div>
          );
        })() : (
          lista.length > 0 && <CollectionCard info={lista.find(c => c.id === 'casa') ?? lista[0]} />
        )}

        {/* Social */}
        <div className="bg-white border border-border rounded-2xl px-5 py-4">
          <div className="flex items-center justify-center gap-5 flex-wrap">
            {ss.ordine
              .filter((key) => ss.items[key]?.visibile)
              .map((key) => {
                const url = ss.items[key].url;
                if (key === 'website') {
                  let domain = url;
                  try { domain = new URL(url).hostname.replace('www.', ''); } catch {}
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors whitespace-nowrap">
                      <Globe size={16} />{domain}
                    </a>
                  );
                }
                if (key === 'podcast') {
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
                      <Mic size={16} />Podcast MATERIA
                    </a>
                  );
                }
                const svg = SOCIAL_SVGS[key];
                if (!svg) return null;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                     className="text-black hover:text-gray-600 transition-colors" aria-label={key}>
                    {svg}
                  </a>
                );
              })}
          </div>
        </div>

      </div>

      {popupNotification && (
        <NotificationPopup notification={popupNotification} onClose={handlePopupClose} />
      )}
    </div>
  );
}
