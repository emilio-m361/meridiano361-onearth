import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { normalizeProductClassificationFields } from '@/lib/normalizeClassification';
import { normalizeProductName } from '@/lib/normalizeProductName';

const strOpt = z.string().optional().nullable();
const numOpt = z.coerce.number().optional().nullable();

const schema = z.object({
  ids: z.array(z.string()).min(1),
  data: z.object({
    // Anagrafica
    description:         strOpt,
    produttore:          strOpt,
    conferente:          strOpt,
    misura:              strOpt,
    paese:               strOpt,
    stock:               z.coerce.number().int().min(0).optional().nullable(),
    // Classificazione
    gruppoMerceologico:  strOpt,
    famiglia:            strOpt,
    classe:              strOpt,
    sottoclasse:         strOpt,
    gruppoOmogeneo:      strOpt,
    nomLinea:            strOpt,
    stagione:            strOpt,
    collezione:          strOpt,
    tranche:             strOpt,
    modello:             strOpt,
    dettaglio:           strOpt,
    forma:               strOpt,
    taglia:              strOpt,
    // Colori
    colore:              strOpt,
    colore2:             strOpt,
    colore3:             strOpt,
    altriColori:         strOpt,
    bloccoColore:        strOpt,
    temaColore:          strOpt,
    temaColore2:         strOpt,
    temaColore3:         strOpt,
    temaColore4:         strOpt,
    temaColore5:         strOpt,
    // Materiali e tessuti
    materiale1:          strOpt,
    materiale2:          strOpt,
    materiale3:          strOpt,
    composizione:        strOpt,
    fantasia:            strOpt,
    lavorazione:         strOpt,
    materialeBottoni:    strOpt,
    nomeStampa:          strOpt,
    materiale1Bio:       z.boolean().optional(),
    materiale2Bio:       z.boolean().optional(),
    materiale3Bio:       z.boolean().optional(),
    // Certificazioni
    certificazione1:     strOpt,
    certificazione2:     strOpt,
    certificazione3:     strOpt,
    // Prezzi e logistica
    lotSize:             z.coerce.number().int().positive().optional(),
    iva:                 z.coerce.number().int().min(0).max(100).optional(),
    costPrice:           z.coerce.number().positive().optional(),
    retailPrice:         z.coerce.number().positive().optional(),
    costoIeConReso:      numOpt,
    costoIeSenzaReso:    numOpt,
    fasciaRicarico:      strOpt,
    fasciaSconto:        z.coerce.number().min(0).max(100).optional().nullable(),
    // Altri
    notes:               strOpt,
    isActive:            z.boolean().optional(),
    cataloghi:           z.array(z.string()).optional(),
  }),
});

const ALL_STR_FIELDS = [
  'description', 'produttore', 'conferente', 'misura', 'paese',
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
  'nomLinea', 'stagione', 'collezione', 'tranche', 'modello', 'dettaglio', 'forma', 'taglia',
  'colore', 'colore2', 'colore3', 'altriColori', 'bloccoColore',
  'temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5',
  'materiale1', 'materiale2', 'materiale3', 'composizione', 'fantasia', 'lavorazione',
  'materialeBottoni', 'nomeStampa',
  'certificazione1', 'certificazione2', 'certificazione3',
  'fasciaRicarico', 'notes',
] as const;

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { ids, data } = schema.parse(body);

    const normalized = normalizeProductClassificationFields(data as Record<string, any>);

    const updateData: Record<string, unknown> = {};
    for (const f of ALL_STR_FIELDS) {
      if (normalized[f] !== undefined) updateData[f] = normalized[f] || null;
    }
    if (normalized.stock !== undefined) updateData.stock = normalized.stock ?? null;
    if (normalized.lotSize !== undefined) updateData.lotSize = normalized.lotSize;
    if (normalized.iva !== undefined) updateData.iva = normalized.iva;
    if (normalized.costPrice !== undefined) updateData.costPrice = normalized.costPrice;
    if (normalized.retailPrice !== undefined) updateData.retailPrice = normalized.retailPrice;
    if (normalized.costoIeConReso !== undefined) updateData.costoIeConReso = normalized.costoIeConReso ?? null;
    if (normalized.costoIeSenzaReso !== undefined) {
      updateData.costoIeSenzaReso = normalized.costoIeSenzaReso ?? null;
      if ((normalized.costoIeSenzaReso ?? 0) > 0 && !(updateData.costPrice as number > 0)) {
        updateData.costPrice = normalized.costoIeSenzaReso;
      }
    }
    if (normalized.fasciaSconto !== undefined) updateData.fasciaSconto = normalized.fasciaSconto ?? null;
    if (normalized.isActive !== undefined) updateData.isActive = normalized.isActive;
    const cataloghiToSet: string[] | undefined = (normalized as any).cataloghi;
    if (normalized.materiale1Bio !== undefined) updateData.materiale1Bio = normalized.materiale1Bio;
    if (normalized.materiale2Bio !== undefined) updateData.materiale2Bio = normalized.materiale2Bio;
    if (normalized.materiale3Bio !== undefined) updateData.materiale3Bio = normalized.materiale3Bio;

    if (Object.keys(updateData).length === 0 && cataloghiToSet === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // When nomLinea changes, regenerate each product's name replacing old linea with new
    if (updateData.nomLinea !== undefined) {
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, nomLinea: true, dettaglio: true },
      });
      await prisma.$transaction(
        products.map((p) =>
          prisma.product.update({
            where: { id: p.id },
            data: {
              ...updateData,
              name: normalizeProductName(
                p.name,
                updateData.nomLinea as string | null,
                p.nomLinea,
                p.dettaglio,
              ),
            },
          })
        )
      );
      return NextResponse.json({ updated: products.length });
    }

    let count = 0;
    if (Object.keys(updateData).length > 0) {
      const result = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
      count = result.count;
    }

    if (cataloghiToSet !== undefined) {
      for (const id of ids) {
        await prisma.$executeRaw`UPDATE products SET cataloghi = ${cataloghiToSet}::text[] WHERE id = ${id}`;
      }
      if (count === 0) count = ids.length;
    }

    return NextResponse.json({ updated: count });
  } catch (err: any) {
    console.error('[bulk-update] Error:', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Errore interno del server' }, { status: 500 });
  }
}
