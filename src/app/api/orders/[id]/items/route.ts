import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  taglia: z.string().default(''),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { customerId: true, organizationId: true, status: true },
    });
    if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

    if (session.user.role === 'OPERATOR') {
      if (order.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.user.role === 'CUSTOMER') {
      if (order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { productId, quantity, taglia } = schema.parse(await req.json());

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, costPrice: true, isActive: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
    }

    const unitPrice = Number(product.costPrice);
    const subtotal = unitPrice * quantity;

    // Check if item already exists in this order (same product + taglia combo)
    const existing = await prisma.orderItem.findFirst({
      where: { orderId: params.id, productId, taglia },
    });

    let item;
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newSubtotal = unitPrice * newQty;
      item = await prisma.orderItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, subtotal: newSubtotal },
        include: { product: { include: { category: true } } },
      });
    } else {
      item = await prisma.orderItem.create({
        data: {
          orderId: params.id,
          productId,
          taglia,
          quantity,
          unitPrice,
          subtotal,
          mercePronta: 0,
        },
        include: { product: { include: { category: true } } },
      });
    }

    // Recalculate order totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: params.id },
      select: { quantity: true, subtotal: true },
    });
    const totalValue = allItems.reduce((s, it) => s + Number(it.subtotal), 0);
    const totalItems = allItems.reduce((s, it) => s + it.quantity, 0);
    await prisma.order.update({
      where: { id: params.id },
      data: { totalValue, totalItems },
    });

    return NextResponse.json({
      data: {
        item: {
          ...item,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          product: item.product
            ? {
                ...item.product,
                costPrice:        Number(item.product.costPrice),
                retailPrice:      Number(item.product.retailPrice),
                costoIeConReso:   item.product.costoIeConReso   != null ? Number(item.product.costoIeConReso)   : null,
                costoIeSenzaReso: item.product.costoIeSenzaReso != null ? Number(item.product.costoIeSenzaReso) : null,
                createdAt: item.product.createdAt?.toISOString(),
                updatedAt: (item.product as any).updatedAt?.toISOString(),
              }
            : undefined,
        },
        order: { totalValue, totalItems },
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
