import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import GenerateScheduleButton from "./components/GenerateScheduleButton";

export const metadata: Metadata = {
  title: "GUC Thesis Scheduler",
  description: "B.Sc. defenses scheduling — German University in Cairo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Navbar */}
        <header className="nav">
          <div className="navInner">
            <Link href="/" className="brand">
              <img src="/guc-logo.png" alt="GUC" className="logo" />
              <span>Thesis Scheduler</span>
            </Link>
            <nav className="links">
              <Link href="/admin/upload-users">Upload Users</Link>
              <Link href="/admin/upload-topics">Upload Topics</Link>
              <Link href="/admin/upload-rooms">Upload Rooms</Link>
              <Link href="/admin/upload-timeslots">Upload Timeslots</Link>
              <Link href="/admin/upload-unavailability">Upload Unavailability</Link>
              <Link href="/admin/upload-preferred-dates">Upload Preferred Dates</Link>
              <Link href="/admin/users">All Users</Link>
              <GenerateScheduleButton />
            </nav>
          </div>
        </header>

        {/* Quick Access Button */}
        <div className="container" style={{ marginTop: "12px", textAlign: "right" }}>
          <Link href="/admin/users" className="btn btnDark">
            👥 View All Users
          </Link>
        </div>

        {/* Page content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="footer">
          © {new Date().getFullYear()} GUC — MET
        </footer>
      </body>
    </html>
  );
}
