/**
 * Color harmony utilities for the Moda color wheel.
 * Pure functions — no side effects, no DB imports.
 */

// ── HSL conversion ────────────────────────────────────────────────────────────

export interface HSL { h: number; s: number; l: number }

export function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { h: 0, s: 0, l: 50 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h / 6) * 360;

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── Hue families ─────────────────────────────────────────────────────────────

export interface HueFamily {
  id: string;
  label: string;
  hueCenter: number;  // -1 = neutral bucket
  hexColor: string;
}

export const HUE_FAMILIES: HueFamily[] = [
  { id: 'red',          label: 'Rosso',         hueCenter: 0,   hexColor: '#E53935' },
  { id: 'red-orange',   label: 'Rosso-Arancio',  hueCenter: 30,  hexColor: '#F4511E' },
  { id: 'orange',       label: 'Arancione',      hueCenter: 60,  hexColor: '#FB8C00' },
  { id: 'yellow',       label: 'Giallo',         hueCenter: 90,  hexColor: '#FDD835' },
  { id: 'yellow-green', label: 'Giallo-Verde',   hueCenter: 120, hexColor: '#C0CA33' },
  { id: 'green',        label: 'Verde',          hueCenter: 150, hexColor: '#43A047' },
  { id: 'teal',         label: 'Teal / Acqua',   hueCenter: 180, hexColor: '#00897B' },
  { id: 'cyan',         label: 'Azzurro',        hueCenter: 210, hexColor: '#039BE5' },
  { id: 'blue',         label: 'Blu',            hueCenter: 240, hexColor: '#1E88E5' },
  { id: 'indigo',       label: 'Indaco',         hueCenter: 270, hexColor: '#5E35B1' },
  { id: 'purple',       label: 'Viola',          hueCenter: 300, hexColor: '#8E24AA' },
  { id: 'pink',         label: 'Rosa',           hueCenter: 330, hexColor: '#D81B60' },
  { id: 'neutral',      label: 'Neutri',         hueCenter: -1,  hexColor: '#9E9E9E' },
];

/**
 * Near-white and near-black colors report artificially high HSL saturation
 * because the denominator in the saturation formula approaches zero at l≈0 or l≈1.
 * Treat them as neutral regardless of the computed saturation value.
 */
export function isColorNeutral({ s, l }: HSL): boolean {
  return s < 15 || l > 90 || l < 8;
}

/** Assign a product/pantone to a hue family based on hex color. */
export function getHueFamilyId(hex: string, isNeutral = false): string {
  if (isNeutral) return 'neutral';
  const hsl = hexToHsl(hex);
  if (isColorNeutral(hsl)) return 'neutral';
  // 12 chromatic families × 30° each; shift by 15° so boundaries fall between families
  const idx = Math.floor(((hsl.h + 15) % 360) / 30);
  return HUE_FAMILIES[idx]?.id ?? 'neutral';
}

export function getHueFamily(id: string): HueFamily {
  return HUE_FAMILIES.find((f) => f.id === id) ?? HUE_FAMILIES[HUE_FAMILIES.length - 1];
}

// ── Circular hue difference ───────────────────────────────────────────────────

/** Smallest angular distance between two hues on the circle (0–180). */
export function hueDiff(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(diff, 360 - diff);
}

// ── Harmony types ─────────────────────────────────────────────────────────────

export type HarmonyType =
  | 'identical'           // Δhue ≤ 15°
  | 'analogous'           // Δhue 15–45°
  | 'split-complementary' // Δhue 150–165° or 195–210°
  | 'complementary'       // Δhue 165–195°  (~180°)
  | 'triadic'             // Δhue 105–135° or 225–255° (~120° or ~240°)
  | 'neutral'             // one or both are neutrals
  | 'discordant';         // everything else

