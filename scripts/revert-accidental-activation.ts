/**
 * Elenca i prodotti diventati isActive=true nelle ultime N ore e li disattiva.
 *
 * Uso:
 *   npx ts-node --transpile-only scripts/revert-accidental-activation.ts
 *
 * Per cambiare la finestra temporale: modifica HOURS_AGO.
 * Per simulare senza modificare nulla: imposta DRY_RUN = true.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOURS_AGO = 3;   // cerca prodotti aggiornati nelle ultime N ore
const DRY_RUN  = false; // true = solo lista, false = disattiva davvero

async function main() {
  const since = new Date(Date.now() - HOURS_AGO * 60 * 60 * 1000);
  console.log(`\nCerco prodotti attivati dopo ${since.toLocaleString('it-IT')} (ultime ${HOURS_AGO} ore)\n`);

  const products = await prisma.product.findMany({
    where: { isActive: true, updatedAt: { gte: since } },
    select: { id: true, code: true, name: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (products.length === 0) {
    console.log('Nessun prodotto trovato in questo intervallo.');
    return;
  }

  console.log(`Trovati ${products.length} prodotti attivi aggiornati di recente:\n`);
  for (const p of products) {
    console.log(`  [${p.code}] ${p.name}  (aggiornato: ${p.updatedAt.toLocaleString('it-IT')})`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY_RUN=true — nessuna modifica eseguita.');
    return;
  }

  const ids = products.map((p) => p.id);
  const { count } = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isActive: false },
  });
  console.log(`\n✅ ${count} prodott${count === 1 ? 'o disattivato' : 'i disattivati'}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
