'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { PAESI } from '@/lib/paesi';

function PaeseSelectInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-xs border border-border rounded px-2 bg-white focus:outline-none focus:ring-1 focus:ring-accent text-primary max-w-[160px]"
    >
      <option value="">— nessuno —</option>
      {PAESI.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

const TIPI_CASA = [
  { tipo: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { tipo: 'famiglia', label: 'Famiglia' },
  { tipo: 'classe', label: 'Classe' },
  { tipo: 'sottoclasse', label: 'Sottoclasse' },
  { tipo: 'gruppoOmogeneo', label: 'Gruppo omogeneo' },
  { tipo: 'nomLinea', label: 'Linea' },
  { tipo: 'stagione', label: 'Stagione' },
  { tipo: 'collezione', label: 'Collezione' },
  { tipo: 'colore', label: 'Colore' },
  { tipo: 'temaColore', label: 'Tema colore' },
];

const TIPI_MODA = [
  { tipo: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { tipo: 'famiglia', label: 'Famiglia' },
  { tipo: 'classe', label: 'Classe' },
  { tipo: 'sottoclasse', label: 'Sottoclasse' },
  { tipo: 'gruppoOmogeneo', label: 'Gruppo omogeneo' },
  { tipo: 'modello', label: 'Linea' },
  { tipo: 'taglia', label: 'Taglia' },
  { tipo: 'bloccoColore', label: 'Blocco colore' },
];

// Tipi gerarchici legati al GM root (escluse le flat lookup table)
const HIERARCHY_TIPI = new Set(['gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo']);

// Taglie MODA — valori fissi, non gestibili da admin
const TAGLIE_MODA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

type Tree = 'casa' | 'moda';

function normalizeValue(tipo: string, v: string, _tree: Tree): string {
  const t = v.trim();
  if (!t) return t;
  if (tipo === 'nomLinea' || tipo === 'collezione') return t.toUpperCase();
  // Sentence case per tutti i valori gerarchici (CASA e MODA)
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

// For hierarchy levels: specifies the parent tipo and the FK field name to send on POST
const PARENT_CONFIG: Record<string, { parentTipo: string; parentLabel: string; parentField: string }> = {
  famiglia: { parentTipo: 'gruppoMerceologico', parentLabel: 'Gruppo merceologico', parentField: 'gruppoMerceologicoId' },
  classe: { parentTipo: 'famiglia', parentLabel: 'Famiglia', parentField: 'famigliaId' },
  sottoclasse: { parentTipo: 'classe', parentLabel: 'Classe', parentField: 'classeId' },
  gruppoOmogeneo: { parentTipo: 'sottoclasse', parentLabel: 'Sottoclasse', parentField: 'sottoclasseId' },
};

interface ValoreItem {
  id: string;
  nome: string;
  createdAt: string;
}

function ClassificazioneTab({
  tipo,
  treeGmId,
  tree,
}: {
  tipo: string;
  treeGmId: string | undefined;
  tree: Tree;
}) {
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const parentConfig = PARENT_CONFIG[tipo];

  // Quando cambia l'albero: auto-selezione per la tab Famiglia (1 solo GM),
  // reset per gli altri livelli (l'utente deve scegliere il genitore).
  useEffect(() => {
    if (!treeGmId) return;
    if (tipo === 'famiglia') {
      setSelectedParentId(treeGmId);
      setNewParentId(treeGmId);
    } else {
      setSelectedParentId('');
    }
    setIsAdding(false);
  }, [treeGmId, tipo]);

  // Load parent options for hierarchy child types,
  // filtrate all'albero selezionato per i livelli che hanno famiglia come genitore.
  const { data: parentData } = useQuery({
    queryKey: ['cls-admin', parentConfig?.parentTipo, treeGmId ?? 'all'],
    queryFn: () => {
      let url = `/api/classificazione/${parentConfig!.parentTipo}`;
      // Per il tab Classe, il genitore è Famiglia: filtriamo alle famiglie dell'albero
      if (treeGmId && parentConfig!.parentTipo === 'famiglia') {
        url += `?parentId=${treeGmId}`;
      }
      return fetch(url).then((r) => r.json()) as Promise<{ data: ValoreItem[] }>;
    },
    enabled: !!parentConfig,
  });

  const parentOptions = parentData?.data || [];

  // Load items — for hierarchy children, require a parent to be selected.
  // Per la tab GruppoMerceologico, filtra al GM dell'albero selezionato.
  const { data, isLoading } = useQuery({
    queryKey: ['cls-admin', tipo, selectedParentId, treeGmId ?? 'all'],
    queryFn: async () => {
      const url = selectedParentId
        ? `/api/classificazione/${tipo}?parentId=${selectedParentId}`
        : `/api/classificazione/${tipo}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !parentConfig || !!selectedParentId,
  });

  const allItems: ValoreItem[] = data?.data || [];
  // Per la tab GM: mostra solo il GM dell'albero corrente
  const items: ValoreItem[] = tipo === 'gruppoMerceologico' && treeGmId
    ? allItems.filter((item) => item.id === treeGmId)
    : allItems;

  async function handleAdd() {
    const name = normalizeValue(tipo, newNome, tree);
    if (!name) return;
    if (parentConfig && !newParentId) {
      toast.error(`Seleziona ${parentConfig.parentLabel}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { nome: name };
      if (parentConfig) body[parentConfig.parentField] = newParentId;

      const res = await fetch(`/api/classificazione/${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setNewNome('');
      setNewParentId('');
      setIsAdding(false);
      await queryClient.invalidateQueries({ queryKey: ['cls-admin', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore aggiunto');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile aggiungere');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    const normNome = normalizeValue(tipo, editNome, tree);
    if (!normNome) return;
    try {
      const res = await fetch(`/api/classificazione/${tipo}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: normNome }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['cls-admin', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore aggiornato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile aggiornare');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/classificazione/${tipo}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: ['cls-admin', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore eliminato');
    } catch {
      toast.error('Impossibile eliminare');
    }
  }

  // Il selettore del genitore è nascosto per la tab Famiglia quando l'albero
  // è già selezionato (il GM è auto-impostato e l'utente non deve sceglierlo).
  const hideParentSelector = tipo === 'famiglia' && !!treeGmId;

  return (
    <div>
      {/* Parent filter — nascosto per la tab Famiglia con albero selezionato */}
      {parentConfig && !hideParentSelector && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
            Filtra per {parentConfig.parentLabel}:
          </label>
          <select
            value={selectedParentId}
            onChange={(e) => { setSelectedParentId(e.target.value); setIsAdding(false); }}
            className="h-8 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent flex-1 max-w-xs"
          >
            <option value="">— seleziona —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          {!parentConfig || selectedParentId
            ? `${items.length} valor${items.length === 1 ? 'e' : 'i'}`
            : 'Seleziona un elemento per visualizzare'}
        </p>
        {(!parentConfig || selectedParentId) && !isAdding && (
          <Button size="sm" icon={<Plus size={12} />} onClick={() => { setIsAdding(true); setNewNome(''); setNewParentId(selectedParentId); }}>
            Aggiungi
          </Button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="flex flex-col gap-2 mb-3 p-3 bg-cream rounded border border-border">
          {/* Selettore genitore nel form: nascosto per Famiglia con albero selezionato */}
          {parentConfig && !hideParentSelector && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap w-28">{parentConfig.parentLabel}:</label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="flex-1 text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
              >
                <option value="">— seleziona —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onBlur={() => setNewNome(normalizeValue(tipo, newNome, tree))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setIsAdding(false); setNewNome(''); } }}
              placeholder="Nuovo valore..."
              className="flex-1 text-sm border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            />
            <button
              onClick={handleAdd}
              disabled={isSubmitting}
              className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              <Check size={15} />
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewNome(''); }}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {parentConfig && !selectedParentId ? null : isLoading ? (
        <div className="py-12 text-center"><LoadingSpinner className="mx-auto" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">
          Nessun valore. Clicca "Aggiungi" per iniziare.
        </p>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="table-luxury w-full">
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-4">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          onBlur={() => setEditNome(normalizeValue(tipo, editNome, tree))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button onClick={() => handleEdit(item.id)} className="p-1 text-green-600 hover:text-green-700">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-primary">{item.nome}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 w-36">
                    {deletingId === item.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-2xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Conferma
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-2xs text-gray-400 hover:text-gray-600"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(item.id); setEditNome(item.nome); }}
                          className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                          title="Modifica"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaglieTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">{TAGLIE_MODA.length} valori fissi</p>
        <span className="text-2xs text-gray-400 italic">Valori non modificabili</span>
      </div>
      <div className="bg-white border border-border rounded overflow-hidden">
        <table className="table-luxury w-full">
          <tbody>
            {TAGLIE_MODA.map((t) => (
              <tr key={t}>
                <td className="py-3 px-4 text-sm text-primary">{t}</td>
                <td className="py-3 px-4 w-36" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProduttoriTab() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNome, setEditingNome] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingNome, setDeletingNome] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: { nome: string; count: number; paese: string | null }[] }>({
    queryKey: ['admin-produttori'],
    queryFn: () => fetch('/api/admin/produttori').then((r) => r.json()),
  });

  const items = data?.data ?? [];

  function normalizeTitle(s: string) {
    return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async function handleAdd() {
    const nome = normalizeTitle(newNome);
    if (!nome) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/produttori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      setNewNome('');
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ['admin-produttori'] });
      toast.success('Produttore aggiunto');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(vecchioNome: string) {
    const nuovoNome = normalizeTitle(editValue);
    if (!nuovoNome || nuovoNome === vecchioNome) { setEditingNome(null); return; }
    try {
      const res = await fetch('/api/admin/produttori', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vecchioNome, nuovoNome }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      setEditingNome(null);
      queryClient.invalidateQueries({ queryKey: ['admin-produttori'] });
      toast.success('Produttore rinominato');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handlePaeseChange(nome: string, paese: string) {
    try {
      const res = await fetch('/api/admin/produttori', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vecchioNome: nome, paese: paese || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      queryClient.invalidateQueries({ queryKey: ['admin-produttori'] });
      toast.success('Paese aggiornato');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(nome: string) {
    try {
      const res = await fetch('/api/admin/produttori', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      setDeletingNome(null);
      queryClient.invalidateQueries({ queryKey: ['admin-produttori'] });
      toast.success('Produttore eliminato');
    } catch (err: any) {
      toast.error(err.message);
      setDeletingNome(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">{items.length} produttor{items.length === 1 ? 'e' : 'i'}</p>
        {!isAdding && (
          <Button size="sm" icon={<Plus size={12} />} onClick={() => { setIsAdding(true); setNewNome(''); }}>
            Aggiungi
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-cream rounded border border-border">
          <input
            autoFocus
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onBlur={() => setNewNome(normalizeTitle(newNome))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setIsAdding(false); setNewNome(''); } }}
            placeholder="Nome produttore..."
            className="flex-1 text-sm border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
          />
          <button onClick={handleAdd} disabled={isSubmitting} className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-50">
            <Check size={15} />
          </button>
          <button onClick={() => { setIsAdding(false); setNewNome(''); }} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center"><LoadingSpinner className="mx-auto" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">Nessun produttore. Clicca "Aggiungi" per iniziare.</p>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="table-luxury w-full">
            <thead>
              <tr className="border-b border-border bg-cream/50">
                <th className="text-left px-4 py-2 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-2 text-2xs font-semibold text-gray-400 uppercase tracking-wide w-20">Prodotti</th>
                <th className="text-left px-4 py-2 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Paese</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.nome}>
                  <td className="py-3 px-4">
                    {editingNome === item.nome ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => setEditValue(normalizeTitle(editValue))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(item.nome); if (e.key === 'Escape') setEditingNome(null); }}
                          className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button onClick={() => handleEdit(item.nome)} className="p-1 text-green-600 hover:text-green-700"><Check size={13} /></button>
                        <button onClick={() => setEditingNome(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={13} /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-primary">{item.nome}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400 w-20">
                    {item.count > 0 ? `${item.count}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <PaeseSelectInline
                      value={item.paese || ''}
                      onChange={(v) => handlePaeseChange(item.nome, v)}
                    />
                  </td>
                  <td className="py-3 px-4 w-20">
                    {deletingNome === item.nome ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleDelete(item.nome)} className="text-2xs text-red-600 hover:text-red-700 font-medium">Conferma</button>
                        <button onClick={() => setDeletingNome(null)} className="text-2xs text-gray-400 hover:text-gray-600">Annulla</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingNome(item.nome); setEditValue(item.nome); }}
                          className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                          title="Rinomina"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingNome(item.nome)}
                          className={cn(
                            'p-1.5 rounded transition-colors',
                            item.count > 0
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          )}
                          title={item.count > 0 ? `${item.count} prodotti usano questo produttore` : 'Elimina'}
                          disabled={item.count > 0}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminClassificazionePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedTree, setSelectedTreeState] = useState<Tree>(
    () => (searchParams.get('tree') as Tree) ?? 'casa'
  );
  const defaultTabForTree = selectedTree === 'moda' ? TIPI_MODA[0].tipo : TIPI_CASA[0].tipo;
  const [activeTab, setActiveTabState] = useState<string>(
    () => searchParams.get('tab') ?? defaultTabForTree
  );

  function setActiveTab(tab: string) {
    setActiveTabState(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', tab);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function setSelectedTree(tree: Tree) {
    setSelectedTreeState(tree);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tree', tree);
    p.delete('tab');
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  // Carica tutti i GM per ricavare l'id radice di ciascun albero
  const { data: gmList } = useQuery<ValoreItem[]>({
    queryKey: ['cls-gm-list'],
    queryFn: async () => {
      const res = await fetch('/api/classificazione/gruppoMerceologico');
      return (await res.json()).data as ValoreItem[];
    },
    staleTime: 60_000,
  });

  const treeGmId = useMemo(() => {
    if (!gmList) return undefined;
    const name = selectedTree === 'moda' ? 'Moda' : 'Casa e regalo';
    return gmList.find((gm) => gm.nome === name)?.id;
  }, [gmList, selectedTree]);

  // Quando si cambia albero, resetta la tab attiva alla prima tab dell'albero scelto
  function handleTreeChange(tree: Tree) {
    const tipi = tree === 'moda' ? TIPI_MODA : TIPI_CASA;
    const firstTab = tipi[0].tipo;
    setSelectedTreeState(tree);
    setActiveTabState(firstTab);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tree', tree);
    p.set('tab', firstTab);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Classificazione</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestione valori di classificazione prodotti</p>
      </div>

      {/* ── Selettore albero ── */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500">Albero:</span>
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          <button
            onClick={() => handleTreeChange('casa')}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
              selectedTree === 'casa'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-primary'
            )}
          >
            Casa e regalo
          </button>
          <button
            onClick={() => handleTreeChange('moda')}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
              selectedTree === 'moda'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-primary'
            )}
          >
            Moda
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      {(() => {
        const tipi = selectedTree === 'moda' ? TIPI_MODA : TIPI_CASA;
        return (
          <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-0">
            {tipi.map(({ tipo, label }) => (
              <button
                key={tipo}
                onClick={() => setActiveTab(tipo)}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                  activeTab === tipo
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-primary hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
            {selectedTree === 'casa' && (
              <button
                onClick={() => setActiveTab('produttori')}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                  activeTab === 'produttori'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-primary hover:border-gray-300'
                )}
              >
                Produttori
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Tab content ── */}
      {activeTab === 'taglia' && selectedTree === 'moda' ? (
        <TaglieTab />
      ) : (
        <>
          {(selectedTree === 'moda' ? TIPI_MODA : TIPI_CASA).map(({ tipo }) =>
            activeTab === tipo && tipo !== 'taglia' ? (
              <ClassificazioneTab
                key={`${tipo}-${selectedTree}`}
                tipo={tipo}
                treeGmId={HIERARCHY_TIPI.has(tipo) ? treeGmId : undefined}
                tree={selectedTree}
              />
            ) : null
          )}
          {activeTab === 'produttori' && selectedTree === 'casa' && <ProduttoriTab />}
        </>
      )}
    </div>
  );
}
