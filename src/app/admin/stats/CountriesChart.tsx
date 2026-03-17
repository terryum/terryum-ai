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

interface CountryItem {
  country: string;
  visitors: number;
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

export default function CountriesChart({ data }: { data: CountryItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={data.slice(0, 8)}
        margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={90} />
        <Tooltip />
        <Bar dataKey="visitors" radius={[0, 3, 3, 0]}>
          {data.slice(0, 8).map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
