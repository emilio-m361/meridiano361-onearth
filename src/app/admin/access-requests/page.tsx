'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, UserPlus, Trash2, Search, Loader2, X, Eye, EyeOff, Copy, RefreshCw, Mail, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AccessRequest {
  id: string;
  organizzazione: string;
  nome?: string | null;
  cognome?: string | null;
  telefono?: string | null;
  email: string;
  status: string;
  mailCredenzialiInviata: boolean;
  approvataDa?: string | null;
  approvataAt?: string | null;
  createdAt: string;
}

interface OrgLight {
  id: string;
  nome: string;
}

function generaPasswordDefault(nomeOrganizzazione: string): string {
  const orgSlug = nomeOrganizzazione
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 5);
  return 'onearth_' + orgSlug;
}

const FILTER_TABS = [
  { key: 'all',     label: 'Tutte' },
  { key: 'pending', label: 'In attesa' },
  { key: 'handled', label: 'Gestite' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk actions
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Per-row actions
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create operator modal
  const [createReq, setCreateReq] = useState<AccessRequest | null>(null);
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('new');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [newOrgNome, setNewOrgNome] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formCognome, setFormCognome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNoteCliente, setFormNoteCliente] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const res = await fetch('/api/access-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ data: AccessRequest[] }>;
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ['admin-organizations-light'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed');
      const body = await res.json() as { data: OrgLight[] };
      return body.data;
    },
    enabled: !!createReq,
  });

  const orgs = orgsData ?? [];

  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return orgs;
    const s = orgSearch.toLowerCase();
    return orgs.filter((o) => o.nome.toLowerCase().includes(s));
  }, [orgs, orgSearch]);

  const requests = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = requests;
    if (filter === 'pending') list = list.filter((r) => r.status === 'pending');
    if (filter === 'handled') list = list.filter((r) => r.status !== 'pending');
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.nome?.toLowerCase().includes(s) ||
          r.cognome?.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.organizzazione.toLowerCase().includes(s)
      );
    }
    return list;
  }, [requests, filter, search]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); filtered.forEach((r) => n.delete(r.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); filtered.forEach((r) => n.add(r.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function markHandled(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'gestita' }),
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Richiesta segnata come gestita');
    } catch {
      toast.error('Impossibile aggiornare la richiesta');
    } finally {
      setMarkingId(null);
    }
  }

  async function deleteSingle(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/access-requests/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Richiesta eliminata');
    } catch {
      toast.error('Impossibile eliminare la richiesta');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function bulkMarkGestita() {
    setIsBulkWorking(true);
    try {
      const ids = Array.from(selected).filter((id) => {
        const r = requests.find((x) => x.id === id);
        return r?.status === 'pending';
      });
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/access-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'gestita' }),
          })
        )
      );
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success(`${ids.length} richiest${ids.length === 1 ? 'a' : 'e'} segnate come gestite`);
    } catch {
      toast.error('Errore durante l\'operazione');
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function bulkDelete() {
    setIsBulkWorking(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => fetch(`/api/access-requests/${id}`, { method: 'DELETE' })));
      setSelected(new Set());
      setConfirmBulkDelete(false);
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success(`${ids.length} richiest${ids.length === 1 ? 'a' : 'e'} eliminate`);
    } catch {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsBulkWorking(false);
    }
  }

  useEffect(() => {
    if (createReq) {
      setOrgMode('new');
      setSelectedOrgId('');
      setOrgSearch('');
      setNewOrgNome(createReq.organizzazione);
      setFormNome(createReq.nome ?? '');
      setFormCognome(createReq.cognome ?? '');
      setFormEmail(createReq.email);
      setFormTelefono(createReq.telefono ?? '');
      setFormPassword(generaPasswordDefault(createReq.organizzazione));
      setFormNoteCliente('');
      setShowPassword(false);
    }
  }, [createReq]);

  async function handleCreate(inviaMail: boolean) {
    if (!createReq) return;
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        nome: formNome,
        cognome: formCognome,
        email: formEmail,
        telefono: formTelefono || null,
        password: formPassword,
        inviaMail,
        noteCliente: formNoteCliente || null,
      };
      if (orgMode === 'existing') {
        body.organizationId = selectedOrgId;
      } else {
        body.nuovaOrganizzazione = { nome: newOrgNome };
      }

      const res = await fetch(`/api/access-requests/${createReq.id}/create-operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error || 'Errore');
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setCreateReq(null);
      if (inviaMail && resBody.data?.mailInviata) {
        toast.success(`Account creato e credenziali inviate a ${formEmail}`);
      } else if (inviaMail && !resBody.data?.mailInviata) {
        const errDetail = resBody.data?.mailError ? `: ${resBody.data.mailError}` : '';
        toast(`Account creato. Email non inviata${errDetail}`, { icon: '⚠️', duration: 8000 });
      } else {
        toast.success('Account creato');
      }
    } catch (err: any) {
      toast.error(err.message || 'Impossibile creare l\'account');
    } finally {
      setIsCreating(false);
    }
  }

  const canSubmit =
    formNome.trim() &&
    formCognome.trim() &&
    formEmail.trim() &&
    formPassword.trim().length >= 6 &&
    (orgMode === 'existing' ? !!selectedOrgId : !!newOrgNome.trim());

  const inputCls = 'w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 placeholder-gray-400';

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
      {/* Header */}
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Richieste Accesso</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {requests.length} richiest{requests.length === 1 ? 'a' : 'e'} totali
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-600 font-medium">· {pendingCount} in attesa</span>
          )}
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-0.5 bg-cream rounded-lg p-0.5 self-start">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-700 text-2xs px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, org…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-border rounded focus:outline-none focus:border-accent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 flex-wrap mb-4 px-3 py-2.5 bg-primary/5 border border-primary/10 rounded-lg">
          <span className="text-xs font-medium text-primary">
            {selected.size} richiest{selected.size === 1 ? 'a' : 'e'} selezionat{selected.size === 1 ? 'a' : 'e'}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={bulkMarkGestita}
              disabled={isBulkWorking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              {isBulkWorking ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Segna come gestite
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={isBulkWorking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={11} />
              Elimina selezionate
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Deseleziona tutte
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          {search ? 'Nessun risultato per la ricerca.' : 'Nessuna richiesta.'}
        </div>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden w-full">
          <table className="table-luxury table-compact w-full">
            <thead>
              <tr className="border-b border-border bg-cream">
                <th className="w-6">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                </th>
                <th className="whitespace-nowrap uppercase tracking-wider">Data</th>
                <th className="uppercase tracking-wider">Organizzazione</th>
                <th className="uppercase tracking-wider">Nome</th>
                <th className="uppercase tracking-wider">Cognome</th>
                <th className="uppercase tracking-wider">Email</th>
                <th className="uppercase tracking-wider">Telefono</th>
                <th className="uppercase tracking-wider">Stato</th>
                <th className="w-36" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-b border-border last:border-0 ${selected.has(r.id) ? 'bg-accent/5' : ''}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                  </td>
                  <td className="text-gray-500 whitespace-nowrap">
                    {format(new Date(r.createdAt), 'd MMM yy', { locale: it })}
                  </td>
                  <td className="font-medium text-primary max-w-[130px]">
                    <span className="block truncate" title={r.organizzazione}>{r.organizzazione}</span>
                  </td>
                  <td className="text-gray-600 whitespace-nowrap">{r.nome || '—'}</td>
                  <td className="text-gray-600 whitespace-nowrap">{r.cognome || '—'}</td>
                  <td className="max-w-[160px]">
                    <a href={`mailto:${r.email}`} className="text-accent hover:underline block truncate" title={r.email}>{r.email}</a>
                  </td>
                  <td className="text-gray-600 whitespace-nowrap">{r.telefono || '—'}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${
                        r.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {r.status === 'pending' ? 'In attesa' : 'Gestita'}
                      </span>
                      {r.status !== 'pending' && (
                        <span
                          className="inline-flex items-center gap-1 text-2xs text-gray-400"
                          title={r.mailCredenzialiInviata ? 'Email credenziali inviata' : 'Email non inviata'}
                        >
                          {r.mailCredenzialiInviata
                            ? <MailCheck size={9} className="text-green-500" />
                            : <Mail size={9} className="text-gray-300" />
                          }
                          {r.approvataAt && format(new Date(r.approvataAt), 'd MMM', { locale: it })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setCreateReq(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            <UserPlus size={9} />
                            Crea account
                          </button>
                          <button
                            onClick={() => markHandled(r.id)}
                            disabled={markingId === r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                            title="Segna come gestita"
                          >
                            {markingId === r.id ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                          </button>
                        </>
                      )}
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteSingle(r.id)}
                            disabled={deletingId === r.id}
                            className="text-2xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === r.id ? <Loader2 size={9} className="animate-spin" /> : 'Sì'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-2xs text-gray-400 hover:text-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create operator modal */}
      {createReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isCreating && setCreateReq(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateReq(null)}
              disabled={isCreating}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={16} />
            </button>
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-primary tracking-wide">Crea account operatore</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Richiesta di <span className="font-medium text-gray-600">{createReq.organizzazione}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Org mode radio */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Organizzazione</label>
                <div className="flex gap-3 mb-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={orgMode === 'new'}
                      onChange={() => { setOrgMode('new'); setSelectedOrgId(''); setOrgSearch(''); }}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-xs text-gray-700">Nuova organizzazione</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={orgMode === 'existing'}
                      onChange={() => setOrgMode('existing')}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-xs text-gray-700">Organizzazione esistente</span>
                  </label>
                </div>

                {orgMode === 'new' ? (
                  <input
                    value={newOrgNome}
                    onChange={(e) => {
                      setNewOrgNome(e.target.value);
                      setFormPassword(generaPasswordDefault(e.target.value));
                    }}
                    className={inputCls}
                    placeholder="Nome organizzazione"
                  />
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={orgSearch}
                        onChange={(e) => setOrgSearch(e.target.value)}
                        className={inputCls + ' pl-8'}
                        placeholder="Cerca organizzazione…"
                      />
                    </div>
                    {filteredOrgs.length > 0 && (
                      <div className="max-h-36 overflow-y-auto border border-border rounded bg-white divide-y divide-border">
                        {filteredOrgs.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => { setSelectedOrgId(o.id); setOrgSearch(o.nome); setFormPassword(generaPasswordDefault(o.nome)); }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-cream transition-colors ${
                              selectedOrgId === o.id ? 'bg-accent/10 font-medium text-primary' : 'text-gray-700'
                            }`}
                          >
                            {o.nome}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedOrgId && (
                      <p className="text-2xs text-green-600 flex items-center gap-1">
                        <Check size={10} /> {orgs.find((o) => o.id === selectedOrgId)?.nome}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Nome / Cognome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nome</label>
                  <input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className={inputCls}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Cognome</label>
                  <input
                    value={formCognome}
                    onChange={(e) => setFormCognome(e.target.value)}
                    className={inputCls}
                    placeholder="Cognome"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email</label>
                <input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  type="email"
                  className={inputCls}
                  placeholder="email@esempio.com"
                />
              </div>

              {/* Telefono */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Telefono</label>
                <input
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className={inputCls}
                  placeholder="Opzionale"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Password</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className={inputCls + ' font-mono pr-8'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const orgName = orgMode === 'new'
                        ? newOrgNome
                        : (orgs.find(o => o.id === selectedOrgId)?.nome ?? '');
                      setFormPassword(generaPasswordDefault(orgName));
                      setShowPassword(true);
                    }}
                    className="px-2.5 py-2 border border-border rounded text-gray-500 hover:text-primary hover:border-gray-400 transition-colors"
                    title="Genera nuova password"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(formPassword); toast.success('Password copiata'); }}
                    className="px-2.5 py-2 border border-border rounded text-gray-500 hover:text-primary hover:border-gray-400 transition-colors"
                    title="Copia password"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                {showPassword && formPassword && (
                  <p className="text-2xs font-mono text-primary bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5">{formPassword}</p>
                )}
              </div>

              {/* Nota per il cliente (opzionale) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  Nota per il cliente <span className="normal-case text-gray-400 font-normal">(opzionale, inclusa nella mail)</span>
                </label>
                <textarea
                  value={formNoteCliente}
                  onChange={(e) => setFormNoteCliente(e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                  placeholder="Es. la tua tranche sarà disponibile a partire da …"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => handleCreate(true)}
                disabled={isCreating || !canSubmit}
                className="w-full py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <><Loader2 size={12} className="animate-spin" /> Creazione in corso…</>
                ) : (
                  <><Mail size={12} /> Crea account e invia credenziali</>
                )}
              </button>
              <button
                onClick={() => handleCreate(false)}
                disabled={isCreating || !canSubmit}
                className="w-full py-2.5 text-xs font-medium rounded border border-border text-gray-700 hover:bg-cream transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <UserPlus size={12} /> Crea senza inviare email
              </button>
              <button
                onClick={() => setCreateReq(null)}
                disabled={isCreating}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isBulkWorking && setConfirmBulkDelete(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-2">Eliminare {selected.size} richiest{selected.size === 1 ? 'a' : 'e'}?</h3>
            <p className="text-xs text-gray-500 mb-5">Questa operazione è irreversibile.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={bulkDelete}
                disabled={isBulkWorking}
                className="flex-1 py-2.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isBulkWorking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Elimina
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isBulkWorking}
                className="flex-1 py-2.5 text-xs font-medium rounded border border-border text-gray-600 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
