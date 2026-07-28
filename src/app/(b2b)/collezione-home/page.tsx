import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import HomeCollectionHome from '@/components/catalog/HomeCollectionHome';

export const metadata: Metadata = { title: 'Collezione Home — ON EARTH B2B' };

export default async function HomeCollectionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <HomeCollectionHome />;
}
