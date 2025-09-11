'use client';

import { useEffect, useState } from 'react';

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
  const [newDate, setNewDate] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<any>(null);

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

  function requestDeleteAllConstraints() {
    setConfirm({
      title: 'Delete All Constraints',
      body: '⚠️ This will permanently delete all preferred and unavailable dates. Are you sure?',
      confirmText: 'Delete All',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/constraints', { method: 'DELETE' });
          if (!res.ok) throw new Error();
          setStatus('✅ All constraints cleared');
          await load();
        } catch {
          setError('❌ Error clearing constraints');
        }
      },
    });
  }

  const sectionState = error
    ? "Error"
    : users.length === 0
    ? "No Users Entered"
    : "Filled";

  const filteredUsers = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <section style={sx.container}>
      {/* header */}
      <div style={sx.hero}>
        <div style={sx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>5📅</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 24 }}>Constraints</div>
              <div style={{ color: '#6b7280' }}>Preferred & Unavailable dates</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sx.badge(sectionState)}>{sectionState}</span>
            <button onClick={load} style={sx.heroBtn}>↻ Refresh</button>
            <button onClick={() => setOpen(o => !o)} style={sx.heroBtn}>
              {open ? 'Hide' : 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div style={sx.body}>
          {/* sticky search bar */}
          <div style={sx.miniBar}>
            <div style={{ fontWeight: 800 }}>Constraints</div>
            <input
              placeholder="Search users…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={sx.search}
            />
            <div style={{ color: '#6b7280', fontSize: 12 }}>{filteredUsers.length} users</div>
            <button onClick={requestDeleteAllConstraints} style={sx.dangerBtn}>
              🗑️ Delete All
            </button>
          </div>

          {/* scrollable content */}
          <div style={sx.scrollCard}>
            {status && <div style={sx.status}>{status}</div>}
            {error && <div style={sx.error}>{error}</div>}

            {filteredUsers.map(user => (
              <div key={user.id} style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 8 }}>{user.name}</h3>

                <div style={sx.twoCol}>
                  {/* Preferred */}
                  <div>
                    <label style={sx.label}>Preferred Dates</label>
                    <div style={sx.pillRowWrap}>
                      {user.preferredDates.map(p => (
                        <div key={p.id} style={sx.chip}>
                          {new Date(p.date).toLocaleDateString()}
                          <button onClick={() => remove(p.id, 'preferred')} style={sx.chipRemove}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="date"
                        value={newDate[user.id + '_preferred'] || ''}
                        onChange={e =>
                          setNewDate({ ...newDate, [user.id + '_preferred']: e.target.value })
                        }
                        style={sx.input}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          add(user.id, newDate[user.id + '_preferred'], 'preferred')
                        }
                        style={sx.secondaryBtn}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Unavailable */}
                  <div>
                    <label style={sx.label}>Unavailable Dates</label>
                    <div style={sx.pillRowWrap}>
                      {user.unavailability.map(u => (
                        <div key={u.id} style={sx.chip}>
                          {new Date(u.date).toLocaleDateString()}
                          <button
                            onClick={() => remove(u.id, 'unavailable')}
                            style={sx.chipRemove}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="date"
                        value={newDate[user.id + '_unavailable'] || ''}
                        onChange={e =>
                          setNewDate({ ...newDate, [user.id + '_unavailable']: e.target.value })
                        }
                        style={sx.input}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          add(user.id, newDate[user.id + '_unavailable'], 'unavailable')
                        }
                        style={sx.secondaryBtn}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div style={sx.modalOverlay} onClick={() => setConfirm(null)}>
          <div style={sx.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={sx.modalTitle}>{confirm.title}</div>
            <div style={sx.modalText}>{confirm.body}</div>
            <div style={sx.modalActions}>
              <button style={sx.secondaryBtn} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                style={confirm.tone === 'danger' ? sx.dangerBtn : sx.primaryBtn}
                onClick={async () => {
                  try {
                    await confirm.onConfirm?.();
                  } finally {
                    setConfirm(null);
                  }
                }}
              >
                {confirm.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const sx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },
  hero: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    boxShadow: '0 8px 20px rgba(0,0,0,.06)',
    marginBottom: 14,
    padding: '16px 20px',
  },
  heroContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
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
   badge: (state: string) => ({
    background:
      state === "Filled"
        ? "#ecfdf5"
        : state === "Error"
        ? "#fef2f2"
        : "#f3f4f6", // Empty or fallback
    color:
      state === "Filled"
        ? "#065f46"
        : state === "Error"
        ? "#991b1b"
        : "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    fontWeight: 700,
    padding: "6px 10px",
    fontSize: 12,
  }),

  heroBtn: {
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  body: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 12,
  },
  miniBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: '10px 12px',
    marginBottom: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,.05)',
    gap: 12,
  },
  scrollCard: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #f3f4f6',
  },
  input: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
  
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#111827',
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
  dangerBtn: {
    background: '#dc2626',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#f3f4f6',
    borderRadius: 16,
    padding: '4px 10px',
    fontSize: 13,
    border: '1px solid #d1d5db',
    margin: 2,
  },
  chipRemove: {
    border: 'none',
    background: 'transparent',
    color: '#ef4444',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 700,
  },
  pillRowWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  label: { display: 'block', fontWeight: 700, marginBottom: 4 },
  status: {
    marginBottom: 12,
    background: '#f0fdf4',
    color: '#166534',
    padding: 10,
    borderRadius: 8,
  },
  error: {
    marginBottom: 12,
    background: '#fef2f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 8,
  },
  search: { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', flex: 1 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,.2)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  modalText: { marginBottom: 16, color: '#374151' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
};
