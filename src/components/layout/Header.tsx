'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut, UserCircle, HelpCircle, Home, Settings, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import NotificationBell from '@/components/layout/NotificationBell';
import { useSettings } from '@/contexts/SettingsContext';
import { isAdminRole } from '@/lib/roles';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const CASA_NAV_CONFIG: Record<string, { href: string; isActive: (p: string) => boolean }> = {
  catalogo:     { href: '/catalog/products',    isActive: (p) => p.startsWith('/catalog/products') },
  preferiti:    { href: '/catalog/preferiti',   isActive: (p) => p.startsWith('/catalog/preferiti') },
  carrelli:     { href: '/catalog/carts',       isActive: (p) => p.startsWith('/catalog/carts') },
  ordini:       { href: '/catalog/orders',      isActive: (p) => p.startsWith('/catalog/orders') },
  destinazioni: { href: '/catalog/destinazioni',isActive: (p) => p.startsWith('/catalog/destinazioni') },
  assistenza:   { href: '/catalog/assistenza',  isActive: (p) => p.startsWith('/catalog/assistenza') },
};

const MODA_NAV = [
  { key: 'catalogo', href: '/moda/catalogo', label: 'Catalogo', isActive: (p: string) => p.startsWith('/moda/catalogo') },
  { key: 'carrelli', href: '/moda/carrelli', label: 'Carrelli', isActive: (p: string) => p.startsWith('/moda/carrelli') },
  { key: 'ordini',   href: '/moda/ordini',   label: 'Ordini',   isActive: (p: string) => p.startsWith('/moda/ordini') },
];

const MODA_RISORSE_ITEMS = [
  { href: '/moda/risorse?tab=documenti', label: 'Documenti', isActive: (p: string) => p.startsWith('/moda/risorse') },
  { href: '/moda/risorse?tab=foto',      label: 'Foto',      isActive: (p: string) => false },
  { href: '/moda/risorse?tab=video',     label: 'Video',     isActive: (p: string) => false },
];

