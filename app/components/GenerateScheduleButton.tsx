'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateScheduleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // prevent normal navigation
    setLoading(true);

    try {
      const res = await fetch('/api/run-scheduler', { method: 'POST' });
      if (!res.ok) {
        alert('❌ Failed to generate schedule');
        setLoading(false);
        return;
      }

      // ✅ Navigate to /schedule once done
      router.push('/schedule');
    } catch (err) {
      console.error('Schedule generation failed:', err);
      alert('❌ Error while generating schedule');
      setLoading(false);
    }
  };

  return (
    <a href="/schedule" onClick={handleClick} className="btn">
      {loading ? '⏳ Generating...' : 'Generate Schedule'}
    </a>
  );
}
