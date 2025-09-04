'use client';

import { useEffect, useState } from 'react';

type ScheduleRow = {
  scheduleId: number;
  topicTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  role: string;
  supervisorName?: string;
  reviewerName?: string;
  date: string;
  startTime: string;
  endTime: string;
  roomName: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

interface UserSchedulePageProps {
  params: { id: string };
}

export default function UserSchedulePage({ params }: UserSchedulePageProps) {
  const { id } = params;
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/users/${id}/schedule`, { cache: 'no-store' });
        const data = await res.json();
        console.log("Fetched data:", data); // 🔍 debug

        if (!res.ok) throw new Error(data.error || 'Failed to load schedule');

        setUser(data.user || null);
        setSchedule(data.schedule || []);
      } catch (err) {
        console.error('Error loading schedule:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  function formatDateLong(dateStr: string | Date): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (loading) return <p className="p-6">⏳ Loading schedule...</p>;
  if (!user) return <p className="p-6 text-red-500">❌ User not found.</p>;

  return (
    <div className="container">
      <h1 className="pageTitle">
        Schedule for <span style={{ color: '#2563eb' }}>{user.name}</span>
      </h1>
      <p className="text-gray-600 mb-2">{user.email}</p>
      {user.role && <p className="text-gray-500 mb-6">Role: <b>{user.role}</b></p>}

      {schedule.length === 0 ? (
        <div className="card p-6 text-gray-600">No schedule found for this user.</div>
      ) : (
        <div className="card" style={{ overflow: 'auto', maxHeight: '70vh' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Student Email</th>
                <th>Topic</th>
                <th>Role</th>
                <th>Counterpart</th>
                <th>Date</th>
                <th>Time</th>
                <th>Room</th>
              </tr>
            </thead>
        <tbody>
  {[...schedule]
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    })
    .map((s) => {
      let myRole = '—';
      let counterpart = '—';

      if (s.supervisorName === user?.name) {
        myRole = 'Supervisor';
        counterpart = s.reviewerName || '—';
      } else if (s.reviewerName === user?.name) {
        myRole = 'Reviewer';
        counterpart = s.supervisorName || '—';
      }

      return (
        <tr key={s.scheduleId}>
          <td>{s.studentId}</td>
          <td>{s.studentName}</td>
          <td>{s.studentEmail}</td>
          <td>{s.topicTitle}</td>
          <td><span className="badge">{myRole}</span></td>
          <td>{counterpart}</td>
          <td>{formatDateLong(s.date)}</td>
          <td>from {s.startTime} to {s.endTime}</td>
          <td><span className="badge">{s.roomName}</span></td>
        </tr>
      );
    })}
        </tbody>


          </table>
        </div>
      )}
    </div>
  );
}
