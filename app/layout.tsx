// app/layout.tsx
import './globals.css'; // Adjust if you use CSS modules or Tailwind

export const metadata = {
  title: 'Thesis Scheduler',
  description: 'Bachelor thesis scheduling system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-gray-100 p-4 flex gap-4">
        <a href="/schedule" className="text-blue-600">📅 Schedule</a>
        <a href="/conflicts" className="text-red-600">⚠️ Conflicts</a>
      </nav>
        <main className="min-h-screen bg-gray-50 text-gray-900">
          {children}
        </main>
      </body>
    </html>
  );
}
