/**
 * Diagnostica discrepanza totale Altraqualità: app vs Demetra
 */
import { prisma } from '../src/lib/prisma';

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      items: { some: { product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } } } },
    },
    include: {
      customer: { select: { companyName: true } },
      items: {
        include: {
          product: {
            select: { code: true, name: true, conferente: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
          },
        },
        where: { product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } } },
      },
    },
  });

  console.log(`Ordini con prodotti Altraqualità: ${orders.length}\n`);

  for (const order of orders) {
    const customerName = order.customer?.companyName ?? 'N/A';
    const items = order.items.filter((it) => it.product != null);

    let totalUnitPrice = 0;
    let totalCostPrice = 0;
    let totalConReso   = 0;
    let totalSenzaReso = 0;

    for (const it of items) {
      const qty         = it.quantity;
      const unitPrice   = Number(it.unitPrice);
      const costPrice   = Number(it.product!.costPrice);
      const conReso     = Number(it.product!.costoIeConReso ?? 0);
      const senzaReso   = Number(it.product!.costoIeSenzaReso ?? 0);

      totalUnitPrice += unitPrice * qty;
      totalCostPrice += costPrice * qty;
      totalConReso   += conReso  * qty;
      totalSenzaReso += senzaReso * qty;

      // Segnala discrepanze tra unitPrice e costPrice
      if (Math.abs(unitPrice - costPrice) > 0.01) {
        console.log(`  DISCREPANZA [${it.product!.code}] ${it.product!.name?.slice(0, 35)}`);
        console.log(`    unitPrice=${unitPrice.toFixed(2)}  costPrice=${costPrice.toFixed(2)}  diff=${(unitPrice-costPrice).toFixed(2)}  qty=${qty}`);
      }
    }

    console.log(`Ordine ${order.id.slice(0, 8)} — ${customerName}`);
    console.log(`  Totale unitPrice (app ora):    €${totalUnitPrice.toFixed(2)}`);
    console.log(`  Totale costPrice (= senza reso): €${totalCostPrice.toFixed(2)}`);
    console.log(`  Totale costoIeSenzaReso:        €${totalSenzaReso.toFixed(2)}`);
    console.log(`  Totale costoIeConReso:          €${totalConReso.toFixed(2)}`);
    console.log();
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
