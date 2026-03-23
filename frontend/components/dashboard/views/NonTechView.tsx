'use client';
// components/dashboard/views/NonTechView.tsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/ui';
import { useSocket } from '@/hooks/useSocket';
import type { Machine, Alert } from '@/types';

const statusConfig = {
  normal:   { color: 'var(--green)',  bg: '#ECFDF5', icon: '✓', label: 'Normal'   },
  warning:  { color: 'var(--yellow)', bg: '#FFFBEB', icon: '⚠', label: 'Warning'  },
  critical: { color: 'var(--red)',    bg: '#FEF2F2', icon: '✕', label: 'Critical' },
  offline:  { color: 'var(--g400)',   bg: 'var(--g100)', icon: '—', label: 'Offline' },
};

export default function NonTechView({ activeSection }: { activeSection: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts,   setAlerts]   = useState<Alert[]>([]);
  const { latestTelemetry } = useSocket();

  useEffect(() => {
    Promise.all([api.machines.list(), api.alerts.list()]).then(([m, a]) => {
      setMachines(m); setAlerts(a);
    });
  }, []);

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length;
  const warningCount  = alerts.filter(a => a.severity === 'warning'  && !a.is_resolved).length;
  const normalCount   = machines.length - criticalCount - warningCount;

  if (activeSection === 'overview') return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Today's Plant Status" sub="Simplified overview · Non-Technical View" />

      {/* Big summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>{normalCount}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginTop: 6 }}>Machines Normal</div>
          <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>Operating within limits</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--yellow)', lineHeight: 1 }}>{warningCount}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)', marginTop: 6 }}>Machines in Warning</div>
          <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>Requires attention</div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--red)', lineHeight: 1, animation: criticalCount ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }}>{criticalCount}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginTop: 6 }}>Machines Critical</div>
          <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>Immediate action needed</div>
        </div>
      </div>

      {/* Machine status cards */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g700)', marginBottom: 12 }}>
          Machine Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {machines.map(m => {
            const machineAlerts = alerts.filter(a => a.machine_id === m.id && !a.is_resolved);
            const severity      = machineAlerts.find(a => a.severity === 'critical') ? 'critical'
                                : machineAlerts.find(a => a.severity === 'warning')  ? 'warning'
                                : m.status;
            const cfg = statusConfig[severity as keyof typeof statusConfig] ?? statusConfig.normal;

            return (
              <div key={m.id} className="card" style={{ padding: '16px 18px', borderLeft: `3px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--g800)' }}>{m.machine_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--g400)' }}>{m.location}</div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: cfg.color, fontWeight: 800,
                  }}>
                    {cfg.icon}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px', borderRadius: 99,
                  background: cfg.bg, color: cfg.color,
                  fontSize: 12, fontWeight: 700, textAlign: 'center',
                  display: 'inline-block',
                }}>
                  {cfg.label}
                </div>
                {machineAlerts.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: cfg.color, fontWeight: 500 }}>
                    {machineAlerts.length} alert{machineAlerts.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance summary */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Daily Summary</span>
          <span style={{ fontSize: 11, color: 'var(--g400)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="card-body">
          {[
            { label: 'Machines Online', value: machines.length,  color: 'var(--green)' },
            { label: 'Active Alerts',   value: alerts.filter(a => !a.is_resolved).length, color: 'var(--red)' },
            { label: 'Critical',        value: criticalCount,     color: 'var(--red)'    },
            { label: 'Warnings',        value: warningCount,      color: 'var(--yellow)' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', background: 'var(--g50)', borderRadius: 4,
              border: '1px solid var(--g200)', marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--g700)' }}>{item.label}</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (activeSection === 'compliance') return (
    <div className="animate-fade-up">
      <SectionHeader title="Compliance" sub="Plant compliance overview" />
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--green)' }}>94.2%</div>
        <div style={{ fontSize: 14, color: 'var(--g500)', marginTop: 8 }}>Weekly Compliance Score</div>
        <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 4 }}>↑ 1.8% from last week</div>
      </div>
    </div>
  );

  return null;
}