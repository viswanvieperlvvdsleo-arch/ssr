'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STATUS = {
  open: { label: 'Open requirement', color: '#FFFFFF', border: '#64748B', text: '#334155' },
  in_progress: { label: 'In sourcing', color: '#FACC15', border: '#CA8A04', text: '#713F12' },
  closed: { label: 'Completed', color: '#22C55E', border: '#15803D', text: '#14532D' },
};

export default function RequirementStatus({ post, currentUser, compact = false }) {
  const [task, setTask] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const enabled = post.visibility === 'internal' && currentUser && ['Employee', 'Admin', 'Super Admin'].includes(currentUser.role);

  const load = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch(`/api/ssr/tasks?postId=${encodeURIComponent(post.id)}&userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
    if (response.ok) setTask(await response.json());
  }, [currentUser?.id, enabled, post.id]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const refresh = event => {
      if (!event.detail?.postId || event.detail.postId === post.id) load();
    };
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('sj-task-updated', refresh);
    document.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('sj-task-updated', refresh);
      document.removeEventListener('pointerdown', close);
    };
  }, [enabled, load, post.id]);

  if (!enabled) return null;

  const statusKey = task?.status || post.requirementStatus || 'open';
  const status = STATUS[statusKey] || STATUS.open;
  const workers = task?.workers || [];
  const isWorker = workers.some(worker => worker.userId === currentUser.id);

  const run = async action => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/ssr/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, postId: post.id, taskId: task?.id, actorId: currentUser.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update requirement');
      setTask(data);
      window.dispatchEvent(new CustomEvent('sj-task-updated', { detail: { taskId: data.id, postId: post.id } }));
      if (action === 'close') setOpen(false);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={status.label} title={status.label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 0 : 8, width: compact ? 30 : 'auto', minHeight: 30, padding: compact ? 0 : '5px 10px', border: `1px solid ${status.border}`, borderRadius: compact ? '50%' : 7, background: '#fff', color: status.text, cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
        <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', background: status.color, border: `2px solid ${status.border}`, boxSizing: 'border-box' }} />
        {!compact && status.label}
        {!compact && statusKey === 'in_progress' && <span style={{ color: '#854D0E' }}>{workers.length}</span>}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 36, left: compact ? 'auto' : 0, right: compact ? 0 : 'auto', zIndex: 70, width: 'min(330px, calc(100vw - 56px))', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, boxShadow: '0 12px 28px rgba(15,23,42,0.18)', padding: 12, textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
            {statusKey === 'open' ? 'No employee has started yet' : statusKey === 'closed' ? `Closed by ${task?.closedByName || 'employee'}` : `${workers.length} employee${workers.length === 1 ? '' : 's'} sourcing`}
          </p>
          {workers.length > 0 && <div style={{ marginBottom: 10, borderTop: '1px solid #F1F5F9' }}>
            {workers.map(worker => <div key={worker.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid #F1F5F9', fontSize: 12 }}><span style={{ color: '#334155', fontWeight: 700 }}>{worker.userName}</span><span style={{ color: worker.status === 'completed' ? '#15803D' : '#A16207' }}>{worker.status === 'completed' ? 'Completed' : 'Working'}</span></div>)}
          </div>}
          {error && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#B91C1C' }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {statusKey !== 'closed' && !isWorker && <button type="button" disabled={busy} onClick={() => run('claim')} style={{ border: 'none', borderRadius: 6, background: '#FACC15', color: '#422006', padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>Work on this</button>}
            {task?.id && <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('sj-open-task-board', { detail: { taskId: task.id, postId: post.id } })); }} style={{ border: '1px solid #BFDBFE', borderRadius: 6, background: '#EFF6FF', color: '#0A6ED1', padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Open Task Board</button>}
            {statusKey === 'in_progress' && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Close this requirement permanently? It cannot return to yellow or white.')) run('close'); }} style={{ border: 'none', borderRadius: 6, background: '#16A34A', color: '#fff', padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>Mark completed</button>}
          </div>
        </div>
      )}
    </div>
  );
}