export function getHarmonyType(
  hue1: number,
  hue2: number,
  isNeutral1: boolean,
  isNeutral2: boolean,
): HarmonyType {
  if (isNeutral1 || isNeutral2) return 'neutral';
  const diff = hueDiff(hue1, hue2);
  if (diff <= 15)  return 'identical';
  if (diff <= 45)  return 'analogous';
  if (diff >= 165 && diff <= 195) return 'complementary';
  if (diff >= 150 && diff <= 210) return 'split-complementary';
  if ((diff >= 105 && diff <= 135) || (diff >= 225 && diff <= 255)) return 'triadic';
  return 'discordant';
}

// ── Harmony score (0–100) ─────────────────────────────────────────────────────

/**
 * Returns a harmony score between two products based on their primary pantone hues.
 * Higher = better display pairing for visual merchandising.
 */
export function harmonyScore(
  hue1: number,
  hue2: number,
  isNeutral1: boolean,
  isNeutral2: boolean,
  lightness1: number,
  lightness2: number,
): number {
  const type = getHarmonyType(hue1, hue2, isNeutral1, isNeutral2);
  const lightnessDiff = Math.abs(lightness1 - lightness2);

  // Base score by harmony type
  const baseScore: Record<HarmonyType, number> = {
    neutral:             85,
    identical:           70, // too similar can be monotone
    analogous:           88,
    'split-complementary': 78,
    complementary:       90, // highest contrast/drama
    triadic:             75,
    discordant:          20,
  };

  // Bonus for different lightness values (tonal contrast improves display)
  const lightnessBonus = Math.min(15, lightnessDiff * 0.3);

  return Math.round(Math.min(100, baseScore[type] + lightnessBonus));
}

// ── Italian color name → hue fallback ────────────────────────────────────────

