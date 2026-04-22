'use client';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types';

const icons = {
  overview:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  machines:   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  alerts:     <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ai:         <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  reports:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  users:      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  compliance: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
};

type NavItem = { key: string; label: string; icon: keyof typeof icons; roles: UserRole[] };

const NAV: NavItem[] = [
  { key: 'overview',   label: 'Overview',       icon: 'overview',   roles: ['admin','tech_staff','non_tech_staff'] },
  { key: 'machines',   label: 'Machines',       icon: 'machines',   roles: ['admin','tech_staff'] },
  { key: 'alerts',     label: 'Alerts',         icon: 'alerts',     roles: ['admin','tech_staff'] },
  { key: 'ai',         label: 'Nexfloor Agent', icon: 'ai',         roles: ['admin','tech_staff'] },
  { key: 'reports',    label: 'Reports',        icon: 'reports',    roles: ['admin','tech_staff'] },
  { key: 'users',      label: 'User Mgmt',      icon: 'users',      roles: ['admin'] },
  { key: 'compliance', label: 'Compliance',     icon: 'compliance', roles: ['non_tech_staff'] },
];

interface Props {
  active: string;
  onNav: (key: string) => void;
  onClose?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}

const roleInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

const roleLabel: Record<UserRole, string> = {
  admin:          'Administrator',
  tech_staff:     'Tech Staff',
  non_tech_staff: 'Non-Tech Staff',
};

export default function Sidebar({ active, onNav, darkMode, onToggleDark }: Props) {
  const { user, logout } = useAuth();
  const role = user?.role as UserRole;
  const visible = NAV.filter(n => n.roles.includes(role));

  const bg        = darkMode ? '#111C2D' : '#ffffff';
  const border    = darkMode ? '#1E2D40' : '#E2E8F0';
  const subBorder = darkMode ? '#1A2A3D' : '#F1F5F9';
  const textMain  = darkMode ? '#CBD5E1' : '#1E293B';
  const textSub   = darkMode ? '#4A6580' : '#94A3B8';
  const hoverBg   = darkMode ? '#1A2A3D' : '#F8FAFC';
  const activeColor = '#3B82F6';
  const activeBg  = darkMode ? 'rgba(59,130,246,.12)' : '#EFF6FF';

  return (
    <nav style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: bg,
      borderRight: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      transition: 'background .2s',
      boxShadow: darkMode ? '4px 0 20px rgba(0,0,0,.4)' : '2px 0 8px rgba(0,0,0,.06)',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${subBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #0057A8, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,87,168,.4)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: textMain, letterSpacing: .3 }}>FACTORY AI</div>
            <div style={{ fontSize: 9, color: textSub, fontWeight: 600, letterSpacing: .6 }}>MONITORING PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: textSub, letterSpacing: .8, padding: '4px 8px 8px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {visible.map(item => (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 6,
              border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              fontSize: 12.5,
              fontWeight: active === item.key ? 700 : 500,
              color: active === item.key ? activeColor : textSub,
              background: active === item.key ? activeBg : 'transparent',
              transition: 'all .12s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (active !== item.key)
                (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
            }}
            onMouseLeave={e => {
              if (active !== item.key)
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {/* Active indicator bar */}
            {active === item.key && (
              <span style={{
                position: 'absolute', left: 0, top: '20%', bottom: '20%',
                width: 3, borderRadius: 99, background: activeColor,
              }} />
            )}
            <span style={{ opacity: active === item.key ? 1 : 0.6, marginLeft: active === item.key ? 4 : 0 }}>
              {icons[item.icon]}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Dark Mode Toggle */}
      <div style={{ padding: '8px', borderTop: `1px solid ${subBorder}` }}>
        <button
          onClick={onToggleDark}
          style={{
            width: '100%', padding: '9px 10px', borderRadius: 6,
            border: `1px solid ${subBorder}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: hoverBg, transition: 'all .15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {darkMode ? (
              <svg width="14" height="14" fill="none" stroke={textSub} strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke={textSub} strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
            <span style={{ fontSize: 12, fontWeight: 500, color: textSub }}>
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
          {/* Pill toggle */}
          <div style={{
            width: 36, height: 20, borderRadius: 99,
            background: darkMode ? '#3B82F6' : '#CBD5E1',
            position: 'relative', transition: 'background .2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3,
              left: darkMode ? 18 : 3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.3)',
            }} />
          </div>
        </button>
      </div>

      {/* User + logout */}
      <div style={{ padding: '10px 8px 12px', borderTop: `1px solid ${subBorder}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 6,
          background: darkMode ? 'rgba(59,130,246,.06)' : '#F8FAFC',
          marginBottom: 6,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0057A8, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,87,168,.35)',
          }}>
            {user?.name ? roleInitials(user.name) : '??'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: textSub }}>
              {user?.role ? roleLabel[user.role] : ''}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6,
            background: 'transparent', border: 'none',
            color: textSub, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,.1)';
            (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = textSub;
          }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </nav>
  );
}