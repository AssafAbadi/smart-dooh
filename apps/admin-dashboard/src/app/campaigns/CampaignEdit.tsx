'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Geofence = { type: 'circle'; lat: number; lng: number; radiusMeters: number } | { type: 'polygon'; coordinates: number[][] };

type Campaign = {
  id: string;
  cpm: number;
  budgetRemaining: number;
  active: boolean;
  geofence: Geofence | null;
  business: { name: string };
};

export function CampaignEdit({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [cpm, setCpm] = useState(campaign.cpm);
  const [budgetRemaining, setBudgetRemaining] = useState(campaign.budgetRemaining);
  const [active, setActive] = useState(campaign.active);
  const [geofenceLat, setGeofenceLat] = useState(
    campaign.geofence?.type === 'circle' ? campaign.geofence.lat : 32.08
  );
  const [geofenceLng, setGeofenceLng] = useState(
    campaign.geofence?.type === 'circle' ? campaign.geofence.lng : 34.78
  );
  const [radiusMeters, setRadiusMeters] = useState(
    campaign.geofence?.type === 'circle' ? campaign.geofence.radiusMeters : 500
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_ADMIN_API_KEY && {
            'x-admin-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY,
          }),
        },
        body: JSON.stringify({
          cpm,
          budgetRemaining,
          active,
          geofence: { type: 'circle' as const, lat: geofenceLat, lng: geofenceLng, radiusMeters },
        }),
      });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6 rounded-lg border border-gray-700 bg-surface p-6">
      <p className="text-gray-400">{campaign.business.name}</p>

      <div>
        <label className="block text-sm text-gray-400">CPM</label>
        <input
          type="number"
          value={cpm}
          onChange={(e) => setCpm(Number(e.target.value))}
          className="mt-1 w-full rounded border border-gray-600 bg-background px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400">Budget remaining</label>
        <input
          type="number"
          value={budgetRemaining}
          onChange={(e) => setBudgetRemaining(Number(e.target.value))}
          className="mt-1 w-full rounded border border-gray-600 bg-background px-3 py-2 text-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="rounded"
        />
        <label className="text-sm text-gray-400">Active</label>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <h2 className="mb-3 text-sm font-medium text-accent">Geofence (circle)</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Lat</label>
            <input
              type="number"
              step="any"
              value={geofenceLat}
              onChange={(e) => setGeofenceLat(Number(e.target.value))}
              className="mt-1 w-full rounded border border-gray-600 bg-background px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Lng</label>
            <input
              type="number"
              step="any"
              value={geofenceLng}
              onChange={(e) => setGeofenceLng(Number(e.target.value))}
              className="mt-1 w-full rounded border border-gray-600 bg-background px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Radius (m)</label>
            <input
              type="number"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="mt-1 w-full rounded border border-gray-600 bg-background px-2 py-1.5 text-sm text-white"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Map integration can be added to draw polygons; for now use circle (lat, lng, radius).
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-dim disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <Link
          href="/campaigns"
          className="rounded border border-gray-600 px-4 py-2 text-gray-400 hover:bg-gray-700"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
