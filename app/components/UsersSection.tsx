'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Role = 'FT_SUPERVISOR' | 'PT_SUPERVISOR' | 'REVIEWER' | 'BOTH';
type UserRow = { id: number; name: string; email: string; role: Role };
type SortKey = keyof UserRow;
type SortDir = 'asc' | 'desc';

type ConfirmState = null | {
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
  onConfirm?: () => void | Promise<void>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isValidEmail = (e: string) => EMAIL_RE.test(e.trim());

export default function UsersSection() {
  // data state
  const [rows, setRows] = useState<UserRow[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // confirm modal
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [deletingAll, setDeletingAll] = useState(false);

  function parseJsonSafe(res: Response) {
    return res.text().then((t) => {
      if (!t) return null;
      try {
        return JSON.parse(t);
      } catch {
        return null;
      }
    });
  }

  // upload state
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // section accordion
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [animHeight, setAnimHeight] = useState<number | 'auto'>(0);

  // table collapsible + search + sort
  const [tableOpen, setTableOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('REVIEWER');
  const [editEmailErr, setEditEmailErr] = useState('');

  // manual add
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('REVIEWER');
  const [newEmailErr, setNewEmailErr] = useState('');
  const roles: Role[] = ['FT_SUPERVISOR', 'PT_SUPERVISOR', 'REVIEWER', 'BOTH'];

  // load users
  async function load() {
    try {
      const res = await fetch('/api/users?ts=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // section animation
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
  }, [open, rows, status, error, tableOpen, query, sortKey, sortDir, editId, editEmailErr, newEmailErr]);

  // upload handlers
  function openPicker() {
    inputRef.current?.click();
  }
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('❌ No file selected');
      return;
    }
    setStatus('⏳ Uploading...');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-users', { method: 'POST', body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(`Upload failed (${res.status}). ${text}`);

      setStatus('✅ Users uploaded successfully');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setQuery(''); // clear search
      await load();
      setOpen(true);
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('');
    }
  }

  // edit / delete / add
  function startEdit(r: UserRow) {
    setEditId(r.id);
    setEditName(r.name);
    setEditEmail(r.email);
    setEditRole(r.role);
    setEditEmailErr('');
  }
  function cancelEdit() {
    setEditId(null);
    setEditName('');
    setEditEmail('');
    setEditRole('REVIEWER');
    setEditEmailErr('');
  }

  async function saveEdit() {
    if (editId == null) return;
    if (!editName.trim()) {
      setError('Name is required');
      return;
    }
    if (!isValidEmail(editEmail)) {
      setEditEmailErr('Please enter a valid email');
      return;
    }
    try {
      const res = await fetch(`/api/users/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim(), role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      setRows((p) => p.map((x) => (x.id === editId ? data.user : x)));
      cancelEdit();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  // ——— Custom modal flows ———
  function requestDelete(id: number) {
    setConfirm({
      title: 'Delete user',
      body: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => {
        await doDeleteOne(id);
      },
    });
  }

  async function doDeleteOne(id: number) {
    setError('');
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-store' },
      });
      const text = await res.text();
      const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setRows((prev) => prev.filter((x) => x.id !== id)); // optimistic
      await load(); // sync with DB
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  function requestClearAll() {
    setConfirm({
      title: 'Delete ALL users',
      body: 'This will permanently delete all users. Related records may also be removed depending on your backend logic. Continue?',
      confirmText: 'Delete all',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => {
        await doClearAll();
      },
    });
  }

  async function doClearAll() {
    setDeletingAll(true);
    setStatus('⏳ Clearing users…');
    setError('');

    try {
      // fetch a fresh, complete list (ignore active search)
      const resList = await fetch('/api/users?ts=' + Date.now(), { cache: 'no-store' });
      const listData = await resList.json();
      const ids: number[] = Array.isArray(listData.rows) ? listData.rows.map((u: any) => u.id) : [];

      setRows([]); // optimistic

      // delete sequentially for reliability
      for (const id of ids) {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await parseJsonSafe(res);
          throw new Error(data?.error || `Delete failed at id=${id} (HTTP ${res.status})`);
        }
      }

      await load();
      setStatus('🧹 Cleared all users');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('');
      await load();
    } finally {
      setDeletingAll(false);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!newName.trim() || !newEmail.trim() || !newRole) {
      setError('Name, email, role are required');
      return;
    }
    if (!isValidEmail(newEmail)) {
      setNewEmailErr('Please enter a valid email');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Create failed');

      // Refetch to avoid drift and ensure sorting is correct
      await load();
      setNewName('');
      setNewEmail('');
      setNewRole('REVIEWER');
      setNewEmailErr('');
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  // search + sort (search first)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.id).includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
    );
  }, [rows, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }
  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const va = a[sortKey] as any,
        vb = b[sortKey] as any;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va).toLowerCase(),
        sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const sectionState = error ? 'Error' : rows.length ? 'Uploaded' : 'Pending';

  return (
    <section style={sx.container}>
      {/* Collapsed (big) / Expanded (mini) white header */}
      <div
        style={{
          ...sx.hero,
          height: open ? 72 : 120,
          padding: open ? '12px 16px' : '28px 26px',
        }}
      >
        <div style={sx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>1</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: open ? 22 : 38, lineHeight: 1 }}>Users</div>
              {!open && <div style={{ color: '#6b7280' }}>Upload, edit, search & manage</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sx.badge(sectionState)}>{sectionState}</span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              style={sx.heroBtn}
              aria-expanded={open}
            >
              {open ? 'Hide' : 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {/* sticky mini-bar when open (clean white) */}
      {open && (
        <div style={sx.miniBar}>
          <div style={{ fontWeight: 800 }}>Users</div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{rows.length} total</div>
        </div>
      )}

      {/* Expandable body */}
      <div
        style={{
          overflow: 'hidden',
          transition: 'height .22s ease',
          height: animHeight === 'auto' ? undefined : animHeight,
        }}
      >
        <div ref={bodyRef}>
          {/* Upload */}
          <form onSubmit={upload} style={sx.card}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={openPicker}
              style={{
                ...sx.dropZone,
                borderColor: dragOver ? '#2563eb' : '#d1d5db',
                background: '#fafafa',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Drag & drop your Excel here</div>
                <div style={{ color: '#6b7280', marginBottom: 10 }}>or</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                  style={sx.primaryBtn}
                >
                  Choose file
                </button>
                <div style={{ marginTop: 10, color: file ? '#111827' : '#6b7280' }}>
                  {file ? file.name : 'No file selected'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="submit" style={sx.primaryBtn}>
                Upload
              </button>
            </div>
          </form>

          {/* Manual add */}
          <form onSubmit={addManual} style={{ ...sx.card, marginTop: 12 }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontWeight: 800 }}>Add user manually</h3>
            <div style={sx.grid}>
              <input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={sx.input}
              />

              <div>
                <input
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewEmail(v);
                    setNewEmailErr(v && !isValidEmail(v) ? 'Please enter a valid email' : '');
                  }}
                  style={{
                    ...sx.input,
                    borderColor: newEmailErr ? '#ef4444' : '#d1d5db',
                  }}
                  type="email"
                />
                {newEmailErr && <div style={sx.inputError}>{newEmailErr}</div>}
              </div>

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                style={sx.input}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                style={{
                  ...sx.secondaryBtn,
                  opacity: !newName.trim() || !newEmail.trim() || !!newEmailErr ? 0.6 : 1,
                  cursor: !newName.trim() || !newEmail.trim() || !!newEmailErr ? 'not-allowed' : 'pointer',
                }}
                disabled={!newName.trim() || !newEmail.trim() || !!newEmailErr}
              >
                Add
              </button>
            </div>
          </form>

          {/* Status & Error */}
          {status && <div style={sx.status}>{status}</div>}
          {error && <div style={sx.error}>{error}</div>}

          {/* TABLE SECTION (collapsible) */}
          <div style={{ ...sx.card, marginTop: 12 }}>
            <div style={sx.tableHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTableOpen((v) => !v)}
                  style={sx.tableToggle}
                  aria-expanded={tableOpen}
                  title={tableOpen ? 'Collapse table' : 'Expand table'}
                >
                  {tableOpen ? '▾' : '▸'}
                </button>
                <div style={{ fontWeight: 800 }}>Users table</div>
              </div>

              {/* Search + Delete all on the right */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by id, name, email, role…"
                  style={sx.search}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} style={sx.clearBtn}>
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
                    cursor: deletingAll ? 'not-allowed' : 'pointer',
                  }}
                  title="Delete ALL users"
                >
                  {deletingAll ? 'Deleting…' : 'Delete all'}
                </button>
              </div>
            </div>

            {/* Collapsible table body */}
            {tableOpen && (
              <div style={{ ...sx.tableCardInner }}>
                <table style={sx.table}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                    <tr>
                      <th style={sx.th}>
                        <Header label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} />
                      </th>
                      <th style={sx.th}>
                        <Header
                          label="Name"
                          active={sortKey === 'name'}
                          dir={sortDir}
                          onClick={() => toggleSort('name')}
                        />
                      </th>
                      <th style={sx.th}>
                        <Header
                          label="Email"
                          active={sortKey === 'email'}
                          dir={sortDir}
                          onClick={() => toggleSort('email')}
                        />
                      </th>
                      <th style={sx.th}>
                        <Header
                          label="Role"
                          active={sortKey === 'role'}
                          dir={sortDir}
                          onClick={() => toggleSort('role')}
                        />
                      </th>
                      <th style={sx.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => {
                      const editing = editId === r.id;
                      return (
                        <tr key={r.id}>
                          <td style={sx.td}>{r.id}</td>
                          <td style={sx.td}>
                            {editing ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={sx.input}
                              />
                            ) : (
                              r.name
                            )}
                          </td>
                          <td style={sx.td}>
                            {editing ? (
                              <>
                                <input
                                  value={editEmail}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setEditEmail(v);
                                    setEditEmailErr(v && !isValidEmail(v) ? 'Please enter a valid email' : '');
                                  }}
                                  style={{
                                    ...sx.input,
                                    borderColor: editEmailErr ? '#ef4444' : '#d1d5db',
                                  }}
                                  type="email"
                                />
                                {editEmailErr && <div style={sx.inputError}>{editEmailErr}</div>}
                              </>
                            ) : (
                              r.email
                            )}
                          </td>
                          <td style={sx.td}>
                            {editing ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as Role)}
                                style={sx.input}
                              >
                                {roles.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              r.role
                            )}
                          </td>
                          <td style={sx.td}>
                            {!editing ? (
                              <>
                                <button onClick={() => startEdit(r)} style={sx.linkBtn}>
                                  Edit
                                </button>
                                <button onClick={() => requestDelete(r.id)} style={sx.dangerBtn}>
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={saveEdit}
                                  style={{
                                    ...sx.primaryBtnSmall,
                                    opacity: !!editEmailErr ? 0.6 : 1,
                                    cursor: !!editEmailErr ? 'not-allowed' : 'pointer',
                                  }}
                                  disabled={!!editEmailErr}
                                >
                                  Save
                                </button>
                                <button onClick={cancelEdit} style={sx.secondaryBtnSmall}>
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {sorted.length === 0 && (
                      <tr>
                        <td style={{ padding: 16, color: '#6b7280' }} colSpan={5}>
                          No matching rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* Custom confirm modal */}
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

function Header({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        fontWeight: active ? 800 : 600,
        color: active ? '#111827' : '#374151',
        cursor: 'pointer',
      }}
    >
      {label}
      {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </button>
  );
}

const sx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },

  // header
  hero: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    transition: 'all .22s ease',
    boxShadow: '0 8px 20px rgba(0,0,0,.06)',
    marginBottom: 14,
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
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderWidth: 1,
  },
  badge: (state: string) => ({
    background: state === 'Uploaded' ? '#ecfdf5' : state === 'Error' ? '#fef2f2' : '#f3f4f6',
    color: state === 'Uploaded' ? '#065f46' : state === 'Error' ? '#991b1b' : '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    fontWeight: 700,
    padding: '6px 10px',
    lineHeight: 1,
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

  // mini bar
  miniBar: {
    position: 'sticky',
    top: 12,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: '10px 12px',
    marginTop: 12,
    boxShadow: '0 6px 20px rgba(0,0,0,.06)',
  },

  // cards
  card: {
    border: '1px solid #e5e7eb',
    padding: 16,
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: 14,
    padding: 28,
    marginBottom: 12,
    transition: 'all .15s ease',
    cursor: 'pointer',
  },

  // controls
  primaryBtn: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 700,
  },
  primaryBtnSmall: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    marginRight: 6,
    fontWeight: 700,
  },
  secondaryBtnSmall: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 700,
  },
  linkBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    marginRight: 6,
    fontWeight: 700,
  },
  dangerBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #ef4444',
    background: '#fff',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: 700,
  },
  dangerOutlineBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #ef4444',
    background: '#fff',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: 700,
  },

  // status
  status: {
    marginTop: 12,
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #cafedaff',
    padding: 12,
    borderRadius: 10,
  },
  error: {
    marginTop: 12,
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    padding: 12,
    borderRadius: 10,
  },

  // table area
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tableToggle: {
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 8,
    padding: '4px 8px',
    cursor: 'pointer',
    fontWeight: 700,
    color: '#111827',
  },
  search: { width: 320, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  clearBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    cursor: 'pointer',
    fontWeight: 700,
  },
  tableCardInner: { overflow: 'auto', maxHeight: '70vh', border: '1px solid #e5e7eb', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 10, background: '#f9fafb' },
  td: { borderBottom: '1px solid #f3f4f6', padding: 10, verticalAlign: 'middle' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 220px 140px', gap: 10 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  inputError: { marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: 600 },

  // modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 16,
  },
  modalCard: {
    width: 'min(520px, 96vw)',
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    boxShadow: '0 24px 60px rgba(0,0,0,.18)',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 900, marginBottom: 8 },
  modalText: { color: '#374151', marginBottom: 16, lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
};
