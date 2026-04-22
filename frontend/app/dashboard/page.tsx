'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/dashboard/Sidebar';
import AdminView   from '@/components/dashboard/views/AdminView';
import TechView    from '@/components/dashboard/views/TechView';
import NonTechView from '@/components/dashboard/views/NonTechView';
import { LoadingSpinner } from '@/components/ui';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [section,     setSection]     = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Default DARK — kyunki theme hi dark hai ab
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Start dark by default
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 12,
      background: '#0D1B2A', color: '#6B87A8',
    }}>
      <LoadingSpinner size={24} />
      <span>Loading platform…</span>
    </div>
  );

  const DashView = user.role === 'admin'
    ? AdminView
    : user.role === 'tech_staff'
    ? TechView
    : NonTechView;

  const topTabs =
    user.role === 'non_tech_staff'
      ? [{ key: 'overview', label: 'Overview' }, { key: 'compliance', label: 'Compliance' }]
      : [
          { key: 'overview', label: 'Live Data' },
          { key: 'ai',       label: 'Nexfloor Agent' },
        ];

  const isDark = darkMode;
  const navBg     = isDark ? '#111C2D' : '#ffffff';
  const navBorder = isDark ? '#1E2D40' : '#E2E8F0';
  const textMain  = isDark ? '#E2E8F0' : '#0F172A';
  const textMuted = isDark ? '#4A6580' : '#94A3B8';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--body-bg)' }}>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 300,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
      }}>
        <Sidebar
          active={section}
          onNav={key => { setSection(key); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top Navbar */}
        <header style={{
          height: 56,
          background: navBg,
          borderBottom: `1px solid ${navBorder}`,
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16,
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,.3)',
          transition: 'background .2s',
        }}>

          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 6,
              color: isDark ? '#6B87A8' : '#475569',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/yash-logo.png" alt="Yash" style={{ height: 30, width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: textMain, letterSpacing: .5 }}>EDGEAI</span>
          </div>

          {/* Center Tabs */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {topTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSection(tab.key)}
                style={{
                  padding: '8px 20px', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: 'transparent',
                  color: section === tab.key ? '#3B82F6' : textMuted,
                  display: 'flex', alignItems: 'center', gap: 7,
                  borderBottom: section === tab.key ? '2px solid #E31837' : '2px solid transparent',
                  borderRadius: 0, transition: 'all .15s',
                }}
              >
                {tab.key === 'overview' && (
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                )}
                {tab.key === 'ai' && (
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                )}
                {tab.label}
                {tab.key === 'ai' && (
                  <span style={{
                    background: '#0057A8', color: '#fff',
                    fontSize: 9, fontWeight: 800, padding: '1px 5px',
                    borderRadius: 3, letterSpacing: .5,
                  }}>AI</span>
                )}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>Live</span>
            </div>
            <span style={{ fontSize: 11, color: textMuted }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0057A8, #3B82F6)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,87,168,.4)',
            }}>
              {user.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: textMain }}>{user.name}</div>
              <div style={{ fontSize: 10, color: textMuted }}>
                {user.role === 'admin' ? 'Admin' : user.role === 'tech_staff' ? 'Tech Staff' : 'Staff'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <DashView activeSection={section} />
        </main>
      </div>
    </div>
  );
}