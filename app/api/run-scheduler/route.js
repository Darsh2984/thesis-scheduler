// app/api/run-scheduler/route.ts
import { runScheduler } from '@/lib/scheduler'; // adjust this if the path is different

export async function POST() {
  try {
    await runScheduler();
    return new Response(JSON.stringify({ message: '✅ Scheduler run successfully' }), {
      status: 200,
    });
  } catch (err) {
    console.error('❌ Scheduler run failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to run scheduler' }), {
      status: 500,
    });
  }
}
