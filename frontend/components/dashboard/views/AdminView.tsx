'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { StatCard, StatusBadge, LiveBadge, SectionHeader, LoadingSpinner } from '@/components/ui';
import TelemetryChart from '@/components/charts/TelemetryChart';
import AIChat from '@/components/rag-chat/AIChat';
import { useSocket } from '@/hooks/useSocket';
import AnomalyView from '@/components/dashboard/views/AnomalyView';
import type { Machine, Alert, User } from '@/types';

// ── Machine Row (Live Sensor Stream style) ───────────────────
function MachineRow({ machine, liveData, onSelect, selected }: {
  machine: Machine; liveData?: any; onSelect: () => void; selected: boolean;
}) {
  const live = liveData ?? machine;
  const status = live.is_anomaly ? 'warning' : (live.status ?? 'normal');
  const statusColor = status === 'critical' ? '#DC2626' : status === 'warning' ? '#D97706' : '#059669';

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 16px', cursor: 'pointer',
        borderBottom: '1px solid #F1F5F9',
        background: selected ? '#EFF6FF' : '#fff',
        transition: 'background .12s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
    >
      <div style={{ width: 70 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0057A8' }}>{machine.machine_name}</div>
        <div style={{ fontSize: 10, color: '#94A3B8' }}>{machine.machine_type}</div>
      </div>
      <div style={{ width: 80, fontSize: 11, color: '#64748B' }}>
        {live.temperature != null ? `${Number(live.temperature).toFixed(1)} °C` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: '#64748B' }}>
        {live.vibration != null ? `${Number(live.vibration).toFixed(3)} mm/s` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: '#64748B' }}>
        {live.rpm != null ? `${Number(live.rpm).toFixed(0)} rpm` : '—'}
      </div>
      <div style={{ width: 80, fontSize: 11, color: '#64748B' }}>
        {live.power_consumption != null ? `${Number(live.power_consumption).toFixed(0)} W` : '—'}
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <span style={{
          padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: status === 'critical' ? '#FEF2F2' : status === 'warning' ? '#FFFBEB' : '#ECFDF5',
          color: statusColor,
        }}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ── Main Admin View ──────────────────────────────────────────
export default function AdminView({ activeSection }: { activeSection: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts,   setAlerts]   = useState<Alert[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [reports,  setReports]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [history,  setHistory]  = useState<any[]>([]);
  const [tick,     setTick]     = useState(1);
  const { connected, latestTelemetry, latestAlert } = useSocket();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([api.machines.list(), api.alerts.list()]);
      setMachines(m); setAlerts(a);
      if (m.length && !selected) setSelected(m[0].id);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selected) api.machines.data(selected, 60).then(setHistory).catch(() => {});
  }, [selected]);

  useEffect(() => {
    if (activeSection === 'users') api.admin.users().then(setUsers).catch(() => {});
    if (activeSection === 'reports') api.reports.list().then(setReports).catch(() => {});
  }, [activeSection]);

  // tick counter for live indicator
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const machinesWithLive = machines.map(m => ({
    ...m, ...(latestTelemetry[m.id] ?? {}),
  }));

  const selectedMachine = machinesWithLive.find(m => m.id === selected);
  const activeAlerts    = alerts.filter(a => !a.is_resolved);
  const criticalAlerts  = activeAlerts.filter(a => a.severity === 'critical');

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <LoadingSpinner size={22} />
      <span style={{ color: '#94A3B8' }}>Loading dashboard…</span>
    </div>
  );

  // ── OVERVIEW (Dashboard) ───────────────────────────────────
  if (activeSection === 'overview') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page title */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Admin Dashboard</div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
          Real-time shopfloor overview · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* RAG banner */}
      <div style={{
        background: 'linear-gradient(135deg, #060C1A 0%, #0d1f3c 100%)',
        borderRadius: 10, padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid rgba(0,87,168,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'rgba(0,87,168,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>RAG Compliance Query Engine</span>
              <span style={{
                background: '#0057A8', color: '#fff', fontSize: 9,
                fontWeight: 800, padding: '2px 6px', borderRadius: 3, letterSpacing: .5,
              }}>CORE FEATURE</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
              Ask compliance questions · AI-referenced answers
            </div>
          </div>
        </div>
        <button
          onClick={() => {}}
          style={{
            background: '#E31837', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontWeight: 700,
            fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Open RAG Console →
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'TOTAL MACHINES',   value: machines.length,        sub: '↑ 3 added this week',     color: '#0057A8' },
          { label: 'MACHINES IN ALERT',value: activeAlerts.length,    sub: `↑ ${criticalAlerts.length} since yesterday`, color: '#DC2626' },
          { label: 'COMPLIANCE SCORE', value: '94.2%',                sub: '↑ 1.8% this week',        color: '#059669' },
          { label: 'ACTIVE ANOMALIES', value: criticalAlerts.length,  sub: `${criticalAlerts.length} pending review`, color: '#D97706' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Live sensor stream + Active anomalies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* Live sensor stream */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: .5 }}>
              Live Sensor Stream
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>Streaming</span>
            </div>
          </div>
          {/* Column headers */}
          <div style={{
            display: 'flex', gap: 16, padding: '8px 16px',
            background: '#F8FAFC', borderBottom: '1px solid #F1F5F9',
          }}>
            {['Machine', 'Temperature', 'Vibration', 'RPM', 'Power', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: .4, textTransform: 'uppercase', width: h === 'Machine' ? 70 : h === 'Status' ? undefined : 80, marginLeft: h === 'Status' ? 'auto' : 0 }}>
                {h}
              </div>
            ))}
          </div>
          {machinesWithLive.map(m => (
            <MachineRow
              key={m.id} machine={m}
              liveData={latestTelemetry[m.id] ? { ...m, ...latestTelemetry[m.id] } : m}
              onSelect={() => setSelected(m.id)}
              selected={selected === m.id}
            />
          ))}
        </div>

        {/* Active anomalies */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: .5 }}>
              Active Anomalies
            </span>
            <span style={{ fontSize: 11, color: '#0057A8', fontWeight: 600, cursor: 'pointer' }}>
              Investigate
            </span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {activeAlerts.slice(0, 6).map(a => (
              <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: a.severity === 'critical' ? '#FEF2F2' : '#FFFBEB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="13" height="13" fill="none" stroke={a.severity === 'critical' ? '#DC2626' : '#D97706'} strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                      {a.alert_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {a.machine_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                ✓ No active anomalies
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── LIVE DATA (Machines) ───────────────────────────────────
  if (activeSection === 'machines') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Live Sensor Data</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            Streaming · Updates every 2 seconds
          </div>
        </div>
        <div style={{
          padding: '5px 14px', borderRadius: 99, border: '1px solid #059669',
          background: '#ECFDF5', fontSize: 11, fontWeight: 700, color: '#059669',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
          LIVE · Tick #{tick}
        </div>
      </div>

      {/* Machine tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {machinesWithLive.map(m => {
          const live = latestTelemetry[m.id];
          const isAnomaly = live?.is_anomaly;
          const dotColor = isAnomaly ? '#DC2626' : m.status === 'warning' ? '#D97706' : '#059669';
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                padding: '7px 16px', borderRadius: 99, cursor: 'pointer',
                border: selected === m.id ? '2px solid #0057A8' : '1px solid #E2E8F0',
                background: selected === m.id ? '#EFF6FF' : '#fff',
                fontWeight: 600, fontSize: 12,
                color: selected === m.id ? '#0057A8' : '#64748B',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: dotColor,
                display: 'inline-block',
                animation: isAnomaly ? 'pulse-dot 1s ease-in-out infinite' : 'none',
              }} />
              {m.machine_name}
              <span style={{ fontSize: 10, color: '#94A3B8' }}>{m.machine_type?.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Selected machine detail */}
      {selectedMachine && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0057A8' }}>{selectedMachine.machine_name}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{selectedMachine.machine_type} · {selectedMachine.location}</span>
              </div>
            </div>
            <StatusBadge status={selectedMachine.status ?? 'normal'} />
          </div>

          {/* Live metric boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid #F1F5F9' }}>
            {[
              { label: 'TEMP',      v: (selectedMachine as any).temperature,       u: '°C',   c: '#E31837' },
              { label: 'VIBRATION', v: (selectedMachine as any).vibration,         u: 'm/s²', c: '#D97706' },
              { label: 'PRESSURE',  v: (selectedMachine as any).pressure,          u: 'bar',  c: '#0057A8' },
              { label: 'ENERGY',    v: (selectedMachine as any).power_consumption, u: 'kWh',  c: '#059669' },
            ].map((m, i) => (
              <div key={m.label} style={{
                padding: '16px 20px', textAlign: 'left',
                borderRight: i < 3 ? '1px solid #F1F5F9' : 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: .8, marginBottom: 4 }}>{m.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: m.c }}>
                    {m.v != null ? Number(m.v).toFixed(m.label === 'VIBRATION' ? 2 : 1) : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{m.u}</span>
                </div>
                <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginTop: 2 }}>NORMAL</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {(['temperature', 'vibration', 'rpm', 'power_consumption'] as const).map((metric, i) => (
              <div key={metric} style={{
                padding: '16px 20px',
                borderRight: i % 2 === 0 ? '1px solid #F1F5F9' : 'none',
                borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  {metric.replace('_', ' ')}
                </div>
                <TelemetryChart data={history} metric={metric} height={120} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── RAG COMPLIANCE (AI) ────────────────────────────────────
  if (activeSection === 'ai') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>RAG Compliance</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>AI-powered compliance queries with real-time factory data</div>
      </div>
      <div className="card" style={{ flex: 1 }}><AIChat /></div>
    </div>
  );

  // ── ANOMALY INVESTIGATION ─────────────────────────────────
    if (activeSection === 'alerts') return <AnomalyView />;

  // ── REPORTS ────────────────────────────────────────────────
  if (activeSection === 'reports') return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Reports</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Machine performance reports</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {machines.map(m => (
          <button
            key={m.id}
            onClick={async () => {
              const r = await api.reports.generate({ report_type: 'weekly', machine_id: m.id });
              setReports(p => [r, ...p]);
            }}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #E2E8F0',
              background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569',
            }}
          >
            {m.machine_name} Weekly
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map((r, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 8 }}>{r.title ?? 'Report'}</div>
            {r.ai_summary && <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{r.ai_summary}</div>}
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
            Click a button above to generate a report
          </div>
        )}
      </div>
    </div>
  );

  // ── SETTINGS (User Management) ─────────────────────────────
  if (activeSection === 'users') return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Settings</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Manage platform users</div>
      </div>
      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#64748B', letterSpacing: .4, textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '11px 16px', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{u.name}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748B' }}>{u.email}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, background: '#EFF6FF', color: '#0057A8', fontSize: 11, fontWeight: 600 }}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <StatusBadge status={(u as any).is_active ? 'normal' : 'offline'} />
                </td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: '#94A3B8' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <button
                    onClick={() => api.admin.toggleUser(u.id).then(() => api.admin.users().then(setUsers))}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0',
                      background: 'transparent', cursor: 'pointer', fontSize: 11,
                      color: (u as any).is_active ? '#DC2626' : '#059669', fontWeight: 600,
                    }}
                  >
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