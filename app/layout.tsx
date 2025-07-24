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
        <main className="min-h-screen bg-gray-50 text-gray-900">
          {children}
        </main>
      </body>
    </html>
  );
}
