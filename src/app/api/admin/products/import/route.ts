import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { titleCase } from '@/lib/normalizeClassification';
import { syncManyProductClassifications } from '@/lib/syncClassification';
import { splitColori, hasColorSeparator } from '@/lib/coloriUtils';
import { assignAutoPantones } from '@/lib/autoPantone';

type PantoneRow = { id: bigint; hex_code: string };

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseDecimal(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return isNaN(n) ? undefined : n;
}

function parseIntField(v: any, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = parseInt(String(v));
  return isNaN(n) ? fallback : n;
}

function parseBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return undefined;
}

function str(v: any): string | null {
  if (v === undefined || v === null || v === '') return null;
  return String(v).trim() || null;
}

// Returns `undefined` if the field is absent from the row (skip), or a Prisma-ready value otherwise
function buildFieldValue(campo: string, row: any): unknown {
  switch (campo) {
    case 'name':
      return row.name !== undefined ? String(row.name).trim() || null : undefined;
    case 'produttore':
      return row.produttore !== undefined
        ? (row.produttore ? titleCase(String(row.produttore).trim()) || null : null)
        : undefined;
    case 'paese':       return str(row.paese);
    case 'misura':      return str(row.misura);
    case 'gruppoMerceologico': return str(row.gruppoMerceologico);
    case 'famiglia':    return str(row.famiglia);
    case 'classe':      return str(row.classe);
    case 'sottoclasse': return str(row.sottoclasse);
    case 'gruppoOmogeneo': return str(row.gruppoOmogeneo);
    case 'nomLinea':    { const v = str(row.nomLinea); return v ? v.toUpperCase() : null; }
    case 'stagione':    return str(row.stagione);
    case 'collezione':
      return row.collezione !== undefined
        ? (str(row.collezione)?.toUpperCase() ?? null)
        : undefined;
    case 'colore': {
      const raw = str(row.colore);
      // Split returned later via buildColorFields; here return the raw value
      return raw;
    }
    case 'temaColore':  return str(row.temaColore);
    case 'tranche':     return str(row.tranche);
    case 'lotSize':
      return row.lotSize !== undefined ? parseIntField(row.lotSize, 1) : undefined;
    case 'iva':
      return row.iva !== undefined ? parseIntField(row.iva, 22) : undefined;
    case 'costPrice': {
      if (row.costPrice === undefined) return undefined;
      return parseDecimal(row.costPrice);
    }
    case 'retailPrice': {
      if (row.retailPrice === undefined) return undefined;
      return parseDecimal(row.retailPrice);
    }
    case 'fasciaRicarico': return str(row.fasciaRicarico);
    case 'fasciaSconto':
      return row.fasciaSconto !== undefined ? (parseDecimal(row.fasciaSconto) ?? null) : undefined;
    case 'notes':       return str(row.notes);
    case 'description': return str(row.description);
    case 'isActive': {
      if (row.isActive === undefined) return undefined;
      const b = parseBool(row.isActive);
      return b !== undefined ? b : undefined;
    }
    case 'imageUrl': return str(row.imageUrl);
    case 'code':
      return row.code !== undefined ? (String(row.code).toUpperCase().trim() || null) : undefined;
    // ── MODA ──────────────────────────────────────────────────────────────────
    case 'modello':      return str(row.modello);
    case 'dettaglio':    return str(row.dettaglio);
    case 'forma':        return str(row.forma);
    case 'materiale1':   return str(row.materiale1);
    case 'materiale2':   return str(row.materiale2);
    case 'materiale3':   return str(row.materiale3);
    case 'colore2':      return str(row.colore2);
    case 'colore3':      return str(row.colore3);
    case 'altriColori':  return str(row.altriColori);
    case 'composizione': return str(row.composizione);
    case 'fantasia':     { const v = str(row.fantasia); return v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : null; }
    case 'lavorazione':  return str(row.lavorazione);
    case 'bloccoColore': return str(row.bloccoColore);
    case 'costoIeConReso':
      return row.costoIeConReso !== undefined ? (parseDecimal(row.costoIeConReso) ?? null) : undefined;
    case 'costoIeSenzaReso':
      return row.costoIeSenzaReso !== undefined ? (parseDecimal(row.costoIeSenzaReso) ?? null) : undefined;
    case 'conferente': return str(row.conferente);
    default: return undefined;
  }
}

