/**
 * GET /api/budget/order-data
 * Returns aggregated order data grouped by (conferente, famiglia, sottoclasse).
 *
 * ?orderId=xxx  → only that specific order (must belong to caller's org)
 * (no param)    → all non-cancelled MODA PE27 orders for the org
 *                 + DRAFT MODA carts for the current operator
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_BRANCH_ID } from '@/lib/modaAccess';
import { MODA_FAMIGLIE, BUDGET_SEASON } from '@/lib/budget';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

type AggRow = { conferente: string; famiglia: string; sottoclasse: string; pezzi: number; imponibile: number; retailStimato: number };

function effectiveCost(p: { costoIeConReso: any; costoIeSenzaReso: any }, unitPrice: number, choice?: 'con' | 'senza'): number {
  const con = Number(p.costoIeConReso);
  const sen = Number(p.costoIeSenzaReso);
  if (choice === 'senza' && sen > 0) return sen;
  if (choice === 'con'   && con > 0) return con;
  if (con > 0) return con;
  if (sen > 0) return sen;
  return unitPrice;
}

function makeAgg() {
  const agg = new Map<string, AggRow>();

  function add(
    conferente: string | null,
    famiglia: string | null,
    sottoclasse: string | null,
    quantity: number,
    unitPrice: number,
    retailPrice: number,
  ) {
    const c = conferente  || 'N/D';
    const f = famiglia    || 'N/D';
    const s = sottoclasse || 'N/D';
    const key = `${c}|${f}|${s}`;
    const existing = agg.get(key);
    if (existing) {
      existing.pezzi        += quantity;
      existing.imponibile   += unitPrice * quantity;
      existing.retailStimato += retailPrice * quantity;
    } else {
      agg.set(key, { conferente: c, famiglia: f, sottoclasse: s, pezzi: quantity, imponibile: unitPrice * quantity, retailStimato: retailPrice * quantity });
    }
  }

  return { add, values: () => Array.from(agg.values()) };
}

const ITEM_SELECT = {
  quantity: true,
  unitPrice: true,
  product: {
    select: {
      conferente: true,
      famiglia: true,
      sottoclasse: true,
      retailPrice: true,
      costoIeConReso: true,
      costoIeSenzaReso: true,
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId      = session.user.organizationId!;
  const operatorId = session.user.id;
  const url        = new URL(req.url);
  const orderId    = url.searchParams.get('orderId');
  const resoChoicesParam = url.searchParams.get('resoChoices');
  const resoChoices: Record<string, 'con' | 'senza'> = resoChoicesParam ? JSON.parse(resoChoicesParam) : {};
  const { add, values } = makeAgg();

  if (orderId) {
    // Single-order mode: verify ownership then aggregate only that order
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          id: orderId,
          organizationId: orgId,
          catalogBranch: MODA_BRANCH_ID,
          status: { not: 'ANNULLATO' },
        },
      },
      select: ITEM_SELECT,
    });

    for (const it of orderItems) {
      const p = it.product;
      const choice = resoChoices[p.conferente || '—'];
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, effectiveCost(p, Number(it.unitPrice), choice), p.retailPrice != null ? Number(p.retailPrice) : 0);
    }
  } else {
    // All-orders mode: all non-cancelled org orders containing PE27 MODA products
    // Filter by product famiglia/collezione rather than order.catalogBranch
    // to be robust regardless of how the order was created.
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { organizationId: orgId, status: { not: 'ANNULLATO' } },
        product: { famiglia: { in: [...MODA_FAMIGLIE] }, collezione: BUDGET_SEASON },
      },
      select: ITEM_SELECT,
    });

    for (const it of orderItems) {
      const p = it.product;
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, effectiveCost(p, Number(it.unitPrice)), p.retailPrice != null ? Number(p.retailPrice) : 0);
    }

    // Also include DRAFT MODA carts for the current operator
    const cartItems = await prisma.cartItem.findMany({
      where: {
        cart: { operatorId, collectionId: 'moda', status: 'DRAFT' },
        product: { famiglia: { in: [...MODA_FAMIGLIE] }, collezione: BUDGET_SEASON },
      },
      select: ITEM_SELECT,
    });

    for (const it of cartItems) {
      const p = it.product;
      const con = Number(p.costoIeConReso);
      const sen = Number(p.costoIeSenzaReso);
      const unitPrice = con > 0 ? con : sen > 0 ? sen : 0;
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, unitPrice, p.retailPrice != null ? Number(p.retailPrice) : 0);
    }
  }

  return NextResponse.json({ data: values() });
}
