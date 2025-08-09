import { prisma } from '@/lib/prisma';

export async function GET(req) {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });

  return new Response(JSON.stringify(users), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
