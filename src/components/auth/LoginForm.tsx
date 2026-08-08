'use client';

import { useState, useMemo } from 'react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

type LoginValues = { email: string; password: string };

export default function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailError')),
        password: z.string().min(1, t('passwordError')),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginValues) {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error === 'CredentialsSignin' ? t('errorInvalid') : result.error);
        return;
      }

      const dest = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/home';
      window.location.href = dest;
    } catch {
      toast.error(t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  }

  async function onBiometricLogin() {
    setIsBiometricLoading(true);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');

      const optRes = await fetch('/api/auth/webauthn/auth-options', { method: 'POST' });
      if (!optRes.ok) throw new Error('Impossibile avviare autenticazione');
      const options = await optRes.json();

      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: options });
      } catch (e: any) {
        if (e?.name === 'NotAllowedError') return; // user cancelled
        throw e;
      }

      const verifyRes = await fetch('/api/auth/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Verifica fallita');

      const { token, userId, userType } = verifyData;
      const result = await signIn('webauthn', { token, userId, userType, redirect: false });
      if (result?.error) throw new Error('Accesso fallito');

      const dest = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/home';
      window.location.href = dest;
    } catch (e: any) {
      toast.error(e?.message ?? 'Autenticazione biometrica non riuscita');
    } finally {
      setIsBiometricLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          {t('emailLabel')}
        </label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder=""
          className="w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          {t('passwordLabel')}
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder=""
            className="w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-primary text-background text-sm font-semibold tracking-wide rounded transition-all duration-150 hover:bg-warm-darker disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('loading')}
          </>
        ) : (
          t('submit')
        )}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-gray-400">oppure</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={onBiometricLogin}
        disabled={isBiometricLoading}
        className="w-full py-3 border border-border rounded text-sm text-primary font-medium transition-all duration-150 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isBiometricLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Fingerprint size={18} />
        )}
        Accedi con Face ID / Touch ID
      </button>
    </form>
  );
}
