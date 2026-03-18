/**
 * One-off script: delete DriverAuth (and OtpCodes) and Driver for the given email.
 * Run: npx ts-node prisma/delete-driver-by-email.ts
 */
import { PrismaClient } from '@prisma/client';

const email = 'asaf022@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  const normalized = email.toLowerCase().trim();
  const auth = await prisma.driverAuth.findUnique({ where: { email: normalized } });
  if (!auth) {
    console.log('No account found for', normalized);
    await prisma.$disconnect();
    return;
  }
  await prisma.driverAuth.delete({ where: { id: auth.id } });
  await prisma.driver.delete({ where: { id: auth.driverId } });
  console.log('Deleted account and driver for', normalized);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
