"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface ChartPoint {
  date: string;
  [key: string]: string | number;
}

const COLORS = ["#818cf8", "#34d399", "#f472b6", "#fbbf24"];

export function MetricChart({
  data,
  series,
  height = 220,
}: {
  data: ChartPoint[];
  series: { key: string; label: string }[];
  height?: number;
}) {
  if (!data.length) {
    return <div className="text-sm text-zinc-500 py-8 text-center">No metric history yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#23232e" />
        <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} width={48} />
        <Tooltip
          contentStyle={{
            background: "#14141b",
            border: "1px solid #23232e",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
