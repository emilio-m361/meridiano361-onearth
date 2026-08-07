import { Suspense } from 'react';
import { Metadata } from 'next';
import AdminClassificazionePage from '@/components/admin/AdminClassificazionePage';

export const metadata: Metadata = { title: 'Classificazione — Admin' };

export default function ClassificazionePage() {
  return <Suspense><AdminClassificazionePage /></Suspense>;
}
