import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

// ── Classification groupings ────────────────────────────────────────────────

const GROUPINGS = [
  { key: 'classe',         label: 'Per Classe' },
  { key: 'sottoclasse',    label: 'Per Sottoclasse' },
  { key: 'famiglia',       label: 'Per Famiglia' },
  { key: 'gruppoOmogeneo', label: 'Per Gruppo Omogeneo' },
  { key: 'nomLinea',       label: 'Per Linea' },
  { key: 'colore',         label: 'Per Colore' },
  { key: 'temaColore',     label: 'Per Tema Colore' },
  { key: 'collezione',     label: 'Per Collezione' },
  { key: 'stagione',       label: 'Per Stagione' },
  { key: 'produttore',     label: 'Per Produttore' },
  { key: 'paese',          label: 'Per Paese' },
  { key: 'tranche',        label: 'Per Tranche' },
] as const;

// ── Column definitions ──────────────────────────────────────────────────────

const COL_HEADERS = [
  'Codice', 'Descrizione', 'Produttore', 'Paese', 'Linea', 'Colore',
  'Collezione', 'Classe', 'Sottoclasse', 'Confezione', 'Quantità',
  'Prezzo costo i.e.', 'Prezzo vendita i.i.', 'Subtotale',
];
const COL_WIDTHS = [16, 42, 20, 14, 16, 16, 18, 20, 22, 11, 10, 18, 20, 16];
const NC = COL_HEADERS.length; // 14

// ── Color palette ───────────────────────────────────────────────────────────

const C = {
  black:  'FF1A1A1A',
  white:  'FFFFFFFF',
  dgray:  'FF3D3D3D',
  lgray:  'FFF0F0F0',
  mgray:  'FFD4D4D4',
  yellow: 'FFFFF0CC',
};

const CURRENCY = '#,##0.00';
const UNCLASSIFIED = '— Non classificato —';

// ── Types ───────────────────────────────────────────────────────────────────

type FlatProduct = {
  code: string;
  name: string;
  produttore: string | null;
  paese: string | null;
  nomLinea: string | null;
  colore: string | null;
  collezione: string | null;
  classe: string | null;
  sottoclasse: string | null;
  famiglia: string | null;
  gruppoOmogeneo: string | null;
  stagione: string | null;
  temaColore: string | null;
  tranche: string | null;
  lotSize: number;
  costPrice: number;
  costoIeConReso: number | null;
  costoIeSenzaReso: number | null;
  retailPrice: number;
};

type ItemRow = { product: FlatProduct; quantity: number; taglia: string };

function effectiveCost(p: FlatProduct): number {
  return (p.costoIeConReso ?? 0) > 0 ? p.costoIeConReso!
       : (p.costoIeSenzaReso ?? 0) > 0 ? p.costoIeSenzaReso!
       : p.costPrice;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fillRow(row: ExcelJS.Row, argb: string, numCols: number) {
  for (let c = 1; c <= numCols; c++) {
    row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  }
}

function formatEur(v: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function groupItems(items: ItemRow[], key: string): Map<string, ItemRow[]> {
  const map = new Map<string, ItemRow[]>();
  for (const item of items) {
    const k = ((item.product as Record<string, any>)[key] as string | null) ?? UNCLASSIFIED;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'it')));
}

// ── Sheet builders ──────────────────────────────────────────────────────────

