import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    where: { conferente: { contains: 'altraqualit', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, costPrice: true, costoIeConReso: true, costoIeSenzaReso: true },
    orderBy: { name: 'asc' },
  });

  const clivia = products.filter(p => p.name.toLowerCase().includes('clivia'));
  console.log('CLIVIA:', JSON.stringify(clivia.map(p => ({
    code: p.code, name: p.name,
    cost: Number(p.costPrice),
    conReso: p.costoIeConReso ? Number(p.costoIeConReso) : null,
    senzaReso: p.costoIeSenzaReso ? Number(p.costoIeSenzaReso) : null,
  })), null, 2));

  const withConReso = products.filter(p => p.costoIeConReso != null);
  const nullConReso = products.filter(p => p.costoIeConReso == null);
  console.log('\ncostoIeConReso: non-null=' + withConReso.length + ', null=' + nullConReso.length);

  console.log('\nTutti i non-null:');
  for (const p of withConReso) {
    const cost = Number(p.costPrice);
    const con = Number(p.costoIeConReso);
    const ratio = (con / cost).toFixed(3);
    console.log(`  [${p.code}] ${p.name.slice(0, 40)}: cost=${cost.toFixed(2)} conReso=${con.toFixed(2)} ratio=${ratio}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
