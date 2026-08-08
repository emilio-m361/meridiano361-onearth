import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { getRpID, getExpectedOrigin, signWebAuthnToken } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  const body: { response: any } = await req.json();
  const assertion = body.response;

  // Find credential by credentialId
  const creds = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM webauthn_credentials WHERE "credentialId" = $1 LIMIT 1`,
    assertion.id,
  );
  if (!creds.length) {
    return NextResponse.json({ error: 'Credenziale non trovata' }, { status: 400 });
  }
  const cred = creds[0];

  // Find and consume challenge
  const challenges = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM webauthn_challenges WHERE "userType" = 'auth' AND "expiresAt" > NOW()
     ORDER BY "expiresAt" DESC LIMIT 1`,
  );
  if (!challenges.length) {
    return NextResponse.json({ error: 'Sessione scaduta. Riprova.' }, { status: 400 });
  }
  const ch = challenges[0];
  await prisma.$executeRawUnsafe(`DELETE FROM webauthn_challenges WHERE id = $1`, ch.id);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: ch.challenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpID(),
      credential: {
        id: cred.credentialId,
        publicKey: cred.publicKey,
        counter: Number(cred.counter),
        transports: cred.transports ? cred.transports.split(',') : undefined,
      },
      requireUserVerification: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Autenticazione biometrica fallita' }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verifica fallita' }, { status: 400 });
  }

  // Update counter
  await prisma.$executeRawUnsafe(
    `UPDATE webauthn_credentials SET counter = $1 WHERE "credentialId" = $2`,
    verification.authenticationInfo.newCounter,
    assertion.id,
  );

  const userType = cred.customerId ? 'customer' : 'operator';
  const userId = cred.customerId ?? cred.operatorId;
  const token = signWebAuthnToken(userId, userType);

  return NextResponse.json({ token, userId, userType });
}