function buildGroupingSheet(ws: ExcelJS.Worksheet, items: ItemRow[], key: string) {
  COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  [12, 13, 14].forEach(c => { ws.getColumn(c).numFmt = CURRENCY; });
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Column header row
  const hdr = ws.addRow(COL_HEADERS);
  fillRow(hdr, C.dgray, NC);
  for (let c = 1; c <= NC; c++) {
    const cell = hdr.getCell(c);
    cell.font = { bold: true, color: { argb: C.white }, size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  hdr.height = 18;

  const groups = groupItems(items, key);

  for (const [name, grpItems] of groups) {
    const grpCost = grpItems.reduce((s, it) => s + it.quantity * effectiveCost(it.product), 0);
    const grpPcs  = grpItems.reduce((s, it) => s + it.quantity, 0);
    const title   = `${name.toUpperCase()}  —  ${grpItems.length} ${grpItems.length === 1 ? 'articolo' : 'articoli'}  —  ${formatEur(grpCost)}`;

    // Group header (black)
    const ghRow = ws.addRow([title]);
    for (let c = 1; c <= NC; c++) {
      const cell = ghRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.black } };
      cell.font = { bold: true, color: { argb: C.white }, size: 9 };
    }
    ws.mergeCells(ghRow.number, 1, ghRow.number, NC);
    ghRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ghRow.height = 20;

    // Product rows
    grpItems.forEach((item, idx) => {
      const bg      = idx % 2 === 0 ? C.white : C.lgray;
      const unitCost = effectiveCost(item.product);
      const subtotal = item.quantity * unitCost;
      const code = item.taglia ? `${item.product.code}${item.taglia}` : item.product.code;
      const row = ws.addRow([
        code,
        item.product.name,
        item.product.produttore    ?? '',
        item.product.paese         ?? '',
        item.product.nomLinea      ?? '',
        item.product.colore        ?? '',
        item.product.collezione    ?? '',
        item.product.classe        ?? '',
        item.product.sottoclasse   ?? '',
        item.product.lotSize,
        item.quantity,
        unitCost,
        item.product.retailPrice,
        subtotal,
      ]);
      fillRow(row, bg, NC);
      row.font = { size: 9 };
      row.height = 15;
      for (let c = 1; c <= NC; c++) {
        const cell = row.getCell(c);
        if (c >= 12) cell.numFmt = CURRENCY;
        if (c === 10 || c === 11) cell.alignment = { horizontal: 'center' };
      }
    });

    // Subtotal row (light gray)
    const subCells: (string | number | null)[] = Array(NC).fill(null);
    subCells[0]  = 'Subtotale';
    subCells[10] = grpPcs;
    subCells[13] = grpCost;
    const subRow = ws.addRow(subCells);
    fillRow(subRow, C.mgray, NC);
    subRow.font = { bold: true, size: 9 };
    subRow.getCell(14).numFmt = CURRENCY;
    subRow.height = 16;

    ws.addRow([]); // empty separator
  }

  // Grand total row (yellow)
  const grandCost = items.reduce((s, it) => s + it.quantity * effectiveCost(it.product), 0);
  const grandPcs  = items.reduce((s, it) => s + it.quantity, 0);
  const grandCells: (string | number | null)[] = Array(NC).fill(null);
  grandCells[0]  = 'TOTALE GENERALE';
  grandCells[10] = grandPcs;
  grandCells[13] = grandCost;
  const grandRow = ws.addRow(grandCells);
  fillRow(grandRow, C.yellow, NC);
  grandRow.font = { bold: true, size: 10 };
  grandRow.getCell(14).numFmt = CURRENCY;
  grandRow.height = 18;
}

