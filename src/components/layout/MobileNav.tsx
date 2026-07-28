'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Home, LayoutGrid, ShoppingCart, Package, Heart, HelpCircle, Settings, Gem, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useBranchStore } from '@/store/branchStore';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { isAdminRole } from '@/lib/roles';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  badge?: boolean;
  notifBadge?: boolean;
};

const HOME_ITEM: NavItem = {
  icon: Home,
  label: 'Home',
  href: '/home',
  isActive: (p) => p === '/home',
  notifBadge: true,
};

const AIUTO_ITEM: NavItem = {
  icon: HelpCircle,
  label: 'Aiuto',
  href: '/catalog/assistenza',
  isActive: (p) => p.startsWith('/catalog/assistenza'),
};

const ADMIN_ITEM: NavItem = {
  icon: Settings,
  label: 'Admin',
  href: '/admin',
  isActive: (p) => p.startsWith('/admin'),
};

const CASA_BASE: NavItem[] = [
  HOME_ITEM,
  { icon: LayoutGrid,   label: 'Catalogo',  href: '/catalog/products',  isActive: (p) => p.startsWith('/catalog/products') },
  { icon: Heart,        label: 'Preferiti', href: '/catalog/preferiti', isActive: (p) => p.startsWith('/catalog/preferiti') },
  { icon: ShoppingCart, label: 'Carrelli',  href: '/catalog/carts',     isActive: (p) => p.startsWith('/catalog/carts'), badge: true },
  { icon: Package,      label: 'Ordini',    href: '/catalog/orders',    isActive: (p) => p.startsWith('/catalog/orders') },
];

const HOME_COLLECTION_BASE: NavItem[] = [
  HOME_ITEM,
  { icon: LayoutGrid, label: 'Catalogo',  href: '/collezione-home/catalogo',  isActive: (p) => p.startsWith('/collezione-home/catalogo') },
  { icon: Heart,      label: 'Preferiti', href: '/collezione-home/preferiti', isActive: (p) => p.startsWith('/collezione-home/preferiti') },
];

const MODA_BASE: NavItem[] = [
  HOME_ITEM,
  { icon: LayoutGrid,   label: 'Catalogo',  href: '/moda/catalogo',  isActive: (p) => p.startsWith('/moda/catalogo') },
  { icon: Heart,        label: 'Preferiti', href: '/moda/preferiti', isActive: (p) => p.startsWith('/moda/preferiti') },
  { icon: ShoppingCart, label: 'Carrelli',  href: '/moda/carrelli',  isActive: (p) => p.startsWith('/moda/carrelli') },
  { icon: Package,      label: 'Ordini',    href: '/moda/ordini',    isActive: (p) => p.startsWith('/moda/ordini') },
  { icon: Gem,          label: 'Visual',    href: '/moda/pareti',    isActive: (p) => p.startsWith('/moda/pareti') || p.startsWith('/moda/esposizione') || p.startsWith('/moda/ruota-cromatica') },
];

const BUDGET_ITEM: NavItem = {
  icon: BarChart2,
  label: 'Budget',
  href: '/budget',
  isActive: (p) => p.startsWith('/budget'),
};

// Path definitivamente MODA (mai casa)
function isModaPath(p: string) { return p.startsWith('/moda') || p.startsWith('/budget'); }

// Path definitivamente COLLEZIONE HOME
function isHomeCollectionPath(p: string) { return p.startsWith('/collezione-home'); }

// Path definitivamente CASA (mai moda)
function isCasaPath(p: string) {
  return (
    p.startsWith('/catalog/products') ||
    p.startsWith('/catalog/preferiti') ||
    p.startsWith('/catalog/carts') ||
    p.startsWith('/catalog/orders') ||
    p.startsWith('/casa')
  );
}

function getModaItems(isAdmin: boolean, canVisual: boolean, isMeridiano361: boolean): NavItem[] {
  const base = isAdmin || canVisual
    ? MODA_BASE
    : MODA_BASE.filter((i) => i.href !== '/moda/pareti' && !i.href.startsWith('/moda/visual'));
  return isAdmin || isMeridiano361 ? [...base, BUDGET_ITEM] : base;
}

function getNavItems(pathname: string, isAdmin: boolean, canVisual: boolean, isMeridiano361: boolean, branch: 'casa' | 'moda' | 'collezione-home'): NavItem[] {
  const tail = isAdmin ? ADMIN_ITEM : AIUTO_ITEM;

  if (pathname === '/home') return [tail];

  // Path definitivi: il branch non conta
  if (isModaPath(pathname)) return [...getModaItems(isAdmin, canVisual, isMeridiano361), tail];
  if (isHomeCollectionPath(pathname)) return [...HOME_COLLECTION_BASE, tail];
  if (isCasaPath(pathname)) return [...CASA_BASE, tail];

  // Path ambigui (scheda prodotto /catalog/[id], assistenza, impostazioni, ecc.)
  // Si usa il branch selezionato dall'utente in home, persisto in localStorage
  if (branch === 'moda') return [...getModaItems(isAdmin, canVisual, isMeridiano361), tail];
  if (branch === 'collezione-home') return [...HOME_COLLECTION_BASE, tail];
  return [...CASA_BASE, tail];
}

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  const { branch, setBranch } = useBranchStore();

  // Auto-sincronizza il branch dai path definitivi (accesso diretto tramite URL)
  useEffect(() => {
    if (isModaPath(pathname)) setBranch('moda');
    else if (isHomeCollectionPath(pathname)) setBranch('collezione-home');
    else if (isCasaPath(pathname)) setBranch('casa');
  }, [pathname, setBranch]);

  const { data: notifications = [] } = useQuery<{ letta: boolean }[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
  const unreadCount = notifications.filter((n) => !n.letta).length;

  const adminUser = isAdminRole(session?.user?.role);
  const { mondiEspositivi, isMeridiano361 } = useFeatureFlags();
  const navItems = getNavItems(pathname, adminUser, mondiEspositivi, isMeridiano361, branch);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-black z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-[56px]">
        {navItems.map(({ icon: Icon, label, href, isActive, badge, notifBadge }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors relative',
                active ? 'text-white/40' : 'text-white',
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-white" />
              )}
              <div className="relative">
                <Icon size={20} />
                {badge && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
                {notifBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none truncate w-full text-center px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