/**
 * If the row has a combined color (e.g. "avorio/bianco") and no colore2/3 columns,
 * returns { colore, colore2, colore3 } split values; otherwise returns nothing extra.
 */
function buildColorFields(row: any): Record<string, string | null> {
  const raw1 = str(row.colore);
  const raw2 = str(row.colore2);
  const raw3 = str(row.colore3);
  if (raw1 && !raw2 && !raw3 && hasColorSeparator(raw1)) {
    const [c1, c2, c3] = splitColori(raw1);
    return { colore: c1 || null, colore2: c2 || null, colore3: c3 || null };
  }
  return {
    ...(raw1 !== undefined ? { colore: raw1 } : {}),
    ...(raw2 !== undefined ? { colore2: raw2 } : {}),
    ...(raw3 !== undefined ? { colore3: raw3 } : {}),
  };
}

// Fields imported for new products when no selection restriction applies
const ALL_CREATE_OPTIONAL = [
  'produttore', 'paese', 'misura', 'gruppoMerceologico', 'famiglia', 'classe',
  'sottoclasse', 'gruppoOmogeneo', 'nomLinea', 'stagione', 'collezione', 'colore',
  'colore2', 'colore3', 'altriColori', 'temaColore', 'tranche', 'lotSize', 'iva',
  'fasciaRicarico', 'fasciaSconto', 'notes', 'description', 'imageUrl',
  // MODA
  'modello', 'dettaglio', 'forma', 'materiale1', 'materiale2', 'materiale3',
  'composizione', 'fantasia', 'lavorazione', 'bloccoColore',
  'costoIeConReso', 'costoIeSenzaReso', 'conferente',
];

function buildCreateData(
  codice: string,
  row: any,
  campiDaAggiornare: string[],
  applicaSelezioneCampiAiNuovi: boolean
): Record<string, any> {
  const data: Record<string, any> = {
    code: codice,
    name: str(row.name) || codice,
    costPrice: parseDecimal(row.costPrice) ?? 0,
    retailPrice: parseDecimal(row.retailPrice) ?? 0,
    isActive: false,
  };
  const fieldsToCheck = applicaSelezioneCampiAiNuovi
    ? campiDaAggiornare.filter((f) => !['code', 'name', 'costPrice', 'retailPrice', 'isActive'].includes(f))
    : ALL_CREATE_OPTIONAL;
  for (const campo of fieldsToCheck) {
    const val = buildFieldValue(campo, row);
    if (val !== undefined) data[campo] = val;
  }
  // Override colore fields with split values if combined color detected
  if (fieldsToCheck.includes('colore')) {
    Object.assign(data, buildColorFields(row));
  }
  if (!data.tranche) data.tranche = '1';
  return data;
}

// Normalise Prisma Decimal → plain number/string for JSON comparison
function toDisplay(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'toNumber' in v) return v.toNumber();
  return v;
}

// ─── Prisma select (all updatable fields) ─────────────────────────────────────

const PRODUCT_SELECT = {
  id: true, code: true, name: true, produttore: true, paese: true, misura: true,
  gruppoMerceologico: true, famiglia: true, classe: true, sottoclasse: true,
  gruppoOmogeneo: true, nomLinea: true, stagione: true, collezione: true,
  colore: true, colore2: true, colore3: true, altriColori: true,
  temaColore: true, tranche: true, lotSize: true, iva: true,
  costPrice: true, retailPrice: true, fasciaRicarico: true, fasciaSconto: true,
  notes: true, description: true, isActive: true, imageUrl: true,
  // MODA
  modello: true, dettaglio: true, forma: true,
  materiale1: true, materiale2: true, materiale3: true,
  composizione: true, fantasia: true, lavorazione: true, bloccoColore: true,
  costoIeConReso: true, costoIeSenzaReso: true, conferente: true,
} as const;

