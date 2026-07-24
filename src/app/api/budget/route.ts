/**
 * GET  /api/budget?scenarioId=xxx  — dati completi di uno scenario specifico
 * PATCH /api/budget                — aggiorna campi meta (scenarioId nel body)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON, MODA_FAMIGLIE, MODA_SUBCLASSES } from '@/lib/budget';

const FORBIDDEN  = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const NOT_FOUND  = NextResponse.json({ error: 'Scenario non trovato' }, { status: 404 });

async function guardBudget() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

function toNum(v: unknown) { return v != null ? Number(v) : null; }

export async function GET(req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId      = session.user.organizationId!;
  const scenarioId = new URL(req.url).searchParams.get('scenarioId');
  if (!scenarioId) return NOT_FOUND;

  const meta = await prisma.budgetScenarioMeta.findFirst({
    where: { id: scenarioId, organizationId: orgId, seasonCode: BUDGET_SEASON },
  });
  if (!meta) return NOT_FOUND;

  const [familyInputs, subclassData, settori] = await Promise.all([
    prisma.budgetFamilyInput.findMany({ where: { scenarioId } }),
    prisma.budgetSubclassData.findMany({ where: { scenarioId } }),
    prisma.budgetSettore.findMany({ where: { scenarioId }, orderBy: { posizione: 'asc' } }),
  ]);

  const m = meta as any;
  return NextResponse.json({
    meta: {
      id:                      meta.id,
      nome:                    meta.nome,
      seasonCode:              meta.seasonCode,
      sourceType:              m.sourceType   ?? null,
      sourceOrderId:           m.sourceOrderId ?? null,
      obiettivoTotale:         toNum(m.obiettivoTotale),
      costiNegozio:            toNum(m.costiNegozio),
      obiettivoRicavoSviluppo: toNum(m.obiettivoRicavoSviluppo),
    },
    famiglie: MODA_FAMIGLIE,
    subclassesByFamiglia: MODA_SUBCLASSES,
    familyInputs: familyInputs.map((fi) => ({
      famiglia:          fi.famiglia,
      vendutoPrevValore: toNum(fi.vendutoPrevValore),
      vendutoPrevPezzi:  fi.vendutoPrevPezzi,
      mesiConsuntivi:    fi.mesiConsuntivi,
      obiettivo:         toNum(fi.obiettivo),
      marginePieno:      toNum(fi.marginePieno),
      scontoMese5:       toNum(fi.scontoMese5),
      scontoMese6:       toNum(fi.scontoMese6),
    })),
    subclassData: subclassData.map((sd) => ({
      famiglia:    sd.famiglia,
      sottoclasse: sd.sottoclasse,
      pezziPE26:   sd.pezziPE26,
      valorePE26:  toNum(sd.valorePE26),
      continuativi: sd.continuativi,
    })),
    settori: settori.map((s) => ({
      id:        s.id,
      nome:      s.nome,
      incidenza: Number(s.incidenza),
      margine:   Number(s.margine),
      posizione: s.posizione,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body  = await req.json();
  const { scenarioId } = body;
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId mancante' }, { status: 400 });

  const meta = await prisma.budgetScenarioMeta.findFirst({
    where: { id: scenarioId, organizationId: orgId },
  });
  if (!meta) return NOT_FOUND;

  const update: Record<string, unknown> = {};
  if (typeof body.nome === 'string' && body.nome.trim()) update.nome = body.nome.trim();
  if ('obiettivoTotale'         in body) update.obiettivoTotale         = body.obiettivoTotale == null ? null : Number(body.obiettivoTotale) || null;
  if ('costiNegozio'            in body) update.costiNegozio            = body.costiNegozio    == null ? null : Number(body.costiNegozio)    || null;
  if ('obiettivoRicavoSviluppo' in body) update.obiettivoRicavoSviluppo = body.obiettivoRicavoSviluppo == null ? null : Number(body.obiettivoRicavoSviluppo) || null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nessun campo' }, { status: 400 });

  await prisma.budgetScenarioMeta.update({ where: { id: scenarioId }, data: update });

  return NextResponse.json({ ok: true });
}
