'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

export default function UploadTopicsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

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

    const res = await fetch('/api/upload-topics', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setStatus(data.message || '✅ Done!');
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload Bachelor Topics</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </form>
      {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
    </div>
  );
}
