'use client';

import { useState } from 'react';

export default function UploadAllDataPage() {
  const [messages, setMessages] = useState({
    users: '',
    topics: '',
    timeslots: '',
    unavailability: '',
    preferredDates: '',
    rooms: '',
    scheduler: '',
  });

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
    type: keyof typeof messages
  ) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/upload-${type}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setMessages(prev => ({ ...prev, [type]: data.message || data.error || 'Unknown error' }));
    } catch (err) {
      setMessages(prev => ({ ...prev, [type]: 'Upload failed. Please try again.' }));
    }
  };

  const handleRunScheduler = async () => {
    setMessages(prev => ({ ...prev, scheduler: '⏳ Running scheduler...' }));
    try {
      const res = await fetch('/api/run-scheduler', { method: 'POST' });
      const data = await res.json();
      setMessages(prev => ({
        ...prev,
        scheduler: data.message || data.error || 'Scheduler finished with unknown response',
      }));
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        scheduler: '❌ Failed to run scheduler',
      }));
    }
  };

  const sections = [
    { title: 'Upload Users', type: 'users' },
    { title: 'Upload Topics', type: 'topics' },
    { title: 'Upload Rooms', type: 'rooms' },
    { title: 'Upload TimeSlots', type: 'timeslots' },
    { title: 'Upload Unavailability', type: 'unavailability' },
    { title: 'Upload Preferred Dates', type: 'preferredDates' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-center mb-6">📤 Upload Scheduler Data</h1>

      {sections.map(({ title, type }) => (
        <form key={type} onSubmit={(e) => handleUpload(e, type)} className="space-y-2 border p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold">{title}</h2>
          <input type="file" accept=".xlsx,.xls" className="block w-full" required />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Upload {type}
          </button>
          {messages[type] && (
            <p className="text-sm text-gray-700 mt-1">📌 {messages[type]}</p>
          )}
        </form>
      ))}

      <div className="border p-4 rounded-md shadow space-y-2">
        <h2 className="text-lg font-semibold">⚙️ Run Scheduler</h2>
        <button
          onClick={handleRunScheduler}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Run Scheduler
        </button>
        {messages.scheduler && (
          <p className="text-sm text-gray-800 mt-1">📣 {messages.scheduler}</p>
        )}
      </div>
    </div>
  );
}
