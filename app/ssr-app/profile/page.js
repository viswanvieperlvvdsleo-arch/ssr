'use client';

import { useRouter } from 'next/navigation';
import AppShell from '../AppShell';
import { useApp } from '../AppContext';

const SETTINGS = [
  { icon: '🔔', label: 'Notifications', desc: 'Push, email & in-app alerts' },
  { icon: '🎨', label: 'Theme', desc: 'Light mode (default)' },
  { icon: '🌐', label: 'Language', desc: 'English (India)' },
  { icon: '💾', label: 'Data & Storage', desc: 'Manage media auto-download' },
  { icon: '🔐', label: 'Privacy & Security', desc: 'Password, 2FA settings' },
  { icon: '❓', label: 'Help & Support', desc: 'FAQs, contact support' },
  { icon: 'ℹ️', label: 'About', desc: 'Version 1.0.0 · SSR Platform' },
];

const PERM_MAP = {
  'Super Admin': { chat: 'Chat with Anyone', group: 'Full Group / Channel Creation', post: 'Edit/delete any post or comment' },
  'Admin': { chat: 'Chat with Anyone', group: 'Create Groups & Announcements', post: 'Delete any post or comment' },
  'Employee': { chat: 'Chat with Anyone', group: 'Create Groups & Broadcasts', post: 'Standard user rights' },
  'Trainer': { chat: 'Chat with Super Admin, Admin & Employees only', group: 'Cannot create groups', post: 'Create posts; delete own comments' },
  'Participant': { chat: 'Chat with Super Admin, Admin & Employees only', group: 'Cannot create groups', post: 'Delete own posts & comments only' },
};

const ROLE_COLOR = {
  'Super Admin': '#7C3AED', 'Admin': '#0A6ED1', 'Employee': '#059669', 'Trainer': '#D97706', 'Participant': '#DC2626'
};

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, logout } = useApp();

  const handleLogout = () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem('ssr_app_user');
    logout();
    router.push('/ssr-app');
  };

  const perms = currentUser ? PERM_MAP[currentUser.role] : null;
  const roleColor = currentUser ? (ROLE_COLOR[currentUser.role] || '#0A6ED1') : '#0A6ED1';

  return (
    <AppShell>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Profile Header */}
        <div style={{ background: `linear-gradient(135deg, #063D8A, ${roleColor})`, padding: '28px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 68, height: 68, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }}>
              {currentUser?.initials || '?'}
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>{currentUser?.name || 'Guest'}</h2>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{currentUser?.email}</p>
              <span style={{ display: 'inline-block', marginTop: 6, background: '#F0AB00', color: '#063D8A', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em' }}>{currentUser?.role || 'No Role'}</span>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        {perms && (
          <div style={{ margin: '-20px 16px 0', background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Permissions</h3>
            {[
              { icon: '💬', label: 'Private Chat', value: perms.chat },
              { icon: '👥', label: 'Group Creation', value: perms.group },
              { icon: '📝', label: 'Post Management', value: perms.post },
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{p.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings List */}
        <div style={{ margin: '16px', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #F1F5F9' }}>
          <h3 style={{ margin: 0, padding: '14px 16px 10px', fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #F1F5F9' }}>Settings</h3>
          {SETTINGS.map((item, i) => (
            <button key={item.label} onClick={() => alert(`${item.label} settings`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', borderBottom: i < SETTINGS.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>{item.desc}</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ margin: '0 16px 32px' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 14, color: '#DC2626', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
          >
            🚪 Log Out
          </button>
          <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 12 }}>SSR Business Solutions · SAP Authorized Training Center</p>
        </div>
      </div>
    </AppShell>
  );
}
