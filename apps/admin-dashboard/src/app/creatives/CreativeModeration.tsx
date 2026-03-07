'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Creative = {
  id: string;
  headline: string;
  body: string | null;
  status: string;
  campaign: { business: { name: string } };
};

export function CreativeModeration({ initialCreatives }: { initialCreatives: Creative[] }) {
  const router = useRouter();
  const [creatives, setCreatives] = useState(initialCreatives);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setLoadingId(id);
    try {
      const res = await fetch(`${API}/admin/creatives/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_ADMIN_API_KEY && {
            'x-admin-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY,
          }),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      setCreatives((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  if (creatives.length === 0) {
    return (
      <p className="text-gray-500">No PENDING creatives. New ones appear here after generation.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {creatives.map((c) => (
        <li
          key={c.id}
          className="rounded-lg border border-gray-700 bg-surface p-4 flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <p className="font-medium text-white">{c.headline}</p>
            {c.body && <p className="text-sm text-gray-400 mt-1">{c.body}</p>}
            <p className="text-xs text-gray-500 mt-1">{c.campaign.business.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus(c.id, 'APPROVED')}
              disabled={loadingId === c.id}
              className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => updateStatus(c.id, 'REJECTED')}
              disabled={loadingId === c.id}
              className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
