import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRpID, getExpectedOrigin } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const userId = session.user.id;
  const userType = session.user.role === 'CUSTOMER' ? 'customer' : 'operator';

  const body: { response: any; label?: string } = await req.json();

  // Get and consume challenge
  const challenges = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM webauthn_challenges WHERE "userId" = $1 AND "userType" = $2 AND "expiresAt" > NOW()
     ORDER BY "expiresAt" DESC LIMIT 1`,
    userId,
    userType,
  );
  if (!challenges.length) {
    return NextResponse.json({ error: 'Sessione scaduta. Riprova.' }, { status: 400 });
  }
  const ch = challenges[0];
  await prisma.$executeRawUnsafe(`DELETE FROM webauthn_challenges WHERE id = $1`, ch.id);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: ch.challenge,
      expectedOrigin: getExpectedOrigin(),
      expectedRPID: getRpID(),
      requireUserVerification: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Registrazione fallita: ' + e.message }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verifica fallita' }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await prisma.$executeRawUnsafe(
    `INSERT INTO webauthn_credentials (id, "credentialId", "publicKey", counter, "deviceType", "backedUp", transports, label, ${userType === 'customer' ? '"customerId"' : '"operatorId"'}, "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    credential.id,
    credential.publicKey,
    credential.counter,
    credentialDeviceType,
    credentialBackedUp,
    body.response.response.transports?.join(',') ?? null,
    body.label ?? null,
    userId,
  );

  return NextResponse.json({ verified: true });
}
