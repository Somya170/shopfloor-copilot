'use client';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';

type Role = 'admin' | 'tech_staff' | 'non_tech_staff';

const ROLE_LABELS: Record<Role, string> = {
  admin:          'Admin',
  tech_staff:     'Technical Staff',
  non_tech_staff: 'Non-Technical',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState<Role>('admin');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans, sans-serif)' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #060C1A 0%, #0a1628 50%, #0d1f3c 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,87,168,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,87,168,.06) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,87,168,.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 520 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 99,
            border: '1px solid rgba(0,87,168,.4)',
            background: 'rgba(0,87,168,.1)',
            marginBottom: 32,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0057A8', display: 'inline-block' }} />
            <span style={{ color: '#60A5FA', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
              INDUSTRIAL IOT · COMPLIANCE PLATFORM
            </span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            <span style={{ color: '#0057A8' }}>Shopfloor</span>
            <br />
            <span style={{ color: '#fff' }}>Copilot</span>
          </h1>

          <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.7, marginBottom: 40, maxWidth: 400 }}>
            RAG-powered compliance queries, real-time machine monitoring, and anomaly detection — built for Industry 4.0 shopfloors.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['RAG Compliance AI', 'Live Sensor Streams', 'Anomaly Detection', 'Vector DB Powered'].map(f => (
              <span key={f} style={{
                padding: '7px 14px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,.1)',
                background: 'rgba(255,255,255,.04)',
                color: '#CBD5E1', fontSize: 12, fontWeight: 500,
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width: 480, background: '#fff',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
      }}>
        {/* YASH Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{
              background: '#0057A8', borderRadius: 6,
              padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: .5 }}>YASH</span>
            </div>
            <span style={{ color: '#64748B', fontSize: 12 }}>Technologies</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: '#64748B', fontSize: 14 }}>Sign in to Shopfloor Copilot</p>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: .8, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Select Role
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
            {(['admin', 'tech_staff', 'non_tech_staff'] as Role[]).map((r, i) => (
              <div
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '11px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  borderTop: i > 0 ? '1px solid #E2E8F0' : 'none',
                  background: role === r ? '#0F172A' : '#fff',
                  color: role === r ? '#fff' : '#475569',
                  transition: 'all .15s',
                }}
              >
                {ROLE_LABELS[r]}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 6, padding: '10px 14px', marginBottom: 16,
            color: '#DC2626', fontSize: 13,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: .8, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yashtech.com"
              style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid #E2E8F0', borderRadius: 8,
                fontSize: 14, outline: 'none', color: '#0F172A',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0057A8'}
              onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: .8, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid #E2E8F0', borderRadius: 8,
                fontSize: 14, outline: 'none', color: '#0F172A',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0057A8'}
              onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Test credentials */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 6, padding: '10px 14px', fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>Test credentials:</div>
            <div style={{ color: '#3B82F6' }}>Admin: admin@factory.ai / Admin@1234</div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              background: loading ? '#94A3B8' : '#E31837',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '13px 0', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: .3, marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 32 }}>
          Shopfloor Copilot v1.0 · © 2025 Yash Technologies
        </p>
      </div>
    </div>
  );
}