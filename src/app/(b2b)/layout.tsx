import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getPreviewFromSession } from '@/lib/preview';
import { prisma } from '@/lib/prisma';
import Header from '@/components/layout/Header';
import CartSidebarConditional from '@/components/cart/CartSidebarConditional';
import MobileNav from '@/components/layout/MobileNav';
import B2BMainWrapper from '@/components/layout/B2BMainWrapper';
import PreviewBanner from '@/components/layout/PreviewBanner';
import { PreviewProvider } from '@/contexts/PreviewContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { parseSettingsFromDb, DEFAULT_APP_SETTINGS } from '@/lib/settingsHelpers';
import PushNotificationSetup from '@/components/push/PushNotificationSetup';
import CartSetup from '@/components/cart/CartSetup';

const CATALOG_FONT_MAP: Record<string, string> = {
  inter: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  montserrat: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  lato: "'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch all app settings — double-guarded: DB miss + parse error both fall back to defaults
  let appSettings = DEFAULT_APP_SETTINGS;
  let settingsRecords: { chiave: string; valore: string }[] = [];
  try {
    settingsRecords = await prisma.appSettings.findMany();
    appSettings = parseSettingsFromDb(settingsRecords);
  } catch (e) {
    console.error('[B2BLayout] AppSettings load failed, using defaults:', e);
  }

  // Catalog font for web interface
  const catalogFontKey = settingsRecords.find((r) => r.chiave === 'catalogo.font')?.valore ?? 'inter';
  const catalogFontFamily = CATALOG_FONT_MAP[catalogFontKey] ?? CATALOG_FONT_MAP.inter;

  const previewData = getPreviewFromSession(session);
  const previewInfo = previewData
    ? {
        organizationId: previewData.organizationId,
        operatorId: previewData.operatorId,
        orgName: previewData.orgName,
        operatorName: previewData.operatorName,
      }
    : null;

  const { colori } = appSettings;

  return (
    <PreviewProvider value={previewInfo}>
      <SettingsProvider value={appSettings}>
        <div
          className="h-dvh bg-background flex flex-col"
          style={{
            fontFamily: catalogFontFamily,
            '--color-bg': colori.sfondo,
            '--color-btn': colori.pulsanti,
            '--color-btn-text': colori.testoPulsanti,
            '--color-text': colori.testo,
          } as React.CSSProperties}
        >
          {previewInfo && (
            <PreviewBanner orgName={previewInfo.orgName} operatorName={previewInfo.operatorName} />
          )}
          <Header session={session} />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <B2BMainWrapper>
              {children}
            </B2BMainWrapper>

            <CartSidebarConditional />
          </div>

          <MobileNav />
          <PushNotificationSetup />
          <CartSetup />
        </div>
      </SettingsProvider>
    </PreviewProvider>
  );
}
