import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adrive Admin',
  description: 'Admin dashboard for Adrive DOOH',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background text-gray-100">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
