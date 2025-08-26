import { read, utils } from 'xlsx';
import { prisma } from '@/lib/prisma';

// Convert Excel serial to JS Date (local)
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000);
  return new Date(Date.UTC(date_info.getFullYear(), date_info.getMonth(), date_info.getDate()));
}

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

    // Optional: Clear previous preferred dates
    await prisma.preferredDate.deleteMany();

    let count = 0;

    for (const row of data) {
      const name = row['Name'];
      const email = row['Email'];
      const rawDate = row['Date'];

      if (!name || !email || !rawDate) continue;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.warn(`⚠️ Skipping: ${name} (${email}) not found.`);
        continue;
      }

      let date;
      if (typeof rawDate === 'number') {
        const jsDate = excelDateToJSDate(rawDate);
        date = new Date(Date.UTC(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate()));
      } else {
        const parsed = new Date(rawDate);
        date = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
      }

      if (isNaN(date)) {
        console.warn(`⚠️ Invalid date for ${email}: ${rawDate}`);
        continue;
      }

      await prisma.preferredDate.create({
        data: {
          userId: user.id,
          date,
        },
      });

      count++;
    }

    return new Response(JSON.stringify({ message: `${count} preferred dates uploaded.` }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process Excel file' }), { status: 500 });
  }
}