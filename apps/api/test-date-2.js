const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.membership.findMany({ 
    orderBy: { createdAt: 'desc' }, 
    take: 3, 
    include: { client: true } 
  });
  console.log(JSON.stringify(m, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