const MODA_VISUAL_ITEMS = [
  { href: '/moda/ruota-cromatica', label: 'Ruota Cromatica', isActive: (p: string) => p.startsWith('/moda/ruota-cromatica') },
  { href: '/moda/esposizione',     label: 'Esposizione',     isActive: (p: string) => p.startsWith('/moda/esposizione') },
  { href: '/moda/pareti',          label: 'Parete',          isActive: (p: string) => p.startsWith('/moda/pareti') },
];

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { menu, collections } = useSettings();

  const isHome = pathname === '/home';
  const isInModa = pathname.startsWith('/moda') || pathname.startsWith('/budget');
  const isInCasa = pathname.startsWith('/casa') || pathname.startsWith('/catalog/');
  const isAdmin = isAdminRole(session.user.role);
  const { mondiEspositivi, isMeridiano361 } = useFeatureFlags();
  const preferitiHref = isInModa ? '/moda/preferiti' : '/catalog/preferiti';
  const isInPreferiti = pathname.startsWith('/moda/preferiti') || pathname.startsWith('/catalog/preferiti');

  const modaInfo = collections.lista.find((c) => c.id === 'moda');
  const casaInfo = collections.lista.find((c) => c.id === 'casa');
  const collectionLabel = isInModa && pathname !== '/moda'
    ? modaInfo?.titolo
    : isInCasa && pathname !== '/casa'
    ? casaInfo?.titolo
    : null;

  return (
    <header className="bg-white border-b border-border flex-shrink-0 z-20 pt-safe">
      <div className="h-14 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 md:gap-6">
      {/* Logo */}
      <Link href="/home" className="flex items-center flex-shrink-0">
        <Image
          src="/logo-on-earth/onearth_solo.png"
          alt="On Earth"
          height={24}
          width={153}
          className="object-contain w-[110px] sm:w-[153px]"
          priority
        />
      </Link>

      {/* Collection label — shows on collection subpages */}
      {collectionLabel && (
        <div className="hidden sm:flex flex-col leading-none flex-shrink-0 border-l border-border pl-3 sm:pl-4">
          <span className="text-[9px] uppercase tracking-[0.15em] text-gray-400 font-medium">Collezione</span>
          <span className="text-xs font-semibold text-primary tracking-wide mt-0.5">{collectionLabel}</span>
        </div>
      )}

      {/* Nav links — desktop */}
      <nav className="hidden md:flex items-center gap-1">
        {!isHome && (isInModa
            ? <>
                {MODA_NAV.map(({ key, href, label, isActive }) => (
                  <Link
                    key={key}
                    href={href}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded transition-colors',
                      isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-400 hover:text-primary hover:bg-cream'
                    )}
                  >
                    {label}
                  </Link>
                ))}
                {/* Risorse dropdown — visibile a tutti */}
                <div className="relative group">
                  <button
                    className={cn(
                      'text-xs px-3 py-1.5 rounded transition-colors',
                      pathname.startsWith('/moda/risorse')
                        ? 'text-primary font-semibold bg-cream'
                        : 'text-gray-400 hover:text-primary hover:bg-cream'
                    )}
                  >
                    Risorse
                  </button>
                  <div className="absolute top-full left-0 hidden group-hover:block bg-white shadow-lg border border-border rounded py-1 min-w-[160px] z-50">
                    {MODA_RISORSE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-xs text-gray-600 hover:text-primary hover:bg-cream transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
                {/* Budget — solo Meridiano361 e admin */}
                {(isAdmin || isMeridiano361) && (
                  <Link
                    href="/budget"
                    className={cn(
                      'text-xs px-3 py-1.5 rounded transition-colors',
                      pathname.startsWith('/budget') ? 'text-primary font-semibold bg-cream' : 'text-gray-400 hover:text-primary hover:bg-cream'
                    )}
                  >
                    Budget
                  </Link>
                )}
                {/* Visual dropdown — solo Meridiano361, Bottega Solidale e admin */}
                {(isAdmin || mondiEspositivi) && (
                  <div className="relative group">
                    <button
                      className={cn(
                        'text-xs px-3 py-1.5 rounded transition-colors',
                        MODA_VISUAL_ITEMS.some((i) => i.isActive(pathname))
                          ? 'text-primary font-semibold bg-cream'
                          : 'text-gray-400 hover:text-primary hover:bg-cream'
                      )}
                    >
                      Visual
                    </button>
                    <div className="absolute top-full left-0 hidden group-hover:block bg-white shadow-lg border border-border rounded py-1 min-w-[168px] z-50">
                      {MODA_VISUAL_ITEMS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'block px-4 py-2 text-xs transition-colors',
                            item.isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-600 hover:text-primary hover:bg-cream'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            : menu.ordine
                .filter((key) => key !== 'preferiti' && menu.items[key]?.visibile && CASA_NAV_CONFIG[key])
                .map((key) => {
                  const config = CASA_NAV_CONFIG[key];
                  const label = menu.items[key]?.label ?? key;
                  return (
                    <Link
                      key={key}
                      href={config.href}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded transition-colors',
                        config.isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-400 hover:text-primary hover:bg-cream'
                      )}
                    >
                      {label}
                    </Link>
                  );
                }))}
        </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Admin — desktop only, admin users only */}
      {isAdmin && (
        <div className="relative group hidden md:block">
          <Link
            href="/admin"
            className="flex p-1.5 text-gray-400 hover:text-primary transition-colors"
            aria-label="Admin"
          >
            <Settings size={19} />
          </Link>
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            Admin
          </span>
        </div>
      )}

      {/* Home — desktop only (mobile uses bottom nav) */}
      <div className="relative group hidden md:block">
        <Link
          href="/home"
          className="flex p-1.5 text-gray-400 hover:text-primary transition-colors"
          aria-label="Home"
        >
          <Home size={19} />
        </Link>
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Home
        </span>
      </div>

      {/* Preferiti — icona cuore, desktop only */}
      {!isHome && (
        <div className="relative group hidden md:block">
          <Link
            href={preferitiHref}
            className={cn(
              'flex p-1.5 transition-colors',
              isInPreferiti ? 'text-primary' : 'text-gray-400 hover:text-primary'
            )}
            aria-label="Preferiti"
          >
            <Heart size={19} fill={isInPreferiti ? 'currentColor' : 'none'} />
          </Link>
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            Preferiti
          </span>
        </div>
      )}

      {/* Notification bell */}
      <NotificationBell />

      {/* Aiuto — desktop only */}
      <div className="relative group hidden md:block">
        <Link
          href="/catalog/assistenza"
          className="flex p-1.5 text-gray-400 hover:text-primary transition-colors"
          aria-label="Aiuto"
        >
          <HelpCircle size={19} />
        </Link>
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Aiuto
        </span>
      </div>

      {/* Profilo mobile — icona */}
      <div className="relative group sm:hidden">
        <Link
          href="/catalog/impostazioni"
          className="flex p-2 text-gray-400 hover:text-primary transition-colors"
          aria-label="Profilo"
        >
          <UserCircle size={22} />
        </Link>
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Profilo
        </span>
      </div>

      {/* Profilo desktop — nome + email */}
      <div className="relative group hidden sm:block">
        <Link
          href="/catalog/impostazioni"
          className="flex flex-col items-end leading-tight hover:opacity-70 transition-opacity"
          aria-label="Profilo"
        >
          <p className="text-xs font-medium text-primary truncate max-w-[160px]">
            {session.user.companyName}
          </p>
          <p className="text-2xs text-gray-400 truncate max-w-[160px]">
            {session.user.email}
          </p>
        </Link>
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Profilo
        </span>
      </div>

      {/* Esci */}
      <div className="relative group">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-2.5 text-gray-400 hover:text-primary transition-colors"
          aria-label={t('logout')}
        >
          <LogOut size={17} />
        </button>
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Esci
        </span>
      </div>
      </div>
    </header>
  );
}
