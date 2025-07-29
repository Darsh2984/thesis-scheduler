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

    console.log('🔑 Columns in sheet:', Object.keys(data[0]));

    await prisma.schedule.deleteMany();
    await prisma.bachelorTopic.deleteMany();

    for (const row of data) {
      console.log('📄 Row:', row);

      const title = row['Title'];
      const supEmail = row['Supervisor Email'];
      const revEmail = row['Reviewer Email'];

      if (!title || !supEmail || !revEmail) {
        console.warn('⚠️ Skipping due to missing fields:', { title, supEmail, revEmail });
        continue;
      }

      const supervisor = await prisma.user.upsert({
        where: { email: supEmail },
        update: {},
        create: {
          name: row['Supervisor Name'] || supEmail.split('@')[0],
          email: supEmail,
          role: 'FT_SUPERVISOR',
        },
      });

      const reviewer = await prisma.user.upsert({
        where: { email: revEmail },
        update: {},
        create: {
          name: row['Reviewer Name'] || revEmail.split('@')[0],
          email: revEmail,
          role: 'REVIEWER',
        },
      });

      if (!supervisor || !reviewer) {
        console.warn(`❌ Skipping topic: ${title} — Supervisor or Reviewer not created.`);
        continue;
      }

      await prisma.bachelorTopic.create({
        data: {
          title,
          supervisorId: supervisor.id,
          reviewerId: reviewer.id,
        },
      });

      console.log(`✅ Inserted topic: ${title}`);
    }

    return new Response(JSON.stringify({ message: 'Topics uploaded successfully' }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
