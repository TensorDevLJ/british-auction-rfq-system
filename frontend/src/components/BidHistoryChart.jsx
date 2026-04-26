/**
 * components/BidHistoryChart.jsx
 * Price vs time trend for all suppliers using Recharts
 */
import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#818cf8', '#34d399', '#fb923c',
  '#f472b6', '#facc15', '#22d3ee',
  '#a78bfa', '#f87171',
];

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
      <p className="text-slate-400 mb-2">{formatTime(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey}: ${p.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function BidHistoryChart({ priceHistory = [] }) {
  const { chartData, suppliers } = useMemo(() => {
    const supplierSet = [...new Set(priceHistory.map((b) => b.supplier_name))];

    // Build timeline with a point per bid submission
    const points = priceHistory.map((bid) => ({
      time: bid.submitted_at,
      [bid.supplier_name]: bid.total_price,
    }));

    // Merge points at same timestamp
    const merged = {};
    for (const p of points) {
      const key = p.time;
      merged[key] = { ...merged[key], time: key, ...p };
    }

    const chartData = Object.values(merged).sort(
      (a, b) => new Date(a.time) - new Date(b.time),
    );

    return { chartData, suppliers: supplierSet };
  }, [priceHistory]);

  if (priceHistory.length === 0) {
    return (
      <div className="card text-center py-8 text-slate-500">
        No price data yet
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4">📈 Price Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }}
          />
          {suppliers.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
