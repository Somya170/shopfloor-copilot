'use client';
// components/charts/TelemetryChart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

interface DataPoint {
  timestamp: string;
  temperature?: number;
  vibration?: number;
  rpm?: number;
  power_consumption?: number;
  is_anomaly?: boolean;
}

interface Props {
  data: DataPoint[];
  metric: 'temperature' | 'vibration' | 'rpm' | 'power_consumption';
  height?: number;
  showAnomaly?: boolean;
}

const META = {
  temperature:       { label: 'Temperature', unit: '°C',   color: '#E31837', warning: 95,  critical: 110  },
  vibration:         { label: 'Vibration',   unit: 'mm/s', color: '#D97706', warning: 0.4, critical: 0.7  },
  rpm:               { label: 'RPM',         unit: 'rpm',  color: '#0057A8', warning: 4200,critical: 4800 },
  power_consumption: { label: 'Power',       unit: 'W',    color: '#059669', warning: 1500,critical: 1800 },
};

const fmtTime = (ts: string) => {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
};

const CustomTooltip = ({ active, payload, label, meta }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const isAnomaly = payload[0]?.payload?.is_anomaly;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--g200)', borderRadius: 6,
      padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    }}>
      <div style={{ color: 'var(--g400)', marginBottom: 4 }}>{fmtTime(label)}</div>
      <div style={{ fontWeight: 700, color: isAnomaly ? 'var(--red)' : meta.color }}>
        {val?.toFixed(3)} {meta.unit}
        {isAnomaly && ' ⚠'}
      </div>
    </div>
  );
};

export default function TelemetryChart({ data, metric, height = 160, showAnomaly = true }: Props) {
  const meta = META[metric];
  const reversed = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={reversed} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--g100)" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={fmtTime}
          tick={{ fontSize: 9.5, fill: 'var(--g400)' }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 9.5, fill: 'var(--g400)' }} />
        <Tooltip content={<CustomTooltip meta={meta} />} />
        {showAnomaly && (
          <ReferenceLine y={meta.warning}  stroke={meta.color} strokeDasharray="4 2" strokeOpacity={0.5} label={{ value: 'Warn', fontSize: 9, fill: 'var(--g400)' }} />
        )}
        {showAnomaly && (
          <ReferenceLine y={meta.critical} stroke="var(--red)"    strokeDasharray="4 2" strokeOpacity={0.5} label={{ value: 'Crit', fontSize: 9, fill: 'var(--red)' }} />
        )}
        <Line
          type="monotone"
          dataKey={metric}
          stroke={meta.color}
          strokeWidth={1.8}
          dot={false}
          activeDot={{ r: 4, fill: meta.color }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Mini sparkline ────────────────────────────────────────────
export function Sparkline({ data, metric, color }: { data: DataPoint[]; metric: keyof typeof META; color?: string }) {
  const reversed = [...data].reverse().slice(-30);
  const c = color ?? META[metric].color;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={reversed}>
        <Line type="monotone" dataKey={metric} stroke={c} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}