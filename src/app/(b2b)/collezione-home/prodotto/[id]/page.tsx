import ProductDetailView from '@/components/catalog/ProductDetailView';

export default function HomeCollectionProductPage({ params }: { params: { id: string } }) {
  return <ProductDetailView id={params.id} readOnly />;
}
