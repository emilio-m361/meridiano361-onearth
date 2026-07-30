/**
 * Migrazione: divide i valori colore che contengono "/" (o altri separatori)
 * nei campi colore/colore2/colore3 separati.
 *
 * Eseguire con: npx ts-node --project tsconfig.scripts.json scripts/split-colori.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEP_RE = /\s*[\/\\,]\s*|\s+e\s+/i;

function hasColorSeparator(v: string | null): boolean {
  return !!v && SEP_RE.test(v);
}

function splitColori(raw: string): [string, string, string] {
  const parts = raw.split(SEP_RE).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function main() {
  // Trova tutti i prodotti che hanno separatori in almeno uno dei tre campi colore
  const products = await prisma.product.findMany({
    select: { id: true, code: true, colore: true, colore2: true, colore3: true },
    where: {
      OR: [
        { colore: { contains: '/' } },
        { colore: { contains: '\\' } },
        { colore: { contains: ',' } },
        { colore2: { contains: '/' } },
        { colore2: { contains: '\\' } },
        { colore2: { contains: ',' } },
        { colore3: { contains: '/' } },
        { colore3: { contains: '\\' } },
        { colore3: { contains: ',' } },
      ],
    },
  });

  console.log(`Trovati ${products.length} prodotti con separatori nei campi colore.`);

  let updated = 0;
  const skipped: { code: string; colore: string | null; reason: string }[] = [];

  for (const p of products) {
    const update: Record<string, string | null> = {};

    // Se colore1 ha separatore, split e riassegna tutti e tre
    if (hasColorSeparator(p.colore)) {
      const [c1, c2, c3] = splitColori(p.colore!);
      update['colore'] = capitalizeFirst(c1) || null;

      // colore2: usa il valore splittato solo se colore2 è vuoto, altrimenti non sovrascrive
      if (!p.colore2) {
        update['colore2'] = capitalizeFirst(c2) || null;
        if (!p.colore3) {
          update['colore3'] = capitalizeFirst(c3) || null;
        }
      } else {
        // colore2 già valorizzato: non sovrascrivere, nota che terremmo solo c1
        if (c2 || c3) {
          skipped.push({
            code: p.code,
            colore: p.colore,
            reason: `colore2 già valorizzato (${p.colore2}), split non applicato a colore2/colore3`,
          });
        }
      }
    }

    // Se colore2 (da DB, non quello appena splittato) ha separatore
    if (hasColorSeparator(p.colore2) && update['colore2'] === undefined) {
      const [c2, c3] = splitColori(p.colore2!);
      update['colore2'] = capitalizeFirst(c2) || null;
      if (!p.colore3 && !update['colore3']) {
        update['colore3'] = capitalizeFirst(c3) || null;
      }
    }

    // Se colore3 ha separatore, prendi solo il primo pezzo
    if (hasColorSeparator(p.colore3) && update['colore3'] === undefined) {
      const [c3] = splitColori(p.colore3!);
      update['colore3'] = capitalizeFirst(c3) || null;
    }

    if (Object.keys(update).length > 0) {
      console.log(`  [${p.code}] colore="${p.colore}" colore2="${p.colore2}" colore3="${p.colore3}"`);
      console.log(`    → colore="${update['colore'] ?? p.colore}" colore2="${update['colore2'] ?? p.colore2}" colore3="${update['colore3'] ?? p.colore3}"`);
      await prisma.product.update({ where: { id: p.id }, data: update as any });
      updated++;
    }
  }

  console.log(`\nAggiornati: ${updated} prodotti.`);
  if (skipped.length > 0) {
    console.log(`\nAttenzione — ${skipped.length} prodotti con conflitto (colore2 già valorizzato):`);
    for (const s of skipped) {
      console.log(`  [${s.code}] ${s.reason} — colore originale: "${s.colore}"`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
