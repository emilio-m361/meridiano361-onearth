/**
 * Auto-assign Pantone colors to a product based on color names.
 * Uses ON CONFLICT DO NOTHING — existing assignments are never overwritten.
 */

import { prisma } from '@/lib/prisma';
import { inferHueFromColore } from '@/lib/colorHarmony';

type PantoneRow = { id: bigint; hex_code: string };

function hexToRgb(hex: string) {
  const h = (hex ?? '').replace('#', '').padEnd(6, '0');
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
}

function nearestPantone(targetHex: string, pantones: PantoneRow[]): PantoneRow | null {
  let best: PantoneRow | null = null, bestDist = Infinity;
  const t = hexToRgb(targetHex);
  for (const p of pantones) {
    if (!p.hex_code) continue;
    const c = hexToRgb(p.hex_code);
    const d = Math.sqrt((t.r - c.r) ** 2 + (t.g - c.g) ** 2 + (t.b - c.b) ** 2);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

/**
 * Assigns Pantone colors to a product based on its color name fields.
 * Skips slots that already have a Pantone (ON CONFLICT DO NOTHING).
 *
 * @param productId  The product UUID
 * @param colori     Array of color name strings (colore, colore2, colore3)
 * @param pantones   Optional pre-fetched pantone list (avoids extra DB round-trip in bulk ops)
 */
export async function assignAutoPantones(
  productId: string,
  colori: (string | null | undefined)[],
  pantones?: PantoneRow[],
): Promise<void> {
  const allPantones = pantones ?? (await prisma.$queryRaw<PantoneRow[]>`SELECT id, hex_code FROM pantone_colors`);
  const seen = new Set<number>();
  let sortOrder = 0;
  for (const colore of colori) {
    if (!colore) continue;
    const hue = inferHueFromColore(colore);
    if (!hue?.hex) continue;
    const match = nearestPantone(hue.hex, allPantones);
    if (!match) continue;
    const pid = Number(match.id);
    if (seen.has(pid)) continue;
    seen.add(pid);
    await prisma.$executeRaw`
      INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary, is_auto_filled)
      VALUES (${productId}, ${BigInt(pid)}, ${sortOrder}, ${sortOrder === 0}, true)
      ON CONFLICT (product_id, pantone_color_id) DO NOTHING
    `;
    sortOrder++;
  }
}
