'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Check, Heart, Package } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductImage } from '@/components/ui/ProductImage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useSettings } from '@/contexts/SettingsContext';
import type { Product } from '@/types';

function ProductRow({ product }: { product: Product }) {
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

  const cartQty = getItemQuantity(product.id);
  const inCart = cartQty > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPendingProduct({ product, quantity: product.lotSize || 1 });
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 transition-colors hover:bg-cream/30',
        inCart && 'bg-accent/5'
      )}
    >
      {/* Thumbnail + heart */}
      <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden bg-cream">
        <Link href={productHref} className="block w-full h-full">
          <ProductImage src={product.imageUrl ?? product.imageUrl2 ?? product.imageUrl3 ?? product.imageUrl4 ?? product.imageUrl5} alt={product.name} className="w-full h-full object-cover" />
        </Link>
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
            size={14}
            className={isFavorited(product.id) ? 'fill-[#374151] text-[#374151]' : 'text-white'}
            style={{ filter: isFavorited(product.id) ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
          />
        </button>
        {inCart && (
          <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-accent rounded-full">
            <Check size={8} className="text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <Link href={productHref} className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className="text-2xs font-mono text-gray-400 tracking-wide leading-none">{product.code}</p>
          {cs.badgeNuovo && product.collezione?.toUpperCase() === 'CA27' && (
            <span className="bg-black text-white text-2xs font-bold px-1.5 py-0.5 rounded-full tracking-wide leading-none">NUOVO</span>
          )}
        </div>
        <p className="text-sm font-medium text-primary leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        {product.produttore && (
          <p className="text-2xs text-gray-400 mt-0.5 hidden sm:block">{product.produttore}</p>
        )}
      </Link>

      {/* Prices — desktop */}
      {(cs.prezzoCosto || cs.pvp) && (
      <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
        {cs.prezzoCosto && (
        <div>
          <p className="text-2xs text-gray-400 uppercase tracking-wide">Costo i.e.</p>
          <p className="text-sm font-semibold text-primary">{formatCurrency((() => { const c = Number((product as any).costoIeConReso); const s = Number((product as any).costoIeSenzaReso); return c > 0 ? c : s > 0 ? s : product.costPrice; })())}</p>
        </div>
        )}
        {cs.pvp && (
        <div>
          <p className="text-2xs text-gray-400 uppercase tracking-wide">PVP</p>
          <p className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</p>
        </div>
        )}
      </div>
      )}

      {/* Price — mobile only */}
      {(cs.prezzoCosto || cs.pvp) && (
      <div className="sm:hidden flex-shrink-0 text-right">
        {cs.prezzoCosto && (
          <p className="text-xs font-semibold text-primary">{formatCurrency((() => { const c = Number((product as any).costoIeConReso); const s = Number((product as any).costoIeSenzaReso); return c > 0 ? c : s > 0 ? s : product.costPrice; })())}</p>
        )}
        {cs.pvp && (
          <p className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</p>
        )}
      </div>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className={cn(
          'flex-shrink-0 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-all duration-150 min-w-[2.5rem]',
          justAdded
            ? 'bg-accent/20 text-accent'
            : inCart
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-primary text-white hover:bg-warm-darker active:scale-95'
        )}
      >
        {justAdded ? <Check size={11} /> : <ShoppingBag size={11} />}
        <span className="hidden sm:inline">
          {justAdded ? 'Aggiunto' : inCart ? `×${cartQty}` : 'Aggiungi'}
        </span>
      </button>
    </div>
  );
}

interface Props {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductList({ products, isLoading }: Props) {
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

  return (
    <div className="border border-border rounded overflow-hidden bg-white">
      {products.map((product) => (
        <ProductRow key={product.id} product={product} />
      ))}
    </div>
  );
}
