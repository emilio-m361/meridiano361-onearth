/**
 * Elimina le righe ordine di Blusa ACANTO con taglia (L/M/S/S/M/L/XL)
 * che generano codici inesistenti in Demetra (HUBAQOEIN8031908L, M, S, LX, SM)
 */
import { prisma } from '../src/lib/prisma';

const PRODUCT_CODE = 'HUBAQOEIN8031908';
const ORDER_PREFIX = 'cmrw8bl3';
const DELETE = process.argv.includes('--delete');

async function main() {
  const product = await prisma.product.findUnique({ where: { code: PRODUCT_CODE }, select: { id: true } });
  if (!product) { console.error('Prodotto non trovato'); process.exit(1); }

  const order = await prisma.order.findFirst({ where: { id: { startsWith: ORDER_PREFIX } }, select: { id: true } });
  if (!order) { console.error('Ordine non trovato'); process.exit(1); }

  const items = await prisma.orderItem.findMany({
    where: { productId: product.id, orderId: order.id },
    select: { id: true, taglia: true, quantity: true, unitPrice: true },
    orderBy: { taglia: 'asc' },
  });

  console.log(`Righe ACANTO in ordine ${ORDER_PREFIX}: ${items.length}\n`);
  for (const it of items) {
    const code = it.taglia ? `${PRODUCT_CODE}${it.taglia === 'S/M' ? 'SM' : it.taglia === 'L/XL' ? 'LX' : it.taglia}` : PRODUCT_CODE;
    console.log(`  taglia="${it.taglia ?? ''}" → "${code}"  qty=${it.quantity}  €${(Number(it.unitPrice)*it.quantity).toFixed(2)}  ${!it.taglia ? '✓ valido' : '✗ da eliminare'}`);
  }

  // Elimina solo le righe con taglia singola (L, M, S) — non S/M e L/XL che esistono in Demetra
  const INVALID_TAGLIE = ['S', 'M', 'L', 'XL', 'XXL', 'L/XL', 'S/M'];
  const toDelete = items.filter(it => it.taglia && INVALID_TAGLIE.includes(it.taglia.toUpperCase()));
  const total = toDelete.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  console.log(`\nRighe da eliminare: ${toDelete.length}  totale €${total.toFixed(2)}`);

  if (DELETE) {
    await prisma.orderItem.deleteMany({ where: { id: { in: toDelete.map(it => it.id) } } });
    console.log('Eliminate.');
  } else {
    console.log('Aggiungi --delete per eliminare.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
