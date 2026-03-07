import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getAnalytics() {
  const res = await fetch(`${API}/admin/analytics`, {
    headers: process.env.ADMIN_API_KEY
      ? { 'x-admin-api-key': process.env.ADMIN_API_KEY }
      : {},
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardPage() {
  const data = await getAnalytics();

  return (
    <div className="min-h-screen bg-background p-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-700 pb-4">
        <Link href="/" className="font-semibold text-accent">
          Dashboard
        </Link>
        <Link href="/creatives" className="text-gray-400 hover:text-gray-200">
          Moderation
        </Link>
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-200">
          Campaigns
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>

      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="OTS" value={data.ots} sub="COUNT(DISTINCT lat_hash) × 50 × 0.7" />
          <Card
            title="Conversion rate"
            value={`${data.conversionRatePercent}%`}
            sub="Redemptions / Impressions × 100"
          />
          <Card title="Impressions" value={data.impressionsTotal} />
          <Card title="Redemptions" value={data.redemptionsTotal} />
        </div>
      ) : (
        <p className="text-gray-500">
          Could not load analytics. Ensure backend is running and ADMIN_API_KEY is set if required.
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-surface p-4">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-accent">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
