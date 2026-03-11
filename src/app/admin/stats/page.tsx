'use client';

import { useState, useEffect, useCallback } from 'react';

type Period = '7d' | '30d' | '90d';

interface StatsData {
  kpi: {
    visitors: number;
    pageviews: number;
    engagementRate: number;
  };
  topPages: {
    path: string;
    pageviews: number;
    visitors: number;
  }[];
  period: string;
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/stats?period=${p}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to fetch');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-text-primary">Stats</h1>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-accent border border-line-default'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {loading ? (
        <p className="text-text-secondary text-sm">Loading...</p>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Visitors" value={data.kpi.visitors.toLocaleString()} />
            <KpiCard label="Pageviews" value={data.kpi.pageviews.toLocaleString()} />
            <KpiCard
              label="Engagement"
              value={`${(data.kpi.engagementRate * 100).toFixed(1)}%`}
            />
          </div>

          {/* Top Pages Table */}
          <div>
            <h2 className="text-sm font-medium text-text-primary mb-3">Top Pages</h2>
            <div className="overflow-x-auto border border-line-default rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-default bg-bg-secondary">
                    <th className="text-left px-3 py-2 text-text-secondary font-medium">Path</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-medium">Views</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-medium">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((page) => (
                    <tr key={page.path} className="border-b border-line-default last:border-b-0">
                      <td className="px-3 py-2 text-text-primary truncate max-w-xs">{page.path}</td>
                      <td className="text-right px-3 py-2 text-text-secondary tabular-nums">{page.pageviews.toLocaleString()}</td>
                      <td className="text-right px-3 py-2 text-text-secondary tabular-nums">{page.visitors.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-default rounded-md p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
    </div>
  );
}
