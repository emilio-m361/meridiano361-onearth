'use client';

import Link from 'next/link';
import { LayoutGrid, Heart, ShoppingCart, Package2, FileText, ImageIcon, Film, Clock, Lock, Palette, Layout, BarChart2, Gem } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from 'next-auth/react';
import { isAdminRole } from '@/lib/roles';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function decodeCollezione(code: string): string {
  const prefix = code.slice(0, 2).toUpperCase();
  const year = code.slice(2);
  const suffix = year ? ` 20${year}` : '';
  if (prefix === 'PE') return `Primavera Estate${suffix}`;
  if (prefix === 'AI') return `Autunno Inverno${suffix}`;
  return code;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

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

function ContentCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-white hover:bg-cream hover:border-gray-300 transition-all duration-200 group"
    >
      <Icon size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      <span className="text-2xs font-medium text-gray-600 tracking-wide">{label}</span>
    </Link>
  );
}

export default function ModaHome() {
  const stagione = decodeCollezione('PE27');
  const { collections } = useSettings();
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role);
  const { mondiEspositivi, isMeridiano361 } = useFeatureFlags();
  const showVisual = isAdmin || mondiEspositivi;
  const showBudget = isMeridiano361;
  const deadline = collections.moda.bookingDeadline;
  const isExpired = deadline ? new Date(deadline) < new Date() : false;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary px-5 pt-8 pb-28">
      {/* Header */}
      <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">collezione</p>
      <h1 className="font-display text-4xl font-light tracking-widest leading-tight mt-0.5">MODA PE27</h1>
      <p className="text-sm text-gray-400 mt-1">{stagione}</p>

      {deadline && (
        <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isExpired
            ? 'bg-gray-100 text-gray-400 border-gray-200'
            : 'bg-white text-gray-500 border-gray-200'
        }`}>
          {isExpired ? <Lock size={10} /> : <Clock size={10} />}
          {isExpired
            ? `Prenotazioni chiuse il ${formatDeadline(deadline)}`
            : `Prenotazioni aperte fino al ${formatDeadline(deadline)}`}
        </div>
      )}

      {/* Main 4 items — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 mt-8">
        <NavCard href="/moda/catalogo"  icon={LayoutGrid}   label="Catalogo"  />
        <NavCard href="/moda/preferiti" icon={Heart}        label="Preferiti" />
        <NavCard href="/moda/carrelli"  icon={ShoppingCart} label="Carrelli"  />
        <NavCard href="/moda/ordini"    icon={Package2}     label="Ordini"    />
      </div>

      {/* Content 3 items — 3 columns */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <ContentCard href="/moda/risorse?tab=documenti" icon={FileText}  label="Documenti" />
        <ContentCard href="/moda/risorse?tab=foto"      icon={ImageIcon} label="Foto"      />
        <ContentCard href="/moda/risorse?tab=video"     icon={Film}      label="Video"     />
      </div>

      {/* Ruota cromatica sempre; Esposizione e Parete solo per org autorizzate */}
      <div className={`grid gap-3 mt-3 ${showVisual ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <NavCard href="/moda/ruota-cromatica" icon={Palette} label="Ruota Cromatica" />
        {showVisual && <NavCard href="/moda/esposizione" icon={Gem}    label="Esposizione" />}
        {showVisual && <NavCard href="/moda/pareti"      icon={Layout} label="Parete"      />}
      </div>

      {/* Budget solo per Meridiano361 */}
      {showBudget && (
        <div className="mt-3">
          <NavCard href="/budget" icon={BarChart2} label="Budget" />
        </div>
      )}
    </div>
  );
}
