'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../AppShell';
import { useApp } from '../AppContext';

const TABS = ['ALL', 'GROUPS', 'DIRECT', 'REQUESTS'];

const STATUS_COLOR = { online: '#22C55E', away: '#F59E0B', offline: '#94A3B8' };

export default function ChatListPage() {
  const router = useRouter();
  const { chats, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = chats;
    if (activeTab === 'GROUPS') list = list.filter(c => c.type === 'group');
    else if (activeTab === 'DIRECT') list = list.filter(c => c.type === 'direct');
    else if (activeTab === 'REQUESTS') list = list.filter(c => c.type === 'request');
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [chats, activeTab, search]);

  const requestCount = chats.filter(c => c.type === 'request').length;
  const canCreateGroup = currentUser && ['Super Admin', 'Admin', 'Employee'].includes(currentUser.role);

  return (
    <AppShell>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Search */}
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ position: 'relative' }}>
            <svg width="16" height="16" fill="none" stroke="#94A3B8" viewBox="0 0 24 24" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats, groups, messages..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC', color: '#0F172A' }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 8px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'transparent', borderBottom: `2.5px solid ${activeTab === tab ? '#0A6ED1' : 'transparent'}`, color: activeTab === tab ? '#0A6ED1' : '#94A3B8', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s', position: 'relative' }}>
              {tab}
              {tab === 'REQUESTS' && requestCount > 0 && (
                <span style={{ position: 'absolute', top: 8, right: 8, background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{requestCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <p style={{ fontWeight: 600 }}>No chats found</p>
            </div>
          ) : (
            filtered.map(chat => (
              <div key={chat.id} onClick={() => router.push(`/ssr-app/chat/${chat.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, background: chat.color, borderRadius: chat.type === 'group' ? 14 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>{chat.initials}</div>
                  {chat.online !== undefined && (
                    <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, background: chat.online ? STATUS_COLOR.online : STATUS_COLOR.offline, borderRadius: '50%', border: '2px solid #fff' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {chat.pinned && <span style={{ fontSize: 10 }}>📌</span>}
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{chat.name}</span>
                      {chat.type === 'group' && <span style={{ fontSize: 10, color: '#94A3B8' }}>· {chat.members}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{chat.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>{chat.lastMessage}</p>
                    {chat.unread > 0 && (
                      <span style={{ background: '#0A6ED1', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>{chat.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => alert(canCreateGroup ? 'Create Group / Announcement' : 'Contact Admin / Support')}
          style={{ position: 'fixed', bottom: 84, right: 16, width: 52, height: 52, background: '#0A6ED1', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(10,110,209,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          title={canCreateGroup ? 'Create Group' : 'Contact Support'}
        >
          {canCreateGroup ? '✏️' : '🆘'}
        </button>
      </div>
    </AppShell>
  );
}
