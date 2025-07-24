import { NextResponse } from 'next/server';
import { runScheduler } from '@/lib/scheduler';

export async function GET() {
  try {
    await runScheduler(); // your logic from lib/scheduler.js
    return NextResponse.json({ success: true, message: 'Scheduler run complete.' });
  } catch (error) {
    console.error('Scheduler Error:', error);
    return NextResponse.json({ success: false, message: 'Scheduler failed.', error });
  }
}