function buildSummarySheet(ws: ExcelJS.Worksheet, items: ItemRow[]) {
  const NC_S = 5;
  [30, 12, 12, 18, 20].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  [4, 5].forEach(c => { ws.getColumn(c).numFmt = CURRENCY; });

  const COLS = ['Gruppo', 'Articoli', 'Pezzi', 'Costo totale', 'Vendite pot. (i.i.)'];

  for (const { key, label } of GROUPINGS) {
    // Section header
    const sh = ws.addRow([label.toUpperCase()]);
    for (let c = 1; c <= NC_S; c++) {
      sh.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.black } };
      sh.getCell(c).font = { bold: true, color: { argb: C.white }, size: 9 };
    }
    ws.mergeCells(sh.number, 1, sh.number, NC_S);
    sh.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sh.height = 18;

    // Column headers
    const ch = ws.addRow(COLS);
    fillRow(ch, C.dgray, NC_S);
    for (let c = 1; c <= NC_S; c++) {
      ch.getCell(c).font = { bold: true, color: { argb: C.white }, size: 9 };
      ch.getCell(c).alignment = { vertical: 'middle', horizontal: c >= 2 ? 'right' : 'left' };
    }
    ch.height = 16;

    const groups = groupItems(items, key);
    let secCost = 0, secPcs = 0, secRetail = 0, rowIdx = 0;

    for (const [name, grpItems] of groups) {
      const art    = grpItems.length;
      const pcs    = grpItems.reduce((s, it) => s + it.quantity, 0);
      const cost   = grpItems.reduce((s, it) => s + it.quantity * effectiveCost(it.product), 0);
      const retail = grpItems.reduce((s, it) => s + it.quantity * it.product.retailPrice, 0);
      secCost   += cost;
      secPcs    += pcs;
      secRetail += retail;

      const row = ws.addRow([name, art, pcs, cost, retail]);
      fillRow(row, rowIdx % 2 === 0 ? C.white : C.lgray, NC_S);
      row.font = { size: 9 };
      row.height = 15;
      row.getCell(4).numFmt = CURRENCY;
      row.getCell(5).numFmt = CURRENCY;
      [2, 3, 4, 5].forEach(c => { row.getCell(c).alignment = { horizontal: 'right' }; });
      rowIdx++;
    }

    const st = ws.addRow([`Totale ${label.replace('Per ', '')}`, '', secPcs, secCost, secRetail]);
    fillRow(st, C.mgray, NC_S);
    st.font = { bold: true, size: 9 };
    st.height = 16;
    st.getCell(4).numFmt = CURRENCY;
    st.getCell(5).numFmt = CURRENCY;

    ws.addRow([]);
  }

  // Grand total
  const gArt    = items.length;
  const gPcs    = items.reduce((s, it) => s + it.quantity, 0);
  const gCost   = items.reduce((s, it) => s + it.quantity * effectiveCost(it.product), 0);
  const gRetail = items.reduce((s, it) => s + it.quantity * it.product.retailPrice, 0);

  const grand = ws.addRow(['TOTALE GENERALE', gArt, gPcs, gCost, gRetail]);
  fillRow(grand, C.yellow, NC_S);
  grand.font = { bold: true, size: 10 };
  grand.height = 18;
  grand.getCell(4).numFmt = CURRENCY;
  grand.getCell(5).numFmt = CURRENCY;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer:     { select: { companyName: true, customerCode: true } },
        organization: { select: { nome: true } },
        items:        { include: { product: true } },
      },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!isAdminRole(session.user.role)) {
      if (session.user.role === 'OPERATOR' && order.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const items: ItemRow[] = order.items
      .filter((it) => it.product != null)
      .map((it) => ({
        product: {
          ...(it.product as any),
          costPrice:        Number(it.product!.costPrice),
          costoIeConReso:   it.product!.costoIeConReso != null ? Number(it.product!.costoIeConReso) : null,
          costoIeSenzaReso: it.product!.costoIeSenzaReso != null ? Number(it.product!.costoIeSenzaReso) : null,
          retailPrice:      Number(it.product!.retailPrice),
        },
        quantity: it.quantity,
        taglia: (it as any).taglia ?? '',
      }));

    // Build filename: Ordine-SHORTID-OrgName-YYYY-MM-DD.xlsx
    const shortId  = order.id.slice(0, 8).toUpperCase();
    const orgRaw   = order.customer?.companyName || order.organization?.nome || 'Ordine';
    const orgClean = orgRaw.replace(/[^\w\s\-]/g, '').replace(/\s+/g, '').slice(0, 30);
    const dateStr  = new Date().toISOString().slice(0, 10);
    const filename = `Ordine-${shortId}-${orgClean}-${dateStr}.xlsx`;

    // Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ON EARTH B2B';
    wb.created  = new Date();

    for (const { key, label } of GROUPINGS) {
      buildGroupingSheet(wb.addWorksheet(label), items, key);
    }
    buildSummarySheet(wb.addWorksheet('Riepilogo Totale'), items);

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export-excel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
