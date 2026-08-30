const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Upgrading leo to Super Admin...');
  const updated = await prisma.appUser.updateMany({
    where: { name: 'leo' },
    data: { role: 'Super Admin' }
  });
  console.log(`Updated ${updated.count} users.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
