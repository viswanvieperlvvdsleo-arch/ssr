'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, RefreshCw, Search } from 'lucide-react';
import styles from './RequirementsProjectList.module.css';

const STATUS_LABELS = {
  open: 'Successfully uploaded',
  in_progress: 'In progress',
  closed: 'Successfully completed',
};

const formatDate = value => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('en-IN');
};

async function read(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load requirements');
  return payload;
}

function normalizeCompanies(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.company) return [{ ...payload.company, accountCount: payload.stats?.accounts ?? payload.accounts?.length ?? 0 }];
  if (payload?.id) return [payload];
  return [];
}

export default function RequirementsProjectList({ currentUser, clientKey = '' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const portalRoot = pathname.startsWith('/ssr-app/admin') ? '/ssr-app/admin' : '/ssr-app';

  const load = useCallback(async signal => {
    try {
      const [requirementsResponse, companiesResponse] = await Promise.all([
        fetch('/api/ssr/requirements', { cache: 'no-store', signal }),
        fetch('/api/ssr/company', { cache: 'no-store', signal }),
      ]);
      const result = await read(requirementsResponse);
      const companyPayload = companiesResponse.ok ? await companiesResponse.json().catch(() => []) : [];
      if (!signal?.aborted) {
        setItems(Array.isArray(result) ? result : []);
        setCompanies(normalizeCompanies(companyPayload));
        setError('');
      }
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const refresh = () => document.visibilityState === 'visible' && load(controller.signal);
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    window.addEventListener('sj-task-updated', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('sj-task-updated', refresh);
    };
  }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map(companies.map(company => [company.id, {
      key: company.id,
      name: company.name || 'Unnamed company',
      accountCount: Number(company.accountCount || 0),
      items: [],
    }]));

    items.forEach(item => {
      const key = item.companyId || 'individual-clients';
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          name: item.companyId ? (item.companyName || 'Unnamed company') : 'Individual clients',
          accountCount: null,
          items: [],
        });
      }
      grouped.get(key).items.push(item);
    });
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, items]);

  const selectedGroup = groups.find(group => group.key === clientKey) || null;
  const query = search.trim().toLowerCase();
  const visibleItems = (selectedGroup?.items || []).filter(item => [
    item.token,
    item.title,
    item.senderName,
    item.closedByName,
    STATUS_LABELS[item.status],
    ...(item.workers || []).map(worker => worker.userName),
  ].some(value => String(value || '').toLowerCase().includes(query)));

  if (!['Admin', 'Super Admin'].includes(currentUser?.role)) {
    return <main className={styles.page}><p className={styles.error}>Admin access is required for the requirements project list.</p></main>;
  }

  const openClient = key => router.push(`${portalRoot}/requirements-projects/${encodeURIComponent(key)}`);
  const returnToClients = () => router.push(`${portalRoot}/home?section=requirements-projects`);
  const openTask = item => router.push(`${portalRoot}/home?section=task-board&taskId=${encodeURIComponent(item.taskId || '')}&postId=${encodeURIComponent(item.postId || '')}`);

  if (clientKey) {
    return (
      <main className={`${styles.page} ${styles.detailPage}`}>
        <header className={styles.header}>
          <div className={styles.detailHeading}>
            <button type="button" className={styles.iconButton} onClick={returnToClients} aria-label="Back to companies" title="Back to companies"><ArrowLeft size={19} /></button>
            <div><h1>{selectedGroup?.name || 'Company progress'}</h1><p>Requirement ownership, deadlines, and completion records.</p></div>
          </div>
          <button type="button" className={styles.iconButton} onClick={() => load()} aria-label="Refresh project list" title="Refresh project list"><RefreshCw size={18} /></button>
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {loading ? <p className={styles.loading} role="status">Loading company progress...</p> : !selectedGroup ? <section className={styles.notFound}><h2>Company not found</h2><p>This company is unavailable or you do not have access to its requirements.</p><button type="button" onClick={returnToClients}>Back to companies</button></section> : <>
          <section className={styles.summaryGrid} aria-label={`${selectedGroup.name} progress summary`}>
            <div><span>Total requirements</span><strong>{selectedGroup.items.length}</strong></div>
            <div><span>Successfully uploaded</span><strong>{selectedGroup.items.filter(item => item.status === 'open').length}</strong></div>
            <div><span>In progress</span><strong>{selectedGroup.items.filter(item => item.status === 'in_progress').length}</strong></div>
            <div><span>Successfully completed</span><strong>{selectedGroup.items.filter(item => item.status === 'closed').length}</strong></div>
          </section>

          <section className={styles.sheet}>
            <div className={styles.sheetHeader}>
              <div><h2>Project progress</h2><p>{selectedGroup.items.length} requirements</p></div>
              <label className={styles.search}><Search size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search token, project or account" aria-label="Search project list" /></label>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Token</th><th>Requirement / Project</th><th>Posted by</th><th>Posted date & time</th><th>End date & time</th><th>Sourcing accounts</th><th>Completed by</th><th>Completed date & time</th><th>Status</th><th>Task</th></tr></thead>
                <tbody>{visibleItems.map(item => {
                  const workers = item.workers || [];
                  const activeWorkers = workers.filter(worker => worker.status !== 'left');
                  const completedWorkers = workers.filter(worker => worker.status === 'completed');
                  const completedAt = item.closedAt || completedWorkers.map(worker => worker.completedAt).filter(Boolean).sort().at(-1);
                  return <tr key={item.id} data-status={item.status}>
                    <td><strong>{item.token}</strong></td>
                    <td>{item.title}</td>
                    <td>{item.senderName}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.dueAt)}</td>
                    <td>{activeWorkers.map(worker => worker.userName).join(', ') || 'Not assigned'}</td>
                    <td>{item.closedByName || completedWorkers.map(worker => worker.userName).join(', ') || '-'}</td>
                    <td>{formatDate(completedAt)}</td>
                    <td><span className={styles.status} data-status={item.status}>{STATUS_LABELS[item.status] || item.status}</span></td>
                    <td><button type="button" className={styles.openTask} onClick={() => openTask(item)}>Open</button></td>
                  </tr>;
                })}</tbody>
              </table>
              {!visibleItems.length && <p className={styles.empty}>No matching requirements for this company.</p>}
            </div>
          </section>
        </>}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><h1>Requirements / Project List</h1><p>Select a company to open its complete progress dashboard.</p></div>
        <button type="button" className={styles.iconButton} onClick={() => load()} aria-label="Refresh project list" title="Refresh project list"><RefreshCw size={18} /></button>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <p className={styles.loading} role="status">Loading companies...</p> : !groups.length ? <p className={styles.empty}>No client companies or requirements are available yet.</p> : <section className={styles.clientGrid} aria-label="Client companies">
        {groups.map(group => {
          const uploaded = group.items.filter(item => item.status === 'open').length;
          const inProgress = group.items.filter(item => item.status === 'in_progress').length;
          const completed = group.items.filter(item => item.status === 'closed').length;
          return <button type="button" key={group.key} className={styles.clientCard} onClick={() => openClient(group.key)}>
            <span className={styles.clientTitle}><BriefcaseBusiness size={18} />{group.name}</span>
            {group.accountCount !== null && <span className={styles.accountCount}>{group.accountCount} account{group.accountCount === 1 ? '' : 's'}</span>}
            <strong>{group.items.length}</strong><span>Total requirements</span>
            <span className={styles.cardStats}><span>{uploaded} uploaded</span><span><Clock3 size={14} />{inProgress} in progress</span><span><CheckCircle2 size={14} />{completed} completed</span></span>
            <span className={styles.viewProgress}>View progress</span>
          </button>;
        })}
      </section>}
    </main>
  );
}
