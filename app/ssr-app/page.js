'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './AppContext';

const CATEGORIES = ['User', 'Trainer', 'Employee'];


// Map category selection to mock user key
const CATEGORY_TO_ROLE = {
  'User': 'participant',
  'Trainer': 'trainer',
  'Employee': 'employee',
};

export default function EntryPage() {
  const router = useRouter();
  const { login, signup, setSelectedRole } = useApp();

  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('User');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (tab === 'signup' && !name)) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));

    // Normal login/signup
    if (tab === 'signup') {
      const success = signup(name, email.trim().toLowerCase(), password, category);
      if (success) {
        router.push('/ssr-app/home');
      } else {
        setError('Signup failed.');
        setLoading(false);
      }
    } else {
      const success = login(email.trim().toLowerCase(), password);
      if (success) {
        router.push('/ssr-app/home');
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <img src="/ssrlogo.jpeg" alt="SSR Logo" style={{
          width: 56, height: 56,
          borderRadius: 16,
          margin: '0 auto 14px',
          boxShadow: '0 4px 16px rgba(10,110,209,0.25)',
          objectFit: 'cover',
          display: 'block'
        }} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          SAP Learning Platform
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748B' }}>
          {tab === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#fff',
        borderRadius: 20,
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>

        {/* Tab Switch */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #F1F5F9' }}>
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? '#0A6ED1' : '#94A3B8',
                borderBottom: `2.5px solid ${tab === t ? '#0A6ED1' : 'transparent'}`,
                marginBottom: -1.5,
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              {t === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 28px 24px' }}>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#DC2626',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Name — signup only */}
          {tab === 'signup' && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={name}
                maxLength={100}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0A6ED1'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#94A3B8' }}>✉️</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputStyle, paddingLeft: 40 }}
                onFocus={e => e.target.style.borderColor = '#0A6ED1'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              {tab === 'login' && (
                <button type="button" onClick={() => alert('Password reset link will be sent to your email.')}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#0A6ED1', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#94A3B8' }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingLeft: 40, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = '#0A6ED1'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94A3B8', lineHeight: 1 }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 26 }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.filter(c => tab === 'signup' ? c !== 'Employee' : true).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    border: `1.5px solid ${category === cat ? '#0A6ED1' : '#E2E8F0'}`,
                    background: category === cat ? '#EFF6FF' : '#F8FAFC',
                    color: category === cat ? '#0A6ED1' : '#64748B',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: category === cat ? 700 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {cat === 'User' ? '🎯' : cat === 'Trainer' ? '🎓' : '💼'}<br />
                  <span style={{ fontSize: 11, marginTop: 3, display: 'block' }}>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#93C5FD' : '#0A6ED1',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#063D8A'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0A6ED1'; }}
          >
            {loading ? (
              <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Signing in...</>
            ) : (
              tab === 'login' ? 'Login →' : 'Create Account →'
            )}
          </button>

          {/* Switch tab */}
          <p style={{ textAlign: 'center', margin: '18px 0 0', fontSize: 13, color: '#94A3B8' }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#0A6ED1', fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              {tab === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </form>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 32, fontSize: 12, color: '#CBD5E1', textAlign: 'center' }}>
        SSR Business Solutions · SAP Authorized Training Center & Placements
      </p>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #CBD5E1; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #E2E8F0',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  color: '#0F172A',
  background: '#fff',
  transition: 'border-color 0.15s',
};
