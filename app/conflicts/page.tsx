import { prisma } from '@/lib/prisma';

export default async function ConflictPage() {
  const conflicts = await prisma.conflict.findMany({
    include: {
      topic: true
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Unscheduled Topics & Conflicts</h1>
      {conflicts.length === 0 ? (
        <p className="text-green-600">🎉 No conflicts found!</p>
      ) : (
        <ul className="list-disc ml-5 space-y-2">
          {conflicts.map((c) => (
            <li key={c.id}>
              <strong>{c.topic.title}</strong> – {c.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
