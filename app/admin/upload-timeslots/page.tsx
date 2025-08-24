'use client';
import { useState } from 'react';

type SlotRow = { id: number; date: string; start: string; end: string };

export default function UploadTimeSlotsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [newExclude, setNewExclude] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<SlotRow[]>([]);

  const addExcludedDate = () => {
    if (newExclude && !excludedDates.includes(newExclude)) {
      setExcludedDates([...excludedDates, newExclude]);
      setNewExclude('');
    }
  };

  const removeExcludedDate = (date: string) => {
    setExcludedDates(excludedDates.filter(d => d !== date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('⏳ Generating slots...');

    const res = await fetch('/api/generate-timeslots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        excluded: excludedDates,
      }),
    });

    const data = await res.json();
    setStatus(data.message || data.error);
    setRows(data.rows || []);
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Generate Time Slots</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* From Date */}
        <div>
          <label className="block font-medium">From Date</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block font-medium">To Date</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* Excluded Dates */}
        <div>
          <label className="block font-medium">Exclude Specific Dates</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={newExclude}
              onChange={e => setNewExclude(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <button
              type="button"
              onClick={addExcludedDate}
              className="bg-gray-700 text-white px-3 py-1 rounded"
            >
              Add
            </button>
          </div>

          {/* Show excluded dates */}
          {excludedDates.length > 0 && (
            <ul className="mt-3 space-y-2">
              {excludedDates.map(date => (
                <li key={date} className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded">
                  <span>{date}</span>
                  <button
                    type="button"
                    onClick={() => removeExcludedDate(date)}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm text-gray-500 mt-1">Fridays are excluded automatically.</p>
        </div>

        <button type="submit" className="btn">Generate</button>
      </form>

      {/* Status */}
      {status && <p className="mt-4 text-sm">{status}</p>}

      {/* Table of generated slots */}
      {rows.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Generated Time Slots ({rows.length})</h3>
          <div className="card" style={{ overflow: 'auto', maxHeight: '50vh' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.date}</td>
                    <td>{r.start}</td>
                    <td>{r.end}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
