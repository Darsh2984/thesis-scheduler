"use client";
import React from "react";

type Schedule = {
  id: number;
  topic: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    title: string;
    supervisor?: { name: string | null } | null;
    reviewer?: { name: string | null } | null;
  };
  room: { name: string };
  slot: { date: string | Date; startTime: string; endTime: string };
};

type Conflict = {
  id: number;
  topic: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    title: string;
  };
  reason: string;
};

// ✅ Helper to add "st", "nd", "rd", "th"
function formatDateWithOrdinal(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    year: "numeric",
  }).replace(String(d.getFullYear()), `${day}${suffix} ${d.getFullYear()}`);
}

export default function ScheduleClient({
  schedules,
  conflicts,
}: {
  schedules: Schedule[];
  conflicts: Conflict[];
}) {
  // Download as CSV
  const handleExportCSV = () => {
    const headers = [
      "Student ID",
      "Student Name",
      "Student Email",
      "Topic",
      "Supervisor",
      "Reviewer",
      "Room",
      "Date",
      "Time",
    ];

    const rows = schedules.map((s) => [
      s.topic.studentId,
      s.topic.studentName,
      s.topic.studentEmail,
      s.topic.title,
      s.topic.supervisor?.name || "—",
      s.topic.reviewer?.name || "—",
      s.room.name,
      formatDateWithOrdinal(s.slot.date),
      `${s.slot.startTime.slice(0, 5)} – ${s.slot.endTime.slice(0, 5)}`,
    ]);

    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Scheduled Presentations</h1>

      {/* Export Button */}
      <button
        onClick={handleExportCSV}
        className="btn"
        style={{ marginBottom: 16 }}
      >
        ⬇️ Download Schedule (CSV)
      </button>

      {/* Schedule Table */}
      <div className="card" style={{ overflow: "auto", maxHeight: "70vh" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Student Email</th>
              <th>Topic</th>
              <th>Supervisor</th>
              <th>Reviewer</th>
              <th>Room</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.topic.studentId}</td>
                <td>{s.topic.studentName}</td>
                <td>{s.topic.studentEmail}</td>
                <td>{s.topic.title}</td>
                <td>{s.topic.supervisor?.name || "—"}</td>
                <td>{s.topic.reviewer?.name || "—"}</td>
                <td>{s.room.name}</td>
                <td>{formatDateWithOrdinal(s.slot.date)}</td>
                <td>
                  {s.slot.startTime.slice(0, 5)} – {s.slot.endTime.slice(0, 5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && (
        <p style={{ marginTop: 16, color: "#6b7280" }}>
          No schedules generated yet. Click <strong>Generate Schedule</strong> in the menu to create one.
        </p>
      )}

      {/* Conflicts Section */}
      <div style={{ marginTop: 40 }}>
        <h2 className="pageTitle">Unscheduled Topics & Conflicts</h2>
        {conflicts.length === 0 ? (
          <p className="text-green-600">🎉 No conflicts found!</p>
        ) : (
          <div className="card" style={{ overflow: "auto", maxHeight: "50vh" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Student Email</th>
                  <th>Topic</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.topic.studentId}</td>
                    <td>{c.topic.studentName}</td>
                    <td>{c.topic.studentEmail}</td>
                    <td>{c.topic.title}</td>
                    <td>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
