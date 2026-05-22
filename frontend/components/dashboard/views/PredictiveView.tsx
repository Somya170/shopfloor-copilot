'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = 'http://localhost:5005';

// ── Types ──────────────────────────────────────────────────────
interface SensorData {
  timestamp: number;
  aRMSx: number; aRMSy: number; aRMSz: number;
  vRMSx: number; vRMSy: number; vRMSz: number;
  temperature: number;
  aucausticRMS: number;
  mac?: string;
}

interface PredictionData {
  failure_risk: number;
  rul_hours: number;
  status: 'normal' | 'warning' | 'critical';
  fault_type: string;
  confidence: number;
  health_score: number;
  motor_off: boolean;
  trend: number;
}

interface Recommendation {
  id: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface ForecastPoint {
  timestamp: number;
  value: number;
  predicted: boolean;
}

interface AlertItem {
  timestamp: string;
  message: string;
  severity?: string;
  type?: string;
}

// ── Helpers ────────────────────────────────────────────────────
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const statusColor = (s: string) =>
  s === 'critical' ? '#EF4444' : s === 'warning' ? '#F59E0B' : '#10B981';

const priorityColor = (p: string) =>
  p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#10B981';

// Temperature color: green below 30, yellow 30-40, red above 40
const tempColor = (t: number) =>
  t >= 40 ? '#EF4444' : t >= 30 ? '#F59E0B' : '#10B981';

// ── Expandable Chart ───────────────────────────────────────────
interface ChartConfig {
  title: string;
  data: any[];
  lines: { key: string; name: string; color: string }[];
  height?: number;
}

function ExpandableChart({ title, data, lines, height = 160 }: ChartConfig) {
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState<'1m' | '5m' | '1h' | 'all'>('all');

  const filtered = (() => {
    if (range === 'all') return data;
    const now = Date.now();
    const ms = range === '1m' ? 60000 : range === '5m' ? 300000 : 3600000;
    return data.filter(d => {
      const ts = d.rawTs ?? 0;
      return ts >= now - ms;
    });
  })();

  const chartContent = (h: number) => (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={filtered}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#64748B' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
        <Tooltip contentStyle={{ background: '#1f2937', border: 'none', fontSize: 11, borderRadius: 6 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
        {lines.map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name}
            stroke={l.color} strokeWidth={1.8} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
          <button
            onClick={() => setExpanded(true)}
            title="Expand chart"
            style={{
              background: '#1f2937', border: 'none', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', color: '#94A3B8', fontSize: 12,
            }}
          >
            ⛶
          </button>
        </div>
        {chartContent(height)}
      </div>

      {/* Modal */}
      {expanded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}
          onClick={() => setExpanded(false)}
        >
          <div
            style={{
              background: '#111827', border: '1px solid #374151',
              borderRadius: 12, padding: 24, width: '90%', maxWidth: 1100,
              maxHeight: '85vh', overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
                {/* Range selector */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['1m', '5m', '1h', 'all'] as const).map(r => (
                    <button key={r} onClick={() => setRange(r)} style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: range === r ? '#0EA5E9' : '#1f2937',
                      color: range === r ? '#fff' : '#64748B',
                    }}>
                      {r === '1m' ? '1 min' : r === '5m' ? '5 min' : r === '1h' ? '1 hour' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setExpanded(false)} style={{
                background: '#1f2937', border: 'none', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer', color: '#94A3B8', fontSize: 14,
              }}>✕</button>
            </div>
            {chartContent(400)}
          </div>
        </div>
      )}
    </>
  );
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#10B981', icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: '#1a1f2e', border: '1px solid #2a3040',
      borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: .8, textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AICard({ label, value, sub, color = '#fff', icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: .8, textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 16, color: '#64748B' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function PredictiveView() {
  const [liveData, setLiveData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [recommendations, setRecs] = useState<Recommendation[]>([]);
  const [vibForecast, setVibForecast] = useState<ForecastPoint[]>([]);
  const [tempForecast, setTempForecast] = useState<ForecastPoint[]>([]);
  const [healthTrend, setHealthTrend] = useState<{ t: string; v: number; rawTs: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '1h' | 'all'>('all');
  const [error, setError] = useState('');

  const healthRef = useRef<{ t: string; v: number; rawTs: number }[]>([]);

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/live-data`);
      if (!r.ok) throw new Error();
      const d: SensorData = await r.json();
      // guard: ensure required fields exist
      if (d && typeof d.temperature === 'number') {
        setLiveData(d);
        setConnected(true);
        setError('');
      }
    } catch {
      setConnected(false);
      setError('Cannot connect to Edge AI backend (port 5005)');
    }
  }, []);

  const fetchPrediction = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/prediction`);
      if (!r.ok) return;
      const d: PredictionData = await r.json();
      if (d && typeof d.health_score === 'number') {
        setPrediction(d);
        const now = Date.now();
        healthRef.current = [
          ...healthRef.current.slice(-40),
          { t: fmtTime(now), v: d.health_score, rawTs: now },
        ];
        setHealthTrend([...healthRef.current]);
      }
    } catch { }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/history?range=${timeRange}&limit=100`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d)) setHistory(d);
    } catch { }
  }, [timeRange]);

  const fetchForecast = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/forecast`);
      if (!r.ok) return;
      const d = await r.json();
      if (d?.vRMSy) setVibForecast(d.vRMSy);
      if (d?.temperature) setTempForecast(d.temperature);
    } catch { }
  }, []);

  const fetchRecs = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/recommendations`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0) setRecs(d);
    } catch { }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/alerts?limit=20`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d)) setAlerts(d);
    } catch { }
  }, []);

  useEffect(() => {
    fetchLive();
    fetchHistory();
    fetchPrediction();
    fetchForecast();
    fetchRecs();
    fetchAlerts();

    const t1 = setInterval(fetchLive, 5000);
    const t2 = setInterval(() => { fetchPrediction(); fetchForecast(); fetchAlerts(); }, 7000);
    const t3 = setInterval(fetchHistory, 5000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [fetchLive, fetchHistory, fetchPrediction, fetchForecast, fetchRecs, fetchAlerts]);

  // ── Chart data builders ───────────────────────────────────────
  const chartData = history.slice(-80).map(d => ({
    t: fmtTime(d.timestamp), rawTs: d.timestamp,
    vX: d.vRMSx, vY: d.vRMSy, vZ: d.vRMSz,
    aX: d.aRMSx, aY: d.aRMSy, aZ: d.aRMSz,
    temp: d.temperature, acou: d.aucausticRMS,
  }));

  const vibFC = vibForecast.map(p => ({
    t: fmtTime(p.timestamp), rawTs: p.timestamp,
    actual: !p.predicted ? p.value : undefined,
    pred: p.predicted ? p.value : undefined,
  }));

  const tempFC = tempForecast.map(p => ({
    t: fmtTime(p.timestamp), rawTs: p.timestamp,
    actual: !p.predicted ? p.value : undefined,
    pred: p.predicted ? p.value : undefined,
  }));

  const status = prediction?.status ?? 'normal';
  const sColor = statusColor(status);
  const temp = liveData?.temperature ?? 0;
  const tColor = tempColor(temp);

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      color: '#fff', fontFamily: 'var(--font-sans, Arial, sans-serif)',
    }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{
        background: '#111827', borderBottom: '1px solid #1f2937',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          <span style={{ color: '#0EA5E9', fontWeight: 700, fontSize: 14 }}>EDGE AI</span>
          <span style={{ color: '#64748B', fontSize: 13 }}>Predictive Maintenance Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            background: connected ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${connected ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? '#10B981' : '#EF4444',
              display: 'inline-block',
              animation: connected ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: connected ? '#10B981' : '#EF4444' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 8, padding: '10px 16px', color: '#FCA5A5', fontSize: 13,
          }}>⚠ {error}</div>
        )}

        {/* Machine info + time range */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Machine_6 — Compressor (Edge AI)</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
              MAC: E4:65:B8:2C:73:48 · Zone C - Bay 2 · MQTT: wired/rms/#
              {liveData && (
                <span style={{ marginLeft: 10, color: '#10B981' }}>
                  Last reading: {fmtTime(liveData.timestamp)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>TIME RANGE:</span>
            {(['1m', '5m', '1h', 'all'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: timeRange === r ? '#0EA5E9' : '#1f2937',
                color: timeRange === r ? '#fff' : '#64748B',
              }}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status cards ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard label="Health Score" icon="♥"
            value={prediction ? `${prediction.health_score.toFixed(0)}%` : '—'}
            sub={prediction?.motor_off ? 'Motor OFF' : 'Operating normally'}
            color={prediction ? statusColor(prediction.status) : '#64748B'}
          />
          <StatCard label="Machine Status" icon="⚡"
            value={prediction ? prediction.status.charAt(0).toUpperCase() + prediction.status.slice(1) : '—'}
            sub="Operating normally" color={sColor}
          />
          <StatCard label="Temperature" icon="🌡"
            value={liveData ? `${liveData.temperature.toFixed(1)}°C` : '—'}
            sub={temp >= 40 ? 'High — check cooling' : temp >= 30 ? 'Slightly elevated' : 'Operating normally'}
            color={tColor}
          />
          <StatCard label="Acoustic RMS" icon="🔊"
            value={liveData ? `${liveData.aucausticRMS.toFixed(1)} dB` : '—'}
            sub="Operating normally" color="#A78BFA"
          />
        </div>

        {/* ── AI Predictive cards ──────────────────────────── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
            AI Predictive Maintenance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <AICard label="Failure Risk" icon="⚠" value={prediction ? `${prediction.failure_risk.toFixed(1)}%` : '—'} color="#fff" />
            <AICard label="Remaining Life" icon="⏱" value={prediction ? `${Math.floor(prediction.rul_hours / 24)}d` : '—'} color="#fff" />
            <AICard label="AI Predicted Status" icon="🌐" value={prediction ? prediction.status.charAt(0).toUpperCase() + prediction.status.slice(1) : '—'} color={sColor} />
            <AICard label="AI Confidence" icon="📈" value={prediction ? `${(prediction.confidence * 100).toFixed(0)}%` : '—'} color="#0EA5E9" />
          </div>
        </div>

        {/* ── Forecast charts ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <ExpandableChart
            title="Vibration Forecast"
            data={vibFC}
            lines={[
              { key: 'actual', name: 'Actual', color: '#06B6D4' },
              { key: 'pred', name: 'Predicted', color: '#06B6D4' },
            ]}
            height={150}
          />
          <ExpandableChart
            title="Temperature Forecast"
            data={tempFC}
            lines={[
              { key: 'actual', name: 'Actual', color: '#F97316' },
              { key: 'pred', name: 'Predicted', color: '#F97316' },
            ]}
            height={150}
          />
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Health Score Trend</span>
              <span style={{ fontSize: 11, color: prediction?.trend && prediction.trend < 0 ? '#EF4444' : '#10B981' }}>
                {prediction?.trend && prediction.trend < 0 ? '↘ Declining' : '↗ Stable'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={healthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#64748B' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748B' }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', fontSize: 11, borderRadius: 6 }} />
                <Line type="monotone" dataKey="v" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── AI Fault + Recommendations ───────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Fault Detection */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: '#0EA5E9' }}>🔵</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>AI Fault Detection</span>
            </div>
            <div style={{ background: '#0d1117', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: (!prediction?.fault_type || prediction.fault_type === 'none') ? '#10B981' : '#F59E0B',
              }}>
                {(!prediction?.fault_type || prediction.fault_type === 'none')
                  ? 'No Fault Detected'
                  : prediction.fault_type.charAt(0).toUpperCase() + prediction.fault_type.slice(1)}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {prediction?.motor_off ? 'Motor is OFF'
                  : (!prediction?.fault_type || prediction.fault_type === 'none')
                    ? 'System operating normally'
                    : 'Fault detected — maintenance required'}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                <span>Model Confidence</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {prediction ? `${(prediction.confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div style={{ background: '#1f2937', borderRadius: 99, height: 6 }}>
                <div style={{
                  width: prediction ? `${prediction.confidence * 100}%` : '0%',
                  height: '100%', borderRadius: 99,
                  background: 'linear-gradient(90deg, #0EA5E9, #06B6D4)',
                  transition: 'width .5s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: '#F59E0B' }}>💡</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>AI Recommendations</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.slice(0, 4).map(rec => (
                <div key={rec.id} style={{
                  background: '#0d1117', borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>
                    {rec.category === 'maintenance' ? '🔧' : rec.category === 'risk' ? '⚠' : '⚙'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.5 }}>{rec.message}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: `${priorityColor(rec.priority)}20`,
                        color: priorityColor(rec.priority),
                        border: `1px solid ${priorityColor(rec.priority)}40`,
                      }}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 99,
                        background: '#1f2937', color: '#94A3B8',
                      }}>
                        {rec.category.charAt(0).toUpperCase() + rec.category.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: 16 }}>
                  Loading recommendations…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Live Charts ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ExpandableChart title="Velocity RMS" data={chartData} lines={[
            { key: 'vX', name: 'vRMS-X', color: '#06B6D4' },
            { key: 'vY', name: 'vRMS-Y', color: '#818CF8' },
            { key: 'vZ', name: 'vRMS-Z', color: '#34D399' },
          ]} height={160} />
          <ExpandableChart title="Acceleration RMS" data={chartData} lines={[
            { key: 'aX', name: 'aRMS-X', color: '#F87171' },
            { key: 'aY', name: 'aRMS-Y', color: '#FBBF24' },
            { key: 'aZ', name: 'aRMS-Z', color: '#4ADE80' },
          ]} height={160} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <ExpandableChart title="Temperature" data={chartData} lines={[
            { key: 'temp', name: 'Temperature', color: '#F97316' },
          ]} height={140} />
          <ExpandableChart title="Acoustic RMS" data={chartData} lines={[
            { key: 'acou', name: 'Acoustic RMS', color: '#A78BFA' },
          ]} height={140} />
        </div>

        {/* ── Alerts section ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Alerts */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #1f2937',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: '#EF4444' }}>⚠</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Alerts</span>
              {alerts.length > 0 && (
                <span style={{
                  background: 'rgba(239,68,68,.2)', color: '#FCA5A5',
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                }}>
                  {alerts.length}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  ✓ No active alerts
                </div>
              ) : (
                alerts.map((a, i) => {
                  const sev = a.severity ?? 'info';
                  const sevColor = sev === 'critical' ? '#EF4444' : sev === 'warning' ? '#F59E0B' : '#10B981';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 20px', borderBottom: '1px solid #1f2937',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: `${sevColor}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                      }}>
                        {sev === 'critical' ? '🔴' : sev === 'warning' ? '🟡' : '🟢'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.5 }}>
                          {a.message ?? a.type ?? 'Alert'}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>
                          {a.timestamp}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: `${sevColor}20`, color: sevColor,
                        border: `1px solid ${sevColor}40`, flexShrink: 0,
                      }}>
                        {sev.toUpperCase()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Sensor Data table */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Live Sensor Data</span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ background: '#0d1117' }}>
                    {['TIME', 'vRMS-Y', 'TEMP', 'ACOUSTIC', 'aRMS-Y'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        color: '#64748B', fontWeight: 600, letterSpacing: .4, fontSize: 10,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(-10).reverse().map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={{ padding: '7px 12px', color: '#94A3B8' }}>{fmtTime(row.timestamp)}</td>
                      <td style={{ padding: '7px 12px', color: row.vRMSy > 1.5 ? '#F59E0B' : '#fff' }}>
                        {row.vRMSy != null ? Number(row.vRMSy).toFixed(3) : '—'}
                      </td>
                      <td style={{ padding: '7px 12px', color: tempColor(row.temperature) }}>
                        {row.temperature != null ? Number(row.temperature).toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '7px 12px', color: row.aucausticRMS > 55 ? '#F59E0B' : '#fff' }}>
                        {row.aucausticRMS != null
                          ? Number(row.aucausticRMS).toFixed(3)
                          : '—'}
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        {row.aRMSy != null
                          ? Number(row.aRMSy).toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>
                        Waiting for data…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}