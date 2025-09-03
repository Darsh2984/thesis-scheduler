'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type SlotRow = { id: number; date: string; start: string; end: string };
type SortKey = keyof SlotRow;
type SortDir = 'asc' | 'desc';

type ConfirmState = null | {
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
  onConfirm?: () => void | Promise<void>;
};

export default function TimeSlotsSection() {
  const [rows, setRows] = useState<SlotRow[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // accordion
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [animHeight, setAnimHeight] = useState<number | 'auto'>(0);

  // table
  const [tableOpen, setTableOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // form state
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [interval, setInterval] = useState(30);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [newExclude, setNewExclude] = useState('');
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [newBreak, setNewBreak] = useState({ start: '', end: '' });
  const [excludeFridays, setExcludeFridays] = useState(true);

  // load rows
async function load() {
  try {
    const res = await fetch('/api/time-slots?ts=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    setRows(
      Array.isArray(data.rows)
        ? data.rows.map((r: any) => ({
            id: r.id,
            date: r.date,
            start: r.startTime, // map DB field
            end: r.endTime,     // map DB field
          }))
        : []
    );
  } catch {
    setRows([]);
  }
}
  useEffect(() => { load(); }, []);

  // accordion animation
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

  // generate slots
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) { setError('From/To required'); return; }
    try {
      setStatus('⏳ Generating...');
      setError('');
      const res = await fetch('/api/time-slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, startTime, endTime, interval, excluded, breaks, excludeFridays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Generation failed');
      setStatus(data.message || '✅ Slots generated');
      await load();
      setOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed');
      setStatus('');
    }
  }

  // delete one
  function requestDelete(id: number) {
    setConfirm({
      title: 'Delete slot',
      body: 'Are you sure you want to delete this slot?',
      confirmText: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/time-slots/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Delete failed');
          setRows(p => p.filter(x => x.id !== id));
          setStatus('🗑️ Slot deleted');
        } catch (err: any) {
          setError(err?.message || 'Delete failed');
        }
      },
    });
  }

  // delete all
  function requestClearAll() {
    setConfirm({
      title: 'Delete ALL slots',
      body: 'This will remove all slots. Continue?',
      confirmText: 'Delete all',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/time-slots', { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Clear failed');
          setRows([]);
          setStatus('🧹 All slots cleared');
        } catch (err: any) {
          setError(err?.message || 'Clear failed');
        }
      },
    });
  }

  // filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      String(r.id).includes(q) ||
      r.date.toLowerCase().includes(q) ||
      r.start.toLowerCase().includes(q) ||
      r.end.toLowerCase().includes(q)
    );
  }, [rows, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const va = a[sortKey] as any, vb = b[sortKey] as any;
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const sectionState = error ? 'Error' : rows.length ? 'Generated' : 'Pending';

  return (
    <section style={sx.container}>
      {/* header */}
      <div style={{ ...sx.hero, height: open ? 72 : 120, padding: open ? '12px 16px' : '28px 26px' }}>
        <div style={sx.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={sx.logoCircle}>4 ⏱</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: open ? 22 : 38 }}>Time Slots</div>
              {!open && <div style={{ color: '#6b7280' }}>Generate, search & manage</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={sx.badge(sectionState)}>{sectionState}</span>
            <button onClick={() => setOpen(o => !o)} style={sx.heroBtn}>{open ? 'Hide' : 'Manage'}</button>
          </div>
        </div>
      </div>

      {open && <div style={sx.miniBar}><div style={{ fontWeight: 800 }}>Time Slots</div><div style={{ color: '#6b7280', fontSize: 12 }}>{rows.length} total</div></div>}

      <div style={{ overflow: 'hidden', transition: 'height .22s ease', height: animHeight === 'auto' ? undefined : animHeight }}>
        <div ref={bodyRef}>
          {/* generator form */}
          <form onSubmit={generate} style={sx.card}>
            <h3 style={{ margin: 0, marginBottom: 12, fontWeight: 800 }}>Generate slots</h3>
            <div style={sx.grid}>
              <div><label style={sx.label}>From Date</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={sx.input}/></div>
              <div><label style={sx.label}>To Date</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={sx.input}/></div>
              <div><label style={sx.label}>Start Time</label><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={sx.input}/></div>
              <div><label style={sx.label}>End Time</label><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={sx.input}/></div>
              <div><label style={sx.label}>Interval (minutes)</label><input type="number" min={5} step={5} value={interval} onChange={e=>setInterval(Number(e.target.value))} style={sx.input}/></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={excludeFridays} onChange={e=>setExcludeFridays(e.target.checked)} />
                <label>Exclude Fridays</label>
              </div>
            </div>

            {/* excluded dates */}
            <div style={{ marginTop: 12 }}>
              <label style={sx.label}>Exclude Dates</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={newExclude} onChange={e=>setNewExclude(e.target.value)} style={sx.input}/>
                <button type="button" onClick={()=>{if(newExclude){setExcluded([...excluded,newExclude]);setNewExclude('')}}} style={sx.secondaryBtn}>Add</button>
              </div>
              {excluded.length>0 && (
                <ul style={{ marginTop: 8, listStyle: 'none', padding: 0 }}>
                  {excluded.map(d=>(
                    <li key={d} style={sx.pillRow}>
                      <span>{d}</span>
                      <button type="button" onClick={()=>setExcluded(excluded.filter(x=>x!==d))} style={sx.linkBtnSmall}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* breaks */}
            <div style={{ marginTop: 12 }}>
              <label style={sx.label}>Breaks</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="time" value={newBreak.start} onChange={e=>setNewBreak({...newBreak,start:e.target.value})} style={sx.input}/>
                <input type="time" value={newBreak.end} onChange={e=>setNewBreak({...newBreak,end:e.target.value})} style={sx.input}/>
                <button type="button" onClick={()=>{if(newBreak.start&&newBreak.end){setBreaks([...breaks,newBreak]);setNewBreak({start:'',end:''});}}} style={sx.secondaryBtn}>Add</button>
              </div>
              {breaks.length>0 && (
                <ul style={{ marginTop: 8, listStyle: 'none', padding: 0 }}>
                  {breaks.map((b,i)=>(
                    <li key={i} style={sx.pillRow}>
                      <span>{b.start} – {b.end}</span>
                      <button type="button" onClick={()=>setBreaks(breaks.filter((_,j)=>j!==i))} style={sx.linkBtnSmall}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button type="submit" style={sx.primaryBtn}>Generate</button>
            </div>
          </form>

          {/* status + error */}
          {status && <div style={sx.status}>{status}</div>}
          {error && <div style={sx.error}>{error}</div>}

          {/* table */}
          <div style={{ ...sx.card, marginTop: 12 }}>
            <div style={sx.tableHeader}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <button type="button" onClick={()=>setTableOpen(v=>!v)} style={sx.tableToggle}>{tableOpen?'▾':'▸'}</button>
                <div style={{ fontWeight:800 }}>Slots table</div>
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…" style={sx.search}/>
                {query && <button type="button" onClick={()=>setQuery('')} style={sx.clearBtn}>Clear</button>}
                {rows.length>0 && <button type="button" onClick={requestClearAll} style={sx.dangerOutlineBtn}>Delete all</button>}
              </div>
            </div>

            {tableOpen && (
              <div style={sx.tableCardInner}>
                <table style={sx.table}>
                  <thead>
                    <tr>
                      <th style={sx.th}><Header label="Date" active={sortKey==='date'} dir={sortDir} onClick={()=>toggleSort('date')}/></th>
                      <th style={sx.th}><Header label="Start" active={sortKey==='start'} dir={sortDir} onClick={()=>toggleSort('start')}/></th>
                      <th style={sx.th}><Header label="End" active={sortKey==='end'} dir={sortDir} onClick={()=>toggleSort('end')}/></th>
                      <th style={sx.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(r=>(
                      <tr key={r.id}>
                        <td style={sx.td}>{new Date(r.date).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</td>
                        <td style={sx.td}>{r.start}</td>
                        <td style={sx.td}>{r.end}</td>
                        <td style={sx.td}><button onClick={()=>requestDelete(r.id)} style={sx.dangerBtn}>Delete</button></td>
                      </tr>
                    ))}
                    {sorted.length===0 && <tr><td style={{padding:16,color:'#6b7280'}} colSpan={5}>No slots</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* modal */}
      {confirm && (
        <div style={sx.modalOverlay} onClick={()=>setConfirm(null)}>
          <div style={sx.modalCard} onClick={e=>e.stopPropagation()}>
            <div style={sx.modalTitle}>{confirm.title}</div>
            <div style={sx.modalText}>{confirm.body}</div>
            <div style={sx.modalActions}>
              <button style={sx.secondaryBtn} onClick={()=>setConfirm(null)}>{confirm.cancelText||'Cancel'}</button>
              <button style={confirm.tone==='danger'?sx.dangerBtn:sx.primaryBtn} onClick={async()=>{await confirm.onConfirm?.();setConfirm(null);}}>{confirm.confirmText||'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Header({ label, active, dir, onClick }: {label:string,active:boolean,dir:SortDir,onClick:()=>void}) {
  return (
    <button type="button" onClick={onClick} style={{ background:'transparent',border:'none',fontWeight:active?800:600,cursor:'pointer' }}>
      {label}{active?(dir==='asc'?' ▲':' ▼'):''}
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
