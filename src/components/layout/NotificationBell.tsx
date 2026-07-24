'use client';

import { useState, useRef, useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Bell, BellOff, Check, Mail, MailX, Settings, X } from 'lucide-react';

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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const [showSettings, setShowSettings] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === 'CUSTOMER';

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  useEffect(() => {
    if (!isCustomer || !open || !showSettings) return;
    fetch('/api/customer/notification-preferences').then(r => r.json()).then(d => setEmailEnabled(d.notificationsEnabled ?? true)).catch(() => {});
    fetch('/api/push/subscribe').then(r => r.json()).then(d => setPushSubscribed(d.subscribed ?? false)).catch(() => {});
  }, [isCustomer, open, showSettings]);

  async function toggleEmail() {
    setSettingsBusy(true);
    try {
      await fetch('/api/customer/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: !emailEnabled }),
      });
      setEmailEnabled((v) => !v);
    } finally {
      setSettingsBusy(false);
    }
  }

  async function togglePush() {
    setSettingsBusy(true);
    try {
      if (pushSubscribed) {
        await fetch('/api/push/subscribe', { method: 'DELETE' });
        setPushSubscribed(false);
      } else {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const vapidRes = await fetch('/api/push/vapid-key');
        const { key } = await vapidRes.json();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
        });
        const json = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
        });
        setPushSubscribed(true);
      }
    } catch (e) {
      console.error('[push] Toggle error:', e);
    } finally {
      setSettingsBusy(false);
    }
  }

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const unread = notifications.filter((n) => !n.letta);
  const read = notifications.filter((n) => n.letta);
  const unreadCount = unread.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [open]);

  // Reset to unread tab when closing
  useEffect(() => {
    if (!open) {
      setShowSettings(false);
    }
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    qc.setQueryData<NotificationItem[]>(['notifications'], (prev) =>
      prev ? prev.map((n) => (n.id === id ? { ...n, letta: true } : n)) : []
    );
  }

  async function markAllRead() {
    await Promise.all(
      unread.map((n) => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
    );
    qc.setQueryData<NotificationItem[]>(['notifications'], (prev) =>
      prev ? prev.map((n) => ({ ...n, letta: true })) : []
    );
  }

  const displayed = activeTab === 'unread' ? unread : read;

  return (
    <div className="relative group">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-gray-400 hover:text-primary transition-colors"
        aria-label="Notifiche"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-[4px] -right-[6px] bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
        Notifiche
      </span>

      {open && (
        <>
          {/* Backdrop — mobile only */}
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="
              fixed left-4 right-4 top-below-header z-50
              md:absolute md:left-auto md:right-0 md:top-8 md:w-[380px]
              bg-white rounded-xl shadow-2xl border border-border
              max-h-[70vh] md:max-h-[80vh] overflow-hidden flex flex-col
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">Notifiche</span>
                {unreadCount > 0 && (
                  <span className="text-2xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!showSettings && activeTab === 'unread' && unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    Segna tutte
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  aria-label="Chiudi"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs — hidden when settings are open */}
            {!showSettings && (
              <div className="flex border-b border-border flex-shrink-0">
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'unread'
                      ? 'text-primary border-primary'
                      : 'text-gray-400 border-transparent hover:text-primary'
                  }`}
                >
                  Da leggere{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
                <button
                  onClick={() => setActiveTab('read')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'read'
                      ? 'text-primary border-primary'
                      : 'text-gray-400 border-transparent hover:text-primary'
                  }`}
                >
                  Già lette{read.length > 0 ? ` (${read.length})` : ''}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {!showSettings ? (
                displayed.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    {activeTab === 'unread' ? 'Nessuna notifica da leggere' : 'Nessuna notifica letta'}
                  </div>
                ) : (
                  displayed.map((n) => (
                    <div
                      key={n.id}
                      className="border-b last:border-0"
                      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                    >
                      <div
                        className={`p-4 ${n.letta ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: n.coloreSfondo, color: n.coloreTesto }}
                      >
                        <div className="flex items-start gap-3">
                          {n.icona && (
                            <span className="text-2xl flex-shrink-0 leading-none">{n.icona}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-snug">{n.titolo}</p>
                            {n.testo && (
                              <p
                                className="text-sm mt-1 leading-relaxed break-words whitespace-normal"
                                style={{ opacity: 0.9 }}
                              >
                                {n.testo}
                              </p>
                            )}
                            {n.linkUrl && (
                              <a
                                href={n.linkUrl}
                                className="inline-block mt-2 text-sm font-medium underline underline-offset-2"
                                style={{ color: n.coloreTesto }}
                              >
                                {n.linkTesto || 'Scopri di più'}
                              </a>
                            )}
                          </div>
                          {/* Mark as read — only shown on unread tab */}
                          {activeTab === 'unread' && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="flex-shrink-0 p-1 opacity-50 hover:opacity-100 transition-opacity"
                              style={{ color: n.coloreTesto }}
                              aria-label="Segna come letta"
                              title="Segna come letta"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* Settings panel */
                <div className="p-4 space-y-4">
                  <p className="text-xs text-gray-400">Scegli come ricevere le notifiche da ON EARTH.</p>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {pushSubscribed ? <Bell size={14} className="text-primary flex-shrink-0" /> : <BellOff size={14} className="text-gray-400 flex-shrink-0" />}
                      <div>
                        <p className="text-xs font-medium text-primary">Notifiche push</p>
                        <p className="text-2xs text-gray-400">{pushSubscribed ? 'Attive su questo dispositivo' : 'Non attive su questo dispositivo'}</p>
                      </div>
                    </div>
                    <button
                      onClick={togglePush}
                      disabled={settingsBusy}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${pushSubscribed ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ml-0.5 ${pushSubscribed ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {emailEnabled ? <Mail size={14} className="text-primary flex-shrink-0" /> : <MailX size={14} className="text-gray-400 flex-shrink-0" />}
                      <div>
                        <p className="text-xs font-medium text-primary">Notifiche email</p>
                        <p className="text-2xs text-gray-400">{emailEnabled ? 'Invio email attivo' : 'Non riceverai email'}</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleEmail}
                      disabled={settingsBusy}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${emailEnabled ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ml-0.5 ${emailEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings toggle footer — customers only */}
            {isCustomer && (
              <div className="border-t border-border/50 flex-shrink-0">
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-primary hover:bg-cream transition-colors"
                >
                  <Settings size={12} />
                  {showSettings ? 'Torna alle notifiche' : 'Impostazioni notifiche'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
