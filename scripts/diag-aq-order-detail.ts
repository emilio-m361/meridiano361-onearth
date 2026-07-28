/**
 * Dettaglio completo ordine cmrw8bl3 (totale app €3643.48)
 */
import { prisma } from '../src/lib/prisma';

const ORDER_ID_PREFIX = 'cmrw8bl3';

async function main() {
  const order = await prisma.order.findFirst({
    where: { id: { startsWith: ORDER_ID_PREFIX } },
    include: {
      items: {
        include: {
          product: {
            select: { code: true, name: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
          },
        },
      },
    },
  });

  if (!order) { console.error('Ordine non trovato'); process.exit(1); }

  console.log(`Ordine: ${order.id}`);
  console.log(`Items: ${order.items.length}\n`);
  console.log('Codice'.padEnd(22) + 'Nome'.padEnd(40) + 'qty'.padEnd(5) + 'unitPrice'.padEnd(12) + 'costPrice'.padEnd(12) + 'senzaReso'.padEnd(12) + 'conReso'.padEnd(12) + 'subtot(cost)');

  let totalUnitPrice = 0;
  let totalCostPrice = 0;
  let totalSenzaReso = 0;

  for (const it of order.items.sort((a, b) => (a.product?.code ?? '').localeCompare(b.product?.code ?? ''))) {
    const qty         = it.quantity;
    const unitPrice   = Number(it.unitPrice);
    const costPrice   = Number(it.product?.costPrice ?? 0);
    const senzaReso   = Number(it.product?.costoIeSenzaReso ?? 0);
    const conReso     = Number(it.product?.costoIeConReso ?? 0);

    totalUnitPrice += unitPrice * qty;
    totalCostPrice += costPrice * qty;
    totalSenzaReso += senzaReso * qty;

    const flag = Math.abs(unitPrice - costPrice) > 0.01 ? ' ← DIFF' : '';
    console.log(
      (it.product?.code ?? '?').padEnd(22) +
      (it.product?.name ?? '?').slice(0, 38).padEnd(40) +
      String(qty).padEnd(5) +
      unitPrice.toFixed(2).padEnd(12) +
      costPrice.toFixed(2).padEnd(12) +
      senzaReso.toFixed(2).padEnd(12) +
      conReso.toFixed(2).padEnd(12) +
      (costPrice * qty).toFixed(2) + flag
    );
  }

  console.log('\n' + '─'.repeat(130));
  console.log('TOTALE unitPrice:   ' + totalUnitPrice.toFixed(2));
  console.log('TOTALE costPrice:   ' + totalCostPrice.toFixed(2));
  console.log('TOTALE senzaReso:   ' + totalSenzaReso.toFixed(2));
  console.log('\nDemetra mostra: 3515.60');
  console.log('Diff app-Demetra:   ' + (totalCostPrice - 3515.60).toFixed(2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
