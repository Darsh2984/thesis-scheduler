'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';

type Row = { id: number; title: string; supervisor: string; examiner: string };

export default function UploadTopicsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);

  // Load topics already in DB
  const load = async () => {
    try {
      const res = await fetch('/api/upload-topics/list');
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
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setStatus('⏳ Uploading...');
    setError('');

    try {
      const res = await fetch('/api/upload-topics', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        setError(`Upload failed (${res.status}). ${text}`);
        setStatus('');
        return;
      }

      setStatus('✅ Topics uploaded successfully');
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
      setStatus('');
    }
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Upload Bachelor Topics</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
        <button type="submit" className="btn">Upload</button>
      </form>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
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
              <th>Title</th>
              <th>Supervisor</th>
              <th>Examiner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.title}</td>
                <td>{r.supervisor}</td>
                <td>{r.examiner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
