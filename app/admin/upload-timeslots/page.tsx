'use client';
import { useState } from 'react';

export default function UploadTimeSlotsPage() {
  const [status, setStatus] = useState('');

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Uploading...');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await fetch('/api/upload-time-slots', {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();
    setStatus(result.message || result.error || 'Unknown response');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Time Slots</h1>
      <form onSubmit={handleUpload}>
        <input type="file" name="file" accept=".xlsx, .xls" required className="mb-4" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Upload</button>
      </form>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
