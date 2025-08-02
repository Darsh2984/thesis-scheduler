import { read, utils } from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(sheet);

    await prisma.schedule.deleteMany();             // references topic, room, slot
    await prisma.conflict.deleteMany();             // references topic
    await prisma.bachelorTopic.deleteMany();        // references user (supervisor & reviewer)
    await prisma.preferredDate.deleteMany();        // references user
    await prisma.userUnavailability.deleteMany();   // references user
    await prisma.timeSlot.deleteMany();             // referenced by schedule
    await prisma.room.deleteMany();                 // referenced by schedule
    await prisma.user.deleteMany();                 // ✅ safe to delete last



    for (const row of data) {
      const { Name: name, Email: email, Role: role } = row;

      if (!name || !email || !role) continue;

      // Avoid duplicates by checking if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) continue;

      await prisma.user.create({
        data: {
          name,
          email,
          role,
        },
      });
    }

    return new Response(JSON.stringify({ message: 'Users uploaded successfully' }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
