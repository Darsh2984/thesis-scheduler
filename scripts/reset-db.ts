// scripts/reset-db.ts
import { prisma } from '@/lib/prisma';

async function main() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.bachelorTopic.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database reset complete.');
}

main()
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
