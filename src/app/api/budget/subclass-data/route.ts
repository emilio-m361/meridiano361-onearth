/**
 * PATCH /api/budget/subclass-data
 * Body: { scenarioId, famiglia, sottoclasse, pezziPE26?, valorePE26?, continuativi? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON } from '@/lib/budget';
import { nanoid } from 'nanoid';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const { scenarioId, famiglia, sottoclasse } = body;

  if (!scenarioId) return NextResponse.json({ error: 'scenarioId mancante' }, { status: 400 });
  if (!famiglia || !sottoclasse) {
    return NextResponse.json({ error: 'famiglia e sottoclasse richiesti' }, { status: 400 });
  }

  // Verify ownership
  const meta = await prisma.budgetScenarioMeta.findFirst({
    where: { id: scenarioId, organizationId: orgId },
    select: { id: true },
  });
  if (!meta) return NextResponse.json({ error: 'Scenario non trovato' }, { status: 404 });

  function intOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Math.round(Number(v));
    return isNaN(n) ? null : Math.max(0, n);
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if ('pezziPE26'    in body) data.pezziPE26    = intOrNull(body.pezziPE26);
  if ('valorePE26'   in body) data.valorePE26   = body.valorePE26 == null ? null : Number(body.valorePE26) || null;
  if ('continuativi' in body) data.continuativi = intOrNull(body.continuativi) ?? 0;

  const row = await prisma.budgetSubclassData.upsert({
    where: { scenarioId_famiglia_sottoclasse: { scenarioId, famiglia, sottoclasse } },
    create: { id: nanoid(), organizationId: orgId, seasonCode: BUDGET_SEASON, scenarioId, famiglia, sottoclasse, ...data },
    update: data,
  });

  return NextResponse.json({
    famiglia:    row.famiglia,
    sottoclasse: row.sottoclasse,
    pezziPE26:   row.pezziPE26,
    valorePE26:  row.valorePE26 != null ? Number(row.valorePE26) : null,
    continuativi: row.continuativi,
  });
}
