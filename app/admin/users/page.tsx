'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        // ✅ sort by ID ascending before setting state
        const sorted = [...data].sort((a, b) => a.id - b.id);
        setUsers(sorted);
      });
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
    <div className="container">
      <h1 className="pageTitle">All Users</h1>

      <div className="card" style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name & Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </td>
                <td>
                  <span className="badge">{user.role}</span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/users/${user.id}/schedule`}
                      className="btn"
                      style={{ borderColor: '#2563eb', color: '#2563eb' }}
                    >
                      View
                    </Link>
                    <button
                      className="btn"
                      style={{ borderColor: '#16a34a', color: '#16a34a' }}
                      onClick={() => handleDownloadPDF(user.id)}
                    >
                      PDF
                    </button>
                    <button
                      className="btn"
                      style={{ borderColor: '#4f46e5', color: '#4f46e5' }}
                      onClick={() => handleSendEmail(user.id)}
                    >
                      Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <p style={{ marginTop: 16, color: '#6b7280' }}>No users found.</p>
      )}
    </div>
  );
}
