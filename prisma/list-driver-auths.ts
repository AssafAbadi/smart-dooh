import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const list = await prisma.driverAuth.findMany({ select: { email: true, isVerified: true } });
  console.log('DriverAuth accounts:', list.length);
  list.forEach((a) => console.log(' -', a.email, a.isVerified ? '(verified)' : '(unverified)'));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
