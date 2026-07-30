import { Metadata } from 'next';
import ProductDetailView from '@/components/catalog/ProductDetailView';

export const metadata: Metadata = { title: 'Prodotto — ON EARTH B2B' };

export default function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { src?: string };
}) {
  return <ProductDetailView id={params.id} readOnly={searchParams.src === 'home'} />;
}
