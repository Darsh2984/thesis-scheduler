'use client';
import { useState, useEffect, FormEvent } from 'react';

type RoomRow = { id: number; name: string };

export default function UploadRoomsPage() {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/upload-rooms');
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('❌ Room name required');
      return;
    }
    try {
      setStatus('⏳ Saving...');
      setError('');

      const res = await fetch('/api/upload-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      setStatus('✅ Room saved');
      setName('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed');
      setStatus('');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/upload-rooms?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      setStatus('🗑️ Room removed');
      await load();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Manage Rooms</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn">Add Room</button>
      </form>

      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3 style={{ marginTop: 20 }}>In database ({rows.length})</h3>
      <div className="card" style={{ overflow: 'auto', maxHeight: '50vh' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Room Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ color: 'red', cursor: 'pointer' }}
                  >
                    Remove ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
