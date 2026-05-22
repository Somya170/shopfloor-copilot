'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { StatusBadge, LoadingSpinner } from '@/components/ui';
import TelemetryChart from '@/components/charts/TelemetryChart';
import AIChat from '@/components/rag-chat/AIChat';
import { useSocket } from '@/hooks/useSocket';
import AnomalyView from '@/components/dashboard/views/AnomalyView';
import type { Machine, Alert, User } from '@/types';
import { useMQTTData } from '@/hooks/useMQTTData';

const C = {
  card: 'var(--card-bg)', border: 'var(--card-border)',
  g50: 'var(--g50)', g100: 'var(--g100)', g200: 'var(--g200)',
  g400: 'var(--g400)', g500: 'var(--g500)', g700: 'var(--g700)', g900: 'var(--g900)',
  blue: '#3B82F6', red: '#EF4444', green: '#10B981', yellow: '#F59E0B',
  yBlue: '#0057A8', yRed: '#E31837', cyan: '#0EA5E9',
};

// ── Machine Row ───────────────────────────────────────────────
function MachineRow({ machine, liveData, onSelect, selected }: {
  machine: Machine; liveData?: any; onSelect: () => void; selected: boolean;
}) {
  const live = liveData ?? machine;
  const isEdgeAI = machine.machine_name === 'Machine_6';
  const status = live.is_anomaly ? 'warning' : (live.status ?? 'normal');
  const sColor = status === 'critical' ? C.red : status === 'warning' ? C.yellow : C.green;
  const sBg = status === 'critical' ? 'rgba(239,68,68,.12)'
    : status === 'warning' ? 'rgba(245,158,11,.12)'
      : 'rgba(16,185,129,.12)';

  return (
    <div onClick={onSelect} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '11px 16px', cursor: 'pointer',
      borderBottom: '1px solid var(--g100)',
      background: selected ? 'rgba(59,130,246,.1)' : 'transparent',
      transition: 'background .12s',
    }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--g100)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ width: 75 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{machine.machine_name}</div>
        <div style={{ fontSize: 10, color: C.g400 }}>{machine.machine_type}</div>
      </div>
      <div style={{ width: 80, fontSize: 11, color: C.g500 }}>
        {live.temperature != null ? `${Number(live.temperature).toFixed(1)} °C` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: C.g500 }}>
        {live.vibration != null
          ? `${Number(live.vibration).toFixed(3)} mm/s`
          : live.vRMSy != null
            ? `${Number(live.vRMSy).toFixed(3)} mm/s` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: isEdgeAI ? C.g400 : C.g500, fontStyle: isEdgeAI ? 'italic' : 'normal' }}>
        {isEdgeAI ? 'N/A' : live.rpm != null ? `${Number(live.rpm).toFixed(0)} rpm` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: isEdgeAI ? C.g400 : C.g500, fontStyle: isEdgeAI ? 'italic' : 'normal' }}>
        {isEdgeAI ? 'N/A' : live.power_consumption != null ? `${Number(live.power_consumption).toFixed(0)} W` : '—'}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isEdgeAI && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(14,165,233,.15)', color: C.cyan, border: '1px solid rgba(14,165,233,.3)', letterSpacing: .3 }}>
            EDGE AI
          </span>
        )}
        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: sBg, color: sColor }}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ── Machine_6 Chart (MQTT data) ───────────────────────────────
