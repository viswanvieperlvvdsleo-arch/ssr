import { useEffect, useState, useCallback } from 'react';
import RequirementsPanel from './RequirementsPanel';

function CompanyDetail({ companyId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/ssr/company?id=${encodeURIComponent(companyId)}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load company details');
        if (!cancelled) setDetail(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId]);

  const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never';
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0) / 100);

  if (loading) return <section style={{ padding: 24 }}><button type="button" onClick={onBack} style={{ border: 0, background: 'transparent', color: '#0A6ED1', fontWeight: 700, cursor: 'pointer' }}>Back to companies</button><p style={{ color: '#64748B' }}>Loading company details...</p></section>;
  if (error || !detail) return <section style={{ padding: 24 }}><button type="button" onClick={onBack} style={{ border: 0, background: 'transparent', color: '#0A6ED1', fontWeight: 700, cursor: 'pointer' }}>Back to companies</button><div style={{ marginTop: 18, padding: 14, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C' }}>{error || 'Company details are unavailable'}</div></section>;

  const { company, accounts = [], stats = {} } = detail;
  const metrics = [
    ['Accounts', stats.accounts || 0],
    ['Active IDs', stats.activeAccounts || 0],
    ['Requirements', stats.requirements || 0],
    ['Open', stats.openRequirements || 0],
    ['Completed', stats.completedRequirements || 0],
    ['Meetings', stats.meetings || 0],
    ['Internal posts', stats.posts || 0],
    ['Payments', stats.payments || 0],
    ['Paid value', money(stats.paidAmount)],
  ];

  return (
    <section style={{ padding: 24, maxWidth: 1180, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <button type="button" onClick={onBack} style={{ border: 0, background: 'transparent', color: '#0A6ED1', fontWeight: 800, cursor: 'pointer', padding: '6px 0', marginBottom: 12 }}>Back to companies</button>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'start', flexWrap: 'wrap', paddingBottom: 18, borderBottom: '1px solid #CBD5E1' }}>
        <div><h1 style={{ margin: 0, color: '#0F172A', fontSize: 26 }}>{company.name}</h1><p style={{ margin: '6px 0 0', color: '#64748B', fontFamily: 'monospace' }}>{company.slug}</p></div>
        <div style={{ minWidth: 230 }}><small style={{ color: '#64748B', fontWeight: 700 }}>REQUIREMENTS EMAIL</small><div style={{ marginTop: 5, color: '#0F172A', fontWeight: 700, overflowWrap: 'anywhere' }}>{company.requirementEmail || 'Not configured'}</div><small style={{ display: 'block', marginTop: 8, color: '#64748B' }}>Client since {formatDate(company.createdAt)}</small></div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', border: '1px solid #E2E8F0', background: '#fff', margin: '18px 0' }}>
        {metrics.map(([label, value]) => <div key={label} style={{ padding: 15, borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', minWidth: 0 }}><strong style={{ display: 'block', color: '#0F172A', fontSize: 20, overflowWrap: 'anywhere' }}>{value}</strong><span style={{ display: 'block', marginTop: 4, color: '#64748B', fontSize: 11 }}>{label}</span></div>)}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong style={{ color: '#0F172A' }}>Company accounts</strong><span style={{ color: '#64748B', fontSize: 12 }}>{accounts.length} IDs</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820, textAlign: 'left' }}>
            <thead><tr style={{ background: '#F8FAFC', color: '#64748B', fontSize: 11 }}><th style={{ padding: 12 }}>ACCOUNT</th><th style={{ padding: 12 }}>ROLE</th><th style={{ padding: 12 }}>EMAIL</th><th style={{ padding: 12 }}>MOBILE</th><th style={{ padding: 12 }}>PERMISSIONS</th><th style={{ padding: 12 }}>LAST ACTIVE</th><th style={{ padding: 12 }}>STATUS</th></tr></thead>
            <tbody>{accounts.map(account => <tr key={account.id} style={{ borderTop: '1px solid #F1F5F9' }}>
              <td style={{ padding: 12 }}><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 34, height: 34, borderRadius: '50%', background: '#334155', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>{account.initials || account.name?.slice(0, 2).toUpperCase()}</span><strong style={{ color: '#0F172A' }}>{account.name}</strong></div></td>
              <td style={{ padding: 12, color: '#334155' }}>{account.role}</td>
              <td style={{ padding: 12 }}><a href={`mailto:${account.email}`} style={{ color: '#0A6ED1', textDecoration: 'none' }}>{account.email}</a></td>
              <td style={{ padding: 12 }}>{account.phone ? <a href={`tel:${String(account.phone).replace(/[^\d+]/g, '')}`} style={{ color: '#0A6ED1', textDecoration: 'none', fontWeight: 700 }}>{account.phone}</a> : <span style={{ color: '#94A3B8' }}>Not provided</span>}</td>
              <td style={{ padding: 12 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(account.permissions || []).length ? account.permissions.map(permission => <span key={permission} style={{ padding: '3px 6px', borderRadius: 4, background: '#EFF6FF', color: '#315EA8', fontSize: 10 }}>{permission.replaceAll('_', ' ')}</span>) : <span style={{ color: '#94A3B8' }}>Standard</span>}</div></td>
              <td style={{ padding: 12, color: '#64748B', fontSize: 12 }}>{formatDate(account.lastSeen)}</td>
              <td style={{ padding: 12 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: account.restricted ? '#FEF2F2' : '#ECFDF5', color: account.restricted ? '#B91C1C' : '#047857', fontSize: 11, fontWeight: 800 }}>{account.restricted ? 'Restricted' : 'Active'}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!accounts.length && <p style={{ padding: 24, color: '#64748B', textAlign: 'center' }}>No accounts created for this company.</p>}
      </div>
    </section>
  );
}

export function CompaniesPanel() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    requirementEmail: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/ssr/company', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load companies');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!formData.companyName.trim() || !formData.adminName.trim() || !formData.email.trim() || !formData.password) {
      setFormError('Company name, admin name, valid email, and password are required');
      return;
    }
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/ssr/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create company');
      }
      setSuccessMsg(`Company "${formData.companyName}" and Admin "${formData.adminName}" created successfully!`);
      setFormData({ companyName: '', adminName: '', email: '', password: '', requirementEmail: '' });
      setShowCreateModal(false);
      await loadCompanies();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalAccounts = companies.reduce((sum, c) => sum + (c.accountCount || 0), 0);

  if (selectedCompanyId) return <CompanyDetail companyId={selectedCompanyId} onBack={() => setSelectedCompanyId('')} />;

  return (
    <section style={{ padding: '24px', maxWidth: 1080, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Client Companies (Multi-Tenant)</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Provision client companies. Each company gets an isolated portal with their own employee accounts and requirement channel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateModal(true); setFormError(''); setSuccessMsg(''); }}
          style={{
            background: '#0A6ED1', color: '#fff', border: 'none', padding: '10px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Client Company
        </button>
      </div>

      {successMsg && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, color: '#065F46', fontSize: 13, fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total Companies</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0A6ED1', marginTop: 4 }}>{companies.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total Client Accounts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>{totalAccounts}</div>
        </div>
      </div>

      {/* Modal for creating new company */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16, boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Create Client Company & Admin</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCompany} style={{ padding: '20px 24px' }}>
              {formError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>Company Name *</label>
                <input
                  value={formData.companyName}
                  onChange={e => setFormData(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="e.g. Acme Corporation"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>Admin Full Name *</label>
                  <input
                    value={formData.adminName}
                    onChange={e => setFormData(f => ({ ...f, adminName: e.target.value }))}
                    placeholder="e.g. John Doe"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>Admin Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    placeholder="admin@acme.com"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>Admin Password (min 8 chars) *</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                  placeholder="Generate or enter temporary password"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>Requirement Inbox Email (optional)</label>
                <input
                  type="email"
                  value={formData.requirementEmail}
                  onChange={e => setFormData(f => ({ ...f, requirementEmail: e.target.value }))}
                  placeholder="requirements@acme.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Where notifications will go when this company sends requirements.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '9px 18px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 20px', background: saving ? '#93C5FD' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}
                >
                  {saving ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Companies List */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14, color: '#0F172A' }}>Registered Companies</strong>
          <span style={{ fontSize: 12, color: '#64748B' }}>{companies.length} companies</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading companies...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#334155', margin: '0 0 6px' }}>No client companies yet</p>
            <p style={{ margin: 0, fontSize: 13 }}>Click &quot;Create Client Company&quot; above to onboard the first company and its admin.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 18px' }}>Company</th>
                  <th style={{ padding: '12px 18px' }}>Slug / ID</th>
                  <th style={{ padding: '12px 18px' }}>Requirements Email</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Account Count</th>
                  <th style={{ padding: '12px 18px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} onClick={() => setSelectedCompanyId(c.id)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedCompanyId(c.id); }} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{c.name}</div>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B', fontFamily: 'monospace' }}>
                      {c.slug}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      {c.requirementEmail || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>None</span>}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span style={{
                        background: '#EFF6FF', color: '#0A6ED1', fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, display: 'inline-block'
                      }}>
                        {c.accountCount || 0} IDs
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 12 }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}


export function TokensPanel(props) {
  return <RequirementsPanel {...props} />;
}
