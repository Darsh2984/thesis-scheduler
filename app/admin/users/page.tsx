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
  const [search, setSearch] = useState(''); // ✅ search term

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        // ✅ sort by ID ascending before setting state
        const sorted = [...data].sort((a, b) => a.id - b.id);
        setUsers(sorted);
      });
  }, []);

  const handleDownloadCSV = async (userId: number, userName: string) => {
    const res = await fetch(`/api/users/${userId}/schedule/csv`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // ✅ sanitize the username (replace spaces with underscores)
    const safeName = userName.replace(/\s+/g, "_");
    a.download = `${safeName}_Schedule.csv`;
    a.click();
  };

  // ✅ Filter users by search
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <h1 className="pageTitle">All Users</h1>

      {/* 🔍 Search Box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

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
            {filteredUsers.map((user) => (
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
                      style={{ borderColor: "#16a34a", color: "#16a34a" }}
                      onClick={() => handleDownloadCSV(user.id, user.name)}
                    >
                      CSV
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <p style={{ marginTop: 16, color: '#6b7280' }}>No users found.</p>
      )}
    </div>
  );
}
