import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET!;

/** Hostname usato come rpID (es. "localhost" o "onearth.it") */
export function getRpID(): string {
  const url = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
}

/** Origin atteso per la verifica WebAuthn */
export function getExpectedOrigin(): string {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

/** Crea un token HMAC-SHA256 monouso con scadenza 90 secondi. */
export function signWebAuthnToken(userId: string, userType: string): string {
  const exp = Date.now() + 90_000;
  const payload = `${userId}:${userType}:${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

/** Verifica il token. Ritorna { userId, userType } o lancia errore. */
export function verifyWebAuthnToken(token: string): { userId: string; userType: string } {
  const parts = token.split(':');
  if (parts.length !== 4) throw new Error('invalid');
  const [userId, userType, expStr, sig] = parts;
  const payload = `${userId}:${userType}:${expStr}`;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new Error('invalid signature');
  }
  if (Date.now() > Number(expStr)) throw new Error('expired');
  return { userId, userType };
}
