'use client';

import { useState } from 'react';

export default function UploadPreferredDates() {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setMessage('');

    try {
      const res = await fetch('/api/upload-preferred-dates', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setMessage(data.message || data.error || 'Unknown response.');
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow max-w-md mx-auto mt-6 bg-white">
      <h2 className="text-lg font-semibold mb-2">Upload Preferred Dates</h2>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleUpload}
        className="block w-full mb-3"
      />
      {uploading ? (
        <p className="text-blue-500">Uploading...</p>
      ) : (
        message && <p className={`text-sm ${message.includes('error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>
      )}
    </div>
  );
}
