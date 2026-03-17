'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TrendItem {
  date: string; // "20260310"
  visitors: number;
  pageviews: number;
}

function formatDate(raw: string): string {
  // "20260310" → "3/10"
  const m = raw.slice(4, 6).replace(/^0/, '');
  const d = raw.slice(6, 8).replace(/^0/, '');
  return `${m}/${d}`;
}

export default function TrendChart({ data }: { data: TrendItem[] }) {
  const chartData = data.map((d) => ({ ...d, date: formatDate(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line-default, #e5e7eb)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="visitors" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pageviews" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
