'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './meetings.module.css';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const Icons = {
  video: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>,
  join: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 8l4 4-4 4"/><path d="M19 12H8"/><path d="M11 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6"/></svg>,
  calendar: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>,
  chevron: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>,
  mic: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>,
  micOff: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 2 20 20M9 9v1a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 10.59 6M12 19v3M8 22h8"/></svg>,
  videoOff: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 2 20 20M10.66 5H14a2 2 0 0 1 2 2v3l5-3v10l-3.1-1.86M14 19H5a2 2 0 0 1-2-2V7c0-.55.22-1.05.59-1.41"/></svg>,
  copy: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  chart: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>,
};

const REPORT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseMeetingTime(meeting) {
  if (!meeting?.date) return null;
  const time = /^\d{2}:\d{2}/.test(meeting.time || '') ? meeting.time.slice(0, 5) : '00:00';
  const value = new Date(`${meeting.date}T${time}:00`);
  if (Number.isNaN(value.getTime())) return null;

  if (/^\d{2}:\d{2}$/.test(meeting.endTime || '')) {
    const [endHour, endMinute] = meeting.endTime.split(':').map(Number);
    value.setHours(endHour, endMinute, 0, 0);
    return value;
  }

  const duration = String(meeting.duration || '').match(/([\d.]+)\s*(hour|hr|minute|min)/i);
  if (duration) {
    const unit = duration[2].toLowerCase();
    const minutes = Number(duration[1]) * (unit.startsWith('h') ? 60 : 1);
    value.setMinutes(value.getMinutes() + minutes);
  }
  return value;
}

function isPastMeeting(meeting, now) {
  if (['completed', 'cancelled', 'past'].includes(String(meeting.status || '').toLowerCase())) return true;
  if (meeting.expiresAt) return new Date(meeting.expiresAt) < now;
  if (meeting.recurrence && meeting.recurrence !== 'none' && meeting.endDate) {
    const recurringEnd = new Date(`${meeting.endDate}T23:59:59`);
    if (!Number.isNaN(recurringEnd.getTime())) return recurringEnd < now;
  }
  const end = parseMeetingTime(meeting);
  return end ? end < now : false;
}

function nextOccurrenceDate(meeting, now) {
  const recurrence = String(meeting?.recurrence || 'none').toLowerCase();
  if (recurrence === 'none') return meeting?.date || '';

  const start = new Date(`${meeting.date}T00:00:00`);
  const end = meeting.endDate ? new Date(`${meeting.endDate}T23:59:59`) : null;
  if (Number.isNaN(start.getTime())) return meeting?.date || '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let candidate = start > today ? new Date(start) : today;

  const isAllowed = date => {
    if (recurrence === 'daily') return true;
    if (recurrence === 'weekly') {
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      return !meeting.weekdays?.length || meeting.weekdays.includes(weekday);
    }
    if (recurrence === 'monthly') {
      const dates = String(meeting.monthlyDates || '').split(',').map(value => Number(value.trim())).filter(Boolean);
      return !dates.length || dates.includes(date.getDate());
    }
    return true;
  };

  for (let offset = 0; offset < 370; offset += 1) {
    if ((!end || candidate <= end) && isAllowed(candidate)) return dateKey(candidate);
    candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 1);
    if (end && candidate > end) break;
  }
  return meeting?.endDate || meeting?.date || '';
}

function dateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function meetingDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || 'Date not set';
  const today = new Date();
  const todayKey = dateKey(today);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (dateKey(date) === todayKey) return `Today, ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (dateKey(date) === dateKey(tomorrow)) return `Tomorrow, ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function Calendar({ month, selectedDate, onMonthChange, onSelectDate }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const today = dateKey(new Date());
  const cells = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: days }, (_, index) => index + 1));

  return (
    <div className={styles.calendarPanel}>
      <div className={styles.monthHeader}>
        <button type="button" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))} aria-label="Previous month" title="Previous month">{Icons.chevron}</button>
        <strong>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className={styles.nextIcon} onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))} aria-label="Next month" title="Next month">{Icons.chevron}</button>
      </div>
      <div className={styles.calendarGrid}>
        {WEEKDAYS.map((day, index) => <span className={styles.weekday} key={`${day}-${index}`}>{day}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const value = dateKey(new Date(year, monthIndex, day));
          const selected = value === selectedDate;
          return (
            <button
              type="button"
              key={value}
              className={`${styles.dayButton} ${selected ? styles.selectedDay : ''} ${value === today ? styles.today : ''}`}
              onClick={() => onSelectDate(selected ? '' : value)}
              aria-label={`Show meetings on ${value}`}
              aria-pressed={selected}
            >
              {day}
            </button>
          );
        })}
      </div>
      {selectedDate && <button type="button" className={styles.clearDate} onClick={() => onSelectDate('')}>Show all dates</button>}
    </div>
  );
}