const CLASSIFICATION_FIELDS = new Set([
  'nomLinea', 'collezione', 'colore', 'temaColore', 'stagione',
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
]);

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      rows,
      campiDaAggiornare,
      dryRun = false,
      modalita = 'upsert',
      applicaSelezioneCampiAiNuovi = false,
    } = body as {
      rows: any[];
      campiDaAggiornare: string[];
      dryRun?: boolean;
      modalita?: 'upsert' | 'solo-aggiorna' | 'solo-crea';
      applicaSelezioneCampiAiNuovi?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Nessuna riga fornita' }, { status: 400 });
    }
    if (!Array.isArray(campiDaAggiornare) || campiDaAggiornare.length === 0) {
      return NextResponse.json({ error: 'Nessun campo selezionato' }, { status: 400 });
    }

    const allCodes = rows
      .map((r) => (r.code ? String(r.code).toUpperCase().trim() : null))
      .filter(Boolean) as string[];

    // Load all pantone colors once for auto-assign
    const allPantones = await prisma.$queryRaw<PantoneRow[]>`
      SELECT id, hex_code FROM pantone_colors WHERE hex_code IS NOT NULL AND hex_code != ''
    `;

    // ── Dry run: preview ──────────────────────────────────────────────────────
    if (dryRun) {
      const previewRows = rows.slice(0, 10);
      const previewCodes = previewRows
        .map((r) => (r.code ? String(r.code).toUpperCase().trim() : null))
        .filter(Boolean) as string[];

      const [allExisting, previewProducts] = await Promise.all([
        prisma.product.findMany({ where: { code: { in: allCodes } }, select: { code: true } }),
        prisma.product.findMany({ where: { code: { in: previewCodes } }, select: PRODUCT_SELECT }),
      ]);

      const existingSet = new Set(allExisting.map((p) => p.code));
      const previewMap = new Map(previewProducts.map((p) => [p.code, p]));

      // Count over ALL rows
      let aggiornamenti = 0, nuovi = 0, ignorati = 0;
      const nonTrovatiCodes: string[] = [];
      for (const row of rows) {
        const codice = row.code ? String(row.code).toUpperCase().trim() : null;
        if (!codice) { ignorati++; continue; }
        if (existingSet.has(codice)) {
          if (modalita === 'solo-crea') { ignorati++; continue; }
          aggiornamenti++;
        } else {
          if (modalita === 'solo-aggiorna') {
            ignorati++;
            if (nonTrovatiCodes.length < 100) nonTrovatiCodes.push(codice);
            continue;
          }
          nuovi++;
          if (nonTrovatiCodes.length < 100) nonTrovatiCodes.push(codice);
        }
      }

      // Preview rows with azione
      const preview = previewRows.map((row) => {
        const codice = row.code ? String(row.code).toUpperCase().trim() : null;
        if (!codice) {
          return { codice: null, trovato: false, azione: 'ignora' as const, motivoIgnora: 'Codice mancante', campi: {} };
        }
        const prodotto = previewMap.get(codice);

        if (prodotto) {
          if (modalita === 'solo-crea') {
            return { codice, trovato: true, azione: 'ignora' as const, motivoIgnora: 'Prodotto già esistente', campi: {} };
          }
          const campi: Record<string, { corrente: any; nuovo: any }> = {};
          for (const campo of campiDaAggiornare) {
            const nuovo = buildFieldValue(campo, row);
            if (nuovo !== undefined) {
              campi[campo] = { corrente: toDisplay((prodotto as any)[campo]), nuovo };
            }
          }
          return { codice, trovato: true, azione: 'aggiorna' as const, campi };
        } else {
          if (modalita === 'solo-aggiorna') {
            return { codice, trovato: false, azione: 'ignora' as const, motivoIgnora: 'Prodotto non trovato', campi: {} };
          }
          const campi: Record<string, { corrente: any; nuovo: any }> = {};
          const previewFields = applicaSelezioneCampiAiNuovi
            ? campiDaAggiornare
            : ['name', 'costPrice', 'retailPrice', ...ALL_CREATE_OPTIONAL];
          for (const campo of previewFields) {
            const val =
              campo === 'name' ? (str(row.name) || codice) :
              campo === 'costPrice' ? (parseDecimal(row.costPrice) ?? 0) :
              campo === 'retailPrice' ? (parseDecimal(row.retailPrice) ?? 0) :
              buildFieldValue(campo, row);
            if (val !== undefined && val !== null) {
              campi[campo] = { corrente: null, nuovo: val };
            }
          }
          return { codice, trovato: false, azione: 'nuovo' as const, campi };
        }
      });

      return NextResponse.json({
        preview,
        aggiornamenti,
        nuovi,
        ignorati,
        nonTrovatiCodes,
        trovati: aggiornamenti,
        nonTrovati: nuovi,
      });
    }

    // ── Actual import ─────────────────────────────────────────────────────────
    const existing = await prisma.product.findMany({
      where: { code: { in: allCodes } },
      select: { id: true, code: true },
    });
    const existingMap = new Map(existing.map((p) => [p.code, p]));

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const notFound: string[] = [];
    const errors: Array<{ codice: string; message: string }> = [];
    const newProductIds: string[] = [];
    const syncFields: Parameters<typeof syncManyProductClassifications>[0] = [];
    const touchesClassification = campiDaAggiornare.some((f) => CLASSIFICATION_FIELDS.has(f));

    for (const row of rows) {
      const codice = row.code ? String(row.code).toUpperCase().trim() : null;
      if (!codice) { skipped++; continue; }

      const prodotto = existingMap.get(codice);

      if (prodotto) {
        if (modalita === 'solo-crea') { skipped++; continue; }
        try {
          const updateData: Record<string, any> = {};
          for (const campo of campiDaAggiornare) {
            const val = buildFieldValue(campo, row);
            if (val !== undefined) updateData[campo] = val;
          }
          // Split combined color if detected
          if (campiDaAggiornare.includes('colore')) {
            Object.assign(updateData, buildColorFields(row));
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.product.update({ where: { id: prodotto.id }, data: updateData });
            updated++;
            // Auto-assign Pantone se il colore è stato aggiornato
            if (campiDaAggiornare.includes('colore')) {
              await assignAutoPantones(prodotto.id, [updateData.colore, updateData.colore2, updateData.colore3], allPantones);
            }
            if (touchesClassification) {
              syncFields.push({
                nomLinea: updateData.nomLinea, collezione: updateData.collezione,
                colore: updateData.colore, temaColore: updateData.temaColore,
                stagione: updateData.stagione, gruppoMerceologico: updateData.gruppoMerceologico,
                famiglia: updateData.famiglia, classe: updateData.classe,
                sottoclasse: updateData.sottoclasse, gruppoOmogeneo: updateData.gruppoOmogeneo,
              });
            }
          }
        } catch (err: any) {
          errors.push({ codice, message: err.message ?? 'Errore sconosciuto' });
        }
      } else {
        if (modalita === 'solo-aggiorna') { notFound.push(codice); continue; }
        try {
          const createData = buildCreateData(codice, row, campiDaAggiornare, applicaSelezioneCampiAiNuovi);
          const newProduct = await prisma.product.create({ data: createData as any });
          created++;
          newProductIds.push(newProduct.id);
          await assignAutoPantones(newProduct.id, [createData.colore, createData.colore2, createData.colore3], allPantones);
          if (Object.keys(createData).some((k) => CLASSIFICATION_FIELDS.has(k))) {
            syncFields.push({
              nomLinea: createData.nomLinea, collezione: createData.collezione,
              colore: createData.colore, temaColore: createData.temaColore,
              stagione: createData.stagione, gruppoMerceologico: createData.gruppoMerceologico,
              famiglia: createData.famiglia, classe: createData.classe,
              sottoclasse: createData.sottoclasse, gruppoOmogeneo: createData.gruppoOmogeneo,
            });
          }
        } catch (err: any) {
          errors.push({ codice, message: err.message ?? 'Errore sconosciuto' });
        }
      }
    }

    if (syncFields.length > 0) {
      void syncManyProductClassifications(syncFields);
    }

    return NextResponse.json({ updated, created, skipped, notFound, campiAggiornati: campiDaAggiornare, errors, newProductIds });
  } catch (err) {
    console.error('[import/selettivo]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