export const COLORE_ITALIANO_HUE: Record<string, { hex: string; isNeutral: boolean }> = {
  'rosso':        { hex: '#C62828', isNeutral: false },
  'arancione':    { hex: '#E65100', isNeutral: false },
  'corallo':      { hex: '#E85D45', isNeutral: false },
  'terracotta':   { hex: '#C66B3D', isNeutral: false },
  'ocra':         { hex: '#F57F17', isNeutral: false },
  'oro':          { hex: '#F9A825', isNeutral: false },
  'senape':       { hex: '#D4A017', isNeutral: false },
  'giallo':       { hex: '#FDD835', isNeutral: false },
  'pesca':        { hex: '#FFAB91', isNeutral: false },
  'verde acqua':  { hex: '#00897B', isNeutral: false },
  'acquamarina':  { hex: '#00ACC1', isNeutral: false },
  'turchese':     { hex: '#00838F', isNeutral: false },
  'ottanio':      { hex: '#00695C', isNeutral: false },
  'petrolio':     { hex: '#004D40', isNeutral: false },
  'menta':        { hex: '#43A047', isNeutral: false },
  'verde':        { hex: '#2E7D32', isNeutral: false },
  'azzurro':      { hex: '#0288D1', isNeutral: false },
  'blu':          { hex: '#1565C0', isNeutral: false },
  'indaco':       { hex: '#4527A0', isNeutral: false },
  'lilla':        { hex: '#AB47BC', isNeutral: false },
  'viola':        { hex: '#6A1B9A', isNeutral: false },
  'fucsia':       { hex: '#AD1457', isNeutral: false },
  'rosa':         { hex: '#E91E63', isNeutral: false },
  'bianco':       { hex: '#F5F5F5', isNeutral: true  },
  'avorio':       { hex: '#F5F0DC', isNeutral: true  },
  'panna':        { hex: '#F5EFD8', isNeutral: true  },
  'crema':        { hex: '#FFF4D4', isNeutral: true  },
  'champagne':    { hex: '#F7E7CE', isNeutral: true  },
  'ecru':         { hex: '#EDE0C8', isNeutral: true  },
  'beige':        { hex: '#C8B89A', isNeutral: true  },
  'sabbia':       { hex: '#C2B280', isNeutral: true  },
  'taupe':        { hex: '#8B7D6B', isNeutral: true  },
  'cammello':     { hex: '#C19A6B', isNeutral: true  },
  'caramello':    { hex: '#C68642', isNeutral: true  },
  'cuoio':        { hex: '#8B6345', isNeutral: true  },
  'cognac':       { hex: '#9A3E1B', isNeutral: true  },
  'bronzo':       { hex: '#CD7F32', isNeutral: true  },
  'rame':         { hex: '#B87333', isNeutral: true  },
  'ruggine':      { hex: '#8B2500', isNeutral: true  },
  'marrone':      { hex: '#795548', isNeutral: true  },
  'cioccolato':   { hex: '#3D1C02', isNeutral: true  },
  'tortora':      { hex: '#9E8E7E', isNeutral: true  },
  'kaki':         { hex: '#8B8457', isNeutral: true  },
  'militare':     { hex: '#4B5320', isNeutral: false },
  'grigio':       { hex: '#9E9E9E', isNeutral: true  },
  'antracite':    { hex: '#455A64', isNeutral: true  },
  'grafite':      { hex: '#424242', isNeutral: true  },
  'argento':      { hex: '#B0BEC5', isNeutral: true  },
  'nero':         { hex: '#212121', isNeutral: true  },
  'trasparente':  { hex: '#E0E0E0', isNeutral: true  },
  // Aggiunte
  'ciclamino':    { hex: '#FF007F', isNeutral: false },
  'violetto':     { hex: '#6A1B9A', isNeutral: false },
  'glicine':      { hex: '#9575CD', isNeutral: false },
  'malva':        { hex: '#AB47BC', isNeutral: false },
  'lavanda':      { hex: '#9575CD', isNeutral: false },
  'vinaccia':     { hex: '#880E4F', isNeutral: false },
  'zafferano':    { hex: '#F9A825', isNeutral: false },
  'safari':       { hex: '#8B8457', isNeutral: true  },
  'salvia':       { hex: '#43A047', isNeutral: false },
  'paglia':       { hex: '#C2B280', isNeutral: true  },
  'ebano':        { hex: '#212121', isNeutral: true  },
  'naturale':     { hex: '#C8B89A', isNeutral: true  },
  'ecrù':         { hex: '#EDE0C8', isNeutral: true  },
  'arancio':      { hex: '#E65100', isNeutral: false },
  'rossa':        { hex: '#C62828', isNeutral: false },
  'ghiaccio':     { hex: '#E0F7FA', isNeutral: true  },
  'salmone':      { hex: '#FFAB91', isNeutral: false },
  'celeste':      { hex: '#0288D1', isNeutral: false },
  'marina':       { hex: '#1565C0', isNeutral: false },
  'cobalto':      { hex: '#1565C0', isNeutral: false },
  'rubino':       { hex: '#C62828', isNeutral: false },
  'smeraldo':     { hex: '#2E7D32', isNeutral: false },
  'oliva':        { hex: '#4B5320', isNeutral: false },
  'lime':         { hex: '#43A047', isNeutral: false },
  'pistacchio':   { hex: '#43A047', isNeutral: false },
  'malachite':    { hex: '#00897B', isNeutral: false },
  'borgogna':     { hex: '#880E4F', isNeutral: false },
  'bordeaux':     { hex: '#880E4F', isNeutral: false },
  'amaranto':     { hex: '#AD1457', isNeutral: false },
  'mattone':      { hex: '#C62828', isNeutral: false },
  'moka':         { hex: '#795548', isNeutral: true  },
  'nocciola':     { hex: '#C68642', isNeutral: true  },
  'lampone':      { hex: '#E91E63', isNeutral: false },
  'magenta':      { hex: '#AD1457', isNeutral: false },
};

