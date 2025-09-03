import { read, utils } from 'xlsx';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(sheet);

    // Clear and import
    await prisma.schedule.deleteMany();
    await prisma.conflict.deleteMany();
    await prisma.bachelorTopic.deleteMany();
    await prisma.preferredDate.deleteMany();
    await prisma.userUnavailability.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();

    let imported = 0;
    for (const row of data) {
      const { Name: name, Email: email, Role: role } = row;
      if (!name || !email || !role) continue;
      await prisma.user.create({ data: { name, email, role } });
      imported++;
    }

    return new Response(JSON.stringify({ message: 'Users uploaded', imported }), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
