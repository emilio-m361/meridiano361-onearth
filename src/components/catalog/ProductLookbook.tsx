'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Heart, Plus, Package } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductImage } from '@/components/ui/ProductImage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useSettings } from '@/contexts/SettingsContext';
import type { Product } from '@/types';

function LookbookCard({ product }: { product: Product }) {
  const { setPendingProduct, getItemQuantity } = useCartStore();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const { card: cs } = useSettings();
  const pathname = usePathname();
  const productHref = pathname.startsWith('/moda')
    ? `/moda/product/${product.id}`
    : pathname.startsWith('/collezione-home')
      ? `/catalog/${product.id}?src=home`
      : `/catalog/${product.id}`;
  const [justAdded, setJustAdded] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const inCart = getItemQuantity(product.id) > 0;

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    setPendingProduct({ product, quantity: product.lotSize || 1 });
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded group">
      {/* Image */}
      <Link href={productHref} className="block w-full h-full">
        <ProductImage
          src={product.imageUrl ?? product.imageUrl2 ?? product.imageUrl3 ?? product.imageUrl4 ?? product.imageUrl5}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        {/* Name + price overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 pr-12 sm:pr-12">
          <p className="text-white text-xs font-semibold leading-snug line-clamp-2 drop-shadow">
            {product.name}
          </p>
          {(cs.prezzoCosto || cs.pvp) && (
            <p className="text-white/80 text-2xs mt-1 flex gap-2 flex-wrap">
              {cs.prezzoCosto && (
                <span>Costo <span className="font-semibold">{formatCurrency((() => { const c = Number((product as any).costoIeConReso); const s = Number((product as any).costoIeSenzaReso); return c > 0 ? c : s > 0 ? s : product.costPrice; })())}</span></span>
              )}
              {cs.pvp && (
                <span>PVP <span className="font-semibold">{formatCurrency(product.retailPrice)}</span></span>
              )}
            </p>
          )}
        </div>
      </Link>

      {/* Heart — always visible, 44px touch area */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(product.id);
          setHeartPop(true);
          setTimeout(() => setHeartPop(false), 200);
        }}
        className={cn(
          'absolute top-0 left-0 w-11 h-11 flex items-center justify-center transition-transform duration-200',
          heartPop ? 'scale-125' : 'scale-100'
        )}
      >
        <Heart
          size={18}
          className={isFavorited(product.id) ? 'fill-[#374151] text-[#374151]' : 'text-white'}
          style={{ filter: isFavorited(product.id) ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
        />
      </button>

      {/* NUOVO badge — CA27 collection */}
      {cs.badgeNuovo && product.collezione?.toUpperCase() === 'CA27' && (
        <div className="absolute top-2 right-2 bg-black text-white text-2xs font-bold px-2 py-0.5 rounded-full tracking-wide">
          NUOVO
        </div>
      )}

      {/* Add button (+) — always visible on mobile, hover on desktop */}
      <button
        onClick={handleAdd}
        className={cn(
          'absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-all duration-150 active:scale-90',
          justAdded || inCart
            ? 'bg-accent text-white opacity-100'
            : 'bg-black text-white sm:opacity-0 sm:group-hover:opacity-100 opacity-100'
        )}
      >
        {justAdded ? <Check size={13} /> : <Plus size={13} />}
      </button>
    </div>
  );
}

interface Props {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductLookbook({ products, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-4">
          <Package size={24} className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">Nessun prodotto trovato</p>
      </div>
    );
  }

  // Group products into sets of 3: [large, small1, small2]
  const groups: Product[][] = [];
  for (let i = 0; i < products.length; i += 3) {
    groups.push(products.slice(i, i + 3));
  }

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => {
        const [first, second, third] = group;
        return (
          /*
           * CSS Grid layout:
           * Mobile (2 cols, row height 180px):
           *   [Large (col-span-2, full width)] row 1
           *   [Small1 (col-span-1)] [Small2 (col-span-1)] row 2
           *
           * Desktop (3 cols, row height 180px):
           *   [Large (col-span-2, row-span-2)] [Small1 (col-span-1)] row 1
           *   [Large (col-span-2, row-span-2)] [Small2 (col-span-1)] row 2
           */
          <div
            key={gi}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            style={{ gridAutoRows: '180px' }}
          >
            {/* Large card */}
            <div className="col-span-2 sm:col-span-2 sm:row-span-2">
              <LookbookCard product={first} />
            </div>

            {/* Small cards */}
            {second && (
              <div className="col-span-1">
                <LookbookCard product={second} />
              </div>
            )}
            {third && (
              <div className="col-span-1">
                <LookbookCard product={third} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
