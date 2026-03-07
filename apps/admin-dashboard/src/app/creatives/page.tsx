import Link from 'next/link';
import { CreativeModeration } from './CreativeModeration';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getPendingCreatives() {
  const res = await fetch(`${API}/admin/creatives?status=PENDING`, {
    headers: process.env.ADMIN_API_KEY
      ? { 'x-admin-api-key': process.env.ADMIN_API_KEY }
      : {},
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function CreativesPage() {
  const creatives = await getPendingCreatives();

  return (
    <div className="min-h-screen bg-background p-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-700 pb-4">
        <Link href="/" className="text-gray-400 hover:text-gray-200">
          Dashboard
        </Link>
        <Link href="/creatives" className="font-semibold text-accent">
          Moderation
        </Link>
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-200">
          Campaigns
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">Moderation (PENDING creatives)</h1>

      <CreativeModeration initialCreatives={creatives} />
    </div>
  );
}
