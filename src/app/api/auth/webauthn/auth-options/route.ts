import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { getRpID } from '@/lib/webauthn';

export async function POST() {
  const challenge = await generateAuthenticationOptions({
    rpID: getRpID(),
    userVerification: 'required',
    allowCredentials: [],
    timeout: 60_000,
  });

  const expiresAt = new Date(Date.now() + 5 * 60_000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO webauthn_challenges (id, "userId", "userType", challenge, "expiresAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4)`,
    '_pending',
    'auth',
    challenge.challenge,
    expiresAt,
  );

  return NextResponse.json(challenge);
}