function M6Chart({ data, field, color, label, height = 100 }: {
  data: any[]; field: string; color: string; label: string; height?: number;
}) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.g400, fontSize: 11 }}>
      No data
    </div>
  );

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } =
    require('recharts');

  const chartData = data.slice(-60).map(d => ({
    t: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    v: Number(d[field] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--g100)" />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: C.g400 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: C.g400 }} />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--g200)', fontSize: 11 }}
          formatter={(v: any) => [`${Number(v).toFixed(3)} ${label}`, label]}
        />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Admin View ────────────────────────────────────────────────
export default function AdminView({ activeSection }: { activeSection: string }) {
  const { liveData: m6Live, connected: m6Connected, history: m6History } = useMQTTData();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [tick, setTick] = useState(1);
  const { latestTelemetry } = useSocket();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([api.machines.list(), api.alerts.list()]);
      setMachines(m); setAlerts(a);
      if (m.length && selected === null) setSelected(m[0].id);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    // Machine_6: use MQTT history, not TimescaleDB
    const selMachine = machines.find(m => m.id === selected);
    if (selMachine?.machine_name === 'Machine_6') {
      // history already in m6History from useMQTTData
    } else {
      api.machines.data(selected, 60).then(setHistory).catch(() => { });
    }
  }, [selected, machines]);

  useEffect(() => {
    if (activeSection === 'users') api.admin.users().then(setUsers).catch(() => { });
    if (activeSection === 'reports') api.reports.list().then(setReports).catch(() => { });
  }, [activeSection]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000);
    return () => clearInterval(t);
  }, []);

  // ── Build machines list with live data ───────────────────
  const machinesWithLive = machines.map(m => {
    if (m.machine_name === 'Machine_6' && m6Live) {
      return {
        ...m,
        temperature: m6Live.temperature,
        vibration: m6Live.vRMSy,
        rpm: null,
        power_consumption: null,
        pressure: m6Live.aucausticRMS,
        is_anomaly: false,
        status: m.status,
        vRMSx: m6Live.vRMSx, vRMSy: m6Live.vRMSy, vRMSz: m6Live.vRMSz,
        aRMSx: m6Live.aRMSx, aRMSy: m6Live.aRMSy, aRMSz: m6Live.aRMSz,
        aucausticRMS: m6Live.aucausticRMS,
      };
    }
    return { ...m, ...(latestTelemetry[m.id] ?? {}) };
  });

  const selectedMachine = machinesWithLive.find(m => m.id === selected);
  const isM6Selected = selectedMachine?.machine_name === 'Machine_6';
  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <LoadingSpinner size={22} />
      <span style={{ color: C.g400 }}>Loading dashboard…</span>
    </div>
  );

  // ── OVERVIEW ─────────────────────────────────────────────
  if (activeSection === 'overview') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.g900 }}>Dashboard</div>
        <div style={{ fontSize: 13, color: C.g400, marginTop: 2 }}>
          Real-time shopfloor overview · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* RAG Banner */}
      <div style={{
        background: 'linear-gradient(135deg,#060C1A 0%,#0d1f3c 100%)',
        borderRadius: 10, padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid rgba(59,130,246,.2)', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,.3)' }}>
            <svg width="18" height="18" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Nexfloor Agent Query Engine</span>
              <span style={{ background: C.yBlue, color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3, letterSpacing: .5 }}>CORE FEATURE</span>
            </div>
            <div style={{ color: '#4A6580', fontSize: 12, marginTop: 2 }}>Ask compliance questions · AI-referenced answers</div>
          </div>
        </div>
        <button style={{ background: 'linear-gradient(135deg,#C41230,#E31837)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(227,24,55,.35)' }}>
          Nexfloor Console →
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'TOTAL MACHINES', value: machines.length, sub: '↑ 3 added this week', color: C.blue, glow: 'rgba(59,130,246,.15)' },
          { label: 'MACHINES IN ALERT', value: activeAlerts.length, sub: `↑ ${criticalAlerts.length} since yesterday`, color: C.red, glow: 'rgba(239,68,68,.12)' },
          { label: 'COMPLIANCE SCORE', value: '94.2%', sub: '↑ 1.8% this week', color: C.green, glow: 'rgba(16,185,129,.12)' },
          { label: 'ACTIVE ANOMALIES', value: criticalAlerts.length, sub: `${criticalAlerts.length} pending review`, color: C.yellow, glow: 'rgba(245,158,11,.12)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px', background: `linear-gradient(135deg,var(--card-bg),${s.glow})` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, letterSpacing: .8, textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.g500, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Live stream + Anomalies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g50)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.g500, textTransform: 'uppercase', letterSpacing: .5 }}>Live Sensor Stream</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>Streaming</span>
              </div>
              <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: m6Connected ? 'rgba(14,165,233,.1)' : 'rgba(239,68,68,.1)', color: m6Connected ? C.cyan : C.red, border: `1px solid ${m6Connected ? 'rgba(14,165,233,.3)' : 'rgba(239,68,68,.3)'}`, fontWeight: 600 }}>
                M6 Edge AI: {m6Connected ? '● Connected' : '○ Offline'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '8px 16px', background: 'var(--g50)', borderBottom: `1px solid ${C.border}` }}>
            {['Machine', 'Temperature', 'Vibration', 'RPM', 'Power', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.g400, letterSpacing: .4, textTransform: 'uppercase', width: h === 'Machine' ? 75 : h === 'Status' ? undefined : 80, marginLeft: h === 'Status' ? 'auto' : 0 }}>{h}</div>
            ))}
          </div>
          {machinesWithLive.map(m => (
            <MachineRow key={m.id} machine={m}
              liveData={m.machine_name === 'Machine_6' ? m : (latestTelemetry[m.id] ? { ...m, ...latestTelemetry[m.id] } : m)}
              onSelect={() => { setSelected(m.id); setShowGraph(true); }}
              selected={selected === m.id}
            />
          ))}

          {/* Inline Graph */}
          {showGraph && selected && selectedMachine && (
            <div style={{ borderTop: `2px solid ${C.blue}`, background: 'var(--g50)', animation: 'fade-up .25s ease' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{selectedMachine.machine_name}</span>
                  <span style={{ fontSize: 11, color: C.g400 }}>{selectedMachine.machine_type}</span>
                  <StatusBadge status={selectedMachine.status ?? 'normal'} />
                  {isM6Selected && m6Connected && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(14,165,233,.15)', color: C.cyan, border: '1px solid rgba(14,165,233,.3)' }}>
                      MQTT LIVE
                    </span>
                  )}
                </div>
                <button onClick={() => setShowGraph(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.g400, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>✕</button>
              </div>

              {/* Metric strip */}
              {(
                isM6Selected
                  ? [
                    { label: 'TEMP', v: m6Live?.temperature, u: '°C', c: C.yRed },
                    { label: 'VIBRATION', v: m6Live?.vRMSy, u: 'mm/s', c: C.yellow },
                    { label: 'ACOUSTIC', v: m6Live?.aucausticRMS, u: 'dB', c: C.blue },
                    { label: 'aRMS-Y', v: m6Live?.aRMSy, u: 'g', c: C.cyan },
                  ]
                  : [
                    { label: 'TEMP', v: (selectedMachine as any).temperature, u: '°C', c: C.yRed },
                    { label: 'VIBRATION', v: (selectedMachine as any).vibration, u: 'mm/s', c: C.yellow },
                    { label: 'PRESSURE', v: (selectedMachine as any).pressure, u: 'bar', c: C.blue },
                    { label: 'ENERGY', v: (selectedMachine as any).power_consumption, u: 'W', c: C.green },
                  ]
              ).map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    padding: '12px 16px',
                    borderRight: i < 3 ? `1px solid ${C.border}` : 'none'
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: C.g400,
                      letterSpacing: .8,
                      marginBottom: 2
                    }}
                  >
                    {item.label}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: item.c
                      }}
                    >
                      {item.v != null
                        ? Number(item.v).toFixed(
                          item.label === 'VIBRATION' || item.label === 'aRMS-Y'
                            ? 3
                            : 1
                        )
                        : '—'}
                    </span>

                    <span style={{ fontSize: 10, color: C.g400 }}>
                      {item.u}
                    </span>
                  </div>
                </div>
              ))}
              {/* Charts — Machine_6 uses MQTT history */}
              {isM6Selected ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { field: 'temperature', label: '°C', color: C.yRed, title: 'TEMPERATURE' },
                    { field: 'vRMSy', label: 'mm/s', color: C.yellow, title: 'VIBRATION (vRMSy)' },
                    { field: 'aucausticRMS', label: 'dB', color: C.blue, title: 'ACOUSTIC RMS' },
                    { field: 'aRMSy', label: 'g', color: C.cyan, title: 'ACCELERATION (aRMSy)' },
                  ].map((cfg, i) => (
                    <div key={cfg.field} style={{ padding: '14px 16px', borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{cfg.title}</div>
                      <M6Chart data={m6History} field={cfg.field} color={cfg.color} label={cfg.label} height={100} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {(['temperature', 'vibration', 'rpm', 'power_consumption'] as const).map((metric, i) => (
                    <div key={metric} style={{ padding: '14px 16px', borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{metric.replace('_', ' ')}</div>
                      <TelemetryChart data={history} metric={metric} height={100} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Anomalies */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g50)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.g500, textTransform: 'uppercase', letterSpacing: .5 }}>Active Anomalies</span>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 600, cursor: 'pointer' }}>Investigate</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {activeAlerts.slice(0, 6).map(a => (
              <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--g50)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: a.severity === 'critical' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" fill="none" stroke={a.severity === 'critical' ? C.red : C.yellow} strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.g900 }}>{a.alert_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {a.machine_name}</div>
                    <div style={{ fontSize: 11, color: C.g400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div>
                  </div>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: C.g400, fontSize: 13 }}>✓ No active anomalies</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── MACHINES ─────────────────────────────────────────────
  if (activeSection === 'machines') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.g900 }}>Live Sensor Data</div>
          <div style={{ fontSize: 12, color: C.g400, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            Streaming · Updates every 2 seconds
          </div>
        </div>
        <div style={{ padding: '5px 14px', borderRadius: 99, border: `1px solid ${C.green}`, background: 'rgba(16,185,129,.1)', fontSize: 11, fontWeight: 700, color: C.green, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          LIVE · Tick #{tick}
        </div>
      </div>

      {/* Machine tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {machinesWithLive.map(m => {
          const isAnomaly = latestTelemetry[m.id]?.is_anomaly;
          const dotColor = isAnomaly ? C.red : m.status === 'warning' ? C.yellow : C.green;
          return (
            <button key={m.id} onClick={() => setSelected(m.id)} style={{
              padding: '7px 16px', borderRadius: 99, cursor: 'pointer',
              border: selected === m.id ? `2px solid ${C.blue}` : '1px solid var(--g200)',
              background: selected === m.id ? 'rgba(59,130,246,.12)' : 'transparent',
              fontWeight: 600, fontSize: 12, color: selected === m.id ? C.blue : C.g500,
              display: 'flex', alignItems: 'center', gap: 7, transition: 'all .12s',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', animation: isAnomaly ? 'pulse-dot 1s ease-in-out infinite' : 'none' }} />
              {m.machine_name}
              <span style={{ fontSize: 10, color: C.g400 }}>{m.machine_type?.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {selectedMachine && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.blue }}>{selectedMachine.machine_name}</span>
              <span style={{ fontSize: 11, color: C.g400 }}>{selectedMachine.machine_type} · {selectedMachine.location}</span>
              {isM6Selected && m6Connected && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(14,165,233,.15)', color: C.cyan, border: '1px solid rgba(14,165,233,.3)' }}>MQTT LIVE</span>
              )}
            </div>
            <StatusBadge status={selectedMachine.status ?? 'normal'} />
          </div>

          {/* Metric strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${C.border}` }}>
            {(isM6Selected
              ? [
                { label: 'TEMP', v: m6Live?.temperature, u: '°C', c: C.yRed },
                { label: 'VIBRATION', v: m6Live?.vRMSy, u: 'mm/s', c: C.yellow },
                { label: 'ACOUSTIC', v: m6Live?.aucausticRMS, u: 'dB', c: C.blue },
                { label: 'aRMS-Y', v: m6Live?.aRMSy, u: 'g', c: C.cyan },
              ]
              : [
                { label: 'TEMP', v: (selectedMachine as any).temperature, u: '°C', c: C.yRed },
                { label: 'VIBRATION', v: (selectedMachine as any).vibration, u: 'm/s²', c: C.yellow },
                { label: 'PRESSURE', v: (selectedMachine as any).pressure, u: 'bar', c: C.blue },
                { label: 'ENERGY', v: (selectedMachine as any).power_consumption, u: 'kWh', c: C.green },
              ]
            ).map((item, i) => (
              <div key={item.label} style={{ padding: '16px 20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, letterSpacing: .8, marginBottom: 4 }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: item.c }}>
                    {item.v != null ? Number(item.v).toFixed(item.label === 'VIBRATION' || item.label === 'aRMS-Y' ? 3 : 1) : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: C.g400 }}>{item.u}</span>
                </div>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginTop: 2 }}>NORMAL</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          {isM6Selected ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { field: 'temperature', label: '°C', color: C.yRed, title: 'TEMPERATURE' },
                { field: 'vRMSy', label: 'mm/s', color: C.yellow, title: 'VIBRATION (vRMSy)' },
                { field: 'aucausticRMS', label: 'dB', color: C.blue, title: 'ACOUSTIC RMS' },
                { field: 'aRMSy', label: 'g', color: C.cyan, title: 'ACCELERATION (aRMSy)' },
              ].map((cfg, i) => (
                <div key={cfg.field} style={{ padding: '16px 20px', borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{cfg.title}</div>
                  <M6Chart data={m6History} field={cfg.field} color={cfg.color} label={cfg.label} height={120} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {(['temperature', 'vibration', 'rpm', 'power_consumption'] as const).map((metric, i) => (
                <div key={metric} style={{ padding: '16px 20px', borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.g400, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{metric.replace('_', ' ')}</div>
                  <TelemetryChart data={history} metric={metric} height={120} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── AI ────────────────────────────────────────────────────
  if (activeSection === 'ai') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.g900 }}>Nexfloor Agent</div>
        <div style={{ fontSize: 12, color: C.g400, marginTop: 2 }}>AI-powered compliance queries with real-time factory data</div>
      </div>
      <div className="card" style={{ flex: 1 }}><AIChat /></div>
    </div>
  );

  if (activeSection === 'alerts') return <AnomalyView />;

  // ── REPORTS ───────────────────────────────────────────────
  if (activeSection === 'reports') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.g900 }}>Reports</div>
        <div style={{ fontSize: 12, color: C.g400, marginTop: 2 }}>Generate PDF or Excel reports for any machine</div>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.g900, marginBottom: 16 }}>Generate New Report</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          {[
            { id: 'report-machine', label: 'Machine', options: machines.map(m => ({ value: String(m.id), label: `${m.machine_name} — ${m.machine_type}` })) },
            { id: 'report-type', label: 'Report Type', options: [{ value: 'weekly', label: 'Weekly (Last 7 days)' }, { value: 'monthly', label: 'Monthly (Last 30 days)' }] },
            { id: 'report-format', label: 'Format', options: [{ value: 'pdf', label: '📄 PDF Report' }, { value: 'excel', label: '📊 Excel Spreadsheet' }] },
          ].map(field => (
            <div key={field.id}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.g500, letterSpacing: .5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{field.label}</label>
              <select id={field.id} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 13 }}>
                {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={async () => {
            const machineId = (document.getElementById('report-machine') as HTMLSelectElement).value;
            const reportType = (document.getElementById('report-type') as HTMLSelectElement).value;
            const format = (document.getElementById('report-format') as HTMLSelectElement).value;
            const token = localStorage.getItem('access_token');
            try {
              const res = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ machine_id: parseInt(machineId), report_type: reportType, format }),
              });
              if (!res.ok) throw new Error('Failed');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Machine_${machineId}_${reportType}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
              a.click(); window.URL.revokeObjectURL(url);
              api.reports.list().then(setReports).catch(() => { });
            } catch (err: any) { alert('Report generation failed: ' + err.message); }
          }} style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#C41230,#E31837)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(227,24,55,.3)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download Report
          </button>
          <button onClick={() => api.reports.list().then(setReports).catch(() => { })} style={{ padding: '10px 16px', borderRadius: 6, border: `1px solid ${C.g200}`, background: 'transparent', color: C.g500, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Refresh List
          </button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.g900, marginBottom: 12 }}>Previously Generated Reports</div>
        {reports.length === 0
          ? <div className="card" style={{ padding: 32, textAlign: 'center', color: C.g400 }}>No reports generated yet!</div>
          : <div className="card" style={{ overflow: 'hidden' }}>
            {reports.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" fill="none" stroke={C.blue} strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.g900 }}>{r.title ?? 'Report'}</div>
                  <div style={{ fontSize: 11, color: C.g400, marginTop: 2 }}>{r.report_type?.toUpperCase()} · {r.generated_at ? new Date(r.generated_at).toLocaleString() : ''}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(59,130,246,.12)', color: C.blue, fontSize: 10, fontWeight: 600 }}>{r.report_type?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );

  // ── USERS ─────────────────────────────────────────────────
  if (activeSection === 'users') return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.g900 }}>Settings</div>
        <div style={{ fontSize: 12, color: C.g400, marginTop: 2 }}>Manage platform users</div>
      </div>
      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--g50)' }}>
              {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: C.g500, letterSpacing: .4, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '11px 16px', fontWeight: 600, fontSize: 13, color: C.g900 }}>{u.name}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: C.g500 }}>{u.email}</td>
                <td style={{ padding: '11px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(59,130,246,.12)', color: C.blue, fontSize: 11, fontWeight: 600 }}>{u.role.replace('_', ' ')}</span></td>
                <td style={{ padding: '11px 16px' }}><StatusBadge status={(u as any).is_active ? 'normal' : 'offline'} /></td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: C.g400 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                <td style={{ padding: '11px 16px' }}>
                  <button onClick={() => api.admin.toggleUser(u.id).then(() => api.admin.users().then(setUsers))} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.g200}`, background: 'transparent', cursor: 'pointer', fontSize: 11, color: (u as any).is_active ? C.red : C.green, fontWeight: 600 }}>
                    {(u as any).is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return null;
}