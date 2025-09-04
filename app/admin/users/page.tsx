'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof User | 'id'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' });
        const data = await res.json();
        setUsers(data.rows || []);
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  if (loading) return <p className="p-6">⏳ Loading users...</p>;
  if (users.length === 0) return <p className="p-6 text-gray-500">No users found.</p>;

  // 🔍 Search filter
  const filtered = users.filter(
    (u) =>
      String(u.id).toLowerCase().includes(query.toLowerCase()) ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(query.toLowerCase())
  );

  // 🔀 Sorting
  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortKey] ?? '';
    const valB = b[sortKey] ?? '';
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Toggle sort direction on header click
  function handleSort(key: keyof User | 'id') {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // 🔽 helper to download schedule as CSV
  async function downloadSchedule(userId: number, userName: string) {
    try {
      const res = await fetch(`/api/users/${userId}/schedule`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.schedule) {
        alert('Failed to fetch schedule');
        return;
      }

      const rows = data.schedule;
      const header = [
        'Student ID',
        'Student Name',
        'Student Email',
        'Topic',
        'Role',
        'Supervisor',
        'Reviewer',
        'Date',
        'Start Time',
        'End Time',
        'Room',
      ];

      const csv = [
        header.join(','),
        ...rows.map((r: any) =>
          [
            r.studentId,
            r.studentName,
            r.studentEmail,
            r.topicTitle,
            r.role,
            r.supervisorName || '',
            r.reviewerName || '',
            r.date,
            r.startTime,
            r.endTime,
            r.roomName,
          ]
            .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${userName.replace(/\s+/g, '_')}_schedule.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  }

  return (
    <div className="container">
      <h1 className="pageTitle">All Users</h1>

      {/* 🔍 Search bar */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search by ID, name, email, or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
          }}
        />
      </div>

      <div className="card" style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                ID {sortKey === 'id' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                Email {sortKey === 'email' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                Role {sortKey === 'role' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <Link
                    href={`/admin/users/${u.id}/schedule`}
                    className="btn btn-primary"
                    style={{ marginRight: '8px' }}
                  >
                    View Schedule
                  </Link>
                  <button
                    className="btn btn-secondary"
                    onClick={() => downloadSchedule(u.id, u.name)}
                  >
                    Download CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
