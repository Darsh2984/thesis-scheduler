'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserSchedulePage() {
  const { id } = useParams();
  const [schedule, setSchedule] = useState([]);
  const [user, setUser] = useState(null);
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

  if (loading) return <p className="p-6">Loading schedule...</p>;

  if (!user) return <p className="p-6 text-red-500">User not found.</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        Schedule for <span className="text-blue-600">{user.name}</span>
      </h1>
      <p className="text-gray-600 mb-4">{user.email}</p>

      {schedule.length === 0 ? (
        <p>No schedule found for this user.</p>
      ) : (
        <ul className="space-y-4">
          {schedule.map(s => (
            <li key={s.scheduleId} className="border p-4 rounded shadow">
              <p><strong>Topic:</strong> {s.topicTitle}</p>
              <p><strong>Role:</strong> {s.role}</p>
              <p><strong>Date:</strong> {s.date}</p>
              <p><strong>Time:</strong> {s.startTime} – {s.endTime}</p>
              <p><strong>Room:</strong> {s.roomName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
