const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.bachelorTopic.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const supervisor = await prisma.user.create({
    data: {
      name: 'Dr. Conflict',
      email: 'conflict@guc.edu.eg',
      role: 'FT_SUPERVISOR'
    }
  });

  const reviewer = await prisma.user.create({
    data: {
      name: 'Dr. Reviewer',
      email: 'reviewer@guc.edu.eg',
      role: 'REVIEWER'
    }
  });

  // One Room
  const room = await prisma.room.create({
    data: { name: 'Room X' }
  });

  // One Time Slot
  const slot = await prisma.timeSlot.create({
    data: {
      date: new Date('2025-07-22'),
      startTime: '09:00',
      endTime: '09:30'
    }
  });

  // 3 Topics (but only 1 slot and 1 room)
  await prisma.bachelorTopic.createMany({
    data: [
      {
        title: 'Topic A',
        supervisorId: supervisor.id,
        reviewerId: reviewer.id
      },
      {
        title: 'Topic B',
        supervisorId: supervisor.id,
        reviewerId: reviewer.id
      },
      {
        title: 'Topic C',
        supervisorId: supervisor.id,
        reviewerId: reviewer.id
      }
    ]
  });

  console.log('✅ Seeded conflict test data');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
