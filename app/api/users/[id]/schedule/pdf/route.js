import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function GET(req, context) {
  const userId = parseInt(context.params.id, 10);

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      OR: [
        { topic: { supervisorId: userId } },
        { topic: { reviewerId: userId } },
      ],
    },
    include: {
      topic: true,
      slot: true,
      room: true,
    },
  });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(`Schedule for ${user.name}`, {
    x: 50,
    y: 760,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  let y = 730;
  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];
    const text = `${i + 1}. ${s.topic.title} | ${s.slot.date.toISOString().split('T')[0]} | ${s.slot.startTime} - ${s.slot.endTime} | Room: ${s.room.name} | Role: ${s.topic.supervisorId === userId ? 'Supervisor' : 'Reviewer'}`;

    if (y < 50) {
      // Add new page if running out of space
      const newPage = pdfDoc.addPage([600, 800]);
      y = 750;
      page.drawText('Continued...', {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    }

    page.drawText(text, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="schedule_user_${userId}.pdf"`,
    },
  });
}
