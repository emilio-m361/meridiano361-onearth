/**
 * PUT  /api/budget/settori — sostituisce la lista settori per uno scenario
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON } from '@/lib/budget';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const scenarioId: string = body.scenarioId;
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId mancante' }, { status: 400 });

  // Verify ownership
  const meta = await prisma.budgetScenarioMeta.findFirst({
    where: { id: scenarioId, organizationId: orgId },
    select: { id: true },
  });
  if (!meta) return NextResponse.json({ error: 'Scenario non trovato' }, { status: 404 });

  const rows: { nome: string; incidenza: number; margine: number; posizione: number }[] = body.rows ?? [];

  // Deduplicate nomi per evitare violazioni del constraint unique
  const seenNomi = new Set<string>();
  const safeRows = rows.map((r, idx) => {
    let nome = (r.nome ?? '').trim() || `Settore ${idx + 1}`;
    const base = nome;
    let suffix = 2;
    while (seenNomi.has(nome.toLowerCase())) nome = `${base} ${suffix++}`;
    seenNomi.add(nome.toLowerCase());
    return { ...r, nome };
  });

  await prisma.$transaction([
    prisma.budgetSettore.deleteMany({ where: { scenarioId } }),
    ...safeRows.map((r) =>
      prisma.budgetSettore.create({
        data: {
          organizationId: orgId,
          seasonCode: BUDGET_SEASON,
          scenarioId,
          nome: r.nome,
          incidenza: r.incidenza,
          margine: r.margine,
          posizione: r.posizione,
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
