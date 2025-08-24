import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req, context) {
  const { params } = context;             // ✅ proper way to access params
  const userId = parseInt(params.id, 10);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

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
    orderBy: {
      slot: { date: 'asc' },
    },
  });

  // ✅ Build a clean HTML table for email
  const htmlContent = `
    <h2>Hello ${user.name},</h2>
    <p>Here is your personalized schedule:</p>
    ${
      schedules.length === 0
        ? "<p>No scheduled presentations found for you.</p>"
        : `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; font-family:Arial, sans-serif; font-size:14px;">
        <thead style="background:#f3f4f6;">
          <tr>
            <th align="left">Topic</th>
            <th align="left">Date</th>
            <th align="left">Time</th>
            <th align="left">Room</th>
            <th align="left">Role</th>
          </tr>
        </thead>
        <tbody>
          ${schedules
            .map(
              (s) => `
            <tr>
              <td>${s.topic.title}</td>
              <td>${s.slot.date.toISOString().split('T')[0]}</td>
              <td>${s.slot.startTime} – ${s.slot.endTime}</td>
              <td>${s.room.name}</td>
              <td>${s.topic.supervisorId === userId ? 'Supervisor' : 'Reviewer'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      `
    }
    <p style="margin-top:16px;">Best regards,<br/>Thesis Scheduler System</p>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail', // or use SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // must be an App Password if Gmail
    },
  });

  await transporter.sendMail({
    from: `"Thesis Scheduler" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Your Bachelor Defense Schedule',
    html: htmlContent,
  });

  return new Response('✅ Email sent successfully');
}