function JoinMeetingDialog({ onClose, onJoin }) {
  const [meetingInput, setMeetingInput] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const continueToMeeting = event => {
    event.preventDefault();
    const input = meetingInput.trim();
    const match = input.match(/\/meeting\/([^/?#]+)/i);
    const code = decodeURIComponent(match?.[1] || input.replace(/\s/g, ''));
    if (!code) return setFormError('Enter a meeting link or meeting ID.');
    onJoin(code, password);
  };

  return (
    <div className={styles.lobbyOverlay} role="dialog" aria-modal="true" aria-label="Join meeting">
      <form className={styles.joinDialog} onSubmit={continueToMeeting}>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close" title="Close">{Icons.close}</button>
          <span className={styles.eyebrow}>SJ MEETING</span>
          <h2>Join a meeting</h2>
          <label htmlFor="meeting-link">Meeting ID or link</label>
          <input id="meeting-link" value={meetingInput} onChange={event => setMeetingInput(event.target.value)} placeholder="Enter ID or paste SJ meeting link" autoFocus />
          <label htmlFor="meeting-password">Password</label>
          <input id="meeting-password" type="password" value={password} onChange={event => setPassword(event.target.value.toUpperCase())} placeholder="Enter meeting password" />
          {formError && <p className={styles.formError}>{formError}</p>}
          <button type="submit" className={styles.primaryButton}>Continue</button>
      </form>
    </div>
  );
}

function TrainingReportDialog({ meeting, existingReport, users, currentUser, onClose, onSaved, onDeleted }) {
  const availablePeople = useMemo(() => {
    const ids = [...new Set([meeting.hostId, ...(meeting.participants || [])])];
    return ids.map(id => users[id]).filter(user => user && !user.restricted).sort((left, right) => {
      if (left.role === 'Trainer' && right.role !== 'Trainer') return -1;
      if (right.role === 'Trainer' && left.role !== 'Trainer') return 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
  }, [meeting.hostId, meeting.participants, users]);
  const availableIds = useMemo(() => new Set(availablePeople.map(user => user.id)), [availablePeople]);
  const [totalDays, setTotalDays] = useState(existingReport?.totalDays || 1);
  const [weekdays, setWeekdays] = useState(existingReport?.weekdays?.length ? existingReport.weekdays : meeting.weekdays?.length ? meeting.weekdays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [trainerId, setTrainerId] = useState(existingReport?.trainerId && availableIds.has(existingReport.trainerId) ? existingReport.trainerId : meeting.hostId);
  const [memberIds, setMemberIds] = useState(() => {
    const existing = existingReport?.memberIds?.filter(id => availableIds.has(id)) || [];
    return existing.length ? existing : availablePeople.map(user => user.id).filter(id => id !== (existingReport?.trainerId || meeting.hostId));
  });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const memberCandidates = availablePeople.filter(user => user.id !== trainerId && `${user.name || ''} ${user.role || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  const toggleWeekday = day => setWeekdays(previous => previous.includes(day) ? previous.filter(value => value !== day) : [...previous, day]);
  const toggleMember = userId => setMemberIds(previous => previous.includes(userId) ? previous.filter(id => id !== userId) : [...previous, userId]);
  const changeTrainer = value => {
    setTrainerId(value);
    if (value) setMemberIds(previous => previous.filter(id => id !== value));
  };

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/ssr/training-reports', {
        method: existingReport ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          meetingId: meeting.id,
          totalDays: Number(totalDays),
          weekdays,
          trainerId: trainerId || null,
          memberIds,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save training report.');
      window.dispatchEvent(new CustomEvent('sj-training-report-updated'));
      onSaved(data);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existingReport || !window.confirm(`Remove ${meeting.title} from the training dashboard? Attendance meeting records will remain available if it is connected again.`)) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/ssr/training-reports?meetingId=${encodeURIComponent(meeting.id)}&userId=${encodeURIComponent(currentUser.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete training report.');
      window.dispatchEvent(new CustomEvent('sj-training-report-updated'));
      onDeleted(meeting.id);
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
    }
  };

  return (
    <div className={styles.reportOverlay} role="dialog" aria-modal="true" aria-label={`${existingReport ? 'Edit' : 'Connect'} training report`}>
      <form className={styles.reportDialog} onSubmit={save}>
        <div className={styles.reportDialogHeader}>
          <div><span>Training dashboard</span><h2>{meeting.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close">{Icons.close}</button>
        </div>
        <div className={styles.reportDialogBody}>
          <div className={styles.reportFields}>
            <label><span>Total training days</span><input type="number" min="1" max="1000" value={totalDays} onChange={event => setTotalDays(event.target.value)} required /></label>
            <label><span>Trainer</span><select value={trainerId} onChange={event => changeTrainer(event.target.value)}><option value="">No trainer selected</option>{availablePeople.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select></label>
          </div>
          <fieldset className={styles.weekdayFieldset}>
            <legend>Training weekdays</legend>
            <div>{REPORT_WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={() => toggleWeekday(day)} /><span>{day}</span></label>)}</div>
          </fieldset>
          <div className={styles.reportMembers}>
            <div className={styles.reportMembersHeading}><div><strong>Tracked attendees</strong><span>Only accounts already invited to this meeting are available.</span></div><span>{memberIds.length} selected</span></div>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invited accounts" aria-label="Search invited accounts" />
            <div className={styles.reportMemberList}>
              {memberCandidates.map(user => <label key={user.id}><input type="checkbox" checked={memberIds.includes(user.id)} onChange={() => toggleMember(user.id)} /><span><strong>{user.name}</strong><small>{user.role}{user.id === meeting.hostId ? ' | Host' : ''}</small></span></label>)}
              {memberCandidates.length === 0 && <p>No invited accounts match this search.</p>}
            </div>
          </div>
          {error && <p className={styles.reportError}>{error}</p>}
        </div>
        <div className={styles.reportDialogFooter}>
          {existingReport && <button type="button" className={styles.removeReportButton} onClick={remove} disabled={saving}>{Icons.trash} Delete report</button>}
          <button type="submit" className={styles.saveReportButton} disabled={saving}>{saving ? 'Saving...' : existingReport ? 'Save report' : 'Connect to dashboard'}</button>
        </div>
      </form>
    </div>
  );
}

export default function MeetingsWorkspace({ currentUser, meetings = [], users = {}, onPlanMeeting, addMeeting, addMeetingParticipants, deleteMeeting }) {
  const router = useRouter();
  const [tab, setTab] = useState('upcoming');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedMeetingId, setExpandedMeetingId] = useState(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [meetingCredentials, setMeetingCredentials] = useState({});
  const [memberMeetingId, setMemberMeetingId] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [meetingActionId, setMeetingActionId] = useState(null);
  const [meetingActionError, setMeetingActionError] = useState('');
  const [trainingReports, setTrainingReports] = useState({});
  const [reportMeeting, setReportMeeting] = useState(null);
  const now = useMemo(() => new Date(), [meetings, tab]);
  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const canPlan = ['Admin', 'Super Admin'].includes(currentUser?.role) || (currentUser?.role === 'Employee' && (permissions.includes('all_access') || permissions.includes('arrange_meetings')));
  const canUseTrainingReports = ['Employee', 'Admin', 'Super Admin'].includes(currentUser?.role) && !currentUser?.restricted;

  useEffect(() => {
    if (!canUseTrainingReports || !currentUser?.id) return undefined;
    let active = true;
    const loadReports = () => fetch(`/api/ssr/training-reports?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : [])
      .then(data => { if (active && Array.isArray(data)) setTrainingReports(Object.fromEntries(data.map(report => [report.meetingId, report]))); })
      .catch(() => {});
    loadReports();
    const refresh = () => loadReports();
    window.addEventListener('sj-training-report-updated', refresh);
    return () => { active = false; window.removeEventListener('sj-training-report-updated', refresh); };
  }, [canUseTrainingReports, currentUser?.id]);

  const visibleMeetings = useMemo(() => meetings.filter(meeting => {
    if (['Employee', 'Admin', 'Super Admin'].includes(currentUser?.role) && !currentUser?.restricted) return true;
    if (meeting.hostId === currentUser?.id) return true;
    if (meeting.participants?.includes(currentUser?.id)) return true;
    return !meeting.participants;
  }), [currentUser?.id, currentUser?.restricted, currentUser?.role, meetings]);

  const filteredMeetings = useMemo(() => visibleMeetings
    .filter(meeting => (tab === 'previous') === isPastMeeting(meeting, now))
    .map(meeting => ({ ...meeting, displayDate: tab === 'upcoming' ? nextOccurrenceDate(meeting, now) : meeting.date }))
    .filter(meeting => !selectedDate || meeting.displayDate === selectedDate)
    .sort((left, right) => {
      const leftTime = parseMeetingTime({ ...left, date: left.displayDate || left.date })?.getTime() || 0;
      const rightTime = parseMeetingTime({ ...right, date: right.displayDate || right.date })?.getTime() || 0;
      return tab === 'previous' ? rightTime - leftTime : leftTime - rightTime;
    }), [now, selectedDate, tab, visibleMeetings]);

  const groupedMeetings = useMemo(() => filteredMeetings.reduce((groups, meeting) => {
    const key = meeting.displayDate || meeting.date || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(meeting);
    return groups;
  }, {}), [filteredMeetings]);

  const openInternalMeeting = (code, joinPassword = '') => {
    if (!code) return;
    if (joinPassword) sessionStorage.setItem(`ssr_meeting_password_${code}`, joinPassword);
    router.push(`/ssr-app/meeting/${encodeURIComponent(code)}`);
  };

  const startInstantMeeting = async () => {
    if (!addMeeting || startingMeeting || !canPlan) return;
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setStartingMeeting(true);
    const result = await addMeeting({
      title: `${currentUser?.name || 'Host'}'s instant meeting`,
      module: 'General',
      hostId: currentUser?.id,
      date: dateKey(now),
      endDate: dateKey(end),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      duration: '1 hour',
      status: 'upcoming',
      recurrence: 'none',
      participants: Object.keys(users).filter(id => id !== currentUser?.id),
    });
    setStartingMeeting(false);
    if (!result?.success) {
      window.alert(result?.error || 'Could not start an instant meeting.');
      return;
    }
    openInternalMeeting(result.meeting.meetingCode, result.meeting.joinPassword);
  };

  const toggleMeetingDetails = async meeting => {
    const isClosing = expandedMeetingId === meeting.id;
    setExpandedMeetingId(isClosing ? null : meeting.id);
    if (isClosing || meetingCredentials[meeting.id] || (!canPlan && meeting.hostId !== currentUser?.id)) return;
    try {
      const response = await fetch(`/api/ssr/meetings?id=${encodeURIComponent(meeting.id)}&userId=${encodeURIComponent(currentUser.id)}&includeCredentials=true`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setMeetingCredentials(previous => ({ ...previous, [meeting.id]: data.joinPassword || '' }));
    } catch { /* The room can still be joined if credential details fail to load. */ }
  };

  const copyMeetingLink = async meeting => {
    try {
      await navigator.clipboard.writeText(meeting.link || meeting.id);
      setCopiedId(meeting.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const copyInvitation = async meeting => {
    const credential = meetingCredentials[meeting.id];
    const invitation = [
      meeting.title,
      `${meeting.date} ${meeting.time} - ${meeting.endTime || ''}`,
      `Join: ${meeting.link}`,
      `Meeting ID: ${meeting.meetingCode}`,
      credential ? `Password: ${credential}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(invitation);
      setCopiedId(`invite-${meeting.id}`);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch { setCopiedId(null); }
  };

  const toggleMember = userId => {
    setSelectedMemberIds(previous => previous.includes(userId) ? previous.filter(id => id !== userId) : [...previous, userId]);
  };

  const openMemberPicker = meeting => {
    setExpandedMeetingId(meeting.id);
    setMemberMeetingId(previous => previous === meeting.id ? null : meeting.id);
    setSelectedMemberIds([]);
    setMemberSearch('');
    setMeetingActionError('');
  };

  const saveMembers = async meeting => {
    if (!selectedMemberIds.length || !addMeetingParticipants) return;
    setMeetingActionId(meeting.id);
    setMeetingActionError('');
    const result = await addMeetingParticipants(meeting.id, selectedMemberIds);
    setMeetingActionId(null);
    if (!result?.success) {
      setMeetingActionError(result?.error || 'Could not add people.');
      return;
    }
    setMemberMeetingId(null);
    setSelectedMemberIds([]);
  };

  const removeMeeting = async meeting => {
    if (!deleteMeeting || !window.confirm(`Delete ${meeting.title}? Invited people will be notified that it was cancelled.`)) return;
    setMeetingActionId(meeting.id);
    setMeetingActionError('');
    const result = await deleteMeeting(meeting.id);
    setMeetingActionId(null);
    if (!result?.success) window.alert(result?.error || 'Could not delete meeting.');
  };

  return (
    <div className={styles.workspace}>
      {showJoinDialog && <JoinMeetingDialog onClose={() => setShowJoinDialog(false)} onJoin={(code, joinPassword) => openInternalMeeting(code, joinPassword)} />}
      {reportMeeting && <TrainingReportDialog meeting={reportMeeting} existingReport={trainingReports[reportMeeting.id]} users={users} currentUser={currentUser} onClose={() => setReportMeeting(null)} onSaved={report => { setTrainingReports(previous => ({ ...previous, [report.meetingId]: report })); setReportMeeting(null); }} onDeleted={meetingId => { setTrainingReports(previous => { const next = { ...previous }; delete next[meetingId]; return next; }); setReportMeeting(null); }} />}

      <aside className={styles.sidebar}>
        <Calendar month={month} selectedDate={selectedDate} onMonthChange={setMonth} onSelectDate={setSelectedDate} />
        <div className={styles.actionSection}>
          <h3>Meeting actions</h3>
          <div className={styles.actionGrid}>
            <button type="button" onClick={startInstantMeeting} disabled={startingMeeting || !canPlan} title={canPlan ? 'Start an instant meeting' : 'Only authorized staff can start meetings'}>{Icons.video}<span>{startingMeeting ? 'Starting' : 'Start'}</span></button>
            <button type="button" onClick={() => setShowJoinDialog(true)}>{Icons.join}<span>Join</span></button>
            <button type="button" onClick={onPlanMeeting} disabled={!canPlan} title={canPlan ? 'Plan a meeting' : 'Only authorized staff can plan meetings'}>{Icons.calendar}<span>Plan</span></button>
          </div>
        </div>
      </aside>

      <main className={styles.meetingArea}>
        <div className={styles.pageHeading}>
          <div>
            <h2>Meetings</h2>
            <p>Manage scheduled sessions and join live classes.</p>
          </div>
          {canPlan && <button type="button" className={styles.planButton} onClick={onPlanMeeting}>{Icons.calendar} Plan meeting</button>}
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Meeting status">
          <button type="button" role="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming meetings</button>
          <button type="button" role="tab" aria-selected={tab === 'previous'} onClick={() => setTab('previous')}>Previous meetings</button>
        </div>

        <div className={styles.mobileDateFilter}>
          <label htmlFor="mobile-meeting-date">Meeting date</label>
          <input id="mobile-meeting-date" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} />
          {selectedDate && <button type="button" onClick={() => setSelectedDate('')}>Clear</button>}
        </div>

        <div className={styles.mobileActions}>
          <button type="button" onClick={startInstantMeeting} disabled={startingMeeting || !canPlan}>{Icons.video}<span>{startingMeeting ? 'Starting' : 'Start'}</span></button>
          <button type="button" onClick={() => setShowJoinDialog(true)}>{Icons.join}<span>Join</span></button>
          <button type="button" onClick={onPlanMeeting} disabled={!canPlan}>{Icons.calendar}<span>Plan</span></button>
        </div>

        {Object.keys(groupedMeetings).length === 0 ? (
          <div className={styles.emptyState}>
            {Icons.calendar}
            <strong>No {tab} meetings{selectedDate ? ' on this date' : ''}</strong>
            <span>{selectedDate ? 'Choose another date or show all dates.' : 'Scheduled meetings will appear here.'}</span>
          </div>
        ) : Object.entries(groupedMeetings).map(([date, dateMeetings]) => (
          <section key={date} className={styles.dateGroup}>
            <h3>{meetingDateLabel(date)}</h3>
            {dateMeetings.map(meeting => {
              const host = users[meeting.hostId];
              const expanded = expandedMeetingId === meeting.id;
              const canManage = meeting.hostId === currentUser?.id || canPlan;
              const memberCandidates = Object.values(users)
                .filter(user => user.id !== meeting.hostId && !user.restricted && !meeting.participants?.includes(user.id))
                .filter(user => `${user.name || ''} ${user.role || ''}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))
                .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
              return (
                <article key={meeting.id} className={styles.meetingCard}>
                  <div className={styles.meetingRow}>
                    <div className={styles.timeBlock}>
                      <strong>{meeting.time || '--:--'}</strong>
                      <span>{meeting.duration || 'Duration not set'}</span>
                    </div>
                    <div className={styles.meetingInfo}>
                      <div><h4>{meeting.title}</h4>{meeting.recurrence && meeting.recurrence !== 'none' && <span className={styles.repeatBadge}>Repeats {meeting.recurrence}</span>}</div>
                      <p>{meeting.module || 'General'} | Host: {host?.name || 'Instructor'}{meeting.hostId === currentUser?.id ? ' (You)' : ''}</p>
                    </div>
                    <div className={styles.cardActions}>
                      {tab === 'upcoming' && <button type="button" className={styles.joinButton} onClick={() => openInternalMeeting(meeting.meetingCode)} disabled={!meeting.meetingCode}>Join</button>}
                      {tab === 'upcoming' && canManage && <button type="button" className={styles.iconAction} onClick={() => openMemberPicker(meeting)} aria-label="Add people" title="Add people" disabled={meetingActionId === meeting.id}>{Icons.plus}</button>}
                      {canManage && <button type="button" className={`${styles.iconAction} ${styles.deleteAction}`} onClick={() => removeMeeting(meeting)} aria-label="Delete meeting" title="Delete meeting" disabled={meetingActionId === meeting.id}>{Icons.trash}</button>}
                      <button type="button" className={`${styles.expandButton} ${expanded ? styles.expanded : ''}`} onClick={() => toggleMeetingDetails(meeting)} aria-expanded={expanded} aria-label={expanded ? 'Hide meeting details' : 'Show meeting details'} title={expanded ? 'Hide details' : 'Show details'}>{Icons.chevron}</button>
                    </div>
                  </div>
                  {expanded && (
                    <div className={styles.meetingDetails}>
                      <div className={styles.linkDetail}><span>SJ meeting link</span><strong>{meeting.link || 'Legacy meeting - create a new internal room'}</strong></div>
                      <button type="button" onClick={() => copyMeetingLink(meeting)} disabled={!meeting.link} title="Copy meeting link">{Icons.copy}{copiedId === meeting.id ? 'Copied' : 'Copy link'}</button>
                      <div><span>Meeting ID</span><strong>{meeting.meetingCode ? meeting.meetingCode.replace(/(\d{3})(?=\d)/g, '$1 ') : 'Not generated'}</strong></div>
                      <div><span>Password</span><strong>{meeting.hostId === currentUser?.id || canPlan ? meetingCredentials[meeting.id] || 'Loading...' : 'Provided by host'}</strong></div>
                      <div><span>Ends</span><strong>{meeting.endDate || meeting.date} at {meeting.endTime || 'Not set'}</strong></div>
                      <div><span>Participants</span><strong>{meeting.participants?.length || 0}</strong></div>
                      {(meeting.hostId === currentUser?.id || canPlan) && <button type="button" onClick={() => copyInvitation(meeting)} disabled={!meeting.meetingCode} title="Copy full invitation">{Icons.copy}{copiedId === `invite-${meeting.id}` ? 'Copied' : 'Copy invitation'}</button>}
                      {canUseTrainingReports && <button type="button" className={styles.dashboardReportButton} onClick={() => setReportMeeting(meeting)} title={trainingReports[meeting.id] ? 'Edit training report' : 'Connect meeting to training dashboard'}>{Icons.chart}{trainingReports[meeting.id] ? 'Edit dashboard report' : 'Connect to dashboard'}</button>}
                      {memberMeetingId === meeting.id && <div className={styles.memberPicker}>
                        <div className={styles.memberPickerHeader}><strong>Add people</strong><button type="button" onClick={() => setMemberMeetingId(null)} aria-label="Close member picker" title="Close">{Icons.close}</button></div>
                        <input value={memberSearch} onChange={event => setMemberSearch(event.target.value)} aria-label="Search people to add" placeholder="Search accounts" />
                        <div className={styles.memberList}>
                          {memberCandidates.map(user => <label key={user.id}><input type="checkbox" checked={selectedMemberIds.includes(user.id)} onChange={() => toggleMember(user.id)} /><span><strong>{user.name}</strong><small>{user.role}</small></span></label>)}
                          {memberCandidates.length === 0 && <p>No more accounts found</p>}
                        </div>
                        {meetingActionError && <p className={styles.actionError}>{meetingActionError}</p>}
                        <button type="button" className={styles.addMembersButton} disabled={!selectedMemberIds.length || meetingActionId === meeting.id} onClick={() => saveMembers(meeting)}>{meetingActionId === meeting.id ? 'Adding...' : `Add & notify ${selectedMemberIds.length || ''}`}</button>
                      </div>}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </main>
    </div>
  );
}
