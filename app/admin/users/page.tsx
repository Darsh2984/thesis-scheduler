'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  const handleDownloadPDF = async (userId: number) => {
  const res = await fetch(`/api/users/${userId}/schedule/pdf`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule_user_${userId}.pdf`;
  a.click();
};

    const handleSendEmail = async (userId: number) => {
      const res = await fetch(`/api/users/${userId}/schedule/email`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('✅ Email sent successfully!');
      } else {
        alert('❌ Failed to send email.');
      }
    };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Users</h1>
      <ul className="space-y-3">
        {users.map(user => (
          <li key={user.id} className="border p-4 rounded">
            <p className="font-medium">{user.name} ({user.email})</p>
            <Link href={`/admin/users/${user.id}/schedule`} className="text-blue-500 underline">
                View Schedule
            </Link>
            <div className="flex space-x-2 mt-2">
              <button
                className="bg-green-500 text-white px-2 py-1 rounded"
                onClick={() => handleDownloadPDF(user.id)}
              >
                Download PDF
              </button>
              <button
                className="bg-indigo-500 text-white px-2 py-1 rounded"
                onClick={() => handleSendEmail(user.id)}
              >
                Send Email
              </button>
            </div>

          </li>
        ))}
      </ul>
    </div>
  );
}
