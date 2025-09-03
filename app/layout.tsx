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
              <Link href="/admin/upload-users">Upload Data</Link>
              <Link href="/schedule">Schedule</Link>              
              <Link href="/admin/users">Users Schedule</Link>
              {/* <GenerateScheduleButton /> */}
            </nav>
          </div>
        </header>

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
