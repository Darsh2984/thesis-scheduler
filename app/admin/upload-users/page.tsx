'use client';

import { useState } from 'react';

export default function UploadUsersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setStatus('❌ No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setStatus('⏳ Uploading...');

    try {
    const res = await fetch('/api/upload-users', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setStatus(`❌ Upload failed: ${result.message}`);
      } else {
        setStatus(`✅ ${result.message}`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Upload Users Excel</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </form>

      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
  );
}
