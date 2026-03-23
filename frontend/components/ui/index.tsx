'use client';
// components/ui/index.tsx — reusable UI primitives

import type { MachineStatus, AlertSeverity } from '@/types';

// ── StatusBadge ──────────────────────────────────────────────
export function StatusBadge({ status }: { status: MachineStatus | AlertSeverity | string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    normal:   { cls: 'badge-normal',   dot: 'dot-green',  label: 'Normal'   },
    warning:  { cls: 'badge-warning',  dot: 'dot-yellow', label: 'Warning'  },
    critical: { cls: 'badge-critical', dot: 'dot-red',    label: 'Critical' },
    offline:  { cls: 'badge-offline',  dot: 'dot-gray',   label: 'Offline'  },
    info:     { cls: 'badge-info',     dot: 'dot-green',  label: 'Info'     },
  };
  const cfg = map[status] ?? { cls: 'badge-offline', dot: 'dot-gray', label: status };
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className={`dot ${cfg.dot}`} style={{ width: 6, height: 6 }} />
      {cfg.label}
    </span>
  );
}

// ── StatCard ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'flat';
}

export function StatCard({ label, value, sub, icon, color = 'var(--yash-blue)', trend }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--g400)', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>{sub}</div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LoadingSpinner ────────────────────────────────────────────
export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="var(--yash-blue)" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── LiveBadge ────────────────────────────────────────────────
export function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 99,
      background: connected ? 'rgba(5,150,105,.1)' : 'var(--g100)',
      border: `1px solid ${connected ? 'rgba(5,150,105,.2)' : 'var(--g200)'}`,
    }}>
      <span className={`dot ${connected ? 'dot-green' : 'dot-gray'}`}
        style={{ width: 6, height: 6, animation: connected ? 'pulse-dot 1s ease-in-out infinite' : 'none' }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: connected ? 'var(--green)' : 'var(--g400)', letterSpacing: .3 }}>
        {connected ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────
export function SectionHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--g800)', letterSpacing: -.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}