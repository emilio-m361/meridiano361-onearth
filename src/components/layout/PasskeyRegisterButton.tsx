'use client';

import { useState } from 'react';
import { Fingerprint, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PasskeyRegisterButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  async function register() {
    if (state !== 'idle') return;
    setState('loading');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');

      const optRes = await fetch('/api/auth/webauthn/reg-options', { method: 'POST' });
      if (!optRes.ok) {
        const d = await optRes.json();
        throw new Error(d.error ?? 'Impossibile avviare registrazione');
      }
      const options = await optRes.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (e: any) {
        if (e?.name === 'NotAllowedError' || e?.name === 'InvalidStateError') {
          setState('idle');
          return;
        }
        throw e;
      }

      const verifyRes = await fetch('/api/auth/webauthn/reg-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: credential }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error ?? 'Registrazione fallita');

      setState('done');
      toast.success('Face ID / Touch ID attivato!');
      setTimeout(() => setState('idle'), 3000);
    } catch (e: any) {
      setState('idle');
      toast.error(e?.message ?? 'Errore durante la registrazione');
    }
  }

  return (
    <button
      type="button"
      onClick={register}
      disabled={state === 'loading'}
      className="p-2.5 text-gray-400 hover:text-primary transition-colors disabled:cursor-wait"
      aria-label="Registra Face ID / Touch ID"
    >
      {state === 'loading' ? (
        <Loader2 size={17} className="animate-spin" />
      ) : state === 'done' ? (
        <Check size={17} className="text-green-500" />
      ) : (
        <Fingerprint size={17} />
      )}
    </button>
  );
}
