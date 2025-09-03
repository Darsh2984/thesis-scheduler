'use client';

import { useEffect, useRef, useState } from 'react';

type Constraint = { id: number; date: string };
type User = {
  id: number;
  name: string;
  preferredDates: Constraint[];
  unavailability: Constraint[];
};

export default function ConstraintsSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [animHeight, setAnimHeight] = useState<number | 'auto'>(0);
  const [newDate, setNewDate] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/constraints?ts=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setUsers(data.rows);
    } catch (err: any) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      const h = bodyRef.current.scrollHeight || 0;
      setAnimHeight(h);
      const t = setTimeout(() => setAnimHeight('auto'), 220);
      return () => clearTimeout(t);
    } else {
      const h = bodyRef.current.scrollHeight || 0;
      setAnimHeight(h);
      requestAnimationFrame(() => setAnimHeight(0));
    }
  }, [open, users, status, error]);

  async function add(userId: number, date: string, type: 'preferred' | 'unavailable') {
    try {
      const res = await fetch('/api/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setStatus(data.message);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: number, type: 'preferred' | 'unavailable') {
    try {
      const res = await fetch(`/api/constraints/${id}?type=${type}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setStatus(data.message);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const sectionState = error ? 'Error' : users.length ? 'Loaded' : 'Pending';
  const filteredUsers = query
    ? users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <section style={sx.container}>
      {/* header */}
      <div style={{ ...sx.hero, height: open ? 72 : 120, padding: open ? '12px 16px' : '28px 26px' }}>
        <div style={sx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>5📅</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: open ? 22 : 36 }}>Constraints</div>
              {!open && <div style={{ color: '#6b7280' }}>Preferred & Unavailable dates</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sx.badge(sectionState)}>{sectionState}</span>
            <button onClick={() => setOpen(o => !o)} style={sx.heroBtn}>{open ? 'Hide' : 'Manage'}</button>
          </div>
        </div>
      </div>

      {open && (
        <div style={sx.miniBar}>
          <div style={{ fontWeight: 800 }}>Constraints</div>
          <input
            placeholder="Search users…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={sx.search}
          />
          <div style={{ color: '#6b7280', fontSize: 12 }}>{filteredUsers.length} users</div>
        </div>
      )}

      <div style={{ overflow: 'hidden', transition: 'height .22s ease', height: animHeight === 'auto' ? undefined : animHeight }}>
        <div ref={bodyRef}>
          {status && <div style={sx.status}>{status}</div>}
          {error && <div style={sx.error}>{error}</div>}

          <div style={{ ...sx.card, marginTop: 12 }}>
            {filteredUsers.map(user => (
              <div key={user.id} style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 8 }}>{user.name}</h3>

                {/* Preferred + Unavailable side by side */}
                <div style={sx.twoCol}>
                  {/* Preferred */}
                  <div>
                    <label style={sx.label}>Preferred Dates</label>
                    <div style={sx.pillRowWrap}>
                      {user.preferredDates.map(p => (
                        <div key={p.id} style={sx.chip}>
                          {new Date(p.date).toLocaleDateString()}
                          <button onClick={() => remove(p.id, 'preferred')} style={sx.chipRemove}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="date"
                        value={newDate[user.id + '_preferred'] || ''}
                        onChange={e => setNewDate({ ...newDate, [user.id + '_preferred']: e.target.value })}
                        style={sx.input}
                      />
                      <button
                        type="button"
                        onClick={() => add(user.id, newDate[user.id + '_preferred'], 'preferred')}
                        style={sx.secondaryBtn}
                      >Add</button>
                    </div>
                  </div>

                  {/* Unavailable */}
                  <div>
                    <label style={sx.label}>Unavailable Dates</label>
                    <div style={sx.pillRowWrap}>
                      {user.unavailability.map(u => (
                        <div key={u.id} style={sx.chip}>
                          {new Date(u.date).toLocaleDateString()}
                          <button onClick={() => remove(u.id, 'unavailable')} style={sx.chipRemove}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="date"
                        value={newDate[user.id + '_unavailable'] || ''}
                        onChange={e => setNewDate({ ...newDate, [user.id + '_unavailable']: e.target.value })}
                        style={sx.input}
                      />
                      <button
                        type="button"
                        onClick={() => add(user.id, newDate[user.id + '_unavailable'], 'unavailable')}
                        style={sx.secondaryBtn}
                      >Add</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const sx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },
  hero: { border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff', transition: 'all .22s ease', boxShadow: '0 8px 20px rgba(0,0,0,.06)', marginBottom: 14 },
  heroContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: { width: 48, height: 48, minWidth: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#f3f4f6', color: '#111827', fontWeight: 900, fontSize: 18, borderColor: '#e5e7eb', borderStyle: 'solid', borderWidth: 1 },
  badge: (state: string) => ({ background: state === 'Loaded' ? '#ecfdf5' : state === 'Error' ? '#fef2f2' : '#f3f4f6', color: state === 'Loaded' ? '#065f46' : state === 'Error' ? '#991b1b' : '#374151', border: '1px solid #e5e7eb', borderRadius: 999, fontWeight: 700, padding: '6px 10px', fontSize: 12 }),
  heroBtn: { padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  miniBar: { position: 'sticky', top: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '10px 12px', marginTop: 12, boxShadow: '0 6px 20px rgba(0,0,0,.06)', gap: 12 },
  card: { border: '1px solid #e5e7eb', padding: 16, borderRadius: 14, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  input: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' },
  secondaryBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 700 },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 16, padding: '4px 10px', fontSize: 13, border: '1px solid #d1d5db', margin: 2 },
  chipRemove: { border: 'none', background: 'transparent', color: '#ef4444', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  pillRowWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  label: { display: 'block', fontWeight: 700, marginBottom: 4 },
  status: { marginTop: 12, background: '#f0fdf4', color: '#166534', padding: 10, borderRadius: 8 },
  error: { marginTop: 12, background: '#fef2f2', color: '#991b1b', padding: 10, borderRadius: 8 },
  search: { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', flex: 1 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }
};
