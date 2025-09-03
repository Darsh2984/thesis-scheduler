'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type TopicRow = {
  id: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  supervisor: string;
  supervisorEmail: string;
  examiner: string;
  examinerEmail: string;
};
type SortKey = keyof TopicRow;
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

export default function TopicsSection() {
  // data
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // confirm modal
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // section expand/collapse
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [animHeight, setAnimHeight] = useState<number | 'auto'>(0);

  // upload
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // table collapsible + search + sort
  const [tableOpen, setTableOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<TopicRow>>({});
  const [editErr, setEditErr] = useState({
    studentEmail: '',
    supervisorEmail: '',
    examinerEmail: '',
  });

  // manual add
  const [newRow, setNewRow] = useState({
    studentId: '', studentName: '', studentEmail: '', title: '',
    supervisorEmail: '', reviewerEmail: '',
    supervisorName: '', reviewerName: '',
  });
  const [newErr, setNewErr] = useState({
    studentEmail: '',
    supervisorEmail: '',
    reviewerEmail: '',
  });

  function parseJsonSafe(res: Response) {
    return res.text().then(t => {
      if (!t) return null;
      try { return JSON.parse(t); } catch { return null; }
    });
  }

  async function load() {
    try {
      const res = await fetch('/api/topics?ts=' + Date.now(), { cache: 'no-store' });
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
  }, [open, rows, status, error, tableOpen, query, sortKey, sortDir, editId, edit, editErr, newErr]);

  // upload actions
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
    setStatus('⏳ Uploading...'); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload-topics', { method: 'POST', body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(`Upload failed (${res.status}). ${text}`);
      setStatus('✅ Topics uploaded successfully');
      setFile(null); if (inputRef.current) inputRef.current.value = '';
      setQuery(''); // reset search so you can see what was uploaded
      await load();
      setOpen(true);
    } catch (err: any) {
      setError(err?.message || String(err)); setStatus('');
    }
  }

  // manual add (with validation)
  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setStatus('');
    const { studentId, studentName, studentEmail, title, supervisorEmail, reviewerEmail, supervisorName, reviewerName } = newRow;

    const errs = {
      studentEmail: studentEmail && !isValidEmail(studentEmail) ? 'Invalid email' : '',
      supervisorEmail: supervisorEmail && !isValidEmail(supervisorEmail) ? 'Invalid email' : '',
      reviewerEmail: reviewerEmail && !isValidEmail(reviewerEmail) ? 'Invalid email' : '',
    };
    setNewErr(errs);

    if (!studentId || !studentName || !studentEmail || !title || !supervisorEmail || !reviewerEmail) {
      setError('All required fields must be filled'); return;
    }
    if (errs.studentEmail || errs.supervisorEmail || errs.reviewerEmail) return;

    try {
      const res = await fetch('/api/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId, studentName, studentEmail: studentEmail.trim(), title: title.trim(),
          supervisorEmail: supervisorEmail.trim(), reviewerEmail: reviewerEmail.trim(),
          supervisorName: supervisorName?.trim() || undefined, reviewerName: reviewerName?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Create failed');

      await load();
      setNewRow({
        studentId: '', studentName: '', studentEmail: '', title: '',
        supervisorEmail: '', reviewerEmail: '',
        supervisorName: '', reviewerName: '',
      });
      setNewErr({ studentEmail: '', supervisorEmail: '', reviewerEmail: '' });
    } catch (err: any) { setError(err?.message || String(err)); }
  }

  // edit / delete
  function startEditRow(r: TopicRow) {
    setEditId(r.id);
    setEdit({
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      title: r.title,
      supervisorEmail: r.supervisorEmail,
      examinerEmail: r.examinerEmail,
      supervisor: r.supervisor,
      examiner: r.examiner,
    });
    setEditErr({ studentEmail: '', supervisorEmail: '', examinerEmail: '' });
  }
  function cancelEdit() { setEditId(null); setEdit({}); setEditErr({ studentEmail: '', supervisorEmail: '', examinerEmail: '' }); }

  async function saveEdit() {
    if (editId == null) return;

    // Validate emails only if present in the edit payload
    const errs = {
      studentEmail: edit.studentEmail && !isValidEmail(edit.studentEmail) ? 'Invalid email' : '',
      supervisorEmail: edit.supervisorEmail && !isValidEmail(edit.supervisorEmail) ? 'Invalid email' : '',
      examinerEmail: edit.examinerEmail && !isValidEmail(edit.examinerEmail) ? 'Invalid email' : '',
    };
    setEditErr(errs);
    if (errs.studentEmail || errs.supervisorEmail || errs.examinerEmail) return;

    try {
      const payload: any = {
        studentId: edit.studentId,
        studentName: edit.studentName,
        studentEmail: edit.studentEmail?.trim(),
        title: edit.title,
      };
      if (edit.supervisorEmail) {
        payload.supervisorEmail = edit.supervisorEmail.trim();
        if (edit.supervisor) payload.supervisorName = edit.supervisor;
      }
      if (edit.examinerEmail) {
        payload.reviewerEmail = edit.examinerEmail.trim(); // reviewer = examiner
        if (edit.examiner) payload.reviewerName = edit.examiner;
      }

      const res = await fetch(`/api/topics/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');

      setRows((p) => p.map((x) => (x.id === editId ? data.topic : x)));
      cancelEdit();
    } catch (err: any) { setError(err?.message || String(err)); }
  }

  function requestDelete(id: number) {
    setConfirm({
      title: 'Delete topic',
      body: 'Are you sure you want to delete this topic? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => { await doDeleteOne(id); },
    });
  }
  async function doDeleteOne(id: number) {
    setError('');
    try {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE', headers: { 'Cache-Control': 'no-store' } });
      const text = await res.text();
      const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(p => p.filter(x => x.id !== id)); // optimistic
      await load(); // keep UI in sync
    } catch (err: any) { setError(err?.message || String(err)); }
  }

  function requestClearAll() {
    setConfirm({
      title: 'Delete ALL topics',
      body: 'This will permanently delete all topics (and possibly related data depending on backend). Continue?',
      confirmText: 'Delete all',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => { await doClearAll(); },
    });
  }
  async function doClearAll() {
    setDeletingAll(true); setStatus('⏳ Clearing topics…'); setError('');
    try {
      const resList = await fetch('/api/topics?ts=' + Date.now(), { cache: 'no-store' });
      const listData = await resList.json();
      const ids: number[] = Array.isArray(listData.rows) ? listData.rows.map((t: any) => t.id) : [];

      setRows([]); // optimistic clear
      for (const id of ids) {
        const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await parseJsonSafe(res);
          throw new Error(data?.error || `Delete failed at id=${id} (HTTP ${res.status})`);
        }
      }
      await load();
      setStatus('🧹 Cleared all topics');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('');
      await load();
    } finally { setDeletingAll(false); }
  }

  // search + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.id).includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      r.studentName.toLowerCase().includes(q) ||
      r.studentEmail.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.supervisor.toLowerCase().includes(q) ||
      r.supervisorEmail.toLowerCase().includes(q) ||
      r.examiner.toLowerCase().includes(q) ||
      r.examinerEmail.toLowerCase().includes(q)
    );
  }, [rows, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const va = a[sortKey] as any, vb = b[sortKey] as any;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const state = error ? 'Error' : rows.length ? 'Uploaded' : 'Pending';

  return (
    <section style={tx.container}>
      {/* Header card (white) */}
      <div
        style={{
          ...tx.hero,
          height: open ? 72 : 120,
          padding: open ? '12px 16px' : '28px 26px',
        }}
      >
        <div style={tx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={tx.logoCircle}>2</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: open ? 22 : 38, lineHeight: 1 }}>
                Topics
              </div>
              {!open && <div style={{ color: '#6b7280',marginTop: 4 }}>Upload, search, edit & manage</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={tx.badge(state)}>{state}</span>
            <button type="button" onClick={() => setOpen(o => !o)} style={tx.heroBtn}>
              {open ? 'Hide' : 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {/* mini bar */}
      {open && (
        <div style={tx.miniBar}>
          <div style={{ fontWeight: 800 }}>Topics</div>
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
          {/* Upload */}
          <form onSubmit={upload} style={tx.card}>
            <div
              onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={onDrop}
              onClick={openPicker}
              style={{
                ...tx.dropZone,
                borderColor: dragOver ? '#2563eb' : '#d1d5db',
                background: '#fafafa'
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
                <button type="button" onClick={(e)=>{e.stopPropagation(); openPicker();}} style={tx.primaryBtn}>
                  Choose file
                </button>
                <div style={{ marginTop: 10, color: file ? '#111827' : '#6b7280' }}>
                  {file ? file.name : 'No file selected'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="submit" style={tx.primaryBtn}>Upload</button>
            </div>
          </form>

          {/* Manual add */}
          <form onSubmit={addManual} style={{ ...tx.card, marginTop: 12 }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontWeight: 800 }}>Add topic manually</h3>
            <div style={tx.grid4}>
              <input placeholder="Student ID" value={newRow.studentId} onChange={e=>setNewRow({...newRow, studentId: e.target.value})} style={tx.input}/>
              <input placeholder="Student Name" value={newRow.studentName} onChange={e=>setNewRow({...newRow, studentName: e.target.value})} style={tx.input}/>
              <div>
                <input
                  placeholder="Student Email"
                  value={newRow.studentEmail}
                  onChange={(e)=> {
                    const v = e.target.value;
                    setNewRow({...newRow, studentEmail: v});
                    setNewErr(prev => ({...prev, studentEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                  }}
                  style={{ ...tx.input, borderColor: newErr.studentEmail ? '#ef4444' : '#d1d5db' }}
                  type="email"
                />
                {newErr.studentEmail && <div style={tx.inputError}>{newErr.studentEmail}</div>}
              </div>
              <input placeholder="Title" value={newRow.title} onChange={e=>setNewRow({...newRow, title: e.target.value})} style={tx.input}/>
            </div>
            <div style={{ height: 8 }} />
            <div style={tx.grid4}>
              <div>
                <input
                  placeholder="Supervisor Email"
                  value={newRow.supervisorEmail}
                  onChange={(e)=> {
                    const v = e.target.value;
                    setNewRow({...newRow, supervisorEmail: v});
                    setNewErr(prev => ({...prev, supervisorEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                  }}
                  style={{ ...tx.input, borderColor: newErr.supervisorEmail ? '#ef4444' : '#d1d5db' }}
                  type="email"
                />
                {newErr.supervisorEmail && <div style={tx.inputError}>{newErr.supervisorEmail}</div>}
              </div>
              <input placeholder="Supervisor Name (optional)" value={newRow.supervisorName} onChange={e=>setNewRow({...newRow, supervisorName: e.target.value})} style={tx.input}/>
              <div>
                <input
                  placeholder="Examiner (Reviewer) Email"
                  value={newRow.reviewerEmail}
                  onChange={(e)=> {
                    const v = e.target.value;
                    setNewRow({...newRow, reviewerEmail: v});
                    setNewErr(prev => ({...prev, reviewerEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                  }}
                  style={{ ...tx.input, borderColor: newErr.reviewerEmail ? '#ef4444' : '#d1d5db' }}
                  type="email"
                />
                {newErr.reviewerEmail && <div style={tx.inputError}>{newErr.reviewerEmail}</div>}
              </div>
              <input placeholder="Examiner Name (optional)" value={newRow.reviewerName} onChange={e=>setNewRow({...newRow, reviewerName: e.target.value})} style={tx.input}/>
            </div>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button
                type="submit"
                style={tx.secondaryBtn}
                disabled={
                  !newRow.studentId.trim() ||
                  !newRow.studentName.trim() ||
                  !newRow.studentEmail.trim() ||
                  !newRow.title.trim() ||
                  !newRow.supervisorEmail.trim() ||
                  !newRow.reviewerEmail.trim() ||
                  !!newErr.studentEmail || !!newErr.supervisorEmail || !!newErr.reviewerEmail
                }
              >
                Add topic
              </button>
            </div>
          </form>

          {/* Status & Error */}
          {status && <div style={tx.status}>{status}</div>}
          {error && <div style={tx.error}>{error}</div>}

          {/* Table section (collapsible) */}
          <div style={{ ...tx.card, marginTop: 12 }}>
            <div style={tx.tableHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTableOpen(v => !v)}
                  style={tx.tableToggle}
                  aria-expanded={tableOpen}
                  title={tableOpen ? 'Collapse table' : 'Expand table'}
                >
                  {tableOpen ? '▾' : '▸'}
                </button>
                <div style={{ fontWeight: 800 }}>Topics table</div>
              </div>

              {/* Search + Clear all */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  placeholder="Search using any field...."
                  style={tx.search}
                />
                {query && <button type="button" onClick={()=>setQuery('')} style={tx.clearBtn}>Clear</button>}
                <button
                  type="button"
                  onClick={requestClearAll}
                  disabled={deletingAll}
                  style={{
                    ...tx.dangerOutlineBtn,
                    opacity: deletingAll ? 0.6 : 1,
                    cursor: deletingAll ? 'not-allowed' : 'pointer'
                  }}
                  title="Delete ALL topics"
                >
                  {deletingAll ? 'Deleting…' : 'Delete all'}
                </button>
              </div>
            </div>

            {tableOpen && (
              <div style={{ ...tx.tableCardInner }}>
                <table style={tx.table}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                    <tr>
                      <th style={tx.th}><Hdr label="ID" active={sortKey==='id'} dir={sortDir} onClick={()=>toggleSort('id')} /></th>
                      <th style={tx.th}><Hdr label="Student ID" active={sortKey==='studentId'} dir={sortDir} onClick={()=>toggleSort('studentId')} /></th>
                      <th style={tx.th}><Hdr label="Student Name" active={sortKey==='studentName'} dir={sortDir} onClick={()=>toggleSort('studentName')} /></th>
                      <th style={tx.th}><Hdr label="Student Email" active={sortKey==='studentEmail'} dir={sortDir} onClick={()=>toggleSort('studentEmail')} /></th>
                      <th style={tx.th}><Hdr label="Title" active={sortKey==='title'} dir={sortDir} onClick={()=>toggleSort('title')} /></th>
                      <th style={tx.th}><Hdr label="Supervisor" active={sortKey==='supervisor'} dir={sortDir} onClick={()=>toggleSort('supervisor')} /></th>
                      <th style={tx.th}><Hdr label="Examiner" active={sortKey==='examiner'} dir={sortDir} onClick={()=>toggleSort('examiner')} /></th>
                      <th style={tx.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => {
                      const editing = editId === r.id;
                      return (
                        <tr key={r.id}>
                          <td style={tx.td}>{r.id}</td>
                          <td style={tx.td}>
                            {editing ? <input value={edit.studentId ?? ''} onChange={(e)=>setEdit({...edit, studentId: e.target.value})} style={tx.input}/>
                                     : r.studentId}
                          </td>
                          <td style={tx.td}>
                            {editing ? <input value={edit.studentName ?? ''} onChange={(e)=>setEdit({...edit, studentName: e.target.value})} style={tx.input}/>
                                     : r.studentName}
                          </td>
                          <td style={tx.td}>
                            {editing ? (
                              <>
                                <input
                                  value={edit.studentEmail ?? ''}
                                  onChange={(e)=> {
                                    const v = e.target.value;
                                    setEdit({...edit, studentEmail: v});
                                    setEditErr(prev => ({...prev, studentEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                                  }}
                                  style={{ ...tx.input, borderColor: editErr.studentEmail ? '#ef4444' : '#d1d5db' }}
                                  type="email"
                                />
                                {editErr.studentEmail && <div style={tx.inputError}>{editErr.studentEmail}</div>}
                              </>
                            ) : r.studentEmail}
                          </td>
                          <td style={tx.td}>
                            {editing ? <input value={edit.title ?? ''} onChange={(e)=>setEdit({...edit, title: e.target.value})} style={tx.input}/>
                                     : r.title}
                          </td>
                          <td style={tx.td}>
                            {editing ? (
                              <>
                                <input
                                  placeholder="Supervisor Name (optional)"
                                  value={edit.supervisor ?? ''}
                                  onChange={(e)=>setEdit({...edit, supervisor: e.target.value})}
                                  style={{ ...tx.input, marginBottom: 6 }}
                                />
                                <input
                                  placeholder="Supervisor Email"
                                  value={edit.supervisorEmail ?? ''}
                                  onChange={(e)=> {
                                    const v = e.target.value;
                                    setEdit({...edit, supervisorEmail: v});
                                    setEditErr(prev => ({...prev, supervisorEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                                  }}
                                  style={{ ...tx.input, borderColor: editErr.supervisorEmail ? '#ef4444' : '#d1d5db' }}
                                  type="email"
                                />
                                {editErr.supervisorEmail && <div style={tx.inputError}>{editErr.supervisorEmail}</div>}
                              </>
                            ) : (
                              <>
                                {r.supervisor}
                                <div style={{ color: '#6b7280', fontSize: 12 }}>{r.supervisorEmail}</div>
                              </>
                            )}
                          </td>
                          <td style={tx.td}>
                            {editing ? (
                              <>
                                <input
                                  placeholder="Examiner Name (optional)"
                                  value={edit.examiner ?? ''}
                                  onChange={(e)=>setEdit({...edit, examiner: e.target.value})}
                                  style={{ ...tx.input, marginBottom: 6 }}
                                />
                                <input
                                  placeholder="Examiner Email"
                                  value={edit.examinerEmail ?? ''}
                                  onChange={(e)=> {
                                    const v = e.target.value;
                                    setEdit({...edit, examinerEmail: v});
                                    setEditErr(prev => ({...prev, examinerEmail: v && !isValidEmail(v) ? 'Invalid email' : ''}));
                                  }}
                                  style={{ ...tx.input, borderColor: editErr.examinerEmail ? '#ef4444' : '#d1d5db' }}
                                  type="email"
                                />
                                {editErr.examinerEmail && <div style={tx.inputError}>{editErr.examinerEmail}</div>}
                              </>
                            ) : (
                              <>
                                {r.examiner}
                                <div style={{ color: '#6b7280', fontSize: 12 }}>{r.examinerEmail}</div>
                              </>
                            )}
                          </td>
                          <td style={tx.td}>
                            {!editing ? (
                              <>
                                <button onClick={()=>startEditRow(r)} style={tx.linkBtn}>Edit</button>
                                <button onClick={()=>requestDelete(r.id)} style={tx.dangerBtn}>Delete</button>
                              </>
                            ) : (
                              <>
                                <button onClick={saveEdit} style={tx.primaryBtnSmall}>Save</button>
                                <button onClick={cancelEdit} style={tx.secondaryBtnSmall}>Cancel</button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {sorted.length === 0 && (
                      <tr><td style={{ padding: 16, color: '#6b7280' }} colSpan={8}>No matching rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* Custom confirm modal */}
      {confirm && (
        <div style={tx.modalOverlay} onClick={() => setConfirm(null)}>
          <div style={tx.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={tx.modalTitle}>{confirm.title}</div>
            <div style={tx.modalText}>{confirm.body}</div>
            <div style={tx.modalActions}>
              <button style={tx.secondaryBtn} onClick={() => setConfirm(null)}>
                {confirm.cancelText || 'Cancel'}
              </button>
              <button
                style={confirm.tone === 'danger' ? tx.dangerBtn : tx.primaryBtn}
                onClick={async () => {
                  try { await confirm.onConfirm?.(); } finally { setConfirm(null); }
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

const tx: Record<string, any> = {
  container: { width: 'min(1400px, 96vw)', margin: '0 auto' },

  hero: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    transition: 'all .22s ease',
    boxShadow: '0 8px 20px rgba(0,0,0,.06)',
    marginBottom: 14,
  },
  heroContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoCircle: {
    width: 48, height: 48, minWidth: 48,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, background: '#f3f4f6', color: '#111827', fontWeight: 900, fontSize: 18,
    borderColor: '#e5e7eb', borderStyle: 'solid', borderWidth: 1,
  },
  badge: (state: string) => ({
    background: state === 'Uploaded' ? '#ecfdf5' : state === 'Error' ? '#fef2f2' : '#f3f4f6',
    color:      state === 'Uploaded' ? '#065f46' : state === 'Error' ? '#991b1b' : '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 999, fontWeight: 700, padding: '6px 10px', lineHeight: 1, fontSize: 12
  }),
  heroBtn: {
    padding: '8px 14px', borderRadius: 10, border: '1px solid #d1d5db',
    background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700
  },
  miniBar: {
    position: 'sticky', top: 12, zIndex: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
    padding: '10px 12px', marginTop: 12, boxShadow: '0 6px 20px rgba(0,0,0,.06)',
  },
  card: {
    border: '1px solid #e5e7eb', padding: 16, borderRadius: 14,
    background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  dropZone: {
    border: '2px dashed #d1d5db', borderRadius: 14, padding: 28, marginBottom: 12,
    transition: 'all .15s ease', cursor: 'pointer'
  },
  primaryBtn: {
    padding: '10px 16px', borderRadius: 10, border: '1px solid #111827',
    background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700
  },
  secondaryBtn: {
    padding: '10px 16px', borderRadius: 10, border: '1px solid #d1d5db',
    background: '#f3f4f6', color: '#111827', cursor: 'pointer', fontWeight: 700
  },
  primaryBtnSmall: {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #111827',
    background: '#111827', color: '#fff', cursor: 'pointer',
    marginRight: 6, fontWeight: 700
  },
  secondaryBtnSmall: {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db',
    background: '#f3f4f6', color: '#111827', cursor: 'pointer', fontWeight: 700
  },
  linkBtn: {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db',
    background: '#fff', color: '#111827', cursor: 'pointer',
    marginRight: 6, fontWeight: 700
  },
  dangerBtn: {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444',
    background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 700
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
  status: { marginTop: 12, background: '#f0fdf4', color: '#166534', border: '1px solid #cafeda', padding: 12, borderRadius: 10 },
  error:  { marginTop: 12, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: 12, borderRadius: 10 },
  tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tableToggle: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontWeight: 700, color: '#111827' },
  search: { width: 380, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  clearBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 700 },
  tableCardInner: { overflow: 'auto', maxHeight: '70vh', border: '1px solid #e5e7eb', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 10, background: '#f9fafb' },
  td: { borderBottom: '1px solid #f3f4f6', padding: 10, verticalAlign: 'middle' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', outline: 'none' },
  inputError: { marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: 600 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 },

  
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
