/**
 * Diagnostica: controlla i unitPrice delle righe ordine per prodotti Altraqualità
 */
import { prisma } from '../src/lib/prisma';

async function main() {
  const items = await prisma.orderItem.findMany({
    where: {
      product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } },
    },
    include: {
      product: { select: { code: true, name: true, costPrice: true, conferente: true } },
      order: { select: { id: true, status: true } },
    },
    take: 20,
  });

  console.log(`Trovate ${items.length} righe ordine Altraqualità (max 20)\n`);

  for (const it of items) {
    const unitPrice = Number(it.unitPrice);
    const costPrice = Number(it.product?.costPrice);
    const ratio = costPrice > 0 ? (unitPrice / costPrice).toFixed(3) : '?';
    const iePrice = unitPrice / 1.22;
    console.log(`[${it.product?.code}] ${it.product?.name?.slice(0, 35)}`);
    console.log(`  unitPrice=${unitPrice.toFixed(2)}  costPrice=${costPrice.toFixed(2)}  ratio=${ratio}  IE_corretto=${iePrice.toFixed(2)}`);
  }

  // Stima totale ordine se unitPrice è IVA inclusa vs IE corretto
  const allItems = await prisma.orderItem.findMany({
    where: {
      product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } },
      order: { status: { not: 'CANCELLED' } },
    },
    include: { product: { select: { costPrice: true } } },
  });

  const totalUnitPrice = allItems.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const totalIE = allItems.reduce((s, it) => s + (Number(it.unitPrice) / 1.22) * it.quantity, 0);
  console.log(`\nTotale con unitPrice attuale: ${totalUnitPrice.toFixed(2)}`);
  console.log(`Totale con unitPrice / 1.22:  ${totalIE.toFixed(2)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
