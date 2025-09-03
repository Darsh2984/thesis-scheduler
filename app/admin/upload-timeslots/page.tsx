'use client';
import { useState, useEffect } from 'react';

type SlotRow = { id: number; date: string; start: string; end: string };

export default function UploadTimeSlotsPage() {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [interval, setInterval] = useState(30);

  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [newBreak, setNewBreak] = useState({ start: '', end: '' });

  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [newExclude, setNewExclude] = useState('');

  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<SlotRow[]>([]);

  // Load slots
  const load = async () => {
    try {
      const res = await fetch('/api/upload-timeslots/list');
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    }
  };
  useEffect(() => { load(); }, []);

  // Excluded
  const addExcludedDate = () => {
    if (newExclude && !excludedDates.includes(newExclude)) {
      setExcludedDates([...excludedDates, newExclude]);
      setNewExclude('');
    }
  };
  const removeExcludedDate = (date: string) => {
    setExcludedDates(excludedDates.filter(d => d !== date));
  };

  // Breaks
  const addBreak = () => {
    if (newBreak.start && newBreak.end) {
      setBreaks([...breaks, newBreak]);
      setNewBreak({ start: '', end: '' });
    }
  };
  const removeBreak = (i: number) => {
    setBreaks(breaks.filter((_, idx) => idx !== i));
  };

  // Generate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('⏳ Generating slots...');

    const res = await fetch('/api/generate-timeslots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        from,
        to,
        startTime,
        endTime,
        interval,
        breaks,
        excluded: excludedDates,
      }),
    });

    const data = await res.json();
    setStatus(data.message || data.error);
    await load();
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Generate Time Slots</h1>

      {/* Generate form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch Name */}
        <div>
          <label className="block font-medium">Batch Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Spring 2025 Slots"
            className="border p-2 rounded w-full"
          />
        </div>

        {/* From/To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">From Date</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label className="block font-medium">To Date</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border p-2 rounded w-full"/>
          </div>
        </div>

        {/* Start/End/Interval */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-medium">Start Time</label>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label className="block font-medium">End Time</label>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label className="block font-medium">Interval (minutes)</label>
            <input type="number" min={5} step={5} value={interval} onChange={e=>setInterval(Number(e.target.value))} className="border p-2 rounded w-full"/>
          </div>
        </div>

        {/* Breaks */}
        <div>
          <label className="block font-medium">Breaks</label>
          <div className="flex gap-2">
            <input type="time" value={newBreak.start} onChange={e=>setNewBreak({...newBreak, start:e.target.value})} className="border p-2 rounded flex-1"/>
            <input type="time" value={newBreak.end} onChange={e=>setNewBreak({...newBreak, end:e.target.value})} className="border p-2 rounded flex-1"/>
            <button type="button" onClick={addBreak} className="bg-gray-700 text-white px-3 py-1 rounded">Add</button>
          </div>
          {breaks.length > 0 && (
            <ul className="mt-3 space-y-2">
              {breaks.map((b,i)=>(
                <li key={i} className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded">
                  <span>{b.start} - {b.end}</span>
                  <button type="button" onClick={()=>removeBreak(i)} className="text-red-500 text-sm">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Excluded Dates */}
        <div>
          <label className="block font-medium">Exclude Dates</label>
          <div className="flex gap-2">
            <input type="date" value={newExclude} onChange={e=>setNewExclude(e.target.value)} className="border p-2 rounded flex-1"/>
            <button type="button" onClick={addExcludedDate} className="bg-gray-700 text-white px-3 py-1 rounded">Add</button>
          </div>
          {excludedDates.length > 0 && (
            <ul className="mt-3 space-y-2">
              {excludedDates.map(d=>(
                <li key={d} className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded">
                  <span>{d}</span>
                  <button type="button" onClick={()=>removeExcludedDate(d)} className="text-red-500 text-sm">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-gray-500 mt-1">Fridays are excluded automatically.</p>
        </div>

        <button type="submit" className="btn">Generate</button>
      </form>

      {status && <p className="mt-4 text-sm">{status}</p>}

      {/* Table */}
      <h3 className="mt-8">In database ({rows.length})</h3>
      <div className="card overflow-auto max-h-[50vh]">
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Date</th><th>Start</th><th>End</th></tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{new Date(r.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</td>
                <td>{r.start}</td>
                <td>{r.end}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
