'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from './AppContext';
import styles from './dashboard.module.css';

function duration(start, end) {
  if (!start) return '-';
  const minutes = Math.max(0, Math.floor((new Date(end || Date.now()).getTime() - new Date(start).getTime()) / 60000));
  return formatSeconds(minutes * 60);
}

function formatSeconds(seconds) {
  const totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr${minutes ? ` ${minutes} min` : ''}`;
}

function displayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EmployeeReport({ tasks, loading }) {
  const totals = useMemo(() => ({
    requirements: tasks.length,
    active: tasks.filter(task => task.status !== 'closed').length,
    profiles: tasks.reduce((sum, task) => sum + task.profiles.length, 0),
    completed: tasks.filter(task => task.status === 'closed').length,
  }), [tasks]);

  return <>
    <div className={styles.metricGrid}>
      {[
        ['Requirements', totals.requirements, '#0A6ED1'],
        ['Active', totals.active, '#CA8A04'],
        ['Profiles added', totals.profiles, '#7C3AED'],
        ['Completed', totals.completed, '#15803D'],
      ].map(([label, value, color]) => <div className={styles.metric} key={label} style={{ borderTopColor: color }}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
    {loading ? <p className={styles.statusMessage}>Loading employee report...</p> : tasks.length === 0 ? <p className={styles.statusMessage}>No requirement activity yet.</p> : <div className={styles.employeeRows}>
      {tasks.map(task => <div className={styles.employeeRow} key={task.id}>
        <div><span className={styles.eyebrow}>Requirement</span><strong>{task.title}</strong><small>{task.createdByName}</small></div>
        <span className={styles.arrow} aria-hidden="true">-&gt;</span>
        <div><span className={styles.eyebrow}>Sourcing contributors</span>{task.workers.length ? task.workers.map((worker, index) => <div className={styles.workerLine} key={worker.id}><strong>#{index + 1} {worker.userName}</strong><span>{task.profiles.filter(profile => profile.addedById === worker.userId).length} profiles | {duration(worker.joinedAt, worker.completedAt)}</span></div>) : <small>Not assigned</small>}</div>
        <span className={styles.arrow} aria-hidden="true">-&gt;</span>
        <div><span className={styles.eyebrow}>Closure</span><strong className={task.status === 'closed' ? styles.completeText : styles.progressText}>{task.status === 'closed' ? task.closedByName || 'Completed' : 'In progress'}</strong><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('sj-open-task-board', { detail: { taskId: task.id } }))}>View details</button></div>
      </div>)}
    </div>}
  </>;
}

function TrainingReport({ reports, loading, selectedId, onSelect }) {
  const report = reports.find(item => item.id === selectedId) || reports[0];
  if (loading) return <p className={styles.statusMessage}>Loading live attendance...</p>;
  if (!report) return <div className={styles.emptyTraining}><strong>No training reports connected</strong><span>Open a meeting, expand its details, and choose Connect to dashboard.</span></div>;

  const progressPeople = [
    ...(report.trainer ? [{ ...report.trainer, type: 'Trainer' }] : []),
    ...report.members.map(member => ({ ...member, type: member.role || 'Attendee' })),
  ];

  return <>
    <div className={styles.reportToolbar}>
      <label htmlFor="training-report-select">Training report</label>
      <select id="training-report-select" value={report.id} onChange={event => onSelect(event.target.value)}>{reports.map(item => <option key={item.id} value={item.id}>{item.meeting.title}</option>)}</select>
      <span className={styles.liveStatus}><i /> Live attendance</span>
    </div>
    <div className={styles.reportHeading}>
      <div><span className={styles.eyebrow}>{report.meeting.module || 'Training'}</span><h3>{report.meeting.title}</h3><p>{report.weekdays.join(', ')} | {report.meeting.time}{report.meeting.endTime ? `-${report.meeting.endTime}` : ''}</p></div>
      <div className={styles.reportCompletion}><strong>{report.completionPercentage}%</strong><span>Course completed</span></div>
    </div>
    <div className={styles.metricGrid}>
      {[
        ['Planned days', report.totalDays, '#0A6ED1'],
        ['Classes completed', report.completedDays, '#087A55'],
        ['Remaining days', Math.max(0, report.totalDays - report.completedDays), '#CA8A04'],
        ['Tracked attendees', report.members.length, '#7C3AED'],
      ].map(([label, value, color]) => <div className={styles.metric} key={label} style={{ borderTopColor: color }}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
    <div className={styles.trainingLayout}>
      <section className={styles.attendanceSection}>
        <div className={styles.sectionHeading}><div><h4>Attendance register</h4><p>Every join, rejoin and leave is combined by account and date.</p></div><span>{report.attendanceRows.length} records</span></div>
        <div className={styles.tableScroll}>
          <table className={styles.attendanceTable}>
            <thead><tr><th>Date</th><th>Day</th><th>Account</th><th>Role</th><th>Joined</th><th>Left</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>{report.attendanceRows.length ? report.attendanceRows.map(row => <tr key={`${row.userId}-${row.date}`}><td>{displayDate(row.date)}</td><td>{row.day}</td><td><strong>{row.name}</strong></td><td>{row.role}</td><td>{row.joinTime}</td><td>{row.leaveTime}</td><td>{formatSeconds(row.durationSeconds)}</td><td><span className={row.active ? styles.liveBadge : styles.presentBadge}>{row.active ? 'In meeting' : 'Present'}</span></td></tr>) : <tr><td colSpan="8" className={styles.emptyCell}>Attendance appears when a tracked account joins the meeting.</td></tr>}</tbody>
          </table>
        </div>
        <div className={styles.memberSummary}>
          <div className={styles.sectionHeading}><div><h4>Participant attendance</h4><p>Attended days compared with the planned training days.</p></div></div>
          <div className={styles.summaryTable}><div className={styles.summaryHead}><span>Account</span><span>Days</span><span>Attendance</span><span>Total time</span></div>{report.members.map(member => <div className={styles.summaryRow} key={member.id}><span><strong>{member.name}</strong><small>{member.role}</small></span><span>{member.attendedDays}/{member.totalDays}</span><span><strong>{member.percentage}%</strong></span><span>{formatSeconds(member.totalSeconds)}</span></div>)}</div>
        </div>
      </section>
      <aside className={styles.progressSection}>
        <div className={styles.courseProgress}><div><strong>{report.completedDays}</strong><span>of {report.totalDays} days</span></div><div className={styles.progressTrack}><i style={{ width: `${report.completionPercentage}%` }} /></div><small>{report.completionPercentage}% course completion</small></div>
        {report.trainer && <div className={styles.trainerProgress}><span className={styles.eyebrow}>Trainer progress</span><strong>{report.trainer.name}</strong><div><span>{report.trainer.attendedDays}/{report.totalDays} classes</span><b>{report.trainer.percentage}%</b></div></div>}
        <div className={styles.barChart}><div className={styles.sectionHeading}><div><h4>Attendance percentage</h4><p>Trainer and participant progress.</p></div></div>{progressPeople.map(person => <div className={styles.barRow} key={`${person.type}-${person.id}`}><div><span>{person.name}</span><small>{person.type}</small></div><div className={styles.barTrack}><i style={{ width: `${person.percentage}%` }} /></div><strong>{person.percentage}%</strong></div>)}</div>
      </aside>
    </div>
  </>;
}

export default function DashboardPanel() {
  const { currentUser } = useApp();
  const [tab, setTab] = useState('employee');
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [taskLoading, setTaskLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const hasStaffAccess = currentUser && ['Employee', 'Admin', 'Super Admin'].includes(currentUser.role) && !currentUser.restricted;

  const loadTasks = useCallback(async () => {
    if (!hasStaffAccess) return setTaskLoading(false);
    const response = await fetch(`/api/ssr/tasks?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
    if (response.ok) setTasks(await response.json());
    setTaskLoading(false);
  }, [currentUser?.id, hasStaffAccess]);

  const loadReports = useCallback(async () => {
    if (!hasStaffAccess) return setReportLoading(false);
    const response = await fetch(`/api/ssr/training-reports?userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setReports(data);
      setSelectedReportId(previous => data.some(report => report.id === previous) ? previous : data[0]?.id || '');
    }
    setReportLoading(false);
  }, [currentUser?.id, hasStaffAccess]);

  useEffect(() => {
    loadTasks();
    const refresh = () => loadTasks();
    window.addEventListener('sj-task-updated', refresh);
    return () => window.removeEventListener('sj-task-updated', refresh);
  }, [loadTasks]);

  useEffect(() => {
    loadReports();
    const refresh = () => loadReports();
    window.addEventListener('sj-training-report-updated', refresh);
    const timer = tab === 'training' ? window.setInterval(loadReports, 5000) : null;
    return () => {
      window.removeEventListener('sj-training-report-updated', refresh);
      if (timer) window.clearInterval(timer);
    };
  }, [loadReports, tab]);

  if (!hasStaffAccess) return <div className={styles.denied}>Reports are available only to employees and administrators.</div>;

  return (
    <main className={styles.dashboard}>
      <div className={styles.pageHeader}><h2>Dashboard</h2><p>Operational and training reports from live app activity.</p></div>
      <div className={styles.tabs} role="tablist">
        {[['employee', 'Employee Report'], ['training', 'Training Report']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}</button>)}
      </div>
      {tab === 'training'
        ? <TrainingReport reports={reports} loading={reportLoading} selectedId={selectedReportId} onSelect={setSelectedReportId} />
        : <EmployeeReport tasks={tasks} loading={taskLoading} />}
    </main>
  );
}
