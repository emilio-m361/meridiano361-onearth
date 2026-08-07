import { Suspense } from 'react';
import AdminAnalyticsPage from '@/components/admin/AdminAnalyticsPage';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Analytics accessi — Admin' };

export default function Page() {
  return <Suspense><AdminAnalyticsPage /></Suspense>;
}
