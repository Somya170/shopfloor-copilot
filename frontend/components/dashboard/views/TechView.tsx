'use client';
// components/dashboard/views/TechView.tsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatCard, StatusBadge, LiveBadge, SectionHeader } from '@/components/ui';
import TelemetryChart from '@/components/charts/TelemetryChart';
import AIChat from '@/components/rag-chat/AIChat';
import { useSocket } from '@/hooks/useSocket';
import type { Machine, Alert } from '@/types';

export default function TechView({ activeSection }: { activeSection: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts,   setAlerts]   = useState<Alert[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history,  setHistory]  = useState<any[]>([]);
  const { connected, latestTelemetry } = useSocket();

  useEffect(() => {
    Promise.all([api.machines.list(), api.alerts.list()]).then(([m, a]) => {
      setMachines(m); setAlerts(a);
      if (m.length) setSelected(m[0].id);
    });
  }, []);

  useEffect(() => {
    if (selected) api.machines.data(selected, 80).then(setHistory).catch(() => {});
  }, [selected]);

  const selectedMachine = machines.find(m => m.id === selected);
  const live = selected && latestTelemetry[selected] ? latestTelemetry[selected] : selectedMachine;

  if (activeSection === 'overview') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionHeader
        title="Tech Dashboard"
        sub="Machine health and telemetry monitoring"
        right={<LiveBadge connected={connected} />}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard label="Machines"      value={machines.length}                                   color="var(--yash-blue)" />
        <StatCard label="Active Alerts" value={alerts.filter(a => !a.is_resolved).length}         color="var(--yellow)" />
        <StatCard label="Critical"      value={alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length} color="var(--red)" />
      </div>

      {/* Machine selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {machines.map(m => {
          const liveStatus = latestTelemetry[m.id]?.is_anomaly ? 'warning' : m.status;
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                border: selected === m.id ? '2px solid var(--yash-blue)' : '1px solid var(--g200)',
                background: selected === m.id ? 'var(--acc-lt)' : '#fff',
                fontWeight: 600, fontSize: 12,
                color: selected === m.id ? 'var(--yash-blue)' : 'var(--g700)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: liveStatus === 'critical' ? 'var(--red)' : liveStatus === 'warning' ? 'var(--yellow)' : 'var(--green)',
                display: 'inline-block',
                animation: liveStatus === 'critical' ? 'pulse-dot 1s ease-in-out infinite' : 'none',
              }} />
              {m.machine_name}
            </button>
          );
        })}
      </div>

      {/* Live metrics for selected machine */}
      {selectedMachine && live && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">{selectedMachine.machine_name}</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--g400)' }}>{selectedMachine.location}</span>
            </div>
            <StatusBadge status={selectedMachine.status} />
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Temperature', v: (live as any).temperature,       u: '°C',   c: '#E31837' },
                { label: 'Vibration',   v: (live as any).vibration,         u: 'mm/s', c: '#D97706' },
                { label: 'RPM',         v: (live as any).rpm,               u: 'rpm',  c: '#0057A8' },
                { label: 'Power',       v: (live as any).power_consumption, u: 'W',    c: '#059669' },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '12px', background: 'var(--g50)', borderRadius: 6,
                  border: '1px solid var(--g200)', textAlign: 'center',
                }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: m.c }}>
                    {m.v != null ? Number(m.v).toFixed(m.label === 'Vibration' ? 3 : 1) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--g500)', fontWeight: 600, letterSpacing: .3 }}>{m.label} ({m.u})</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {(['temperature', 'vibration', 'rpm', 'power_consumption'] as const).map(metric => (
                <div key={metric}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>
                    {metric.replace('_', ' ')}
                  </div>
                  <TelemetryChart data={history} metric={metric} height={130} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Active Alerts</span>
        </div>
        <div style={{ padding: 0 }}>
          {alerts.filter(a => !a.is_resolved).slice(0, 10).map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px', borderBottom: '1px solid var(--g100)',
            }}>
              <StatusBadge status={a.severity} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{a.machine_name}</div>
                <div style={{ fontSize: 11, color: 'var(--g500)' }}>{a.message}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--g400)' }}>
                {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button onClick={() => api.alerts.resolve(a.id).then(() => api.alerts.list().then(setAlerts))}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--g200)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--g500)' }}>
                Resolve
              </button>
            </div>
          ))}
          {alerts.filter(a => !a.is_resolved).length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--g400)' }}>✓ No active alerts</div>
          )}
        </div>
      </div>
    </div>
  );

  if (activeSection === 'ai') return (
    <div className="animate-fade-up">
      <SectionHeader title="AI Assistant" sub="Ask about machines and maintenance" />
      <div className="card"><AIChat /></div>
    </div>
  );

  if (activeSection === 'alerts') return (
    <div className="animate-fade-up">
      <SectionHeader title="Alerts" sub="All machine alerts" />
      <div className="card">
        {alerts.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--g100)' }}>
            <StatusBadge status={a.severity} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{a.machine_name}</div>
              <div style={{ fontSize: 11, color: 'var(--g500)' }}>{a.message}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--g400)' }}>{new Date(a.timestamp).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}