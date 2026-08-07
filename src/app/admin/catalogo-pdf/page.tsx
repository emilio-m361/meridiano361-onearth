import { Suspense } from 'react';
import { Metadata } from 'next';
import AdminCatalogoPDFPage from '@/components/admin/AdminCatalogoPDFPage';

export const metadata: Metadata = { title: 'Catalogo PDF — Admin' };

export default function CatalogoPDFPage() {
  return <Suspense><AdminCatalogoPDFPage /></Suspense>;
}
