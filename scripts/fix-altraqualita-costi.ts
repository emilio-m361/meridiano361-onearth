/**
 * Fix prezzi Altraqualità: tutti i campi costo erano IVA inclusa (×1.22).
 *
 * Uso:
 *   npx tsx scripts/fix-altraqualita-costi.ts          # dry-run
 *   npx tsx scripts/fix-altraqualita-costi.ts --fix    # applica
 */
import { prisma } from '../src/lib/prisma';

const DRY_RUN = !process.argv.includes('--fix');
const IVA = 1.22;

function round2(v: number) { return Math.round(v * 100) / 100; }

async function main() {
  if (DRY_RUN) console.log('=== DRY-RUN (aggiungi --fix per applicare) ===\n');

  // ── 1. Leggi prodotti Altraqualità ─────────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { conferente: { contains: 'altraqualit', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Prodotti Altraqualità: ${products.length}\n`);

  const productFixes = products.map((p) => {
    const old_cost  = Number(p.costPrice);
    const old_con   = p.costoIeConReso != null ? Number(p.costoIeConReso) : null;
    const old_senza = p.costoIeSenzaReso != null ? Number(p.costoIeSenzaReso) : null;
    return {
      id:          p.id,
      code:        p.code,
      name:        p.name,
      new_cost:    round2(old_cost  / IVA),
      new_con:     old_con   != null ? round2(old_con   / IVA) : null,
      new_senza:   old_senza != null ? round2(old_senza / IVA) : null,
    };
  });

  for (const f of productFixes) {
    console.log(`[${f.code}] ${f.name.slice(0, 38).padEnd(38)}  cost→${f.new_cost.toFixed(2)}  con→${f.new_con?.toFixed(2) ?? 'NULL'}`);
  }

  // ── 2. Leggi righe ordine ──────────────────────────────────────────────────
  const items = await prisma.orderItem.findMany({
    where: { product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } } },
    include: { product: { select: { id: true, costPrice: true } } },
  });

  console.log(`\nRighe ordine Altraqualità: ${items.length}`);
  const oldTotal = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);

  // new unitPrice = product.costPrice / 1.22 (IE senza reso, prezzo base)
  const newTotal = items.reduce((s, it) => {
    const newPrice = round2(Number(it.product!.costPrice) / IVA);
    return s + newPrice * it.quantity;
  }, 0);

  console.log(`Totale attuale  (unitPrice):         €${oldTotal.toFixed(2)}`);
  console.log(`Totale corretto (costPrice / 1.22):  €${newTotal.toFixed(2)}`);

  if (!DRY_RUN) {
    console.log('\nApplico fix prodotti...');
    let nProd = 0;
    await prisma.$transaction(
      productFixes.map((f) =>
        prisma.product.update({
          where: { id: f.id },
          data: {
            costPrice:        f.new_cost,
            costoIeConReso:   f.new_con,
            costoIeSenzaReso: f.new_senza,
          },
        })
      )
    );
    nProd = productFixes.length;
    console.log(`  Prodotti aggiornati: ${nProd}`);

    console.log('Applico fix righe ordine...');
    let nItems = 0;
    await prisma.$transaction(
      items.map((it) => {
        const newPrice = round2(Number(it.product!.costPrice) / IVA);
        return prisma.orderItem.update({
          where: { id: it.id },
          data: { unitPrice: newPrice, subtotal: newPrice * it.quantity },
        });
      })
    );
    nItems = items.length;
    console.log(`  Righe ordine aggiornate: ${nItems}`);

    // Verifica finale
    const finalItems = await prisma.orderItem.findMany({
      where: { product: { conferente: { contains: 'altraqualit', mode: 'insensitive' } } },
      select: { unitPrice: true, quantity: true },
    });
    const finalTotal = finalItems.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
    console.log(`\nTotale finale: €${finalTotal.toFixed(2)}`);
    console.log('Fix completato.');
  } else {
    console.log('\nEsegui con --fix per applicare le modifiche.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
