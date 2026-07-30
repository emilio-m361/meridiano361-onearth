import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { normalizeProductClassificationFields, ensureHubeqCode } from '@/lib/normalizeClassification';
import { normalizeProductName, stripStampaFromName, applyStampaToName } from '@/lib/normalizeProductName';
import { syncProductClassification } from '@/lib/syncClassification';
import { translateProduct } from '@/lib/translate';
import { autoComposizione } from '@/lib/autoComposizione';
import { assignAutoPantones } from '@/lib/autoPantone';

const capFirst = (s?: string | null) => s?.trim() ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() : null;

const updateSchema = z.object({
  colorBlockIds: z.array(z.coerce.number().int()).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0).optional(),
  retailPrice: z.coerce.number().min(0).optional(),
  lotSize: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().optional().nullable(),
  imageUrl2: z.string().optional().nullable(),
  imageUrl3: z.string().optional().nullable(),
  imageUrl4: z.string().optional().nullable(),
  imageUrl5: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  stock: z.coerce.number().int().optional().nullable(),
  famiglia: z.string().optional().nullable(),
  sottofamiglia: z.string().optional().nullable(),
  colore: z.string().optional().nullable(),
  colore2: z.string().optional().nullable(),
  colore3: z.string().optional().nullable(),
  nomLinea: z.string().optional().nullable(),
  misura: z.string().optional().nullable(),
  produttore: z.string().optional().nullable(),
  gruppoMerceologico: z.string().optional().nullable(),
  classe: z.string().optional().nullable(),
  classe2: z.string().optional().nullable(),
  sottoclasse: z.string().optional().nullable(),
  sottoclasse2: z.string().optional().nullable(),
  gruppoOmogeneo: z.string().optional().nullable(),
  gruppoOmogeneo2: z.string().optional().nullable(),
  stagione: z.string().optional().nullable(),
  temaColore:   z.string().optional().nullable(),
  temaColore2:  z.string().optional().nullable(),
  temaColore3:  z.string().optional().nullable(),
  temaColore4:  z.string().optional().nullable(),
  temaColore5:  z.string().optional().nullable(),
  temaColore6:  z.string().optional().nullable(),
  temaColore7:  z.string().optional().nullable(),
  temaColore8:  z.string().optional().nullable(),
  temaColore9:  z.string().optional().nullable(),
  temaColore10: z.string().optional().nullable(),
  fasciaRicarico: z.string().optional().nullable(),
  fasciaSconto: z.coerce.number().min(0).max(100).optional().nullable(),
  collezione: z.string().optional().nullable(),
  tranche: z.string().optional().nullable(),
  paese: z.string().optional().nullable(),
  iva: z.coerce.number().int().min(0).max(100).optional(),
  modello: z.string().optional().nullable(),
  taglia: z.string().optional().nullable(),
  bloccoColore: z.string().optional().nullable(),
  costoIeConReso: z.coerce.number().positive().optional().nullable(),
  costoIeSenzaReso: z.coerce.number().positive().optional().nullable(),
  conferente: z.string().optional().nullable(),
  materiale1: z.string().optional().nullable(),
  materiale2: z.string().optional().nullable(),
  materiale3: z.string().optional().nullable(),
  composizione: z.string().optional().nullable(),
  certificazione1: z.string().optional().nullable(),
  certificazione2: z.string().optional().nullable(),
  certificazione3: z.string().optional().nullable(),
  fantasia: z.string().optional().nullable(),
  lavorazione: z.string().optional().nullable(),
  dettaglio: z.string().optional().nullable(),
  materialeBottoni: z.string().optional().nullable(),
  nomeStampa: z.string().optional().nullable(),
  materiale1Bio: z.boolean().optional(),
  materiale2Bio: z.boolean().optional(),
  materiale3Bio: z.boolean().optional(),
  pantoneColorIds: z.array(z.coerce.number().int()).optional(),
  pantoneAutoFilledFlags: z.array(z.boolean()).optional(),
  sizeVariants: z.array(z.object({ taglia: z.string(), codice: z.string() })).optional().nullable(),
  isContinuativo: z.boolean().optional(),
  cataloghi: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, collection: true },
    });

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [colorBlockLinks, pantoneLinks] = await Promise.all([
      prisma.$queryRaw<{ color_block_id: bigint }[]>`
        SELECT color_block_id FROM product_color_blocks WHERE product_id = ${params.id}
      `,
      prisma.$queryRaw<{
        pantone_color_id: bigint; code: string; name: string;
        hex_code: string; system_type: string; sort_order: number; is_primary: boolean; is_auto_filled: boolean;
      }[]>`
        SELECT pp.pantone_color_id, pc.code, pc.name, pc.hex_code, pc.system_type,
               pp.sort_order, pp.is_primary, pp.is_auto_filled
        FROM   product_pantones pp
        JOIN   pantone_colors pc ON pc.id = pp.pantone_color_id
        WHERE  pp.product_id = ${params.id}
        ORDER  BY pp.sort_order ASC
      `,
    ]);

    return NextResponse.json({
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        fasciaSconto: product.fasciaSconto != null ? Number(product.fasciaSconto) : null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        colorBlockIds: colorBlockLinks.map((r) => Number(r.color_block_id)),
        pantoneColors: pantoneLinks.map((pp) => ({
          pantoneColorId: Number(pp.pantone_color_id),
          code: pp.code, name: pp.name, hex_code: pp.hex_code,
          system_type: pp.system_type, sortOrder: pp.sort_order, isPrimary: pp.is_primary,
          isAutoFilled: pp.is_auto_filled,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const { colorBlockIds, pantoneColorIds, pantoneAutoFilledFlags, sizeVariants, cataloghi, ...rest } = parsed;
    const data = normalizeProductClassificationFields(rest);
    if (sizeVariants !== undefined) (data as any).sizeVariants = sizeVariants?.length ? sizeVariants : null;

    // Keep costPrice in sync with costoIeSenzaReso
    if ((data as any).costoIeSenzaReso != null && (data as any).costoIeSenzaReso > 0 && !((data as any).costPrice > 0)) {
      (data as any).costPrice = (data as any).costoIeSenzaReso;
    }

    if (data.gruppoMerceologico?.toLowerCase() === 'moda' && (!pantoneColorIds || pantoneColorIds.length === 0)) {
      return NextResponse.json({ error: 'Il Pantone è obbligatorio per i prodotti MODA' }, { status: 400 });
    }

    // Normalize code to uppercase and apply HUBEQ prefix for equomercato
    if (data.code) {
      data.code = data.code.toUpperCase().trim();
      // Determine conferente: from patch body or from current product
      const conferente = (data as any).conferente !== undefined
        ? (data as any).conferente
        : (await prisma.product.findUnique({ where: { id: params.id }, select: { conferente: true } }))?.conferente;
      data.code = ensureHubeqCode(data.code, conferente);
    }

    // When nomLinea / nomeStampa / fantasia changes (or name is present), regenerate name
    if (data.nomLinea) data.nomLinea = data.nomLinea.toUpperCase();
    const nomLineaChanging   = data.nomLinea    !== undefined;
    const nomeStampaChanging = 'nomeStampa' in rest;
    const fantasiaChanging   = 'fantasia'   in rest;
    const namePresent = !!(data.name && !(body as any).skipNameNormalization);

    if (namePresent || nomLineaChanging || nomeStampaChanging || fantasiaChanging) {
      const cur = await prisma.product.findUnique({
        where: { id: params.id },
        select: { nomLinea: true, name: true, dettaglio: true, nomeStampa: true, fantasia: true },
      });
      const oldLinea      = cur?.nomLinea    ?? null;
      const newLinea      = nomLineaChanging   ? data.nomLinea                  : oldLinea;
      const dettaglio     = data.dettaglio !== undefined ? data.dettaglio       : cur?.dettaglio;
      const oldNomeStampa = cur?.nomeStampa   ?? null;
      const newNomeStampa = nomeStampaChanging ? (data as any).nomeStampa       : oldNomeStampa;
      const newFantasia   = fantasiaChanging   ? (data as any).fantasia         : (cur?.fantasia ?? null);

      // Strip old stampa suffix before re-normalizing, then re-apply with new values
      let baseName = stripStampaFromName(data.name ?? cur?.name ?? '', oldNomeStampa);
      if (baseName) {
        data.name = applyStampaToName(
          normalizeProductName(baseName, newLinea, oldLinea, dettaglio),
          newNomeStampa,
          newFantasia,
        );
      }
    }

    // Auto-composizione: se almeno un materiale è nel payload e composizione è vuota
    const materialInPatch = ('materiale1' in rest) || ('materiale2' in rest) || ('materiale3' in rest);
    if (materialInPatch && !data.composizione?.trim()) {
      const cur = await prisma.product.findUnique({
        where: { id: params.id },
        select: { materiale1: true, materiale2: true, materiale3: true, composizione: true },
      });
      if (cur && !cur.composizione?.trim()) {
        const m1 = 'materiale1' in rest ? (data as any).materiale1 : cur.materiale1;
        const m2 = 'materiale2' in rest ? (data as any).materiale2 : cur.materiale2;
        const m3 = 'materiale3' in rest ? (data as any).materiale3 : cur.materiale3;
        const comp = autoComposizione(m1, m2, m3, null);
        if (comp) (data as any).composizione = comp;
      }
    }

    // Normalize color casing: Iniziale Maiuscola + resto minuscolo
    if ('colore' in data) (data as any).colore = capFirst((data as any).colore);
    if ('colore2' in data) (data as any).colore2 = capFirst((data as any).colore2);
    if ('colore3' in data) (data as any).colore3 = capFirst((data as any).colore3);

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { category: true },
    });

    // Sync cataloghi array
    if (cataloghi !== undefined) {
      await prisma.$executeRaw`UPDATE products SET cataloghi = ${cataloghi}::text[] WHERE id = ${params.id}`;
    }

    // Sync color blocks many-to-many
    if (colorBlockIds !== undefined) {
      await prisma.$executeRaw`DELETE FROM product_color_blocks WHERE product_id = ${params.id}`;
      for (const cbId of colorBlockIds) {
        await prisma.$executeRaw`
          INSERT INTO product_color_blocks (product_id, color_block_id)
          VALUES (${params.id}, ${BigInt(cbId)})
        `;
      }
    }

    // Sync pantone many-to-many
    if (pantoneColorIds !== undefined) {
      await prisma.$executeRaw`DELETE FROM product_pantones WHERE product_id = ${params.id}`;
      for (let i = 0; i < pantoneColorIds.length; i++) {
        const autoFilled = pantoneAutoFilledFlags?.[i] ?? false;
        await prisma.$executeRaw`
          INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary, is_auto_filled)
          VALUES (${params.id}, ${BigInt(pantoneColorIds[i])}, ${i}, ${i === 0}, ${autoFilled})
        `;
      }
    } else if ('colore' in rest || 'colore2' in rest || 'colore3' in rest) {
      // Colore modificato senza Pantone esplicito: auto-assign (ON CONFLICT DO NOTHING preserva gli esistenti)
      const newColore  = 'colore'  in rest ? (data as any).colore  : undefined;
      const newColore2 = 'colore2' in rest ? (data as any).colore2 : undefined;
      const newColore3 = 'colore3' in rest ? (data as any).colore3 : undefined;
      void assignAutoPantones(params.id, [newColore, newColore2, newColore3].filter(Boolean)).catch(() => {});
    }

    void syncProductClassification(data);

    // Memorizza fantasia/lavorazione nel vocabolario per i suggerimenti futuri
    for (const [campo, valore] of [['fantasia', (data as any).fantasia], ['lavorazione', (data as any).lavorazione]] as const) {
      if (valore?.trim()) {
        void prisma.vocabolarioCampo.upsert({
          where: { campo_valore: { campo, valore: valore.trim() } },
          update: {},
          create: { campo, valore: valore.trim() },
        }).catch(() => {});
      }
    }

    // Memorizza produttore → paese nella lookup table
    const produttoreVal = data.produttore?.trim() ?? product.produttore?.trim();
    const paeseVal = data.paese ?? product.paese;
    if (produttoreVal) {
      void prisma.produttore.upsert({
        where: { nome: produttoreVal },
        update: paeseVal ? { paese: paeseVal } : {},
        create: { nome: produttoreVal, paese: paeseVal || null },
      }).catch(() => {});
    }

    // Auto-translate se la descrizione è stata aggiornata
    if (data.description !== undefined) {
      const testo = data.description || product.name;
      void translateProduct(testo).then((trad) =>
        prisma.product.update({ where: { id: params.id }, data: trad })
      ).catch(() => {});
    }

    return NextResponse.json({
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        fasciaSconto: product.fasciaSconto != null ? Number(product.fasciaSconto) : null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Codice già in uso da un altro prodotto' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Product deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (err.code === 'P2003') {
      return NextResponse.json(
        { error: 'Il prodotto è presente in uno o più ordini o carrelli e non può essere eliminato. Disattivalo dal campo "Attivo" oppure eliminalo dagli ordini prima di procedere.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
