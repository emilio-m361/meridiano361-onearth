/**
 * Correzione mirata Blusa ACANTO:
 * costPrice era anomalo (31.97 invece di ~44€), quindi la divisione per 1.22
 * ha dato 26.20 sbagliato. Il costoIeConReso originale (46.64) era corretto
 * come prezzo IVA inclusa con reso → IE con reso = 38.23 → IE base = 38.23/1.06 = 36.07
 */
import { prisma } from '../src/lib/prisma';

const PRODUCT_CODE = 'HUBAQOEIN8031908';
const CORRECT_COST       = 36.07;  // 46.64 / 1.22 / 1.06
const CORRECT_CON_RESO   = 38.23;  // 46.64 / 1.22  (già corretto dal fix precedente)
const CORRECT_SENZA_RESO = 36.07;

async function main() {
  const product = await prisma.product.findUnique({
    where: { code: PRODUCT_CODE },
    select: { id: true, code: true, name: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
  });

  if (!product) { console.error('Prodotto non trovato'); process.exit(1); }

  console.log(`Prodotto: ${product.name}`);
  console.log(`Stato attuale:  cost=${Number(product.costPrice).toFixed(2)}  con=${Number(product.costoIeConReso).toFixed(2)}  senza=${Number(product.costoIeSenzaReso).toFixed(2)}`);
  console.log(`Stato corretto: cost=${CORRECT_COST.toFixed(2)}  con=${CORRECT_CON_RESO.toFixed(2)}  senza=${CORRECT_SENZA_RESO.toFixed(2)}`);

  // Aggiorna prodotto
  await prisma.product.update({
    where: { id: product.id },
    data: { costPrice: CORRECT_COST, costoIeConReso: CORRECT_CON_RESO, costoIeSenzaReso: CORRECT_SENZA_RESO },
  });

  // Aggiorna righe ordine
  const items = await prisma.orderItem.findMany({
    where: { productId: product.id },
    select: { id: true, quantity: true, unitPrice: true },
  });

  console.log(`\nRighe ordine trovate: ${items.length}`);
  for (const it of items) {
    console.log(`  unitPrice: ${Number(it.unitPrice).toFixed(2)} → ${CORRECT_COST.toFixed(2)}  (qty ${it.quantity})`);
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.orderItem.update({
        where: { id: it.id },
        data: { unitPrice: CORRECT_COST, subtotal: CORRECT_COST * it.quantity },
      })
    )
  );

  console.log('\nCorrezione applicata.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
