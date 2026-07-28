import { Suspense } from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = { title: 'Catalogo Collezione Home — ON EARTH B2B' };

const HOME_FAMIGLIE = ['Prodotti per la casa', 'Ricorrenze e regalistica'];

export default async function HomeCollectionCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <Suspense fallback={null}>
      <CatalogView lockedFamiglie={HOME_FAMIGLIE} readOnly />
    </Suspense>
  );
}
