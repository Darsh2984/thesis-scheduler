'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateScheduleCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/run-scheduler', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate schedule');
      router.push('/schedule');
    } catch (err) {
      console.error('Schedule generation failed:', err);
      alert('❌ Error while generating schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={sx.container}>
      <div style={sx.hero}>
        <div style={sx.heroContent}>
          {/* Number + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>6</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Generate Schedule</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Run the scheduler and view results</div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleClick}
            disabled={loading}
            style={sx.heroBtn}
          >
            {loading ? '⏳ Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </section>
  );
}

const sx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },
  hero: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    transition: 'all .22s ease',
    boxShadow: '0 8px 20px rgba(0,0,0,.06)',
    marginBottom: 14,
    padding: '20px 24px',
    height: 120,          // ✅ fixed height
  },
  heroContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoCircle: {
    width: 48,
    height: 48,
    minWidth: 48,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    background: '#f3f4f6',
    color: '#111827',
    fontWeight: 900,
    fontSize: 18,
    border: '1px solid #e5e7eb',
  },
  heroBtn: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
};
