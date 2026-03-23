'use client';
// app/signup/page.tsx
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tech_staff' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.role);
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 6, padding: '10px 14px',
    color: '#fff', fontSize: 13, outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'var(--g400)', fontSize: 11,
    fontWeight: 600, letterSpacing: .5, marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--yash-navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,87,168,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,87,168,.08) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--g400)', fontSize: 13, marginTop: 6 }}>
            Join the Factory AI Monitoring Platform
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 10, padding: 32, backdropFilter: 'blur(12px)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.3)',
              borderRadius: 6, padding: '10px 14px', marginBottom: 18,
              color: '#FCA5A5', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <input type="text" required value={form.name} onChange={set('name')}
                placeholder="Jane Smith" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--yash-blue)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,.12)'} />
            </div>

            <div>
              <label style={labelStyle}>EMAIL ADDRESS</label>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="jane@factory.ai" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--yash-blue)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,.12)'} />
            </div>

            <div>
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" required value={form.password} onChange={set('password')}
                placeholder="Min 8 characters" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--yash-blue)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,.12)'} />
            </div>

            <div>
              <label style={labelStyle}>ROLE</label>
              <select value={form.role} onChange={set('role')}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="tech_staff">Tech Staff</option>
                <option value="non_tech_staff">Non-Technical Staff</option>
              </select>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 8, background: loading ? 'var(--g600)' : 'var(--yash-blue)',
              color: '#fff', border: 'none', borderRadius: 6, padding: '12px 0',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--g500)', fontSize: 12, marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--yash-blue)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}