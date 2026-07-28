'use client';

import Link from 'next/link';
import { LayoutGrid, Heart } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

function NavCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl border border-border bg-white hover:bg-cream hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl bg-cream group-hover:bg-white flex items-center justify-center transition-colors">
        <Icon size={16} className="text-gray-500" />
      </div>
      <span className="text-xs font-medium text-primary tracking-wide">{label}</span>
    </Link>
  );
}

export default function HomeCollectionHome() {
  const { collections } = useSettings();
  const info = collections.lista.find((c) => c.id === 'collezione-home');
  const titolo = info?.titolo ?? 'Collezione Home';
  const sottotitolo = info?.sottotitolo;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary px-5 pt-8 pb-28">
      <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">collezione</p>
      <h1 className="font-display text-4xl font-light tracking-widest leading-tight mt-0.5">{titolo.toUpperCase()}</h1>
      {sottotitolo && <p className="text-sm text-gray-400 mt-1">{sottotitolo}</p>}

      <div className="grid grid-cols-2 gap-3 mt-8">
        <NavCard href="/collezione-home/catalogo" icon={LayoutGrid} label="Catalogo" />
        <NavCard href="/collezione-home/preferiti" icon={Heart}      label="Preferiti" />
      </div>
    </div>
  );
}
