import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '0.6rem 0.8rem',
        color: 'var(--text-primary)',
        fontSize: '0.8rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{label || payload[0]?.name}</div>
        {payload.map((item, index) => (
          <div key={index} style={{ color: item.color || '#818cf8' }}>
            {item.name}: <strong>{item.value?.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartPanel({ chartPayload }) {
  if (!chartPayload || !chartPayload.data || chartPayload.data.length === 0) {
    return null;
  }

  const defaultType = chartPayload.chart_type || 'bar';
  const [activeType, setActiveType] = useState(defaultType);

  const data = chartPayload.data;
  const series = chartPayload.series || [{ key: 'value', name: 'Value', color: '#6366f1' }];
  const mainColor = series[0]?.color || '#6366f1';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="card-title" style={{ margin: 0 }}>
          <span>📈</span> {chartPayload.title || 'Resource Consumption Analytics'}
        </div>

        <div className="chart-type-tabs">
          <button
            className={`tab-btn ${activeType === 'bar' ? 'active' : ''}`}
            onClick={() => setActiveType('bar')}
          >
            📊 Bar
          </button>
          <button
            className={`tab-btn ${activeType === 'area' ? 'active' : ''}`}
            onClick={() => setActiveType('area')}
          >
            📉 Area
          </button>
          <button
            className={`tab-btn ${activeType === 'line' ? 'active' : ''}`}
            onClick={() => setActiveType('line')}
          >
            📈 Line
          </button>
          <button
            className={`tab-btn ${activeType === 'pie' ? 'active' : ''}`}
            onClick={() => setActiveType('pie')}
          >
            🥧 Pie
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {activeType === 'bar' && (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.7} />
              <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} angle={-15} textAnchor="end" />
              <YAxis stroke="var(--chart-axis)" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={series[0]?.name || 'Consumption'} fill={mainColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}

          {activeType === 'area' && (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={mainColor} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={mainColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.7} />
              <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} angle={-15} textAnchor="end" />
              <YAxis stroke="var(--chart-axis)" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name={series[0]?.name || 'Consumption'} stroke={mainColor} fill="url(#areaGradient)" />
            </AreaChart>
          )}

          {activeType === 'line' && (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.7} />
              <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} angle={-15} textAnchor="end" />
              <YAxis stroke="var(--chart-axis)" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name={series[0]?.name || 'Consumption'} stroke={mainColor} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          )}

          {activeType === 'pie' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={3}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

