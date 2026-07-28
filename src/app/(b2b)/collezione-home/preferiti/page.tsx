'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useViewMode } from '@/hooks/useViewMode';
import ProductGrid from '@/components/catalog/ProductGrid';
import ProductList from '@/components/catalog/ProductList';
import ProductLookbook from '@/components/catalog/ProductLookbook';
import { ViewToggle } from '@/components/catalog/ViewToggle';
import type { Product } from '@/types';

const HOME_FAMIGLIE = new Set(['Prodotti per la casa', 'Ricorrenze e regalistica']);

export default function HomeCollectionPreferiti() {
  const { favoriteIds, isLoading: favLoading } = useFavorites();
  const { mode: viewMode, changeMode: setViewMode } = useViewMode();

  const ids = [...favoriteIds];

  const { data: allFavorited = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-by-ids', ids.slice().sort().join(',')],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const res = await fetch(`/api/products?ids=${ids.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return (await res.json()).data as Product[];
    },
    enabled: !favLoading,
    staleTime: 30_000,
  });

  const favoritedProducts = useMemo(
    () => allFavorited.filter((p) => p.famiglia && HOME_FAMIGLIE.has(p.famiglia)),
    [allFavorited]
  );

  const isLoading = favLoading || productsLoading;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50 flex items-center justify-between gap-4">
        <div>
          <p className="label-luxury text-accent">Collezione Home</p>
          <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide">
            I miei preferiti
          </h1>
        </div>
        {favoritedProducts.length > 0 && (
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        )}
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Caricamento…</p>
        ) : favoritedProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Heart size={36} className="mx-auto text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-500 mb-1">Nessun preferito</p>
            <p className="text-xs text-gray-400">Aggiungi prodotti Collezione Home ai preferiti dal catalogo</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && <ProductGrid products={favoritedProducts} isLoading={false} />}
            {viewMode === 'list' && <ProductList products={favoritedProducts} isLoading={false} />}
            {viewMode === 'lookbook' && <ProductLookbook products={favoritedProducts} isLoading={false} />}
          </>
        )}
      </div>
    </div>
  );
}
