'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';

type RoomRow = { id: number; name: string; capacity: number };

export default function UploadRoomsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<RoomRow[]>([]);

  // Load rooms already in DB
  const load = async () => {
    try {
      const res = await fetch('/api/upload-rooms/list');
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError('❌ No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setStatus('⏳ Uploading...');
    setError('');

    try {
      const res = await fetch('/api/upload-rooms', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        setError(`Upload failed (${res.status}). ${text}`);
        setStatus('');
        return;
      }

      setStatus('✅ Rooms uploaded successfully');
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('');
    }
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Upload Rooms</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <button type="submit" className="btn">Upload</button>
      </form>

      {status && (
        <pre
          style={{
            background: '#f9fafb',
            border: '1px solid #eee',
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {status}
        </pre>
      )}

      {error && (
        <pre
          style={{
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {error}
        </pre>
      )}

      <h3 style={{ marginTop: 20 }}>In database ({rows.length})</h3>
      <div className="card" style={{ overflow: 'auto', maxHeight: '50vh' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Room Name</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
