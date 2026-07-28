import { Suspense } from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = { title: 'Catalogo Collezione Home — ON EARTH B2B' };

const HOME_FAMIGLIE = ['Prodotti per la casa', 'Ricorrenze e regalistica'];
// Collezioni da escludere finché l'admin non le aggiunge esplicitamente
const ESCLUDI_COLLEZIONI = ['CA27', 'CA28', 'CA29', 'CA30'];

export default async function HomeCollectionCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <Suspense fallback={null}>
      <CatalogView lockedFamiglie={HOME_FAMIGLIE} excludeCollezioni={ESCLUDI_COLLEZIONI} readOnly />
    </Suspense>
  );
}
