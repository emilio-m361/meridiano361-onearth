/**
 * GET  /api/budget/scenarios — lista degli scenari per org+season
 * POST /api/budget/scenarios — crea un nuovo scenario
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON } from '@/lib/budget';
import { nanoid } from 'nanoid';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET() {
  const session = await guard();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const scenarios = await prisma.budgetScenarioMeta.findMany({
    where: { organizationId: orgId, seasonCode: BUDGET_SEASON },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nome: true, sourceType: true, sourceOrderId: true, createdAt: true },
  });

  return NextResponse.json({ scenarios });
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const nome: string = (body.nome ?? '').trim() || 'Budget PE27';
  const sourceType: string = body.sourceType ?? 'MANUAL';
  const sourceOrderId: string | null = body.sourceOrderId ?? null;

  // Avoid duplicate names within the same org+season
  let finalNome = nome;
  let suffix = 2;
  while (true) {
    const existing = await prisma.budgetScenarioMeta.findFirst({
      where: { organizationId: orgId, seasonCode: BUDGET_SEASON, nome: finalNome },
    });
    if (!existing) break;
    finalNome = `${nome} ${suffix++}`;
  }

  const scenario = await prisma.budgetScenarioMeta.create({
    data: {
      id: nanoid(),
      organizationId: orgId,
      seasonCode: BUDGET_SEASON,
      nome: finalNome,
      sourceType,
      sourceOrderId,
    },
  });

  // Create a default settore so the negozio tab is usable immediately
  await prisma.budgetSettore.create({
    data: {
      organizationId: orgId,
      seasonCode: BUDGET_SEASON,
      scenarioId: scenario.id,
      nome: 'Moda PE27',
      incidenza: 0,
      margine: 0,
      posizione: 0,
    },
  });

  return NextResponse.json({
    id: scenario.id,
    nome: scenario.nome,
    sourceType: scenario.sourceType,
    sourceOrderId: scenario.sourceOrderId,
  });
}
