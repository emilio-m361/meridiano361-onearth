import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Color mapping (inlined from colorHarmony.ts) ──────────────────────────────

const COLORE_HUE: Record<string, string> = {
  'rosso': '#C62828', 'arancione': '#E65100', 'corallo': '#E85D45',
  'terracotta': '#C66B3D', 'ocra': '#F57F17', 'oro': '#F9A825',
  'senape': '#D4A017', 'giallo': '#FDD835', 'pesca': '#FFAB91',
  'verde acqua': '#00897B', 'acquamarina': '#00ACC1', 'turchese': '#00838F',
  'ottanio': '#00695C', 'petrolio': '#004D40', 'menta': '#43A047',
  'verde': '#2E7D32', 'azzurro': '#0288D1', 'blu': '#1565C0',
  'indaco': '#4527A0', 'lilla': '#AB47BC', 'viola': '#6A1B9A',
  'fucsia': '#AD1457', 'rosa': '#E91E63',
  'bianco': '#F5F5F5', 'avorio': '#F5F0DC', 'panna': '#F5EFD8',
  'crema': '#FFF4D4', 'champagne': '#F7E7CE', 'ecru': '#EDE0C8',
  'beige': '#C8B89A', 'sabbia': '#C2B280', 'taupe': '#8B7D6B',
  'cammello': '#C19A6B', 'caramello': '#C68642', 'cuoio': '#8B6345',
  'cognac': '#9A3E1B', 'bronzo': '#CD7F32', 'rame': '#B87333',
  'ruggine': '#8B2500', 'marrone': '#795548', 'cioccolato': '#3D1C02',
  'tortora': '#9E8E7E', 'kaki': '#8B8457', 'militare': '#4B5320',
  'grigio': '#9E9E9E', 'antracite': '#455A64', 'grafite': '#424242',
  'argento': '#B0BEC5', 'nero': '#212121', 'trasparente': '#E0E0E0',
  'naturale': '#C8B89A', 'mattone': '#C62828', 'borgogna': '#880E4F',
  'bordeaux': '#880E4F', 'amaranto': '#AD1457', 'magenta': '#AD1457',
  'lampone': '#E91E63', 'malva': '#AB47BC', 'lavanda': '#9575CD',
  'moka': '#795548', 'nocciola': '#C68642', 'tabacco': '#8B6345',
  'acqua': '#00ACC1', 'salmone': '#FFAB91', 'ghiaccio': '#E0F7FA',
  'celeste': '#0288D1', 'marina': '#1565C0', 'cobalto': '#1565C0',
  'rubino': '#C62828', 'smeraldo': '#2E7D32', 'oliva': '#4B5320',
  'lime': '#43A047', 'pistacchio': '#43A047', 'malachite': '#00897B',
  'ciclamino': '#FF007F', 'violetto': '#6A1B9A', 'glicine': '#9575CD',
  'vinaccia': '#880E4F', 'zafferano': '#F9A825', 'safari': '#8B8457',
  'salvia': '#43A047', 'paglia': '#C2B280', 'ebano': '#212121',
  'ecrù': '#EDE0C8', 'arancio': '#E65100', 'rossa': '#C62828',
  'toni freddi': '#9E9E9E', 'toni caldi': '#E65100', 'toni azzurri': '#0288D1',
  'naturali': '#C8B89A',
};

