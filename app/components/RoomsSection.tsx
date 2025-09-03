'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RoomRow = { id: number; name: string; capacity?: number | null };
type SortKey = keyof RoomRow;
type SortDir = 'asc' | 'desc';

type ConfirmState = null | {
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
  onConfirm?: () => void | Promise<void>;
};

export default function RoomsSection() {
  // data
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // confirm modal
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // section accordion
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [animHeight, setAnimHeight] = useState<number | 'auto'>(0);

  // upload
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // table
  const [tableOpen, setTableOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // manual add
  const [newName, setNewName] = useState('');
  const [newCap, setNewCap] = useState<string>('');
  const [capErr, setCapErr] = useState('');

  // load list
  async function load() {
    try {
      const res = await fetch('/api/upload-rooms?ts=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => { load(); }, []);

  // section anim
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
  }, [open, rows, status, error, tableOpen, query, sortKey, sortDir]);

  // upload handlers
  function openPicker() { inputRef.current?.click(); }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) setFile(f);
  }
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('❌ No file selected'); return; }
    setStatus('⏳ Uploading rooms…'); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload-rooms', { method: 'POST', body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Upload failed (${res.status})`);
      setStatus('✅ Rooms uploaded successfully');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setQuery('');
      await load();
      setOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
      setStatus('');
    }
  }

  // delete one — shows a nice modal, and keeps a success message
  function requestDeleteOne(id: number, name: string) {
    setConfirm({
      title: 'Delete room',
      body: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => {
        await doDeleteOne(id, name);
      }
    });
  }
  async function doDeleteOne(id: number, name: string) {
    setError('');
    try {
      const res = await fetch(`/api/upload-rooms?id=${id}`, { method: 'DELETE', headers: { 'Cache-Control': 'no-store' } });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      setStatus(`🗑️ Deleted “${name}”`);
      setRows(prev => prev.filter(r => r.id !== id));   // optimistic
      await load();                                      // ensure sync
    } catch (err: any) {
      setError(err?.message || 'Delete failed');
    }
  }

  // delete all (looping single-delete endpoint)
  function requestClearAll() {
    setConfirm({
      title: 'Delete ALL rooms',
      body: 'This will permanently delete all rooms. Continue?',
      confirmText: 'Delete all',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => { await doClearAll(); }
    });
  }
  async function doClearAll() {
    setDeletingAll(true);
    setStatus('⏳ Clearing rooms…'); setError('');
    try {
      const res = await fetch('/api/upload-rooms?ts=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      const ids: number[] = Array.isArray(data.rows) ? data.rows.map((r: any) => r.id) : [];
      setRows([]); // optimistic
      for (const id of ids) {
        const r = await fetch(`/api/upload-rooms?id=${id}`, { method: 'DELETE' });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `Failed at id=${id}`);
        }
      }
      await load();
      setStatus('🧹 Cleared all rooms');
    } catch (err: any) {
      setError(err?.message || 'Clear failed');
      setStatus('');
      await load();
    } finally {
      setDeletingAll(false);
    }
  }

  // manual add
  function validateCap(v: string) {
    if (v.trim() === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 'Capacity must be a non-negative number';
    return '';
  }
  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setStatus('');
    if (!newName.trim()) { setError('Room name is required'); return; }
    const capErrMsg = validateCap(newCap);
    setCapErr(capErrMsg);
    if (capErrMsg) return;

    const payload: any = { name: newName.trim() };
    if (newCap.trim() !== '') payload.capacity = Number(newCap);

    try {
      const res = await fetch('/api/upload-rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || 'Create failed');
      setStatus('✅ Room added');
      setNewName(''); setNewCap('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Create failed');
    }
  }

  // search + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      String(r.id).includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.capacity != null && String(r.capacity).includes(q))
    );
  }, [rows, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const va = a[sortKey] as any, vb = b[sortKey] as any;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va ?? '').toLowerCase(), sb = String(vb ?? '').toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const sectionState = error ? 'Error' : rows.length ? 'Uploaded' : 'Pending';

  return (
    <section style={sx.container}>
      {/* Header */}
      <div style={{ ...sx.hero, height: open ? 64 : 120, padding: open ? '10px 14px' : '24px 24px' }}>
        <div style={sx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>3</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: open ? 22 : 38, lineHeight: 1 }}>Rooms</div>
              {!open && <div style={{ color: '#6b7280' }}>Upload, search & manage</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sx.badge(sectionState)}>{sectionState}</span>
            <button type="button" onClick={() => setOpen(o => !o)} style={sx.heroBtn}>
              {open ? 'Hide' : 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {/* Mini bar */}
      {open && (
        <div style={sx.miniBar}>
          <div style={{ fontWeight: 800 }}>Rooms</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{rows.length} total</div>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          overflow: 'hidden',
          transition: 'height .22s ease',
          height: animHeight === 'auto' ? undefined : animHeight,
        }}
      >
        <div ref={bodyRef}>
          {/* Upload + Manual side-by-side (single card) */}
          <div style={{ ...sx.card, padding: 0 }}>
            <div style={sx.duoWrap}>
              {/* Upload */}
              <form onSubmit={upload} style={sx.duoCol}>
                <div
                  onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={onDrop}
                  onClick={openPicker}
                  style={{
                    ...sx.dropZone,
                    borderColor: dragOver ? '#2563eb' : '#d1d5db',
                    background: '#fafafa'
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                      Drag & drop Excel/CSV here
                    </div>
                    <div style={{ color: '#6b7280', marginBottom: 10 }}>or</div>
                    <button type="button" onClick={(e)=>{e.stopPropagation(); openPicker();}} style={sx.primaryBtn}>
                      Choose file
                    </button>
                    <div style={{ marginTop: 10, color: file ? '#111827' : '#6b7280' }}>
                      {file ? file.name : 'No file selected'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button type="submit" style={sx.primaryBtn}>Upload</button>
                </div>
              </form>

              {/* Manual add */}
              <form onSubmit={addManual} style={sx.duoCol}>
                <h3 style={{ margin: 0, marginBottom: 8, fontWeight: 800 }}>Add room manually</h3>
                <div style={sx.grid2}>
                  <input
                    placeholder="Room name"
                    value={newName}
                    onChange={(e)=>setNewName(e.target.value)}
                    style={sx.input}
                  />
           
                </div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button
                    type="submit"
                    style={{
                      ...sx.secondaryBtn,
                      opacity: !newName.trim() || !!capErr ? 0.6 : 1,
                      cursor: !newName.trim() || !!capErr ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!newName.trim() || !!capErr}
                  >
                    Add room
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Status & Error */}
          {status && <div style={sx.status}>{status}</div>}
          {error && <div style={sx.error}>{error}</div>}

          {/* Table */}
          <div style={{ ...sx.card, marginTop: 12 }}>
            <div style={sx.tableHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTableOpen(v => !v)}
                  style={sx.tableToggle}
                  aria-expanded={tableOpen}
                >
                  {tableOpen ? '▾' : '▸'}
                </button>
                <div style={{ fontWeight: 800 }}>Rooms table</div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  placeholder="Search id, name, capacity…"
                  style={sx.search}
                />
                {query && (
                  <button type="button" onClick={()=>setQuery('')} style={sx.clearBtn}>
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestClearAll}
                  disabled={deletingAll}
                  style={{
                    ...sx.dangerOutlineBtn,
                    opacity: deletingAll ? 0.6 : 1,
                    cursor: deletingAll ? 'not-allowed' : 'pointer'
                  }}
                  title="Delete ALL rooms"
                >
                  {deletingAll ? 'Deleting…' : 'Delete all'}
                </button>
              </div>
            </div>

            {tableOpen && (
              <div style={{ ...sx.tableCardInner }}>
                <table style={sx.table}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                    <tr>
                      <th style={sx.th}><Hdr label="ID" active={sortKey==='id'} dir={sortDir} onClick={()=>toggleSort('id')} /></th>
                      <th style={sx.th}><Hdr label="Name" active={sortKey==='name'} dir={sortDir} onClick={()=>toggleSort('name')} /></th>
                      <th style={sx.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.id}>
                        <td style={sx.td}>{r.id}</td>
                        <td style={sx.td}>{r.name}</td>
                        <td style={sx.td}>
                          <button onClick={()=>requestDeleteOne(r.id, r.name)} style={sx.dangerBtn}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {sorted.length === 0 && (
                      <tr><td style={{ padding: 16, color: '#6b7280' }} colSpan={4}>No matching rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* Confirm modal */}
      {confirm && (
        <div style={sx.modalOverlay} onClick={() => setConfirm(null)}>
          <div style={sx.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={sx.modalTitle}>{confirm.title}</div>
            <div style={sx.modalText}>{confirm.body}</div>
            <div style={sx.modalActions}>
              <button style={sx.secondaryBtn} onClick={() => setConfirm(null)}>
                {confirm.cancelText || 'Cancel'}
              </button>
              <button
                style={confirm.tone === 'danger' ? sx.dangerBtn : sx.primaryBtn}
                onClick={async () => {
                  try { await confirm.onConfirm?.(); }
                  finally { setConfirm(null); }
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

function Hdr({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none',
        fontWeight: active ? 800 : 600, color: active ? '#111827' : '#374151',
        cursor: 'pointer'
      }}
    >
      {label}{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </button>
  );
}

const sx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },

  // header
  hero: {
    border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff',
    transition: 'all .22s ease', boxShadow: '0 8px 20px rgba(0,0,0,.06)', marginBottom: 14
  },
  heroContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: {
    width: 48, height: 48, minWidth: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, background: '#f3f4f6', color: '#111827', fontWeight: 900, fontSize: 18,
    borderColor: '#e5e7eb', borderStyle: 'solid', borderWidth: 1,
  },
  badge: (state: string) => ({
    background: state === 'Uploaded' ? '#ecfdf5' : state === 'Error' ? '#fef2f2' : '#f3f4f6',
    color:      state === 'Uploaded' ? '#065f46' : state === 'Error' ? '#991b1b' : '#374151',
    border: '1px solid #e5e7eb', borderRadius: 999, fontWeight: 700, padding: '6px 10px', lineHeight: 1, fontSize: 12
  }),
  heroBtn: { padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 },

  // mini bar
  miniBar: {
    position: 'sticky', top: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '10px 12px', marginTop: 12, boxShadow: '0 6px 20px rgba(0,0,0,.06)',
  },

  // cards
  card: { border: '1px solid #e5e7eb', borderRadius: 14, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 16 },

  // duo layout
  duoWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  duoCol: {
    padding: 16,
    borderRight: '1px solid #e5e7eb',
  },
  // last col no border
  // (we'll inline style for second column by spreading ...sx.duoCol and then override borderRight)

  dropZone: {
    border: '2px dashed #d1d5db', borderRadius: 14, padding: 28, marginBottom: 12,
    transition: 'all .15s ease', cursor: 'pointer'
  },

  // controls
  primaryBtn: { padding: '10px 16px', borderRadius: 10, border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  secondaryBtn: { padding: '10px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#111827', cursor: 'pointer', fontWeight: 700 },
  linkBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827', cursor: 'pointer', marginRight: 6, fontWeight: 700 },
  dangerBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 700 },
  dangerOutlineBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ef4444', background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 700 },

  status: { marginTop: 12, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: 12, borderRadius: 10 },
  error:  { marginTop: 12, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: 12, borderRadius: 10 },

  // table
  tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tableToggle: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontWeight: 700, color: '#111827' },
  search: { width: 320, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  clearBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 700 },
  tableCardInner: { overflow: 'auto', maxHeight: '70vh', border: '1px solid #e5e7eb', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 10, background: '#f9fafb' },
  td: { borderBottom: '1px solid #f3f4f6', padding: 10, verticalAlign: 'middle' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  inputError: { marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: 600 },

  // modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 },
  modalCard: { width: 'min(520px, 96vw)', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 24px 60px rgba(0,0,0,.18)', padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 900, marginBottom: 8 },
  modalText: { color: '#374151', marginBottom: 16, lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
};
