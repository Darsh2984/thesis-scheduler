'use client';
import { useEffect, useState } from 'react';

type UnavailabilityRow = { id: number; user: string; date: string };
type PreferredRow = { id: number; user: string; date: string };

export default function UserDatesPage() {
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [singleDate, setSingleDate] = useState('');
  const [status, setStatus] = useState('');
  const [unavailability, setUnavailability] = useState<UnavailabilityRow[]>([]);
  const [preferred, setPreferred] = useState<PreferredRow[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [usersRes, unRes, prefRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/upload-unavailability/list'),
        fetch('/api/upload-preferred-dates/list'),
      ]);

      setUsers(await usersRes.json());
      setUnavailability((await unRes.json()).rows || []);
      setPreferred((await prefRes.json()).rows || []);
    } catch {
      setUnavailability([]);
      setPreferred([]);
    }
  };

  const addRange = async (type: 'unavailability' | 'preferred') => {
    if (!selectedUser || !from || !to) {
      setStatus('❌ Please select user and dates');
      return;
    }
    setStatus('⏳ Saving...');
    const res = await fetch(`/api/${type}/add-range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser, from, to }),
    });
    const data = await res.json();
    setStatus(data.message || data.error);
    await load();
  };

  const addSingle = async (type: 'unavailability' | 'preferred') => {
    if (!selectedUser || !singleDate) {
      setStatus('❌ Please select user and date');
      return;
    }
    setStatus('⏳ Saving...');
    const res = await fetch(`/api/${type}/add-single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser, date: singleDate }),
    });
    const data = await res.json();
    setStatus(data.message || data.error);
    await load();
  };

  // ✅ NEW: remove handler
  const removeDate = async (type: 'unavailability' | 'preferred', id: number) => {
    setStatus('⏳ Removing...');
    try {
      const res = await fetch(`/api/${type}/delete/${id}`, { method: 'DELETE' });
      const data = await res.json();
      setStatus(data.message || data.error);
      await load();
    } catch {
      setStatus('❌ Failed to remove');
    }
  };

  return (
    <div className="container space-y-8">
      <h1 className="pageTitle">User Unavailability & Preferred Dates</h1>

      {/* User selector */}
      <div>
        <label className="block font-medium">Select User</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">-- Choose User --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date range picker */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={() => addRange('unavailability')} className="btn">
          Add Unavailability (Range)
        </button>
        <button onClick={() => addRange('preferred')} className="btn btnLight">
          Add Preferred (Range)
        </button>
      </div>

      {/* Single date picker */}
      <div>
        <label>Single Date</label>
        <input
          type="date"
          value={singleDate}
          onChange={(e) => setSingleDate(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="flex gap-4">
        <button onClick={() => addSingle('unavailability')} className="btn">
          Add Unavailability (Single)
        </button>
        <button onClick={() => addSingle('preferred')} className="btn btnLight">
          Add Preferred (Single)
        </button>
      </div>

      {status && <p className="text-sm mt-4">{status}</p>}

      {/* Tables */}
      <div>
        <h3 className="font-bold mt-6">Unavailability ({unavailability.length})</h3>
        <div className="card" style={{ maxHeight: '40vh', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unavailability.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.user}</td>
                  <td>{r.date}</td>
                  <td>
                    <button
                      className="text-red-600 underline"
                      onClick={() => removeDate('unavailability', r.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-bold mt-6">Preferred Dates ({preferred.length})</h3>
        <div className="card" style={{ maxHeight: '40vh', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {preferred.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.user}</td>
                  <td>{r.date}</td>
                  <td>
                    <button
                      className="text-red-600 underline"
                      onClick={() => removeDate('preferred', r.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