const KEYWORD_ORDER = [
  'verde acqua', 'acquamarina', 'turchese', 'ottanio', 'petrolio', 'menta',
  'terracotta', 'corallo', 'rosso', 'arancione', 'arancio', 'pesca', 'ocra', 'senape', 'zafferano', 'oro', 'giallo',
  'verde', 'salvia', 'oliva', 'lime', 'pistacchio', 'malachite', 'smeraldo',
  'azzurro', 'celeste', 'cobalto', 'marina', 'blu', 'indaco',
  'ciclamino', 'glicine', 'lavanda', 'lilla', 'violetto', 'viola', 'magenta', 'fucsia',
  'lampone', 'vinaccia', 'borgogna', 'bordeaux', 'amaranto', 'rubino', 'rosa',
  'militare', 'safari', 'kaki', 'antracite', 'grafite', 'grigio', 'argento',
  'paglia', 'avorio', 'panna', 'crema', 'champagne', 'ecrù', 'ecru', 'ghiaccio', 'beige', 'sabbia', 'taupe',
  'cioccolato', 'ebano', 'cognac', 'cuoio', 'caramello', 'cammello', 'bronzo', 'rame', 'ruggine', 'moka', 'nocciola', 'marrone',
  'mattone', 'tortora', 'naturale', 'salmone', 'malva', 'tabacco',
  'toni freddi', 'toni caldi', 'toni azzurri', 'naturali',
  'bianco', 'nero', 'rossa', 'trasparente',
];

function inferHex(colore: string | null | undefined): string | null {
  if (!colore) return null;
  const key = colore.toLowerCase().trim();
  if (COLORE_HUE[key]) return COLORE_HUE[key];
  for (const kw of KEYWORD_ORDER) {
    if (key.includes(kw)) return COLORE_HUE[kw] ?? null;
  }
  return null;
}

// ── Pantone nearest-match ─────────────────────────────────────────────────────

type PRow = { id: bigint; hex_code: string };

function hexToRgb(hex: string) {
  const h = hex.replace('#', '').padEnd(6, '0');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function nearest(targetHex: string, pantones: PRow[]): PRow | null {
  let best: PRow | null = null, bestDist = Infinity;
  const t = hexToRgb(targetHex);
  for (const p of pantones) {
    if (!p.hex_code) continue;
    const c = hexToRgb(p.hex_code);
    const d = (t.r - c.r) ** 2 + (t.g - c.g) ** 2 + (t.b - c.b) ** 2;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const allPantones = await prisma.$queryRaw<PRow[]>`
    SELECT id, hex_code FROM pantone_colors WHERE hex_code IS NOT NULL AND hex_code != ''
  `;
  console.log(`Pantoni disponibili: ${allPantones.length}`);

  const products = await prisma.$queryRaw<{ id: string; colore: string | null; colore2: string | null; colore3: string | null }[]>`
    SELECT p.id, p.colore, p.colore2, p.colore3
    FROM products p
    WHERE (p.colore IS NOT NULL AND p.colore != '')
      AND NOT EXISTS (SELECT 1 FROM product_pantones pp WHERE pp.product_id = p.id)
  `;
  console.log(`Prodotti senza Pantone: ${products.length}`);

  let updated = 0;
  let skipped = 0;
  const unmapped = new Map<string, number>();

  for (const prod of products) {
    const colori = [prod.colore, prod.colore2, prod.colore3];
    const seen = new Set<number>();
    let sortOrder = 0;

    for (const col of colori) {
      if (!col) continue;
      const hex = inferHex(col);
      if (!hex) {
        unmapped.set(col, (unmapped.get(col) ?? 0) + 1);
        continue;
      }
      const match = nearest(hex, allPantones);
      if (!match) continue;
      const pid = Number(match.id);
      if (seen.has(pid)) continue;
      seen.add(pid);
      await prisma.$executeRaw`
        INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary, is_auto_filled)
        VALUES (${prod.id}, ${BigInt(pid)}, ${sortOrder}, ${sortOrder === 0}, true)
        ON CONFLICT (product_id, pantone_color_id) DO NOTHING
      `;
      sortOrder++;
    }

    if (sortOrder > 0) updated++; else skipped++;
  }

  console.log(`\nAggiornati: ${updated}`);
  console.log(`Saltati (colore non riconoscibile): ${skipped}`);

  if (unmapped.size > 0) {
    const top = [...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log(`\nColori non mappati (aggiungi a colorHarmony.ts):`);
    top.forEach(([c, n]) => console.log(`  "${c}" — ${n} prodotti`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
