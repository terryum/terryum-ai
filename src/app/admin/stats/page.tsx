'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

type Period = '7d' | '30d' | '90d';
type PostLocale = 'all' | 'ko' | 'en';

interface StatsData {
  kpi: {
    visitors: number;
    pageviews: number;
    engagementRate: number;
    avgSessionDuration: number;
  };
  trend: { date: string; visitors: number; pageviews: number }[];
  sources: { source: string; medium: string; sessions: number; visitors: number }[];
  countries: { country: string; visitors: number }[];
  posts: { path: string; locale: string; slug: string; pageviews: number; visitors: number; avgDuration: number }[];
  period: string;
}

// recharts — SSR 제외하여 브라우저에서만 로드
const TrendChart = dynamic(() => import('./TrendChart'), { ssr: false, loading: () => <ChartSkeleton /> });
const SourcesChart = dynamic(() => import('./SourcesChart'), { ssr: false, loading: () => <ChartSkeleton /> });
const CountriesChart = dynamic(() => import('./CountriesChart'), { ssr: false, loading: () => <ChartSkeleton /> });

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function ChartSkeleton() {
  return <div className="h-48 bg-bg-secondary rounded-md animate-pulse" />;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-default rounded-md p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
    </div>
  );
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [postLocale, setPostLocale] = useState<PostLocale>('all');
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

  const filteredPosts = data?.posts.filter(
    (p) => postLocale === 'all' || p.locale === postLocale
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-line-default rounded-md p-4 h-20 animate-pulse bg-bg-secondary" />
            ))}
          </div>
          <ChartSkeleton />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Visitors" value={data.kpi.visitors.toLocaleString()} />
            <KpiCard label="Pageviews" value={data.kpi.pageviews.toLocaleString()} />
            <KpiCard label="Engagement" value={`${(data.kpi.engagementRate * 100).toFixed(1)}%`} />
            <KpiCard label="Avg Duration" value={formatDuration(data.kpi.avgSessionDuration)} />
          </div>

          {/* Trend Chart */}
          <div>
            <h2 className="text-sm font-medium text-text-primary mb-3">방문자 트렌드</h2>
            <TrendChart data={data.trend} />
          </div>

          {/* Sources + Countries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-medium text-text-primary mb-3">유입경로</h2>
              <SourcesChart data={data.sources} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-text-primary mb-3">국가별 방문자</h2>
              <CountriesChart data={data.countries} />
            </div>
          </div>

          {/* Posts Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text-primary">포스팅별 조회수</h2>
              <div className="flex gap-1">
                {(['all', 'ko', 'en'] as PostLocale[]).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setPostLocale(loc)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      postLocale === loc
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-accent border border-line-default'
                    }`}
                  >
                    {loc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto border border-line-default rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-default bg-bg-secondary">
                    <th className="text-left px-3 py-2 text-text-secondary font-medium">Slug</th>
                    <th className="text-center px-3 py-2 text-text-secondary font-medium">Lang</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-medium">Views</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-medium">Visitors</th>
                    <th className="text-right px-3 py-2 text-text-secondary font-medium">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-text-secondary">No data</td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => (
                      <tr key={post.path} className="border-b border-line-default last:border-b-0">
                        <td className="px-3 py-2 text-text-primary truncate max-w-xs">{post.slug}</td>
                        <td className="px-3 py-2 text-center text-text-secondary uppercase text-xs">{post.locale}</td>
                        <td className="text-right px-3 py-2 text-text-secondary tabular-nums">{post.pageviews.toLocaleString()}</td>
                        <td className="text-right px-3 py-2 text-text-secondary tabular-nums">{post.visitors.toLocaleString()}</td>
                        <td className="text-right px-3 py-2 text-text-secondary tabular-nums">{formatDuration(post.avgDuration)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
