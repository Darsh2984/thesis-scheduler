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
  room: { id: number; name: string };
  slot: { id: number; date: string | Date; startTime: string; endTime: string };
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

type SlotRoom = {
  id: string; // synthetic id = slotId-roomId
  slotId: number;
  roomId: number;
  date: string | Date;
  startTime: string;
  endTime: string;
  room: { id: number; name: string };
};

// ✅ Helper for long date format
function formatDateLong(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ScheduleClient({
  schedules,
  conflicts,
  allSlots,
}: {
  schedules: Schedule[];
  conflicts: Conflict[];
  allSlots: SlotRoom[];
}) {
  // === CSV Export (scheduled only) ===
    const handleExportScheduleCSV = () => {
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
      formatDateLong(s.slot.date),
      `from ${s.slot.startTime.slice(0, 5)} to ${s.slot.endTime.slice(0, 5)}`,
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
    // ✅ updated name
    link.setAttribute("download", "Defenses_Schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // === Unused slots (slot × room not in any schedule) ===
  const usedKeys = new Set(schedules.map((s) => `${s.slot.id}-${s.room.id}`));
  const unusedSlots = allSlots.filter(
    (sr) => !usedKeys.has(`${sr.slotId}-${sr.roomId}`)
  );

  // === CSV Export (unused slots) ===
  const handleExportUnusedCSV = () => {
    const headers = ["Date", "Time", "Room"];

    const rows = unusedSlots.map((sr) => [
      formatDateLong(sr.date),
      `from ${sr.startTime.slice(0, 5)} to ${sr.endTime.slice(0, 5)}`,
      sr.room.name,
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
    link.setAttribute("download", "Unused_Slots.csv"); // ✅ file name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <h1 className="pageTitle">Scheduled Presentations</h1>

      {/* Export Buttons */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleExportScheduleCSV} className="btn">
          ⬇️ Download Schedule (CSV)
        </button>
        {unusedSlots.length > 0 && (
          <button onClick={handleExportUnusedCSV} className="btn">
            ⬇️ Download Unused Slots (CSV)
          </button>
        )}
      </div>

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
                <td>{formatDateLong(s.slot.date)}</td>
                <td>
                  from {s.slot.startTime.slice(0, 5)} to{" "}
                  {s.slot.endTime.slice(0, 5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && (
        <p style={{ marginTop: 16, color: "#6b7280" }}>
          No schedules generated yet. Click <strong>Generate Schedule</strong> in
          the menu to create one.
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

      {/* Unused Slots Section */}
      <div style={{ marginTop: 40 }}>
        <h2 className="pageTitle">Unused Slots</h2>
        {unusedSlots.length === 0 ? (
          <p className="text-green-600">
            🎉 No unused slots — all slots are assigned!
          </p>
        ) : (
          <div className="card" style={{ overflow: "auto", maxHeight: "50vh" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {unusedSlots.map((sr) => (
                  <tr key={sr.id}>
                    <td>{formatDateLong(sr.date)}</td>
                    <td>
                      from {sr.startTime.slice(0, 5)} to {sr.endTime.slice(0, 5)}
                    </td>
                    <td>{sr.room.name}</td>
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
