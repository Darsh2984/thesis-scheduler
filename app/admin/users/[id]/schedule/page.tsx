'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type ScheduleRow = {
  scheduleId: number;
  topicTitle: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  roomName: string;
};

type User = {
  id: number;
  name: string;
  email: string;
};

export default function UserSchedulePage() {
  const { id } = useParams();
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [scheduleRes, userRes] = await Promise.all([
          fetch(`/api/users/${id}/schedule`),
          fetch(`/api/users/${id}`),
        ]);

        const scheduleData = await scheduleRes.json();
        const userData = await userRes.json();

        setSchedule(scheduleData);
        setUser(userData);
      } catch (err) {
        console.error('Error loading schedule or user info:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <p className="p-6">⏳ Loading schedule...</p>;

  if (!user) return <p className="p-6 text-red-500">❌ User not found.</p>;

  return (
    <div className="container">
      <h1 className="pageTitle">
        Schedule for <span style={{ color: '#2563eb' }}>{user.name}</span>
      </h1>
      <p className="text-gray-600 mb-6">{user.email}</p>

      {schedule.length === 0 ? (
        <div className="card p-6 text-gray-600">
          No schedule found for this user.
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto', maxHeight: '70vh' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Role</th>
                <th>Date</th>
                <th>Time</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr key={s.scheduleId}>
                  <td>{s.topicTitle}</td>
                  <td>
                    <span className="badge">{s.role}</span>
                  </td>
                  <td>{s.date}</td>
                  <td>
                    {s.startTime} – {s.endTime}
                  </td>
                  <td>
                    <span className="badge">{s.roomName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
