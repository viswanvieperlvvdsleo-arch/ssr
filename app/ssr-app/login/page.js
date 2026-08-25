'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '../AppContext';

const ROLE_META = {
  superadmin: { label: 'Super Admin', icon: '👑', color: '#7C3AED', bg: '#F5F3FF' },
  admin: { label: 'Admin', icon: '🛡️', color: '#0A6ED1', bg: '#EFF6FF' },
  employee: { label: 'Employee', icon: '💼', color: '#059669', bg: '#ECFDF5' },
  trainer: { label: 'Trainer', icon: '🎓', color: '#D97706', bg: '#FFFBEB' },
  participant: { label: 'Participant', icon: '🎯', color: '#DC2626', bg: '#FEF2F2' },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleKey = searchParams.get('role') || 'participant';
  const { login, setSelectedRole } = useApp();
  const meta = ROLE_META[roleKey] || ROLE_META.participant;

  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill all fields.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const user = login(roleKey);
    setSelectedRole(roleKey);
    sessionStorage.setItem('ssr_app_user', JSON.stringify(user));
    router.push('/ssr-app/home');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Please fill all fields.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const user = login(roleKey);
    setSelectedRole(roleKey);
    sessionStorage.setItem('ssr_app_user', JSON.stringify(user));
    router.push('/ssr-app/home');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #063D8A, #0A6ED1)', padding: '32px 24px 48px' }}>
        <button onClick={() => router.push('/ssr-app')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, background: meta.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{meta.icon}</div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Signing in as</p>
            <h1 style={{ color: '#fff', margin: 0, fontSize: 22, fontWeight: 800 }}>{meta.label}</h1>
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{ flex: 1, padding: '0 16px 32px', marginTop: -24 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '28px 24px', maxWidth: 480, margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 0', background: tab === t ? '#fff' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: tab === t ? 700 : 500, fontSize: 14, color: tab === t ? '#0A6ED1' : '#64748B', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', textTransform: 'capitalize' }}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 20 }}>{error}</div>}

          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            {tab === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0F172A' }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0F172A' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px 44px 12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0F172A' }} />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#94A3B8' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.01em' }}>
              {loading ? 'Signing in...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#0A6ED1', cursor: 'pointer', fontSize: 13 }}>Forgot password?</button>
          </div>

          {/* Demo hint */}
          <div style={{ marginTop: 24, background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#0369A1', fontWeight: 600 }}>🔵 Demo Mode</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#0369A1' }}>Enter any email & password to continue as <strong>{meta.label}</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
