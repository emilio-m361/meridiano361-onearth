'use client';

import { useState, useEffect, useDeferredValue } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, KeyRound, Copy, Send, MoreHorizontal, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CustomerForm from './CustomerForm';
import type { Customer } from '@/types';
import toast from 'react-hot-toast';

interface ResetResult {
  companyName: string;
  password: string;
}

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [sendingCreds, setSendingCreds] = useState<string | null>(null);

  // Dropdown "altre azioni" — usa position:fixed per evitare il clipping dell'overflow:hidden del wrapper tabella
  const [dropdownCustomerId, setDropdownCustomerId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  function handleMoreClick(e: React.MouseEvent<HTMLButtonElement>, customer: Customer) {
    e.stopPropagation();
    if (dropdownCustomerId === customer.id) {
      setDropdownCustomerId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setDropdownCustomerId(customer.id);
  }

  useEffect(() => {
    if (!dropdownCustomerId) return;
    const close = () => setDropdownCustomerId(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, { passive: true, capture: true });
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, { capture: true });
    };
  }, [dropdownCustomerId]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', deferredSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' });
      if (deferredSearch) params.set('search', deferredSearch);
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const customers: (Customer & { orderCount?: number })[] = data?.data || [];
  const dropdownCustomer = customers.find((c) => c.id === dropdownCustomerId);

  async function handleToggleActive(customer: Customer) {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success(`Cliente ${customer.isActive ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Impossibile aggiornare il cliente');
    }
  }

  async function handleResetPassword(customer: Customer) {
    setResetting(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}/reset-password`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      const { data } = await res.json();
      setResetResult({ companyName: customer.companyName, password: data.password });
    } catch (err: any) {
      toast.error(err.message || 'Impossibile resettare la password');
    } finally {
      setResetting(null);
    }
  }

  async function handleSendCredentials(customer: Customer) {
    if (!confirm(`Resettare la password di ${customer.companyName} e inviare le credenziali via email a ${customer.email}?`)) return;
    setSendingCreds(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}/send-credentials`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Errore');
      toast.success(`Credenziali inviate a ${body.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Errore nell\'invio');
    } finally {
      setSendingCreds(null);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Eliminare ${customer.companyName}? Questa azione non può essere annullata.`)) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Cliente eliminato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile eliminare il cliente');
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const res = await fetch('/api/customers?limit=5000');
      if (!res.ok) throw new Error('Errore nel caricamento');
      const json = await res.json();
      const all: (Customer & { orderCount?: number })[] = json.data || [];
      const rows: string[][] = [
        ['Codice', 'Ragione sociale', 'Email', 'Telefono', 'Indirizzo', 'Città', 'Paese', 'P.IVA', 'Attivo', 'N. ordini', 'Creato il'],
      ];
      for (const c of all) {
        rows.push([
          c.customerCode, c.companyName, c.email, c.phone || '',
          c.address || '', c.city || '', c.country || '', c.vatNumber || '',
          c.isActive ? 'Sì' : 'No',
          String(c.orderCount ?? ''),
          c.createdAt ? new Date(c.createdAt).toLocaleDateString('it-IT') : '',
        ]);
      }
      const bom = '﻿';
      const content = bom + rows.map((r) => r.map((v) => {
        const s = String(v ?? '');
        return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';')).join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clienti_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Clienti</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} account registrati</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<Download size={13} />} onClick={handleExportCSV} loading={exporting} disabled={exporting}>
            Esporta CSV
          </Button>
          <Button icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
            <span className="hidden sm:inline">Aggiungi Cliente</span>
            <span className="sm:hidden">Aggiungi</span>
          </Button>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cerca per nome, email, codice o operatore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={14} />}
        />
      </div>

      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[700px]">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>Codice</th>
              <th>Email</th>
              <th>Città</th>
              <th>Ruolo</th>
              <th>Ordini</th>
              <th>Stato</th>
              <th>Registrato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                  Nessun cliente trovato
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <p className="font-medium text-primary text-xs">{customer.companyName}</p>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-gray-500">{customer.customerCode}</span>
                  </td>
                  <td className="text-xs text-gray-600">{customer.email}</td>
                  <td className="text-xs text-gray-500">{customer.city || '—'}</td>
                  <td>
                    <Badge
                      variant={customer.role === 'ADMIN' ? 'accent' : 'default'}
                      size="xs"
                    >
                      {customer.role}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <span className="text-xs font-medium text-gray-500">
                      {(customer as any).orderCount || 0}
                    </span>
                  </td>
                  <td>
                    <Badge
                      variant={customer.isActive ? 'success' : 'default'}
                      size="xs"
                    >
                      {customer.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </td>
                  <td className="text-xs text-gray-400">
                    {formatDate(customer.createdAt)}
                  </td>
                  {/* Colonna azioni: 3 elementi max → Edit + Send (sempre visibili) + ⋯ dropdown */}
                  <td className="pr-3 pl-1 whitespace-nowrap">
                    <div className="flex items-center gap-0.5 flex-nowrap">
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors flex-shrink-0"
                        title="Modifica"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleSendCredentials(customer)}
                        disabled={sendingCreds === customer.id}
                        className="p-1.5 text-blue-500 rounded hover:bg-blue-50 transition-colors disabled:opacity-40 flex-shrink-0"
                        title="Invia credenziali per email (reset + invio)"
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={(e) => handleMoreClick(e, customer)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors flex-shrink-0"
                        title="Altre azioni"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dropdown "altre azioni" — position:fixed bypassa overflow:hidden del wrapper tabella */}
      {dropdownCustomer && (
        <div
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
          className="w-48 bg-white border border-border rounded shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setDropdownCustomerId(null); handleResetPassword(dropdownCustomer); }}
            disabled={resetting === dropdownCustomer.id}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-600 hover:bg-cream transition-colors disabled:opacity-40"
          >
            <KeyRound size={12} />
            Reset password (mostra)
          </button>
          <button
            onClick={() => { setDropdownCustomerId(null); handleToggleActive(dropdownCustomer); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-600 hover:bg-cream transition-colors"
          >
            {dropdownCustomer.isActive
              ? <Eye size={12} className="text-green-500" />
              : <EyeOff size={12} />
            }
            {dropdownCustomer.isActive ? 'Disattiva' : 'Attiva'}
          </button>
          <div className="border-t border-border/60 my-1" />
          <button
            onClick={() => { setDropdownCustomerId(null); handleDelete(dropdownCustomer); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
            Elimina
          </button>
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Aggiungi Cliente"
        size="lg"
      >
        <CustomerForm
          onSuccess={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Modifica Cliente"
        size="lg"
      >
        {editingCustomer && (
          <CustomerForm
            customer={editingCustomer}
            onSuccess={() => {
              setEditingCustomer(null);
              queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            }}
            onCancel={() => setEditingCustomer(null)}
          />
        )}
      </Modal>

      {/* Password reset — one-time reveal */}
      <Modal
        isOpen={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password resettata"
        size="sm"
        footer={
          <Button onClick={() => setResetResult(null)}>Ho preso nota, chiudi</Button>
        }
      >
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              La password di{' '}
              <span className="font-semibold text-primary">{resetResult.companyName}</span>{' '}
              è stata resettata.
            </p>
            <div className="bg-cream border border-border rounded p-4">
              <p className="text-2xs text-gray-500 uppercase tracking-wider mb-2">
                Nuova password temporanea
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary flex-1">
                  {resetResult.password}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetResult.password);
                    toast.success('Copiata');
                  }}
                  className="text-gray-400 hover:text-primary transition-colors"
                  title="Copia"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Comunica questa password al cliente. Non verrà mostrata di nuovo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
