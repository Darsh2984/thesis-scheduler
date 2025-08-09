import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req, { params }) {
  const userId = parseInt(params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) return new Response('User not found', { status: 404 });

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

  const htmlContent = `
    <h2>Hello ${user.name},</h2>
    <p>Here is your personalized schedule:</p>
    <ul>
      ${schedules.map(s => `
        <li>
          <strong>${s.topic.title}</strong><br/>
          Date: ${s.slot.date.toISOString().split('T')[0]}<br/>
          Time: ${s.slot.startTime} – ${s.slot.endTime}<br/>
          Room: ${s.room.name}<br/>
          Role: ${s.topic.supervisorId === userId ? 'Supervisor' : 'Reviewer'}
        </li>
      `).join('<br/>')}
    </ul>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Your Bachelor Schedule',
    html: htmlContent,
  });

  return new Response('Email sent!');
}
