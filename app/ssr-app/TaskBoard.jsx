'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';

const TASK_EVENT = 'sj-task-updated';
const staffRole = role => ['Employee', 'Admin', 'Super Admin'].includes(role);
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const initials = name => String(name || '').split(/\s+/).filter(Boolean).map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'U';

function elapsed(start, end = Date.now()) {
  const minutes = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

function WorkerColumn({ worker, task }) {
  const profiles = task.profiles.filter(profile => profile.addedById === worker.userId);
  return (
    <div style={{ flex: '0 0 250px', minHeight: 148, borderLeft: `4px solid ${worker.status === 'completed' ? '#16A34A' : '#EAB308'}`, background: '#F8FAFC', padding: 14, boxSizing: 'border-box', scrollSnapAlign: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#334155', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{initials(worker.userName)}</span>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.userName}</div><div style={{ fontSize: 10, color: '#64748B' }}>Joined #{task.workers.findIndex(item => item.id === worker.id) + 1}{worker.teamName ? ` · ${worker.teamName}` : ''}</div></div>
      </div>
      <div style={{ marginTop: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
        <span style={{ color: '#64748B' }}>Profiles<br /><strong style={{ color: '#0F172A' }}>{profiles.length}</strong></span>
        <span style={{ color: '#64748B' }}>Time<br /><strong style={{ color: '#0F172A' }}>{elapsed(worker.joinedAt, worker.completedAt || Date.now())}</strong></span>
      </div>
      <div style={{ marginTop: 12, color: worker.status === 'completed' ? '#15803D' : '#A16207', fontSize: 11, fontWeight: 800 }}>{worker.status === 'completed' ? 'Completed' : 'Working'}</div>
    </div>
  );
}

function TaskCard({ task, users, currentUser, uploadChatMedia, onUpdated, initiallyExpanded }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [profileText, setProfileText] = useState('');
  const [file, setFile] = useState(null);
  const [mentionIds, setMentionIds] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const workerStrip = useRef(null);
  const isClosed = task.status === 'closed';
  const myWorker = task.workers.find(worker => worker.userId === currentUser.id);

  useEffect(() => { if (initiallyExpanded) setExpanded(true); }, [initiallyExpanded]);

  const mentionQuery = useMemo(() => {
    const match = profileText.match(/(?:^|\s)@([^@\n]*)$/);
    return match ? match[1].trim().toLowerCase() : null;
  }, [profileText]);
  const suggestions = mentionQuery === null ? [] : Object.values(users || {})
    .filter(user => staffRole(user.role) && user.id !== currentUser.id)
    .filter(user => user.name.toLowerCase().includes(mentionQuery)).slice(0, 6);

  const addMention = user => {
    setProfileText(value => value.replace(/(?:^|\s)@([^@\n]*)$/, match => `${match.startsWith(' ') ? ' ' : ''}@${user.name} `));
    setMentionIds(value => value.includes(user.id) ? value : [...value, user.id]);
  };

  const action = async (name, extra = {}) => {
    setBusy(name);
    setError('');
    try {
      const response = await fetch('/api/ssr/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, taskId: task.id, actorId: currentUser.id, ...extra }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update task');
      onUpdated(data);
      window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { taskId: task.id, postId: task.postId } }));
      return true;
    } catch (actionError) {
      setError(actionError.message);
      return false;
    } finally {
      setBusy('');
    }
  };

  const submitProfile = async event => {
    event.preventDefault();
    if (!profileText.trim() && !file) return;
    setBusy('addProfile');
    setError('');
    try {
      const attachment = file ? await uploadChatMedia(file, setUploadProgress) : null;
      const activeMentions = mentionIds.filter(id => users?.[id]?.name && profileText.includes(`@${users[id].name}`));
      const response = await fetch('/api/ssr/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addProfile', taskId: task.id, actorId: currentUser.id, text: profileText, mentions: activeMentions, attachment }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not add profile');
      setProfileText(''); setFile(null); setMentionIds([]); setUploadProgress(0);
      onUpdated(data);
      window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { taskId: task.id, postId: task.postId } }));
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <article id={`sj-task-${task.id}`} style={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Collapse task' : 'Expand task'} title={expanded ? 'Collapse' : 'Expand'} style={{ width: 32, height: 32, border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 18 }}>{expanded ? '−' : '+'}</button>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><h3 style={{ margin: 0, color: '#0F172A', fontSize: 16, fontWeight: 800 }}>{task.title}</h3><span style={{ padding: '3px 8px', borderRadius: 5, background: isClosed ? '#DCFCE7' : task.status === 'in_progress' ? '#FEF9C3' : '#F8FAFC', border: `1px solid ${isClosed ? '#86EFAC' : task.status === 'in_progress' ? '#FDE047' : '#CBD5E1'}`, color: isClosed ? '#166534' : task.status === 'in_progress' ? '#854D0E' : '#475569', fontSize: 10, fontWeight: 800 }}>{isClosed ? 'Completed' : task.status === 'in_progress' ? 'In sourcing' : 'Open'}</span></div>
          <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 12 }}>{task.createdByName}{task.teamName ? ` · ${task.teamName}` : ''} · {formatDate(task.createdAt)}</p>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {!isClosed && !myWorker && <button type="button" disabled={Boolean(busy)} onClick={() => action('claim')} style={{ border: 'none', borderRadius: 6, padding: '8px 11px', background: '#FACC15', color: '#422006', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>Join sourcing</button>}
          {!isClosed && myWorker && myWorker.status !== 'completed' && <button type="button" disabled={Boolean(busy)} onClick={() => action('complete')} title="Mark my sourcing work complete" style={{ border: '1px solid #86EFAC', borderRadius: 6, padding: '8px 11px', background: '#F0FDF4', color: '#166534', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>Complete my work</button>}
          {!isClosed && task.status === 'in_progress' && <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Close this requirement permanently? It cannot be reopened.')) action('close'); }} style={{ border: 'none', borderRadius: 6, padding: '8px 11px', background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>Close requirement</button>}
        </div>
      </div>

      {expanded && <div style={{ borderTop: '1px solid #E2E8F0' }}>
        {task.description && <p style={{ margin: 0, padding: '13px 16px', background: '#F8FAFC', color: '#475569', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{task.description}</p>}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}><strong style={{ fontSize: 12, color: '#0F172A' }}>Sourcing order ({task.workers.length})</strong>{task.workers.length > 0 && <div style={{ display: 'flex', gap: 5 }}><button type="button" title="Previous employee" aria-label="Previous employee" onClick={() => workerStrip.current?.scrollBy({ left: -260, behavior: 'smooth' })} style={{ width: 30, height: 30, border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>‹</button><button type="button" title="Next employee" aria-label="Next employee" onClick={() => workerStrip.current?.scrollBy({ left: 260, behavior: 'smooth' })} style={{ width: 30, height: 30, border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>›</button></div>}</div>
          {task.workers.length === 0 ? <p style={{ margin: 0, padding: '22px 0', color: '#94A3B8', fontSize: 12 }}>No employee has joined this requirement yet.</p> : <div ref={workerStrip} style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: 5 }}>{task.workers.map(worker => <WorkerColumn key={worker.id} worker={worker} task={task} />)}</div>}
        </div>

        <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0' }}>
          <strong style={{ fontSize: 12, color: '#0F172A' }}>Candidate profiles ({task.profiles.length})</strong>
          <div style={{ marginTop: 10 }}>{task.profiles.length === 0 && <p style={{ color: '#94A3B8', fontSize: 12 }}>No profiles added yet.</p>}{task.profiles.map(profile => <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr auto', gap: 12, padding: '11px 0', borderTop: '1px solid #F1F5F9', alignItems: 'start' }}><div><strong style={{ fontSize: 12, color: '#334155' }}>{profile.addedByName}</strong><div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{formatDate(profile.createdAt)}</div></div><p style={{ margin: 0, fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{profile.text || 'Attached profile'}</p>{profile.attachment?.url && <a href={profile.attachment.url} target="_blank" rel="noreferrer" style={{ color: '#0A6ED1', fontSize: 11, fontWeight: 800, textDecoration: 'none' }}>View file</a>}</div>)}</div>
        </div>

        {!isClosed && (myWorker || ['Admin', 'Super Admin'].includes(currentUser.role)) && <form onSubmit={submitProfile} style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <label style={{ display: 'block', marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: 800 }}>Add candidate profile</label>
          <div style={{ position: 'relative' }}><textarea value={profileText} onChange={event => setProfileText(event.target.value)} rows={3} placeholder="Add profile details. Type @ to mention an employee." style={{ width: '100%', resize: 'vertical', border: '1px solid #CBD5E1', borderRadius: 6, padding: 10, font: 'inherit', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />{suggestions.length > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, background: '#fff', border: '1px solid #CBD5E1', boxShadow: '0 8px 20px rgba(15,23,42,0.12)' }}>{suggestions.map(user => <button key={user.id} type="button" onClick={() => addMention(user)} style={{ width: '100%', border: 'none', borderBottom: '1px solid #F1F5F9', background: '#fff', padding: '8px 10px', textAlign: 'left', color: '#334155', fontSize: 12, cursor: 'pointer' }}>@{user.name} <span style={{ color: '#94A3B8' }}>{user.role}</span></button>)}</div>}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' }}><input type="file" onChange={event => setFile(event.target.files?.[0] || null)} style={{ minWidth: 0, maxWidth: 260, fontSize: 11 }} /><button type="submit" disabled={Boolean(busy) || (!profileText.trim() && !file)} style={{ border: 'none', borderRadius: 6, background: busy ? '#93C5FD' : '#0A6ED1', color: '#fff', padding: '8px 13px', fontSize: 11, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>{busy === 'addProfile' ? (uploadProgress ? `Uploading ${uploadProgress}%` : 'Saving...') : 'Add profile'}</button></div>
        </form>}
        {isClosed && <div style={{ padding: '13px 16px', borderTop: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', fontSize: 12, fontWeight: 700 }}>Closed by {task.closedByName || 'employee'} on {formatDate(task.closedAt)}. This status is final.</div>}
        {error && <div style={{ padding: '10px 16px', background: '#FEF2F2', color: '#B91C1C', fontSize: 12 }}>{error}</div>}
      </div>}
    </article>
  );
}

export default function TaskBoard() {
  const { currentUser, users, uploadChatMedia } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [focusTaskId, setFocusTaskId] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`/api/ssr/tasks?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load task board');
      setTasks(Array.isArray(data) ? data : []); setError('');
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFocusTaskId(params.get('taskId') || '');
    load();
    const timer = window.setInterval(load, 15000);
    const refresh = event => { if (event.detail?.taskId) setFocusTaskId(event.detail.taskId); load(); };
    window.addEventListener(TASK_EVENT, refresh);
    return () => { window.clearInterval(timer); window.removeEventListener(TASK_EVENT, refresh); };
  }, [load]);

  useEffect(() => { if (focusTaskId && !loading) window.setTimeout(() => document.getElementById(`sj-task-${focusTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }, [focusTaskId, loading]);

  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.status === 'closed' : task.status !== 'closed'));
  const updateOne = updated => setTasks(list => list.map(task => task.id === updated.id ? updated : task));
  if (!currentUser || !staffRole(currentUser.role)) return <div style={{ padding: 28, color: '#64748B' }}>The Task Board is available to employees and administrators.</div>;

  return (
    <main style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '22px 18px 90px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0, fontSize: 22, color: '#0F172A' }}>Task Board</h2><p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 13 }}>Requirement ownership, sourcing order, profiles, and closure.</p></div><div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: 7, overflow: 'hidden' }}>{[['active', 'Active'], ['completed', 'Completed'], ['all', 'All']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} style={{ minHeight: 34, border: 'none', borderRight: value !== 'all' ? '1px solid #CBD5E1' : 'none', background: filter === value ? '#0A6ED1' : '#fff', color: filter === value ? '#fff' : '#475569', padding: '0 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{label}</button>)}</div></div>
      {error && <div style={{ padding: 12, marginBottom: 12, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12 }}>{error}</div>}
      {loading ? <p style={{ color: '#64748B' }}>Loading task board...</p> : visible.length === 0 ? <div style={{ padding: '48px 18px', borderTop: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', textAlign: 'center', color: '#64748B' }}>No {filter === 'all' ? '' : filter} requirements yet.</div> : <div style={{ display: 'grid', gap: 14 }}>{visible.map(task => <TaskCard key={task.id} task={task} users={users} currentUser={currentUser} uploadChatMedia={uploadChatMedia} onUpdated={updateOne} initiallyExpanded={focusTaskId === task.id} />)}</div>}
    </main>
  );
}
