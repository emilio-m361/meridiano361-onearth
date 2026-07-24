'use client';

import { usePathname } from 'next/navigation';

const CONTAINED_PATHS = [
  '/moda/pareti',
  '/moda/visual',
  '/catalog/products',
  '/moda/catalogo',
  '/moda/ruota-cromatica',
  '/moda/product',
];

function isContained(pathname: string) {
  return CONTAINED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function B2BMainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const contained = isContained(pathname);

  return (
    <main className={`flex-1 min-h-0 overscroll-y-contain ${contained ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {contained ? children : (
        <div className="min-h-full pb-nav-safe md:pb-0">
          {children}
        </div>
      )}
    </main>
  );
}
