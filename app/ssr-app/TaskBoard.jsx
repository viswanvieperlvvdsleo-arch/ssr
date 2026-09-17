'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';
import styles from './task-board.module.css';
import { CallButton } from './DirectCall';


const TASK_EVENT = 'sj-task-updated';
const staffRole = role => ['Employee', 'Admin', 'Super Admin'].includes(role);
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const initials = name => String(name || '').split(/\s+/).filter(Boolean).map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'U';

function elapsed(start, end = Date.now()) {
  const minutes = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

function WorkerColumn({ worker, task, selected, onSelect, currentUser }) {
  const profiles = task.profiles.filter(profile => profile.addedById === worker.userId);
  return (
    <button type="button" data-worker-id={worker.userId} aria-pressed={selected} className={`${styles.workerCard} ${selected ? styles.workerCardSelected : ''}`} style={{ '--worker-color': worker.status === 'completed' ? '#16A34A' : '#EAB308' }} onClick={onSelect}>
      <span className={styles.workerIdentity}>
        <span className={styles.avatar}>{initials(worker.userName)}</span>
        <span className={styles.workerNameWrap}><strong>{worker.userName}</strong><small>Joined #{task.workers.findIndex(item => item.id === worker.id) + 1}{worker.teamName ? ` | ${worker.teamName}` : ''}</small></span>
        {currentUser && (
          <span onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <CallButton targetUserId={worker.userId} targetUserName={worker.userName} callType="audio" currentUser={currentUser} />
          </span>
        )}
      </span>
      <span className={styles.workerStats}><span>Profiles<strong>{profiles.length}</strong></span><span>Time<strong>{elapsed(worker.joinedAt, worker.completedAt || Date.now())}</strong></span></span>
      <span className={worker.status === 'completed' ? styles.completeText : styles.workingText}>{worker.status === 'completed' ? 'Completed' : 'Working'}</span>
    </button>
  );
}

const PROFILE_STATUS = {
  new: { label: 'New', className: styles.profileNew },
  follow_up: { label: 'Follow-up', className: styles.profileFollowUp },
  rejected: { label: 'Rejected', className: styles.profileRejected },
  completed: { label: 'Completed', className: styles.profileCompleted },
};

function ProfileRow({ profile, focused, taskClosed, busy, onStatusChange, currentUser }) {
  const statusKey = profile.status || 'new';
  const status = PROFILE_STATUS[statusKey] || PROFILE_STATUS.new;
  return (
    <div id={`sj-profile-${profile.id}`} className={`${styles.profileRow} ${focused ? styles.focusedProfile : ''}`}>
      <div className={styles.profileOwner}>
        <strong>{profile.addedByName}</strong>
        <small>{formatDate(profile.createdAt)}</small>
        {currentUser && (
          <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
            <CallButton targetUserId={profile.addedById} targetUserName={profile.addedByName} callType="audio" currentUser={currentUser} />
          </span>
        )}
      </div>
      <p>{profile.text || 'Attached profile'}</p>
      <div className={styles.profileControls}>
        <span className={`${styles.profileStatus} ${status.className}`}>{status.label}</span>
        {profile.attachment?.url && <a href={profile.attachment.url} target="_blank" rel="noreferrer">View</a>}
        {currentUser && (
          <CallButton targetUserId={profile.addedById} targetUserName={profile.addedByName} callType="audio" currentUser={currentUser} />
        )}
        {!taskClosed && statusKey === 'new' && <button type="button" disabled={Boolean(busy)} className={styles.followUpButton} onClick={() => onStatusChange(profile, 'follow_up')}>Follow-up</button>}
        {!taskClosed && ['new', 'follow_up'].includes(statusKey) && <button type="button" disabled={Boolean(busy)} className={styles.rejectButton} onClick={() => onStatusChange(profile, 'rejected')}>Rejected</button>}
        {!taskClosed && statusKey === 'follow_up' && <button type="button" disabled={Boolean(busy)} className={styles.profileCompleteButton} onClick={() => onStatusChange(profile, 'completed')}>Completed</button>}
      </div>
      {statusKey !== 'new' && <small className={styles.statusAudit}>Updated by {profile.statusUpdatedByName || 'staff'}{profile.statusUpdatedAt ? ` | ${formatDate(profile.statusUpdatedAt)}` : ''}</small>}
    </div>
  );
}


function TaskCard({ task, users, currentUser, uploadChatMedia, onUpdated, initiallyExpanded, focusProfileId }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [selectedWorkerId, setSelectedWorkerId] = useState(task.workers[0]?.userId || 'all');
  const [profileText, setProfileText] = useState('');
  const [file, setFile] = useState(null);
  const [mentionIds, setMentionIds] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const workerStrip = useRef(null);
  const scrollTimer = useRef(null);
  const isClosed = task.status === 'closed';
  const myWorker = task.workers.find(worker => worker.userId === currentUser.id);

  useEffect(() => { if (initiallyExpanded) setExpanded(true); }, [initiallyExpanded]);

  useEffect(() => {
    if (!task.workers.length) return setSelectedWorkerId('all');
    const profile = focusProfileId ? task.profiles.find(item => item.id === focusProfileId) : null;
    const worker = profile ? task.workers.find(item => item.userId === profile.addedById) : null;
    setSelectedWorkerId(current => worker?.userId || (task.workers.some(item => item.userId === current) ? current : task.workers[0].userId));
  }, [focusProfileId, task.profiles, task.workers]);

  useEffect(() => {
    if (!focusProfileId || !expanded) return undefined;
    const timer = window.setTimeout(() => document.getElementById(`sj-profile-${focusProfileId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
    return () => window.clearTimeout(timer);
  }, [expanded, focusProfileId, selectedWorkerId]);

  const selectedWorker = task.workers.find(worker => worker.userId === selectedWorkerId);
  const visibleProfiles = selectedWorkerId === 'all' ? task.profiles : task.profiles.filter(profile => profile.addedById === selectedWorkerId);
  const mentionQuery = useMemo(() => {
    const match = profileText.match(/(?:^|\s)@([^@\n]*)$/);
    return match ? match[1].trim().toLowerCase() : null;
  }, [profileText]);
  const suggestions = mentionQuery === null ? [] : Object.values(users || {}).filter(user => staffRole(user.role) && user.id !== currentUser.id).filter(user => user.name.toLowerCase().includes(mentionQuery)).slice(0, 6);

  const addMention = user => {
    setProfileText(value => value.replace(/(?:^|\s)@([^@\n]*)$/, match => `${match.startsWith(' ') ? ' ' : ''}@${user.name} `));
    setMentionIds(value => value.includes(user.id) ? value : [...value, user.id]);
  };

  const action = async (name, extra = {}) => {
    const { busyKey, ...payload } = extra;
    setBusy(busyKey || name);
    setError('');
    try {
      const response = await fetch('/api/ssr/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, taskId: task.id, actorId: currentUser.id, ...payload }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update task');
      onUpdated(data);
      window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { taskId: task.id, postId: task.postId } }));
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  };

  const updateProfileStatus = (profile, profileStatus) => {
    const label = PROFILE_STATUS[profileStatus]?.label || profileStatus;
    if (['rejected', 'completed'].includes(profileStatus) && !window.confirm(`Mark this candidate profile as ${label}? This status is final.`)) return;
    action('updateProfileStatus', { profileId: profile.id, profileStatus, busyKey: `profile-${profile.id}` });
  };

  const submitProfile = async event => {
    event.preventDefault();
    if (!profileText.trim() && !file) return;
    setBusy('addProfile');
    setError('');
    try {
      const attachment = file ? await uploadChatMedia(file, setUploadProgress) : null;
      const mentions = mentionIds.filter(id => users?.[id]?.name && profileText.includes(`@${users[id].name}`));
      const response = await fetch('/api/ssr/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addProfile', taskId: task.id, actorId: currentUser.id, text: profileText, mentions, attachment }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not add profile');
      setProfileText('');
      setFile(null);
      setMentionIds([]);
      setUploadProgress(0);
      setSelectedWorkerId(currentUser.id);
      onUpdated(data);
      window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { taskId: task.id, postId: task.postId } }));
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  };

  const selectWorker = (workerId, behavior = 'smooth') => {
    setSelectedWorkerId(workerId);
    workerStrip.current?.querySelector(`[data-worker-id="${workerId}"]`)?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
  };
  const moveSelection = direction => {
    const index = Math.max(0, task.workers.findIndex(worker => worker.userId === selectedWorkerId));
    const next = task.workers[Math.min(task.workers.length - 1, Math.max(0, index + direction))];
    if (next) selectWorker(next.userId);
  };
  const handleWorkerScroll = () => {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const strip = workerStrip.current;
      if (!strip) return;
      const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
      const cards = [...strip.querySelectorAll('[data-worker-id]')];
      const closest = cards.sort((a, b) => Math.abs(a.getBoundingClientRect().left + a.clientWidth / 2 - center) - Math.abs(b.getBoundingClientRect().left + b.clientWidth / 2 - center))[0];
      if (closest?.dataset.workerId) setSelectedWorkerId(closest.dataset.workerId);
    }, 100);
  };

  return (
    <article id={`sj-task-${task.id}`} className={styles.taskCard}>
      <header className={styles.taskHeader}>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Collapse task' : 'Expand task'} className={styles.iconButton}>{expanded ? '-' : '+'}</button>
        <div className={styles.taskTitle}><div><h3>{task.title}</h3><span className={`${styles.status} ${isClosed ? styles.closed : task.status === 'in_progress' ? styles.inProgress : ''}`}>{isClosed ? 'Completed' : task.status === 'in_progress' ? 'In sourcing' : 'Open'}</span></div><p>{task.createdByName}{task.teamName ? ` | ${task.teamName}` : ''} | {formatDate(task.createdAt)}</p></div>
        <div className={styles.taskActions}>
          {!isClosed && !myWorker && <button type="button" disabled={Boolean(busy)} onClick={() => action('claim')} className={styles.joinButton}>Join sourcing</button>}
          {!isClosed && myWorker && myWorker.status !== 'completed' && <button type="button" disabled={Boolean(busy)} onClick={() => action('complete')} className={styles.completeButton}>Complete my work</button>}
          {!isClosed && task.status === 'in_progress' && <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Close this requirement permanently? It cannot be reopened.')) action('close'); }} className={styles.closeButton}>Close requirement</button>}
        </div>
      </header>

      {expanded && <div className={styles.details}>
        {task.description && <p className={styles.description}>{task.description}</p>}
        <section className={styles.section}>
          <div className={styles.sectionHeading}><strong>Sourcing order ({task.workers.length})</strong>{task.workers.length > 0 && <div className={styles.arrowControls}><button type="button" aria-label="Previous employee" onClick={() => moveSelection(-1)}>{'<'}</button><button type="button" aria-label="Next employee" onClick={() => moveSelection(1)}>{'>'}</button></div>}</div>
          {task.workers.length === 0 ? <p className={styles.empty}>No employee has joined this requirement yet.</p> : <div ref={workerStrip} onScroll={handleWorkerScroll} className={styles.workerStrip}>{task.workers.map(worker => <WorkerColumn key={worker.id} worker={worker} task={task} selected={worker.userId === selectedWorkerId} onSelect={() => selectWorker(worker.userId)} currentUser={currentUser} />)}</div>}

        </section>

        <section className={`${styles.section} ${styles.profileSection}`}>
          <div className={styles.profileHeading}><strong>{selectedWorker ? `${selectedWorker.userName}'s profiles (${visibleProfiles.length})` : `Candidate profiles (${visibleProfiles.length})`}</strong>{selectedWorker && task.profiles.length !== visibleProfiles.length && <button type="button" onClick={() => setSelectedWorkerId('all')}>View all</button>}</div>
          <div className={styles.profileList}>
            {visibleProfiles.length === 0 && <p className={styles.empty}>No profiles added by this employee yet.</p>}
            {visibleProfiles.map(profile => <ProfileRow key={profile.id} profile={profile} focused={focusProfileId === profile.id} taskClosed={isClosed} busy={Boolean(busy)} onStatusChange={updateProfileStatus} currentUser={currentUser} />)}

          </div>
        </section>

        {!isClosed && (myWorker || ['Admin', 'Super Admin'].includes(currentUser.role)) && <form onSubmit={submitProfile} className={styles.profileForm}>
          <label>Add candidate profile</label>
          <div className={styles.mentionField}><textarea value={profileText} onChange={event => setProfileText(event.target.value)} rows={3} placeholder="Add profile details. Type @ to mention an employee." />{suggestions.length > 0 && <div className={styles.suggestions}>{suggestions.map(user => <button key={user.id} type="button" onClick={() => addMention(user)}>@{user.name} <span>{user.role}</span></button>)}</div>}</div>
          <div className={styles.formActions}><input type="file" onChange={event => setFile(event.target.files?.[0] || null)} /><button type="submit" disabled={Boolean(busy) || (!profileText.trim() && !file)}>{busy === 'addProfile' ? (uploadProgress ? `Uploading ${uploadProgress}%` : 'Saving...') : 'Add profile'}</button></div>
        </form>}
        {isClosed && <div className={styles.closedNotice}>Closed by {task.closedByName || 'employee'} on {formatDate(task.closedAt)}. This status is final.</div>}
        {error && <div className={styles.error}>{error}</div>}
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
  const [focusProfileId, setFocusProfileId] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`/api/ssr/tasks?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load task board');
      setTasks(Array.isArray(data) ? data : []);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFocusTaskId(params.get('taskId') || '');
    setFocusProfileId(params.get('profileId') || '');
    load();
    const timer = window.setInterval(load, 15000);
    const refresh = event => {
      if (event.detail?.taskId) setFocusTaskId(event.detail.taskId);
      if (event.detail?.profileId) setFocusProfileId(event.detail.profileId);
      load();
    };
    window.addEventListener(TASK_EVENT, refresh);
    return () => { window.clearInterval(timer); window.removeEventListener(TASK_EVENT, refresh); };
  }, [load]);

  useEffect(() => {
    if (!focusTaskId || loading) return undefined;
    const timer = window.setTimeout(() => document.getElementById(`sj-task-${focusTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(timer);
  }, [focusTaskId, loading]);

  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.status === 'closed' : task.status !== 'closed'));
  const updateOne = updated => setTasks(list => list.map(task => task.id === updated.id ? updated : task));
  if (!currentUser || !staffRole(currentUser.role)) return <div className={styles.denied}>The Task Board is available to employees and administrators.</div>;
  return <main className={styles.page}>
    <div className={styles.pageHeader}><div><h2>Task Board</h2><p>Requirement ownership, sourcing order, profiles, and closure.</p></div><div className={styles.filters}>{[['active', 'Active'], ['completed', 'Completed'], ['all', 'All']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? styles.activeFilter : ''}>{label}</button>)}</div></div>
    {error && <div className={styles.error}>{error}</div>}
    {loading ? <p className={styles.loading}>Loading task board...</p> : visible.length === 0 ? <div className={styles.noTasks}>No {filter === 'all' ? '' : filter} requirements yet.</div> : <div className={styles.taskList}>{visible.map(task => <TaskCard key={task.id} task={task} users={users} currentUser={currentUser} uploadChatMedia={uploadChatMedia} onUpdated={updateOne} initiallyExpanded={focusTaskId === task.id} focusProfileId={focusTaskId === task.id ? focusProfileId : ''} />)}</div>}
  </main>;
}
