'use client';

import { useState } from 'react';

export default function UploadUnavailability() {
  const [message, setMessage] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload-unavailability', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message || data.error);
  };

  return (
    <div>
      <input type="file" accept=".xlsx,.xls" onChange={handleUpload} />
      <p>{message}</p>
    </div>
  );
}
