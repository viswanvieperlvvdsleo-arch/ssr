'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../AppContext';
import { checkoutServerAccess } from '../razorpayCheckout';
import PaymentHistory from '../PaymentHistory';
import CompanyChat from './CompanyChat';
import styles from './workspace.module.css';

const TEAM_PERMISSIONS = [
  ['post_feeds', 'Post requirements'],
  ['view_chats', 'View company chats'],
  ['arrange_meetings', 'Arrange meetings'],
  ['request_access', 'Manage requests'],
];
const FEED_TABS = ['All', 'Internal Feed', 'Requirements', 'Announcements', 'Training Updates', 'Discussions', 'Videos'];

function phoneFromText(value) {
  const digits = String(value || '').match(/(?:\+?\d[\s-]?){8,15}/)?.[0]?.replace(/[^\d+]/g, '');
  return digits && digits.replace(/\D/g, '').length >= 6 ? digits : '';
}

async function readResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export default function CompanyWorkspace() {
  const { logout } = useApp();
  const router = useRouter();
  return <main className={styles.page}><div className={styles.inner}>
    <div className={styles.sectionHead}><h1>Company Administration</h1></div>
    <p role="status">Coming in V2.</p>
    <button type="button" className={styles.primaryAction} onClick={() => { logout(); router.replace('/ssr-app'); }}>Back to login</button>
  </div></main>;
}