// Compound/longer keywords must precede their substrings (e.g. 'verde acqua' before 'verde')
const COLORE_KEYWORD_ORDER = [
  'verde acqua', 'acquamarina', 'turchese', 'ottanio', 'petrolio', 'menta',
  'terracotta', 'corallo', 'rosso', 'arancione', 'arancio', 'pesca', 'ocra', 'senape', 'zafferano', 'oro', 'giallo',
  'verde', 'salvia', 'oliva', 'lime', 'pistacchio', 'malachite', 'smeraldo',
  'azzurro', 'celeste', 'cobalto', 'marina', 'blu', 'indaco',
  'ciclamino', 'glicine', 'lavanda', 'lilla', 'violetto', 'viola', 'magenta', 'fucsia',
  'lampone', 'vinaccia', 'borgogna', 'bordeaux', 'amaranto', 'rubino', 'rosa',
  'militare', 'safari', 'kaki', 'antracite', 'grafite', 'grigio', 'argento',
  'paglia', 'avorio', 'panna', 'crema', 'champagne', 'ecrù', 'ecru', 'ghiaccio', 'beige', 'sabbia', 'taupe',
  'cioccolato', 'ebano', 'cognac', 'cuoio', 'caramello', 'cammello', 'bronzo', 'rame', 'ruggine', 'moka', 'nocciola', 'marrone',
  'mattone', 'tortora', 'naturale', 'salmone', 'malva',
  'bianco', 'nero', 'rossa', 'trasparente',
];

export function inferHueFromColore(
  colore: string | null | undefined,
): { hex: string; isNeutral: boolean } | null {
  if (!colore) return null;
  const key = colore.toLowerCase().trim();
  if (COLORE_ITALIANO_HUE[key]) return COLORE_ITALIANO_HUE[key];
  for (const kw of COLORE_KEYWORD_ORDER) {
    if (key.includes(kw)) return COLORE_ITALIANO_HUE[kw];
  }
  return null;
}

// ── Display group generator ───────────────────────────────────────────────────

export interface PantoneInfo {
  productId: string;
  hue: number;
  lightness: number;
  isNeutral: boolean;
  hex: string;
}

export type DisplayGroupType =
  | 'tono-su-tono'
  | 'analoghi'
  | 'complementari'
  | 'hero-neutrals'
  | 'triadico';

export interface DisplayGroupSuggestion {
  type: DisplayGroupType;
  label: string;
  description: string;
  productIds: string[];
  score: number;
}

/** Generate display-group suggestions for a "hero" product. */
export function generateDisplayGroups(
  hero: PantoneInfo,
  pool: PantoneInfo[],
  maxPerGroup = 6,
): DisplayGroupSuggestion[] {
  const others = pool.filter((p) => p.productId !== hero.productId);

  const scored = others.map((p) => ({
    ...p,
    score: harmonyScore(hero.hue, p.hue, hero.isNeutral, p.isNeutral, hero.lightness, p.lightness),
    type: getHarmonyType(hero.hue, p.hue, hero.isNeutral, p.isNeutral),
  }));

  const byType = (types: HarmonyType[]) =>
    scored
      .filter((p) => types.includes(p.type))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerGroup - 1)
      .map((p) => p.productId);

  const neutralIds = scored
    .filter((p) => p.type === 'neutral')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((p) => p.productId);

  const groups: DisplayGroupSuggestion[] = [];

  const tonoIds = byType(['identical', 'analogous']);
  if (tonoIds.length >= 1) {
    groups.push({
      type: 'tono-su-tono',
      label: 'Tono su tono',
      description: 'Colori identici o quasi — profondità monocromatica.',
      productIds: [hero.productId, ...tonoIds],
      score: 88,
    });
  }

  const analogousIds = byType(['analogous', 'split-complementary']);
  if (analogousIds.length >= 1) {
    groups.push({
      type: 'analoghi',
      label: 'Analoghi',
      description: 'Colori vicini sulla ruota — armonia morbida e naturale.',
      productIds: [hero.productId, ...analogousIds],
      score: 85,
    });
  }

  const compIds = byType(['complementary']);
  if (compIds.length >= 1) {
    groups.push({
      type: 'complementari',
      label: 'A contrasto',
      description: 'Colori opposti sulla ruota — massimo impatto visivo e tensione cromatica.',
      productIds: [hero.productId, ...compIds],
      score: 90,
    });
  }

  if (neutralIds.length >= 1) {
    groups.push({
      type: 'hero-neutrals',
      label: 'Hero + Neutri',
      description: 'Colore forte con fondali neutri — elegante e versatile.',
      productIds: [hero.productId, ...neutralIds],
      score: 82,
    });
  }

  return groups.sort((a, b) => b.score - a.score);
}
