import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSettingsFromDb, DEFAULT_APP_SETTINGS } from '@/lib/settingsHelpers';
import LoginForm from '@/components/auth/LoginForm';
import RequestAccessButton from '@/components/auth/RequestAccessButton';
import Image from 'next/image';

export const metadata: Metadata = {
  title: { absolute: 'Accedi | OE B2B' },
  description: 'Accedi alla piattaforma ordini B2B ON EARTH',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);

  if (session) {
    const cb = searchParams?.callbackUrl;
    const dest = cb && cb.startsWith('/') ? cb : '/home';
    redirect(dest);
  }

  const callbackUrl = searchParams?.callbackUrl;

  const [t, settingsRecords] = await Promise.all([
    getTranslations('login'),
    prisma.appSettings.findMany().catch(() => []),
  ]);

  const { login: ls } = settingsRecords.length
    ? parseSettingsFromDb(settingsRecords)
    : DEFAULT_APP_SETTINGS;

  const hasImage = !!ls.sfondoUrl;

  return (
    <div className="min-h-screen bg-background flex pt-safe lg:pt-0">
      {/* Left Panel — Brand */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-16 relative overflow-hidden"
        style={hasImage
          ? { backgroundImage: `url(${ls.sfondoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
        }
      >
        {/* Overlay/texture */}
        {hasImage ? (
          <div className="absolute inset-0 bg-black/45" />
        ) : (
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #ACA39A 0px,
                #ACA39A 1px,
                transparent 1px,
                transparent 60px
              )`,
            }}
          />
        )}

        <div className="relative z-10">
          <Link href="/">
            <Image
              src="/logo-on-earth/onearth_solo_bianco.png"
              alt="On Earth"
              width={400}
              height={63}
              className="object-contain"
              priority
              quality={90}
              sizes="400px"
            />
          </Link>
        </div>

        <div className="relative z-10">
          <p className="text-white/70 text-sm font-light leading-relaxed max-w-xs">
            {ls.caption}
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 xl:px-32">
        <div className="max-w-sm w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <Link href="/">
              <Image
                src="/logo-on-earth/onearth_solo.png"
                alt="On Earth"
                width={310}
                height={49}
                className="object-contain"
                priority
                quality={90}
                sizes="310px"
              />
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-light text-primary tracking-tight">
              {ls.claim || t('claim')}
            </h2>
          </div>

          <LoginForm callbackUrl={callbackUrl} />

          <div className="mt-8 flex flex-col items-center gap-2.5 text-xs">
            <RequestAccessButton />
            <Link href="/recupera-password" className="text-accent hover:underline transition-colors">
              Ho dimenticato la password
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
