'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface SourceItem {
  source: string;
  medium: string;
  sessions: number;
  visitors: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8'];

export default function SourcesChart({ data }: { data: SourceItem[] }) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.medium === '(none)' ? d.source : `${d.source}/${d.medium}`,
    sessions: d.sessions,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip />
        <Bar dataKey="sessions" radius={[0, 3, 3, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
