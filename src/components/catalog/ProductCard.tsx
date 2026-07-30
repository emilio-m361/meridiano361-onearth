'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Check, AlertCircle, Layers, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatCurrency, isValidLotQuantity } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import QuantitySelector from './QuantitySelector';
import { ProductImage } from '@/components/ui/ProductImage';
import { useSettings } from '@/contexts/SettingsContext';
import SizePickerModal from '@/components/cart/SizePickerModal';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { getItemQuantity, updateQuantity, setPendingProduct, setPendingVariants } = useCartStore();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const t = useTranslations('product');
  const { card: cs } = useSettings();
  const pathname = usePathname();
  const isReadOnly = pathname.startsWith('/collezione-home');
  const productHref = pathname.startsWith('/moda')
    ? `/moda/product/${product.id}`
    : pathname.startsWith('/collezione-home')
      ? `/catalog/${product.id}?src=home`
      : `/catalog/${product.id}`;
  const cartQty = getItemQuantity(product.id);
  const [localQty, setLocalQty] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const inCart = cartQty > 0;
  const hasLotWarning = cartQty > 0 && !isValidLotQuantity(cartQty, product.lotSize);
  const hasSizeVariants = (product.sizeVariants?.length ?? 0) > 0;
  const [showSizePicker, setShowSizePicker] = useState(false);

  function handleQuantityChange(qty: number) {
    updateQuantity(product.id, qty);
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (hasSizeVariants) {
      setShowSizePicker(true);
      return;
    }
    const qty = localQty > 0 ? localQty : product.lotSize || 1;
    setLocalQty(0);
    setPendingProduct({ product, quantity: qty });
  }

  return (
    <>
    <div
      className={cn(
        'group bg-white border rounded transition-all duration-200 hover:shadow-luxury-lg flex flex-col h-full',
        inCart ? 'border-accent/50 shadow-luxury' : 'border-border',
        hasLotWarning && 'border-amber-300'
      )}
    >
      {/* Clickable area: image + code + name → product detail */}
      <Link href={productHref} className="block">
        {/* Image */}
        <div className="aspect-square relative bg-cream overflow-hidden rounded-t">
          <ProductImage
            src={product.imageUrl ?? product.imageUrl2 ?? product.imageUrl3 ?? product.imageUrl4 ?? product.imageUrl5}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Heart / favorite */}
          {cs.cuoricino && (
          <button
            onClick={(e) => {
              e.preventDefault();
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
          )}

          {/* In-cart overlay — top-right */}
          {inCart && (
            <div className="absolute top-2 right-2 bg-accent rounded-full p-1">
              <Check size={10} className="text-white" />
            </div>
          )}

          {/* LOT badge */}
          {product.lotSize > 1 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded">
              <Layers size={9} className="text-gray-500" />
              <span className="text-2xs text-gray-600 font-medium">CONF {product.lotSize}</span>
            </div>
          )}

          {/* NUOVO badge — CA27 collection */}
          {cs.badgeNuovo && product.collezione?.toUpperCase() === 'CA27' && (
            <div className="absolute bottom-2 right-2 bg-black text-white text-2xs font-bold px-2 py-0.5 rounded-full tracking-wide">
              NUOVO
            </div>
          )}
          {/* CO badge — continuativo */}
          {product.isContinuativo && !product.collezione?.toUpperCase().startsWith('CA') && (
            <div className="absolute bottom-2 right-2 bg-[#7A6A5A] text-white text-2xs font-bold px-2 py-0.5 rounded-full tracking-wide">
              CO
            </div>
          )}
        </div>

        {/* Code + Name */}
        <div className="px-3 pt-3 pb-1">
          {cs.codice && (
          <p className="text-2xs font-medium tracking-widest uppercase text-gray-600 mb-0.5">
            {product.code}
          </p>
          )}
          <h3
            className="text-xs font-medium text-primary"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '2.25rem',
              maxHeight: '2.25rem',
              lineHeight: '1.125rem',
            }}
          >
            {product.name}
          </h3>
        </div>
      </Link>

      {/* Non-navigating section: prices + cart */}
      <div className="px-3 pb-3 pt-1 flex flex-col flex-1">
        <div className="flex-1" />
        {/* Prices */}
        {isReadOnly ? (
          cs.pvp && (
            <div className="flex items-end justify-end mb-3">
              <div className="text-right">
                <p className="text-2xs text-gray-400 uppercase tracking-wide">{t('sale')}</p>
                <p className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</p>
              </div>
            </div>
          )
        ) : (cs.prezzoCosto || cs.pvp) && (
        <div className="flex items-end justify-between mb-3">
          {cs.prezzoCosto && (
          <div className="space-y-0.5">
            {(() => {
              const conReso = Number((product as any).costoIeConReso);
              const senzaReso = Number((product as any).costoIeSenzaReso);
              const hasConReso = conReso > 0;
              const hasSenzaReso = senzaReso > 0;
              if (hasConReso) return (
                <>
                  <p className="text-2xs text-gray-400 uppercase tracking-wide">Costo i.e. con reso</p>
                  <p className="text-xs font-medium text-primary">{formatCurrency(conReso)}</p>
                  {hasSenzaReso && (
                    <>
                      <p className="text-2xs text-gray-400 uppercase tracking-wide">Senza reso</p>
                      <p className="text-xs font-medium text-gray-600">{formatCurrency(senzaReso)}</p>
                    </>
                  )}
                </>
              );
              if (hasSenzaReso) return (
                <>
                  <p className="text-2xs text-gray-400 uppercase tracking-wide">{t('cost')}</p>
                  <p className="text-xs font-medium text-primary">{formatCurrency(senzaReso)}</p>
                </>
              );
              return (
                <>
                  <p className="text-2xs text-gray-400 uppercase tracking-wide">{t('cost')}</p>
                  <p className="text-xs font-medium text-primary">{formatCurrency(product.costPrice)}</p>
                </>
              );
            })()}
          </div>
          )}
          {cs.pvp && (
          <div className="text-right">
            <p className="text-2xs text-gray-400 uppercase tracking-wide">{t('sale')}</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(product.retailPrice)}
            </p>
          </div>
          )}
        </div>
        )}


        {/* Lot warning */}
        {!isReadOnly && hasLotWarning && (
          <div className="flex items-center gap-1 mb-2 p-1.5 bg-amber-50 rounded border border-amber-200">
            <AlertCircle size={11} className="text-amber-500 flex-shrink-0" />
            <p className="text-2xs text-amber-700">
              {t('adjustLot', { lotSize: product.lotSize })}
            </p>
          </div>
        )}

        {/* Cart controls */}
        {!isReadOnly && cs.aggiungi && (hasSizeVariants ? (
          <button
            onClick={handleAddToCart}
            className={cn(
              'w-full py-2 text-xs font-medium rounded transition-all duration-200',
              justAdded
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-primary text-background hover:bg-warm-darker active:scale-95'
            )}
          >
            {justAdded ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={12} /> {t('added')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingBag size={12} />
                {inCart ? `${cartQty} pz · ${t('add')}` : t('add')}
              </span>
            )}
          </button>
        ) : inCart ? (
          <QuantitySelector
            value={cartQty}
            onChange={handleQuantityChange}
            lotSize={product.lotSize}
            min={0}
          />
        ) : (
          <button
            onClick={handleAddToCart}
            className={cn(
              'w-full py-2 text-xs font-medium rounded transition-all duration-200',
              justAdded
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-primary text-background hover:bg-warm-darker active:scale-95'
            )}
          >
            {justAdded ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={12} /> {t('added')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingBag size={12} />
                {t('add')}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>

    {showSizePicker && (
      <SizePickerModal
        product={product}
        onClose={() => setShowSizePicker(false)}
        onConfirm={(variants) => {
          setPendingVariants({ product, variants });
        }}
      />
    )}
  </>
  );
}
