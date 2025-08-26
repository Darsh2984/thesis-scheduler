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

    if (!data.length) {
      return new Response(JSON.stringify({ error: 'No rows found in Excel file' }), { status: 400 });
    }

    // ✅ Require student columns too
    const REQUIRED_COLS = [
      'Student ID',
      'Student Name',
      'Student Email',
      'Title',
      'Supervisor Name',
      'Supervisor Email',
      'Reviewer Name',
      'Reviewer Email',
    ];
    const cols = Object.keys(data[0]);
    for (const col of REQUIRED_COLS) {
      if (!cols.includes(col)) {
        return new Response(
          JSON.stringify({ error: `Missing required column: ${col}` }),
          { status: 400 }
        );
      }
    }

    // Clear old topics
    await prisma.schedule.deleteMany();
    await prisma.bachelorTopic.deleteMany();

    for (const row of data) {
      const studentId = row['Student ID'];
      const studentName = row['Student Name'];
      const studentEmail = row['Student Email'];
      const title = row['Title'];
      const supName = row['Supervisor Name'];
      const supEmail = row['Supervisor Email'];
      const revName = row['Reviewer Name'];
      const revEmail = row['Reviewer Email'];

      if (!studentId || !studentName || !studentEmail || !title || !supEmail || !revEmail) {
        console.warn('⚠️ Skipping row due to missing fields:', row);
        continue;
      }

      const supervisor = await prisma.user.upsert({
        where: { email: supEmail },
        update: {},
        create: {
          name: supName || supEmail.split('@')[0],
          email: supEmail,
          role: 'FT_SUPERVISOR',
        },
      });

      const reviewer = await prisma.user.upsert({
        where: { email: revEmail },
        update: {},
        create: {
          name: revName || revEmail.split('@')[0],
          email: revEmail,
          role: 'REVIEWER',
        },
      });

      await prisma.bachelorTopic.create({
        data: {
          studentId,
          studentName,
          studentEmail,
          title,
          supervisorId: supervisor.id,
          reviewerId: reviewer.id,
        },
      });

      console.log(`✅ Inserted topic for student ${studentName} (${studentId})`);
    }

    return new Response(JSON.stringify({ message: 'Topics uploaded successfully' }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