function CompanyWorkspaceV2() {
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('feed');
  const [feedTab, setFeedTab] = useState('All');
  const [company, setCompany] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [publicPosts, setPublicPosts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [chatPeople, setChatPeople] = useState([]);
  const [services, setServices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', date: '', endDate: '', time: '', endTime: '', meetingType: 'internal', externalProvider: 'Zoom', externalLink: '', externalMeetingId: '', externalPassword: '', participantIds: [] });
  const [search, setSearch] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [form, setForm] = useState({ cc: '', subject: '', body: '', signature: '' });
  const [feedForm, setFeedForm] = useState({ title: '', content: '' });
  const [commentPostId, setCommentPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '', password: '', permissions: [] });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeEdits, setEmployeeEdits] = useState({ name: '', permissions: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverAccess, setServerAccess] = useState(null);

  // AppContext restores the signed-in account from browser storage after hydration.
  // Keep the server and first browser render empty so React can hydrate reliably.
  useEffect(() => { setMounted(true); }, []);

  const loadRequirements = useCallback(async () => {
    if (!currentUser?.companyId) return;
    try { setRequirements(await readResponse(await fetch('/api/ssr/requirements', { cache: 'no-store' }))); }
    catch (loadError) { setError(loadError.message); }
  }, [currentUser?.companyId]);

  const loadFeed = useCallback(async () => {
    if (!currentUser?.companyId) return;
    try { setFeedPosts(await readResponse(await fetch('/api/ssr/company-feed', { cache: 'no-store' }))); }
    catch (loadError) { setError(loadError.message); }
  }, [currentUser?.companyId]);

  const loadPublicFeed = useCallback(async () => {
    if (!currentUser?.companyId) return;
    try { setPublicPosts(await readResponse(await fetch('/api/ssr/company-feed?scope=public', { cache: 'no-store' }))); }
    catch (loadError) { setError(loadError.message); }
  }, [currentUser?.companyId]);

  const loadMeetings = useCallback(async () => {
    if (!currentUser?.id) return;
    try { setMeetings(await readResponse(await fetch(`/api/ssr/meetings?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' }))); }
    catch (loadError) { setError(loadError.message); }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.companyId) { router.replace('/ssr-app'); return; }
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    if (['requirements', 'tokens', 'feed', 'tasks', 'services', 'history'].includes(requestedSection) || (requestedSection === 'team' && currentUser.role === 'Admin')) setTab(requestedSection);
    Promise.all([
      fetch('/api/ssr/company', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/requirements', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/company-feed', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/company-feed?scope=public', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/courses', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/company-users', { cache: 'no-store' }).then(readResponse),
      fetch('/api/ssr/company-users?scope=chat', { cache: 'no-store' }).then(readResponse),
      fetch(`/api/ssr/meetings?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' }).then(readResponse),
    ]).then(([companyResult, requirementsResult, feedResult, publicResult, servicesResult, employeesResult, chatPeopleResult, meetingsResult]) => {
      setCompany(companyResult);
      setRequirements(requirementsResult);
      setFeedPosts(feedResult);
      setPublicPosts(publicResult);
      setServices(servicesResult.filter(service => service.serviceType === 'server'));
      if (employeesResult) setEmployees(employeesResult);
      setChatPeople(chatPeopleResult);
      setMeetings(meetingsResult);
    }).catch(loadError => setError(loadError.message));
  }, [currentUser?.id, currentUser?.companyId, currentUser?.role, router]);

  useEffect(() => {
    const interval = window.setInterval(() => { loadRequirements(); loadFeed(); loadPublicFeed(); loadMeetings(); }, 15000);
    return () => window.clearInterval(interval);
  }, [loadRequirements, loadFeed, loadPublicFeed, loadMeetings]);

  if (!mounted || !currentUser?.companyId) return null;
  const isAdmin = currentUser.role === 'Admin';
  const canPost = isAdmin || currentUser.permissions?.includes('post_feeds') || currentUser.permissions?.includes('all_access');
  const visibleRequirements = requirements.filter(item => [item.token, item.title, item.senderName, item.status].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  const selectedRequirement = requirements.find(item => item.token === selectedToken);
  const savedPosts = [...feedPosts, ...publicPosts].filter((post, index, list) => post.savedBy?.includes(currentUser.id) && list.findIndex(item => item.id === post.id) === index);
  const displayedPosts = feedTab === 'Internal Feed'
    ? feedPosts
    : feedTab === 'Requirements'
      ? requirements.map(item => ({ id: item.id, title: item.title, content: item.description, authorName: item.senderName, createdAt: item.createdAt, status: item.status, token: item.token, category: 'Requirement' }))
      : publicPosts.filter(post => feedTab === 'All' || post.category === feedTab);

  const submitRequirement = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readResponse(await fetch('/api/ssr/requirements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }));
      setNotice(`Requirement ${result.token} submitted. ${result.emailStatus === 'sent' ? 'Email sent.' : result.emailStatus === 'failed' ? 'Email delivery failed; SJ was notified in the app.' : 'Email is not configured; SJ was notified in the app.'}`);
      setForm({ cc: '', subject: '', body: '', signature: '' });
      setSelectedToken(result.token);
      await loadRequirements();
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  const submitFeedPost = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await readResponse(await fetch('/api/ssr/company-feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedForm) }));
      setFeedForm({ title: '', content: '' });
      setNotice('Posted to your company feed.');
      await loadFeed();
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  const updatePost = async (post, action, comment = null) => {
    setError('');
    try {
      const updated = await readResponse(await fetch('/api/ssr/posts', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, action, userId: currentUser.id, ...(comment ? { comment: { text: comment } } : {}) }),
      }));
      const replace = items => items.map(item => item.id === updated.id ? updated : item);
      setFeedPosts(replace);
      setPublicPosts(replace);
      return updated;
    } catch (updateError) { setError(updateError.message); return null; }
  };

  const sharePost = async post => {
    const url = `${window.location.origin}/ssr-app/company?post=${encodeURIComponent(post.id)}`;
    try { await navigator.clipboard.writeText(url); setNotice('Post link copied.'); }
    catch { setNotice('Copy this post link: ' + url); }
  };

  const createMeeting = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const meeting = await readResponse(await fetch('/api/ssr/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...meetingForm, hostId: currentUser.id, participants: meetingForm.participantIds, recurrence: 'none', duration: '1 hour' }),
      }));
      setMeetings(items => [meeting, ...items]);
      setMeetingForm({ title: '', date: '', endDate: '', time: '', endTime: '', meetingType: 'internal', externalProvider: 'Zoom', externalLink: '', externalMeetingId: '', externalPassword: '', participantIds: [] });
      setShowMeetingForm(false);
      setNotice('Meeting created and selected company accounts were notified.');
    } catch (createError) { setError(createError.message); }
    finally { setBusy(false); }
  };

  const joinMeeting = async meeting => {
    if (meeting.meetingType === 'external') {
      try {
        const result = await readResponse(await fetch('/api/ssr/meetings/external-join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId: meeting.id, userId: currentUser.id }) }));
        window.open(result.link, '_blank', 'noopener,noreferrer');
      } catch (joinError) { setError(joinError.message); }
      return;
    }
    router.push(`/ssr-app/meeting/${encodeURIComponent(meeting.meetingCode || meeting.id)}`);
  };

  const addEmployee = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const employee = await readResponse(await fetch('/api/ssr/company-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(employeeForm) }));
      setEmployees(items => [...items, employee]);
      setEmployeeForm({ name: '', email: '', password: '', permissions: [] });
      setNotice(`${employee.name} can now sign in with the Employee role.`);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  const updateEmployee = async (employee, updates) => {
    setError(''); setNotice('');
    try {
      const updated = await readResponse(await fetch('/api/ssr/company-users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: employee.id, ...updates }) }));
      setEmployees(items => items.map(item => item.id === updated.id ? updated : item));
      setEditingEmployee(null);
    } catch (updateError) { setError(updateError.message); }
  };

  const buyServer = async (service, plan) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await checkoutServerAccess({ courseId: service.id, user: currentUser, plan });
      setNotice('Payment confirmed. Open Payment History for the delivery record.');
      setTab('history');
    } catch (checkoutError) { setError(checkoutError.message); }
    finally { setBusy(false); }
  };

  const viewServerAccess = async bookingId => {
    setError('');
    try {
      const result = await readResponse(await fetch(`/api/ssr/company-server-access?bookingId=${encodeURIComponent(bookingId)}`, { cache: 'no-store' }));
      setServerAccess(result);
    } catch (accessError) { setError(accessError.message); }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}><img src="/logo/192.png" alt="SJ Info Business Solutions" /><div><strong>SJ INFO BUSINESS SOLUTIONS</strong><span>{company?.name || 'Company workspace'}</span></div></div>
        <div className={styles.search}><span>Search your company workspace</span></div>
        <div className={styles.account}><span className={styles.accountAvatar}>{currentUser.initials || currentUser.name?.slice(0, 1)}</span><div><strong>{currentUser.name}</strong><small>{isAdmin ? 'Company Admin' : 'Employee'}</small></div><button type="button" onClick={() => { logout(); router.replace('/ssr-app'); }}>Log out</button></div>
      </header>
      <div className={styles.shell}>
        <nav className={styles.sidebar} aria-label="Company pages">
          <p>{company?.name || 'Company'}</p>
          {[['feed', 'Feed'], ['chat', 'Admin Service'], ['services', 'Services'], ['meetings', 'Meetings'], ['bookmarks', 'Bookmarks'], ['settings', 'Settings'], ...(isAdmin ? [['team', 'Team']] : []), ['requirements', 'Requirements'], ['tokens', 'Tokens'], ['history', 'Payment History'], ['tasks', 'Task Board']].map(([id, label]) => <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setError(''); setNotice(''); }}><span>{label.slice(0, 1)}</span>{label}</button>)}
        </nav>
        <div className={styles.inner}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {notice && <div className={styles.notice} role="status">{notice}</div>}

        {tab === 'feed' && <main className={styles.feedLayout}><section className={styles.feedColumn}><div className={styles.sectionHead}><div><h1>Home Feed</h1><p>{feedTab === 'Internal Feed' ? `${company?.name || 'Company'} private updates` : 'Public posts from SJ Info Business Solutions'}</p></div>{feedTab === 'Internal Feed' && canPost && <button type="button" className={styles.primaryAction} onClick={() => document.getElementById('company-internal-post')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>+ Create Post</button>}</div>
          <div className={styles.feedTabs}>{FEED_TABS.map(label => <button type="button" key={label} className={feedTab === label ? styles.feedTabActive : ''} onClick={() => setFeedTab(label)}>{label}</button>)}</div>
          {feedTab === 'Internal Feed' && canPost && <form id="company-internal-post" className={styles.form} onSubmit={submitFeedPost}><h2>New internal update</h2><label>Title<input required maxLength={160} value={feedForm.title} onChange={event => setFeedForm(value => ({ ...value, title: event.target.value }))} /></label><label>Message<textarea required rows={4} maxLength={5000} value={feedForm.content} onChange={event => setFeedForm(value => ({ ...value, content: event.target.value }))} /></label><button type="submit" disabled={busy}>{busy ? 'Posting...' : 'Post to Internal Feed'}</button></form>}
          {displayedPosts.map(post => <article className={styles.feedCard} key={post.id}><div className={styles.feedAuthor}><span>{String(post.authorName || 'SJ').slice(0, 1).toUpperCase()}</span><div><strong>{post.authorName || 'SJ Info Business Solutions'}</strong><small>{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</small></div><em>{post.token || post.category || 'ANNOUNCEMENT'}</em></div><h2>{post.title}</h2><p>{post.content}</p>{post.image && <img src={post.image} alt="" />}{post.status && <small className={styles.status}>{String(post.status).replaceAll('_', ' ')}</small>}{!post.token && <><div className={styles.feedActions}><button type="button" onClick={() => updatePost(post, 'toggleLike')}>{post.likedBy?.includes(currentUser.id) ? 'Liked' : 'Like'} {post.likes || 0}</button><button type="button" onClick={() => { setCommentPostId(commentPostId === post.id ? null : post.id); setCommentText(''); }}>Comment {post.commentsList?.length || post.comments || 0}</button><button type="button" onClick={() => sharePost(post)}>Share</button><button type="button" className={styles.saveAction} onClick={() => updatePost(post, 'toggleSave')}>{post.savedBy?.includes(currentUser.id) ? 'Saved' : 'Save'}</button></div>{commentPostId === post.id && <div className={styles.feedComments}>{(post.commentsList || []).map(comment => <p key={comment.id}><strong>{comment.authorName || 'Account'}</strong> {comment.text}</p>)}<form onSubmit={async event => { event.preventDefault(); const value = commentText.trim(); if (!value) return; const updated = await updatePost(post, 'addComment', value); if (updated) { setCommentText(''); } }}><input value={commentText} onChange={event => setCommentText(event.target.value)} maxLength={2000} placeholder="Write a comment..." /><button type="submit" disabled={!commentText.trim()}>Post</button></form></div>}</>}</article>)}
          {displayedPosts.length === 0 && <p className={styles.empty}>{feedTab === 'Internal Feed' ? 'No company updates yet.' : feedTab === 'Requirements' ? 'No requirements submitted yet.' : 'No public posts in this category yet.'}</p>}
        </section><aside className={styles.feedChat}><CompanyChat currentUser={currentUser} people={chatPeople} /></aside></main>}
        {tab === 'tasks' && <main><div className={styles.sectionHead}><div><h1>Task Board</h1><p>Progress on requirements submitted by your company.</p></div><span>{requirements.length} tasks</span></div>
          {requirements.map(item => <article key={item.id} className={styles.detail}><h2>{item.title}</h2><p><strong>{item.token}</strong> | {item.status.replaceAll('_', ' ')}</p><p>Submitted by {item.senderName} on {new Date(item.createdAt).toLocaleString()}</p><p>Sourcing: {item.workers.length ? item.workers.map(worker => `${worker.userName} (${worker.status})`).join(', ') : 'Not assigned yet'}</p><h3 style={{ fontSize: 14 }}>Candidate profiles ({item.profiles.length})</h3>{item.profiles.map(profile => { const phone = phoneFromText(profile.text); return <p key={profile.id}><strong>{profile.addedByName}</strong> | {(profile.status || 'new').replaceAll('_', ' ')}<br />{profile.text}{profile.attachment?.mediaId && <><br /><a href={`/api/ssr/company-profile-media/${profile.attachment.mediaId}`} target="_blank" rel="noreferrer">View attachment</a></>}{phone && <><br /><a className={styles.profileCall} href={`tel:${phone}`}>Call profile</a></>}</p>; })}</article>)}
          {requirements.length === 0 && <p className={styles.empty}>No requirements submitted yet.</p>}
        </main>}
        {tab === 'requirements' && <main>
          <div className={styles.sectionHead}><div><h1>Requirements</h1><p>Track every request with its unique token.</p></div><span>{requirements.length} total</span></div>
          {canPost && <form className={styles.form} onSubmit={submitRequirement}>
            <h2>New requirement</h2>
            <div className={styles.fields}><label>Your email<input value={currentUser.email || ''} readOnly /></label><label>CC<input type="text" value={form.cc} onChange={event => setForm(value => ({ ...value, cc: event.target.value }))} placeholder="name@example.com" /></label></div>
            <label>Subject<input required maxLength={160} value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} /></label>
            <label>Body<textarea required rows={5} maxLength={10000} value={form.body} onChange={event => setForm(value => ({ ...value, body: event.target.value }))} /></label>
            <label>Signature<textarea rows={2} maxLength={1000} value={form.signature} onChange={event => setForm(value => ({ ...value, signature: event.target.value }))} /></label>
            <button type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit requirement'}</button>
          </form>}
          <div className={styles.listHead}><h2>Submitted requirements</h2><input type="search" aria-label="Search requirements" placeholder="Search token, title, sender, or status" value={search} onChange={event => setSearch(event.target.value)} /></div>
          <div className={styles.tableWrap}><table><thead><tr><th>Token</th><th>Subject</th><th>Sent by</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>{visibleRequirements.map(item => <tr key={item.id}><td><strong>{item.token}</strong></td><td>{item.title}</td><td>{item.senderName}</td><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.status.replaceAll('_', ' ')}</td><td><button type="button" onClick={() => setSelectedToken(item.token)}>View</button></td></tr>)}</tbody></table>{visibleRequirements.length === 0 && <p className={styles.empty}>No requirements found.</p>}</div>
          {selectedRequirement && <section className={styles.detail}><button type="button" className={styles.close} onClick={() => setSelectedToken(null)} aria-label="Close details">x</button><h2>{selectedRequirement.title}</h2><p><strong>{selectedRequirement.token}</strong> · {selectedRequirement.status.replaceAll('_', ' ')}</p><p>{selectedRequirement.description}</p><p>Sent by {selectedRequirement.senderName} on {new Date(selectedRequirement.createdAt).toLocaleString()}</p><p>Email: {selectedRequirement.emailStatus === 'sent' ? 'Sent' : selectedRequirement.emailStatus === 'failed' ? 'Failed' : 'Not configured'}</p></section>}
        </main>}

        {tab === 'tokens' && <main><div className={styles.sectionHead}><div><h1>Tokens</h1><p>Only your company requirements and their current task progress.</p></div><span>{requirements.length} total</span></div><div className={styles.listHead}><h2>Requirement progress</h2><input type="search" aria-label="Search tokens" placeholder="Search token, title, sender, or status" value={search} onChange={event => setSearch(event.target.value)} /></div><div className={styles.tableWrap}><table><thead><tr><th>Token</th><th>Requirement</th><th>Status</th><th>Sourcing</th><th>Profiles</th><th></th></tr></thead><tbody>{visibleRequirements.map(item => <tr key={item.id}><td><strong>{item.token}</strong></td><td>{item.title}</td><td>{item.status.replaceAll('_', ' ')}</td><td>{item.workers.length}</td><td>{item.profiles.length}</td><td><button type="button" onClick={() => setTab('tasks')}>View task</button></td></tr>)}</tbody></table>{visibleRequirements.length === 0 && <p className={styles.empty}>No tokens found.</p>}</div></main>}

        {tab === 'chat' && <main><CompanyChat currentUser={currentUser} people={chatPeople} /></main>}

        {tab === 'bookmarks' && <main><div className={styles.sectionHead}><div><h1>Bookmarks</h1><p>Your saved SJ public posts and company updates.</p></div><span>{savedPosts.length} saved</span></div>{savedPosts.map(post => <article className={styles.feedCard} key={post.id}><div className={styles.feedAuthor}><span>{String(post.authorName || 'SJ').slice(0, 1).toUpperCase()}</span><div><strong>{post.authorName || 'SJ Info Business Solutions'}</strong><small>{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</small></div><em>{post.category || 'ANNOUNCEMENT'}</em></div><h2>{post.title}</h2><p>{post.content}</p>{post.image && <img src={post.image} alt="" />}<div className={styles.feedActions}><button type="button" onClick={() => updatePost(post, 'toggleSave')}>Remove saved item</button><button type="button" onClick={() => sharePost(post)}>Share</button></div></article>)}{!savedPosts.length && <p className={styles.empty}>No saved posts yet. Use Save on a feed post to keep it here.</p>}</main>}
        {tab === 'settings' && <main><div className={styles.sectionHead}><div><h1>Settings</h1><p>Your company account is managed by your Company Admin.</p></div></div><section className={styles.detail}><h2>{currentUser.name}</h2><p>{currentUser.email || ''} | {isAdmin ? 'Company Admin' : 'Company Employee'}</p></section></main>}
        {tab === 'meetings' && <main><div className={styles.sectionHead}><div><h1>Meetings</h1><p>Internal and external meetings assigned to your company accounts.</p></div>{(isAdmin || currentUser.permissions?.includes('arrange_meetings') || currentUser.permissions?.includes('all_access')) && <button type="button" className={styles.primaryAction} onClick={() => setShowMeetingForm(value => !value)}>{showMeetingForm ? 'Close planner' : 'Plan meeting'}</button>}</div>{showMeetingForm && <form className={styles.form} onSubmit={createMeeting}><h2>Plan meeting</h2><label>Meeting title<input required maxLength={160} value={meetingForm.title} onChange={event => setMeetingForm(value => ({ ...value, title: event.target.value }))} /></label><div className={styles.fields}><label>Start date<input required type="date" value={meetingForm.date} onChange={event => setMeetingForm(value => ({ ...value, date: event.target.value, endDate: value.endDate || event.target.value }))} /></label><label>End date<input required type="date" value={meetingForm.endDate} onChange={event => setMeetingForm(value => ({ ...value, endDate: event.target.value }))} /></label><label>Start time<input required type="time" value={meetingForm.time} onChange={event => setMeetingForm(value => ({ ...value, time: event.target.value }))} /></label><label>End time<input required type="time" value={meetingForm.endTime} onChange={event => setMeetingForm(value => ({ ...value, endTime: event.target.value }))} /></label></div><fieldset><legend>Meeting type</legend><div className={styles.checks}>{[['internal', 'SJ internal meeting'], ['external', 'External link']].map(([value, label]) => <label key={value}><input type="radio" name="meeting-type" checked={meetingForm.meetingType === value} onChange={() => setMeetingForm(previous => ({ ...previous, meetingType: value }))} />{label}</label>)}</div></fieldset>{meetingForm.meetingType === 'external' && <div className={styles.fields}><label>Provider<select value={meetingForm.externalProvider} onChange={event => setMeetingForm(value => ({ ...value, externalProvider: event.target.value }))}><option>Zoom</option><option>JioMeet</option><option>Google Meet</option><option>Microsoft Teams</option><option>Other</option></select></label><label>Meeting link<input required type="url" placeholder="https://..." value={meetingForm.externalLink} onChange={event => setMeetingForm(value => ({ ...value, externalLink: event.target.value }))} /></label><label>Meeting ID<input value={meetingForm.externalMeetingId} onChange={event => setMeetingForm(value => ({ ...value, externalMeetingId: event.target.value }))} /></label><label>Password<input value={meetingForm.externalPassword} onChange={event => setMeetingForm(value => ({ ...value, externalPassword: event.target.value }))} /></label></div>}<fieldset><legend>Notify company accounts</legend><div className={styles.checks}>{employees.filter(employee => employee.id !== currentUser.id && !employee.restricted).map(employee => <label key={employee.id}><input type="checkbox" checked={meetingForm.participantIds.includes(employee.id)} onChange={event => setMeetingForm(value => ({ ...value, participantIds: event.target.checked ? [...value.participantIds, employee.id] : value.participantIds.filter(id => id !== employee.id) }))} />{employee.name} ({employee.role})</label>)}</div></fieldset><button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create and notify'}</button></form>}<div className={styles.meetingList}>{meetings.map(meeting => <article className={styles.meetingCard} key={meeting.id}><div><small>{meeting.meetingType === 'external' ? meeting.externalProvider || 'External meeting' : 'SJ internal meeting'}</small><h2>{meeting.title}</h2><p>{meeting.date} | {meeting.time} to {meeting.endTime} | {meeting.participants?.length || 0} invited</p></div><button type="button" onClick={() => joinMeeting(meeting)}>Join</button></article>)}</div>{!meetings.length && <p className={styles.empty}>No meetings assigned to your account yet.</p>}</main>}

        {tab === 'team' && isAdmin && <main>
          <div className={styles.sectionHead}><div><h1>Company team</h1><p>Only accounts in {company?.name || 'your company'} appear here.</p></div><span>{employees.length} accounts</span></div>
          <form className={styles.form} onSubmit={addEmployee}><h2>Create employee</h2><div className={styles.fields}><label>Name<input required value={employeeForm.name} onChange={event => setEmployeeForm(value => ({ ...value, name: event.target.value }))} /></label><label>Email<input required type="email" value={employeeForm.email} onChange={event => setEmployeeForm(value => ({ ...value, email: event.target.value }))} /></label></div><label>Temporary password<input required type="text" minLength={8} value={employeeForm.password} onChange={event => setEmployeeForm(value => ({ ...value, password: event.target.value }))} /></label><fieldset><legend>Permissions</legend><div className={styles.checks}>{TEAM_PERMISSIONS.map(([id, label]) => <label key={id}><input type="checkbox" checked={employeeForm.permissions.includes(id)} onChange={event => setEmployeeForm(value => ({ ...value, permissions: event.target.checked ? [...value.permissions, id] : value.permissions.filter(item => item !== id) }))} />{label}</label>)}</div></fieldset><button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create employee'}</button></form>
          <div className={styles.listHead}><h2>Accounts</h2></div><div className={styles.tableWrap}><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th></th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td>{employee.name}</td><td>{employee.email}</td><td>{employee.role}</td><td>{employee.role === 'Admin' ? 'Company admin' : employee.permissions.join(', ') || 'Standard'}</td><td>{employee.role === 'Employee' && <div style={{ display: 'flex', gap: 6 }}><button type="button" onClick={() => { setEditingEmployee(employee.id); setEmployeeEdits({ name: employee.name, permissions: employee.permissions || [] }); }}>Edit</button><button type="button" onClick={() => updateEmployee(employee, { restricted: !employee.restricted })}>{employee.restricted ? 'Restore' : 'Restrict'}</button></div>}</td></tr>)}</tbody></table></div>
          {editingEmployee && <form className={styles.form} style={{ marginTop: 18 }} onSubmit={event => { event.preventDefault(); const employee = employees.find(item => item.id === editingEmployee); if (employee) updateEmployee(employee, employeeEdits); }}><h2>Edit employee</h2><label>Name<input required value={employeeEdits.name} onChange={event => setEmployeeEdits(value => ({ ...value, name: event.target.value }))} /></label><fieldset><legend>Permissions</legend><div className={styles.checks}>{TEAM_PERMISSIONS.map(([id, label]) => <label key={id}><input type="checkbox" checked={employeeEdits.permissions.includes(id)} onChange={event => setEmployeeEdits(value => ({ ...value, permissions: event.target.checked ? [...value.permissions, id] : value.permissions.filter(item => item !== id) }))} />{label}</label>)}</div></fieldset><div style={{ display: 'flex', gap: 8 }}><button type="submit">Save changes</button><button type="button" onClick={() => setEditingEmployee(null)} style={{ background: '#64748b' }}>Cancel</button></div></form>}
        </main>}

        {tab === 'services' && <main><div className={styles.sectionHead}><div><h1>Server Access</h1><p>Managed server access offered by SJ Info Business Solutions.</p></div><span>{services.length} available</span></div><div className={styles.services}>{services.map(service => <article key={service.id} className={styles.service}>{service.image ? <img className={styles.serviceImage} src={service.image} alt="" /> : <div className={styles.servicePlaceholder}>SJ<br />SERVER</div>}<div className={styles.serviceBody}><div className={styles.serviceTags}><span>Server access</span>{service.module && <span>{service.module}</span>}{service.moduleType && <span>{service.moduleType}</span>}</div><h2>{service.title}</h2><p>{service.shortDesc || service.fullDesc || 'Secure access managed by SJ Info Business Solutions.'}</p><div className={styles.plans}>{(Array.isArray(service.pricePlans) ? service.pricePlans : []).map(plan => <button type="button" key={plan.months} disabled={busy || Number(service.credentialCount || 0) < 1} onClick={() => buyServer(service, plan)}>{plan.months} {Number(plan.months) === 1 ? 'month' : 'months'} | Rs. {Number(plan.discountPrice || 0).toLocaleString('en-IN')}</button>)}</div>{Number(service.credentialCount || 0) < 1 ? <span className={styles.outOfStock}>Out of stock</span> : <span className={styles.inStock}>Access available</span>}</div></article>)}</div>{services.length === 0 && <p className={styles.empty}>No server access is available right now.</p>}</main>}
        {tab === 'history' && <main><PaymentHistory currentUser={currentUser} onNavigateToChat={viewServerAccess} />{serverAccess && <section className={styles.detail}><button type="button" className={styles.close} aria-label="Close server access" onClick={() => setServerAccess(null)}>x</button><h2>{serverAccess.title}</h2><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{serverAccess.credential}</pre></section>}</main>}
        </div>
      </div>
    </div>
  );
}
