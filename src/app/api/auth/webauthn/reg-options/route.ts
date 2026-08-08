import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRpID } from '@/lib/webauthn';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const userId = session.user.id;
  const userType = session.user.role === 'CUSTOMER' ? 'customer' : 'operator';
  const email = session.user.email ?? '';

  // Fetch existing credentials to exclude
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "credentialId" FROM webauthn_credentials WHERE ${userType === 'customer' ? '"customerId"' : '"operatorId"'} = $1`,
    userId,
  );

  const options = await generateRegistrationOptions({
    rpName: 'ON EARTH B2B',
    rpID: getRpID(),
    userName: email,
    userDisplayName: session.user.companyName ?? email,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.credentialId })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    timeout: 60_000,
  });

  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO webauthn_challenges (id, "userId", "userType", challenge, "expiresAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4)`,
    userId,
    userType,
    options.challenge,
    expiresAt,
  );

  return NextResponse.json(options);
}
