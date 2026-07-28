/**
 * Totale solo prodotti Altraqualità nell'ordine cmrw8bl3
 * Confronto con Demetra €3.515,60
 */
import { prisma } from '../src/lib/prisma';

const ORDER_ID_PREFIX = 'cmrw8bl3';
const DEMETRA = 3515.60;

async function main() {
  const order = await prisma.order.findFirst({
    where: { id: { startsWith: ORDER_ID_PREFIX } },
    include: {
      items: {
        include: {
          product: {
            select: { code: true, name: true, conferente: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
          },
        },
      },
    },
  });

  if (!order) { console.error('Ordine non trovato'); process.exit(1); }

  const aqItems = order.items.filter(it =>
    it.product?.conferente?.toLowerCase().includes('altraqualit')
  );

  console.log(`Altraqualità items: ${aqItems.length}\n`);
  console.log('Codice'.padEnd(22) + 'Nome'.padEnd(40) + 'qty'.padEnd(5) + 'unitPrice'.padEnd(12) + 'costPrice'.padEnd(12) + 'senzaReso'.padEnd(12) + 'Δ(unit-cost)');

  let totalUnitPrice  = 0;
  let totalCostPrice  = 0;
  let totalSenzaReso  = 0;

  const sorted = [...aqItems].sort((a, b) => (a.product?.code ?? '').localeCompare(b.product?.code ?? ''));
  for (const it of sorted) {
    const qty       = it.quantity;
    const unitPrice = Number(it.unitPrice);
    const cost      = Number(it.product?.costPrice ?? 0);
    const senza     = Number(it.product?.costoIeSenzaReso ?? 0);
    totalUnitPrice += unitPrice * qty;
    totalCostPrice += cost     * qty;
    totalSenzaReso += senza    * qty;

    const delta = unitPrice - cost;
    const flag = Math.abs(delta) > 0.01 ? ` ← Δ${delta.toFixed(2)}` : '';
    console.log(
      (it.product?.code ?? '').padEnd(22) +
      (it.product?.name ?? '').slice(0, 38).padEnd(40) +
      String(qty).padEnd(5) +
      unitPrice.toFixed(2).padEnd(12) +
      cost.toFixed(2).padEnd(12) +
      senza.toFixed(2).padEnd(12) +
      flag
    );
  }

  console.log('\n' + '─'.repeat(120));
  console.log(`Totale unitPrice  (app-default): €${totalUnitPrice.toFixed(2)}`);
  console.log(`Totale costPrice  (senza reso):  €${totalCostPrice.toFixed(2)}`);
  console.log(`Totale senzaReso:                €${totalSenzaReso.toFixed(2)}`);
  console.log(`Demetra:                         €${DEMETRA.toFixed(2)}`);
  console.log(`Diff (costPrice - Demetra):      €${(totalCostPrice - DEMETRA).toFixed(2)}`);
  console.log(`Diff (senzaReso - Demetra):      €${(totalSenzaReso - DEMETRA).toFixed(2)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
