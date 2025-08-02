import { read, utils } from 'xlsx';
import { prisma } from '@/lib/prisma';

function excelTimeToString(time) {
  const totalMinutes = Math.round(time * 24 * 60);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000); // convert to ms
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate()); // local date
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

    // ✅ Clear existing time slots first
    await prisma.schedule.deleteMany();
    await prisma.timeSlot.deleteMany();

    for (const row of data) {
      const rawDate = row['Date'];
      const startTimeRaw = row['Start Time'];
      const endTimeRaw = row['End Time'];

      if (!rawDate || !startTimeRaw || !endTimeRaw) continue;

      let date;

      if (typeof rawDate === 'number') {
        const jsDate = excelDateToJSDate(rawDate);
        date = new Date(Date.UTC(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate())); // UTC midnight
      } else {
        const parsed = new Date(rawDate);
        date = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())); // UTC midnight
      }      
      const startTime = excelTimeToString(startTimeRaw);
      const endTime = excelTimeToString(endTimeRaw);

      await prisma.timeSlot.create({
        data: {
          date,
          startTime,
          endTime,
        },
      });
    }

    return new Response(JSON.stringify({ message: 'Time slots uploaded successfully' }), { status: 200 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse Excel file' }), { status: 500 });
  }
}
