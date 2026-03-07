import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CampaignEdit } from '../CampaignEdit';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getCampaign(id: string) {
  const res = await fetch(`${API}/admin/campaigns/${id}`, {
    headers: process.env.ADMIN_API_KEY ? { 'x-admin-api-key': process.env.ADMIN_API_KEY } : {},
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = await getCampaign(params.id);
  if (!campaign) notFound();

  return (
    <div className="min-h-screen bg-background p-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-700 pb-4">
        <Link href="/" className="text-gray-400 hover:text-gray-200">Dashboard</Link>
        <Link href="/creatives" className="text-gray-400 hover:text-gray-200">Moderation</Link>
        <Link href="/campaigns" className="font-semibold text-accent">Campaigns</Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">Edit campaign & geofence</h1>

      <CampaignEdit campaign={campaign} />
    </div>
  );
}
