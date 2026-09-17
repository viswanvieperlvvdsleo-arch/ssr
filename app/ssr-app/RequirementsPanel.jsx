'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Send, X } from 'lucide-react';
import styles from './RequirementsPanel.module.css';

const blankForm = { to: '', subject: '', body: '', cc: '', signature: '' };
const statuses = { open: 'Awaiting sourcing', in_progress: 'In sourcing', closed: 'Closed' };
const mailLabels = { sent: 'Sent to email provider', failed: 'Email failed', not_configured: 'Email setup pending', unknown: 'Email confirmation unavailable', sending: 'Email confirmation pending', pending: 'Email pending' };
const date = value => value ? new Date(value).toLocaleString() : '-';
async function read(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export default function RequirementsPanel({ currentUser, initialToken, onOpenTask }) {
  const canSubmit = currentUser?.role === 'Participant' || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || (currentUser?.companyId && (currentUser.role === 'Admin' || currentUser.permissions?.some(value => ['post_feeds', 'all_access'].includes(value))));
  const [items, setItems] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(initialToken || null);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(null);
  const detailRef = useRef(null);
  const load = useCallback(async signal => {
    if (inFlight.current && !inFlight.current.signal?.aborted) return;
    const operation = { signal };
    inFlight.current = operation;
    try {
      const result = await read(await fetch('/api/ssr/requirements', { cache: 'no-store', signal }));
      if (!signal?.aborted) { setItems(result); setError(''); }
    } catch (failure) { if (!signal?.aborted) setError(failure.message); }
    finally { if (inFlight.current === operation) inFlight.current = null; if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    fetch('/api/ssr/requirements?config=1', { cache: 'no-store', signal: controller.signal }).then(read).then(setConfig).catch(() => {});
    const refresh = () => { if (document.visibilityState === 'visible') load(controller.signal); };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);
  useEffect(() => { if (initialToken) setSelected(initialToken); }, [initialToken]);
  const detail = items.find(item => item.token === selected);
  useEffect(() => { if (detail) detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [selected, Boolean(detail)]);
  const filtered = items.filter(item => [item.token, item.title, item.senderName, item.companyName, statuses[item.status], ...item.workers.map(worker => worker.userName)].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        ...form,
        to: form.to || config?.to || 'admin.ssrbs@gmail.com',
      };
      const response = await fetch('/api/ssr/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await read(response);
      setNotice(`${result.token} saved. ${mailLabels[result.emailStatus] || 'Email pending'}.`);
      setForm(blankForm); setComposing(false); setSelected(result.token);
      load().catch(() => {});
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const retry = async () => {
    setBusy(true); setError('');
    try {
      const result = await read(await fetch('/api/ssr/requirements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: detail.token }) }));
      setNotice(`${detail.token}: ${mailLabels[result.emailStatus] || result.emailStatus}.`);
      load().catch(() => {});
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  return <main className={styles.page}>
    <header className={styles.header}><h1>{canSubmit ? 'Your Requirements' : 'Tokens'}</h1><div className={styles.actions}>
      <button type="button" onClick={() => load()} aria-label="Refresh requirements" title="Refresh requirements"><RefreshCw size={17} /></button>
      {canSubmit && <button className={styles.primary} type="button" onClick={() => setComposing(!composing)}><Plus size={17} />New requirement</button>}
    </div></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {composing && <form className={styles.form} onSubmit={submit}>
      <h2>New requirement</h2>
      {config && !config.ready && <p className={styles.warning}>Email setup is pending with SJ. Your requirement will still be saved.</p>}
      <div className={styles.fields}>
        <label>To
          <input
            type="email"
            placeholder="admin.ssrbs@gmail.com"
            value={form.to !== '' ? form.to : (config?.to || 'admin.ssrbs@gmail.com')}
            onChange={event => setForm({ ...form, to: event.target.value })}
          />
        </label>
        <label>Your email<input readOnly value={currentUser?.email || ''} /></label>
      </div>
      <label>CC (optional)<input value={form.cc} maxLength={1000} onChange={event => setForm({ ...form, cc: event.target.value })} /></label>
      <label>Subject<input required maxLength={160} value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /></label>
      <label>Body<textarea required rows={6} maxLength={10000} value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} /></label>
      <label>Signature (optional)<textarea rows={2} maxLength={1000} value={form.signature} onChange={event => setForm({ ...form, signature: event.target.value })} /></label>
      <div className={styles.actions}><button type="submit" className={styles.primary} disabled={busy || !form.subject.trim() || !form.body.trim()}><Send size={16} />{busy ? 'Submitting...' : 'Submit requirement'}</button><button type="button" disabled={busy} onClick={() => setComposing(false)}>Cancel</button></div>
    </form>}
    <div className={styles.toolbar}><span>{items.length} requirements</span><input type="search" aria-label="Search requirements" placeholder="Search token, title or person" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {loading ? <p role="status">Loading requirements...</p> : <div className={styles.tableWrap}><table><thead><tr><th>Token / requirement</th><th>Submitted by</th><th>Status</th><th>Working on it</th><th>Email</th><th></th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} aria-selected={selected === item.token}><td><strong>{item.token}</strong><span>{item.title}</span><small>{date(item.createdAt)}</small></td><td>{item.senderName}</td><td><span className={styles.status} data-status={item.status}>{statuses[item.status] || item.status}</span></td><td>{item.workers.filter(worker => worker.status !== 'left').map(worker => worker.userName).join(', ') || 'Not assigned yet'}</td><td>{mailLabels[item.emailStatus] || 'Email pending'}</td><td><button type="button" onClick={() => setSelected(item.token)}>View</button></td></tr>)}</tbody></table>{!filtered.length && <p className={styles.empty}>{items.length ? 'No matching requirements.' : 'No requirements submitted yet.'}</p>}</div>}
    {detail && <section ref={detailRef} className={styles.detail} aria-label="Requirement details">
      <header className={styles.header}><div><small>{detail.token}</small><h2>{detail.title}</h2></div><button type="button" title="Close details" aria-label="Close details" onClick={() => setSelected(null)}><X size={18} /></button></header>
      <p className={styles.body}>{detail.description}</p>
      <dl className={styles.summary}><div><dt>Status</dt><dd>{statuses[detail.status] || detail.status}</dd></div><div><dt>Profiles added</dt><dd>{detail.profileCount ?? detail.profiles?.length ?? 0}</dd></div><div><dt>Closed by</dt><dd>{detail.closedByName || 'Not closed'}</dd></div><div><dt>Closed at</dt><dd>{date(detail.closedAt)}</dd></div></dl>
      <h3>Sourcing team</h3>
      {detail.workers.length ? <ul className={styles.workers}>{detail.workers.map((worker, index) => <li key={`${worker.userName}-${index}`}><strong>{index + 1}. {worker.userName}</strong><span>{worker.status === 'completed' ? 'Work completed' : worker.status === 'left' ? 'Left' : 'Working'}</span><small>Joined {date(worker.joinedAt)}{worker.completedAt ? ` | Completed ${date(worker.completedAt)}` : ''}</small></li>)}</ul> : <p>Waiting for SJ to take this requirement.</p>}
      <h3>Email</h3><p>{mailLabels[detail.emailStatus] || 'Email pending'}{detail.emailStatus === 'sent' ? '. Inbox delivery is not confirmed.' : ''}</p>
      {detail.emailError && <p className={styles.warning}>{detail.emailError}</p>}
      <p>From: {detail.fromEmail}<br />CC: {detail.cc?.join(', ') || 'None'}</p>
      {detail.signature && <p className={styles.body}>{detail.signature}</p>}
      <div className={styles.actions}>{['failed', 'not_configured'].includes(detail.emailStatus) && <button type="button" disabled={busy} onClick={retry}><Send size={16} />{busy ? 'Sending...' : 'Retry email'}</button>}{onOpenTask && <button className={styles.primary} type="button" onClick={() => onOpenTask(detail.taskId)}>Open Task Board</button>}</div>
    </section>}
  </main>;
}
