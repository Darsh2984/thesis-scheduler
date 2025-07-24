// app/schedule/page.tsx
import { prisma } from '@/lib/prisma';

export default async function SchedulePage() {
  const schedules = await prisma.schedule.findMany({
    include: {
      topic: {
        include: {
          supervisor: true,
          reviewer: true
        }
      },
      room: true,
      slot: true
    },
    orderBy: {
      slot: {
        date: 'asc'
      }
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Scheduled Presentations</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Topic</th>
            <th className="p-2 border">Supervisor</th>
            <th className="p-2 border">Reviewer</th>
            <th className="p-2 border">Room</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Time</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map(s => (
            <tr key={s.id}>
              <td className="p-2 border">{s.topic.title}</td>
              <td className="p-2 border">{s.topic.supervisor.name}</td>
              <td className="p-2 border">{s.topic.reviewer.name}</td>
              <td className="p-2 border">{s.room.name}</td>
              <td className="p-2 border">{s.slot.date.toISOString().split('T')[0]}</td>
              <td className="p-2 border">
                {s.slot.startTime.slice(0, 5)} - {s.slot.endTime.slice(0, 5)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
