'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Geofence = { type: 'circle'; lat: number; lng: number; radiusMeters: number } | { type: 'polygon'; coordinates: number[][] };

type Campaign = {
  id: string;
  businessId: string;
  cpm: number;
  budgetRemaining: number;
  active: boolean;
  geofence: Geofence | null;
  business: { name: string };
  creatives: { id: string }[];
};

export function CampaignsList({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    const res = await fetch(`${API}/admin/campaigns/${id}`, {
      method: 'DELETE',
      headers: process.env.NEXT_PUBLIC_ADMIN_API_KEY
        ? { 'x-admin-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY }
        : {},
    });
    if (!res.ok) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Manage campaigns and geofences. Geofence: circle (lat, lng, radiusMeters) or polygon (coordinates). Map view can be added to draw geofences.
      </p>
      <ul className="space-y-3">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-gray-700 bg-surface p-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <p className="font-medium text-white">{c.business.name}</p>
              <p className="text-sm text-gray-400">
                CPM: {c.cpm} · Budget: {c.budgetRemaining} · {c.active ? 'Active' : 'Inactive'}
              </p>
              {c.geofence && (
                <p className="text-xs text-accent mt-1">
                  Geofence: {c.geofence.type === 'circle'
                    ? `circle ${c.geofence.radiusMeters}m`
                    : `polygon ${(c.geofence.coordinates?.length ?? 0)} points`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/campaigns/${c.id}`}
                className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent hover:text-white"
              >
                Edit
              </Link>
              <button
                onClick={() => deleteCampaign(c.id)}
                className="rounded border border-gray-500 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
