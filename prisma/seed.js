const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Users
  const [drA, drB, drC, drD, drE] = await Promise.all([
    prisma.user.create({
      data: { name: 'Dr. A', email: 'a@guc.edu.eg', role: 'FT_SUPERVISOR' }
    }),
    prisma.user.create({
      data: { name: 'Dr. B', email: 'b@guc.edu.eg', role: 'PT_SUPERVISOR' }
    }),
    prisma.user.create({
      data: { name: 'Dr. C', email: 'c@outside.com', role: 'REVIEWER' }
    }),
    prisma.user.create({
      data: { name: 'Dr. D', email: 'd@guc.edu.eg', role: 'BOTH' }
    }),
    prisma.user.create({
      data: { name: 'Dr. E', email: 'e@outside.com', role: 'REVIEWER' }
    })
  ]);

  // Create Rooms
  await prisma.room.createMany({
    data: [
      { name: 'Room A' },
      { name: 'Room B' },
      { name: 'Room C' }
    ]
  });

  // Create Time Slots
  await prisma.timeSlot.createMany({
    data: [
      { date: new Date('2025-07-22'), startTime: '09:00', endTime: '09:30' },
      { date: new Date('2025-07-22'), startTime: '09:30', endTime: '10:00' },
      { date: new Date('2025-07-22'), startTime: '10:00', endTime: '10:30' },
      { date: new Date('2025-07-22'), startTime: '10:30', endTime: '11:00' }
    ]
  });

  // Create Bachelor Topics
  await prisma.bachelorTopic.createMany({
    data: [
      { title: 'AI for Medical Imaging', supervisorId: drA.id, reviewerId: drC.id },
      { title: 'IoT for Smart Farming', supervisorId: drA.id, reviewerId: drE.id },
      { title: 'Blockchain Voting System', supervisorId: drB.id, reviewerId: drC.id },
    ]
  });

  console.log('✅ Seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
