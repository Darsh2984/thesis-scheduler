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

    await prisma.schedule.deleteMany();
    await prisma.room.deleteMany();


    for (const row of data) {
      const name = row['Room Name'];
      if (!name) continue;

      await prisma.room.create({ data: { name } });
    }

    return new Response(JSON.stringify({ message: 'Rooms uploaded successfully' }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
