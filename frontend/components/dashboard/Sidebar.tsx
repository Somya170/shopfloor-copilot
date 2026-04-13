'use client';
// components/dashboard/Sidebar.tsx
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types';

const icons = {
  overview:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  machines:    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  alerts:      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ai:          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  reports:     <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  users:       <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  compliance:  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
};

type NavItem = { key: string; label: string; icon: keyof typeof icons; roles: UserRole[] };

const NAV: NavItem[] = [
  { key: 'overview',   label: 'Overview',    icon: 'overview',   roles: ['admin','tech_staff','non_tech_staff'] },
  { key: 'machines',   label: 'Machines',    icon: 'machines',   roles: ['admin','tech_staff'] },
  { key: 'alerts',     label: 'Alerts',      icon: 'alerts',     roles: ['admin','tech_staff'] },
  { key: 'ai',         label: 'Nexfloor Agent',icon: 'ai',         roles: ['admin','tech_staff'] },
  { key: 'reports',    label: 'Reports',     icon: 'reports',    roles: ['admin','tech_staff'] },
  { key: 'users',      label: 'User Mgmt',   icon: 'users',      roles: ['admin'] },
  { key: 'compliance', label: 'Compliance',  icon: 'compliance', roles: ['non_tech_staff'] },
];

interface Props {
  active: string;
  onNav: (key: string) => void;
}

const roleInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

const roleLabel: Record<UserRole, string> = {
  admin:         'Administrator',
  tech_staff:    'Tech Staff',
  non_tech_staff:'Non-Tech Staff',
};

export default function Sidebar({ active, onNav }: Props) {
  const { user, logout } = useAuth();
  const role = user?.role as UserRole;

  const visible = NAV.filter(n => n.roles.includes(role));

  return (
    <nav style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: '#fff', borderRight: '1px solid var(--g200)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 18px 14px',
        borderBottom: '1px solid var(--g100)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'var(--yash-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--g800)', letterSpacing: .2 }}>
              FACTORY AI
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--g400)', fontWeight: 600, letterSpacing: .5 }}>
              MONITORING PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--g400)', letterSpacing: .8, padding: '4px 8px 8px', textTransform: 'uppercase' }}>
          Menu
        </div>
        {visible.map(item => (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 5,
              border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              fontSize: 12.5, fontWeight: active === item.key ? 600 : 500,
              color: active === item.key ? 'var(--yash-blue)' : 'var(--g600)',
              background: active === item.key ? 'var(--acc-lt)' : 'transparent',
              transition: 'all .12s',
            }}
            onMouseEnter={e => {
              if (active !== item.key)
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--g50)';
            }}
            onMouseLeave={e => {
              if (active !== item.key)
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span style={{ opacity: active === item.key ? 1 : 0.7 }}>{icons[item.icon]}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* User + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--g100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--yash-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name ? roleInitials(user.name) : '??'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--g400)' }}>
              {user?.role ? roleLabel[user.role] : ''}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 5,
            background: 'transparent', border: 'none',
            color: 'var(--g500)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--g500)'; }}
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