'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

interface MachineStat {
  machine_id: number;
  machine_name: string;
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  active_count: number;
  last_alert: string | null;
}

interface AlertItem {
  id: number;
  machine_id: number;
  machine_name: string;
  alert_type: string;
  message: string;
  severity: string;
  is_resolved: boolean;
  timestamp: string;
  anomaly_score?: number;
}

interface SeverityCounts {
  total: number;
  active_critical: number;
  active_warning: number;
  resolved: number;
}

export default function AnomalyView() {
  const [machineStats,    setMachineStats]    = useState<MachineStat[]>([]);
  const [recentAlerts,    setRecentAlerts]    = useState<AlertItem[]>([]);
  const [severityCounts,  setSeverityCounts]  = useState<SeverityCounts | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState<'all' | 'critical' | 'warning' | 'resolved'>('all');
  const { latestAlert } = useSocket();

  const load = useCallback(async () => {
    try {
      const data = await (api as any).anomaly.stats();
      setMachineStats(data.machine_stats ?? []);
      setRecentAlerts(data.recent_alerts ?? []);
      setSeverityCounts(data.severity_counts ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto reload when new alert comes via WebSocket
  useEffect(() => {
    if (latestAlert) load();
  }, [latestAlert]);

  const filteredAlerts = recentAlerts.filter(a => {
    if (filter === 'all')      return !a.is_resolved;
    if (filter === 'critical') return a.severity === 'critical' && !a.is_resolved;
    if (filter === 'warning')  return a.severity === 'warning'  && !a.is_resolved;
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  const resolveAlert = async (id: number) => {
    await api.alerts.resolve(id);
    load();
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #0057A8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#94A3B8' }}>Loading anomaly data…</span>
    </div>
  );

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Anomaly Detection</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            Real-time machine anomaly monitoring · Isolation Forest ML
          </div>
        </div>
        <button onClick={load} style={{
          padding: '7px 16px', borderRadius: 6, border: '1px solid #E2E8F0',
          background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          color: '#475569', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-4.55"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Severity stat cards */}
      {severityCounts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'TOTAL ALERTS',    value: severityCounts.total,           color: '#0057A8', bg: '#EFF6FF' },
            { label: 'ACTIVE CRITICAL', value: severityCounts.active_critical,  color: '#DC2626', bg: '#FEF2F2' },
            { label: 'ACTIVE WARNING',  value: severityCounts.active_warning,   color: '#D97706', bg: '#FFFBEB' },
            { label: 'RESOLVED',        value: severityCounts.resolved,         color: '#059669', bg: '#ECFDF5' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 20px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Machine anomaly heatmap */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: .5 }}>
            Machine Anomaly Score
          </span>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {machineStats.map(m => {
            const maxAlerts = Math.max(...machineStats.map(x => x.total_alerts), 1);
            const pct       = (m.total_alerts / maxAlerts) * 100;
            const barColor  = m.active_count > 0
              ? (m.critical_count > 0 ? '#DC2626' : '#D97706')
              : '#059669';

            return (
              <div key={m.machine_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Machine name */}
                <div style={{ width: 100, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{m.machine_name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {m.active_count > 0 ? `${m.active_count} active` : 'All clear'}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: barColor, borderRadius: 99,
                    transition: 'width .5s ease',
                    animation: m.active_count > 0 && m.critical_count > 0
                      ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
                  }} />
                </div>

                {/* Counts */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {m.critical_count > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', fontSize: 10, fontWeight: 700 }}>
                      {m.critical_count} critical
                    </span>
                  )}
                  {m.warning_count > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', fontSize: 10, fontWeight: 700 }}>
                      {m.warning_count} warning
                    </span>
                  )}
                  {m.active_count === 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: '#ECFDF5', color: '#059669', fontSize: 10, fontWeight: 700 }}>
                      ✓ Normal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert feed */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: .5 }}>
            Alert Feed
          </span>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'critical', 'warning', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: filter === f ? '#0F172A' : 'transparent',
                  color: filter === f ? '#fff' : '#94A3B8',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filteredAlerts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
              ✓ No alerts in this category
            </div>
          ) : (
            filteredAlerts.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 18px', borderBottom: '1px solid #F8FAFC',
                background: a.severity === 'critical' && !a.is_resolved ? '#FFFAFA' : '#fff',
              }}>
                {/* Severity icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: a.is_resolved ? '#ECFDF5'
                    : a.severity === 'critical' ? '#FEF2F2' : '#FFFBEB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {a.is_resolved ? (
                    <svg width="14" height="14" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" fill="none" stroke={a.severity === 'critical' ? '#DC2626' : '#D97706'} strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {a.machine_name}
                    </span>
                    <span style={{
                      padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      background: a.is_resolved ? '#ECFDF5'
                        : a.severity === 'critical' ? '#FEF2F2' : '#FFFBEB',
                      color: a.is_resolved ? '#059669'
                        : a.severity === 'critical' ? '#DC2626' : '#D97706',
                    }}>
                      {a.is_resolved ? 'RESOLVED' : a.severity.toUpperCase()}
                    </span>
                    {a.anomaly_score != null && a.anomaly_score > 0 && (
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        Score: {Number(a.anomaly_score).toFixed(3)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 3 }}>{a.message}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {new Date(a.timestamp).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Resolve button */}
                {!a.is_resolved && (
                  <button
                    onClick={() => resolveAlert(a.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, flexShrink: 0,
                      background: '#EFF6FF', border: '1px solid #BFDBFE',
                      color: '#0057A8', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}