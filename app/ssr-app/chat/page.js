'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../AppShell';
import { useApp } from '../AppContext';
import { ChatActionMenu } from '../home/page';

const TABS = ['ALL', 'GROUPS', 'DIRECT', 'REQUESTS'];

export default function ChatListPage() {
  const router = useRouter();
  const { chats, chatMessages, chatRequests, currentUser, users, createGroup, markChatRead, canUseStaffChatAccess, canManageChatRequests, decideChatRequest, performChatAction } = useApp();
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [chatActionTarget, setChatActionTarget] = useState(null);
  const [chatActionBusy, setChatActionBusy] = useState(false);
  const pressTimer = useRef(null);
  const suppressNextClick = useRef(false);
  const staffAccess = canUseStaffChatAccess(currentUser);
  const canManageRequests = canManageChatRequests(currentUser);
  const visibleTabs = canManageRequests ? TABS : TABS.filter(tab => tab !== 'REQUESTS');

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return undefined;

    window.history.pushState({ ...(window.history.state || {}), ssrChatListEntry: true }, '', window.location.href);
    const handlePopState = () => {
      window.history.replaceState({ ...(window.history.state || {}), ssrChatListReturn: true }, '', window.location.href);
      router.replace('/ssr-app/home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser?.id, router]);

  const displayChats = useMemo(() => chats.filter(chat => !chat.deletedFor?.includes(currentUser?.id)).map(chat => {
    const lastMessage = chatMessages[chat.id]?.at(-1);
    const otherUserId = chat.type === 'direct'
      ? chat.participants?.find(id => id !== currentUser?.id)
      : null;
    const otherUser = otherUserId ? users[otherUserId] : null;
    const supportUserId = chat.type === 'support' ? chat.participants?.[0] : null;
    const supportUser = supportUserId ? users[supportUserId] : null;
    const name = chat.type === 'support'
      ? (staffAccess ? `Admin Service: ${supportUser?.name || 'Unknown User'}` : 'Admin Service Contact')
      : (otherUser?.name || chat.name || 'New Chat');

    return {
      ...chat,
      name,
      initials: chat.type === 'support' ? (staffAccess ? (supportUser?.initials || 'AS') : 'AS') : (otherUser?.initials || chat.initials || name.slice(0, 2).toUpperCase()),
      color: chat.type === 'support' ? (staffAccess ? (supportUser?.color || '#F59E0B') : '#0A6ED1') : (otherUser?.color || chat.color || '#0A6ED1'),
      online: chat.type === 'support' ? Boolean(staffAccess && supportUser?.online) : Boolean(otherUser?.online || chat.online),
      members: chat.members || chat.participants?.length || 0,
      lastMessage: lastMessage?.text || lastMessage?.content || chat.lastMessage || chat.sub || 'No messages yet',
      time: lastMessage?.timestamp || chat.time || '',
      unread: Number(chat.unreadBy?.[currentUser?.id] || chat.unread || 0),
      pinned: Boolean(chat.pinned || chat.pinnedBy?.includes(currentUser?.id)),
    };
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned)), [chats, chatMessages, currentUser?.id, staffAccess, users]);

  const requestRows = useMemo(() => [...(chatRequests || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(request => {
    const requester = users[request.requesterId];
    const target = users[request.targetId];
    return {
      ...request,
      requesterName: requester?.name || 'Deleted account',
      targetName: target?.name || 'Deleted account',
      requesterInitials: requester?.initials || 'NA',
      requesterColor: requester?.color || '#94A3B8',
      label: `${requester?.name || 'Deleted account'} to ${target?.name || 'Deleted account'}`,
      sub: `${request.status || 'pending'} request`,
    };
  }), [chatRequests, users]);

  const filtered = useMemo(() => {
    let list = displayChats.filter(c => {
      if (c.type === 'support') {
        return staffAccess || c.participants?.includes(currentUser?.id);
      }
      if (c.participants && !c.participants.includes(currentUser?.id)) {
        return staffAccess && c.type === 'group';
      }
      return true;
    });
    if (activeTab === 'GROUPS') list = list.filter(c => c.type === 'group');
    else if (activeTab === 'DIRECT') list = list.filter(c => c.type === 'direct');
    if (search) {
      const needle = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(needle) || c.lastMessage.toLowerCase().includes(needle));
    }
    return list;
  }, [displayChats, activeTab, search, staffAccess, currentUser?.id]);

  const filteredRequests = useMemo(() => {
    if (!canManageRequests) return [];
    if (!search) return requestRows;
    const needle = search.toLowerCase();
    return requestRows.filter(r => r.label.toLowerCase().includes(needle) || r.sub.toLowerCase().includes(needle));
  }, [canManageRequests, requestRows, search]);

  const requestCount = requestRows.filter(r => r.status === 'pending').length;
  const canCreateGroup = currentUser && (['Super Admin', 'Admin'].includes(currentUser.role) || staffAccess);

  const closeCreateGroup = () => {
    setShowCreateGroup(false);
    setGroupName('');
    setGroupDescription('');
    setGroupMemberIds([]);
    setGroupMemberSearch('');
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || groupMemberIds.length === 0) return;
    setCreatingGroup(true);
    const result = await createGroup({ name: groupName, description: groupDescription, participantIds: groupMemberIds });
    setCreatingGroup(false);
    if (!result.success) {
      alert(result.error || 'Could not create group');
      return;
    }
    closeCreateGroup();
    router.push(`/ssr-app/chat/${result.chat.id}`);
  };

  const handleDecision = async (requestId, action) => {
    setBusyRequestId(requestId);
    const result = await decideChatRequest(requestId, action);
    setBusyRequestId(null);
    if (!result.success) alert(result.error || 'Could not update request');
  };

  const beginChatPress = (chat) => {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      suppressNextClick.current = true;
      setChatActionTarget(chat);
    }, 550);
  };

  const endChatPress = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handleChatAction = async (action) => {
    if (!chatActionTarget) return;
    if (action === 'view') {
      const target = chatActionTarget;
      setChatActionTarget(null);
      router.push(`/ssr-app/chat/${target.id}`);
      return;
    }
    setChatActionBusy(true);
    const result = await performChatAction(chatActionTarget.id, action);
    setChatActionBusy(false);
    if (!result.success) {
      alert(result.error || 'Could not update chat');
      return;
    }
    setChatActionTarget(null);
  };

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
          {visibleTabs.map(tab => (
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
          {activeTab === 'REQUESTS' ? (
            filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📨</div>
                <p style={{ fontWeight: 600 }}>No requests found</p>
              </div>
            ) : (
              filteredRequests.map(request => {
                const isBusy = busyRequestId === request.id;
                return (
                  <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ width: 48, height: 48, background: request.requesterColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{request.requesterInitials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.label}</div>
                      <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{request.sub}</div>
                    </div>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button disabled={isBusy} onClick={() => handleDecision(request.id, 'reject')} style={{ border: 'none', background: '#FEF2F2', color: '#DC2626', borderRadius: 7, padding: '7px 9px', fontSize: 11, fontWeight: 800, cursor: isBusy ? 'default' : 'pointer' }}>Reject</button>
                        <button disabled={isBusy} onClick={() => handleDecision(request.id, 'approve')} style={{ border: 'none', background: '#0A6ED1', color: '#fff', borderRadius: 7, padding: '7px 9px', fontSize: 11, fontWeight: 800, cursor: isBusy ? 'default' : 'pointer' }}>Approve</button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <p style={{ fontWeight: 600 }}>No chats found</p>
            </div>
          ) : (
            filtered.map(chat => (
              <div key={chat.id} onPointerDown={e => { if (e.pointerType === 'mouse' && e.button !== 0) return; beginChatPress(chat); }} onPointerUp={endChatPress} onPointerLeave={endChatPress} onContextMenu={e => { e.preventDefault(); setChatActionTarget(chat); }} onClick={() => { if (suppressNextClick.current) { suppressNextClick.current = false; return; } markChatRead(chat.id); router.push(`/ssr-app/chat/${chat.id}`); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, background: chat.color, borderRadius: chat.type === 'group' ? 14 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>{chat.initials}</div>
                  {chat.online === true && (
                    <div style={{ position: 'absolute', top: -1, right: -1, width: 13, height: 13, background: '#10B981', borderRadius: '50%', border: '2px solid #fff', boxSizing: 'border-box' }} />
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
          onClick={() => canCreateGroup ? setShowCreateGroup(true) : alert('Contact Admin / Support')}
          style={{ position: 'fixed', bottom: 84, right: 16, width: 52, height: 52, background: '#0A6ED1', border: 'none', borderRadius: '50%', color: '#fff', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(10,110,209,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          title={canCreateGroup ? 'Create Group' : 'Contact Support'}
        >
          {canCreateGroup ? '✏️' : '🆘'}
        </button>

        {showCreateGroup && canCreateGroup && (
          <div onClick={(e) => { if (e.target === e.currentTarget) closeCreateGroup(); }} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.6)' }}>
            <form onSubmit={handleCreateGroup} style={{ width: '100%', maxWidth: 420, maxHeight: '88vh', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15,23,42,0.24)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Create group</h3><p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>Choose who can communicate in this group.</p></div>
                <button type="button" onClick={closeCreateGroup} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '16px 20px 8px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Group name</label>
                <input autoFocus value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. SAP Finance Team" maxLength={80} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 14, outline: 'none', color: '#0F172A' }} />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', margin: '12px 0 6px' }}>Description <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                <textarea value={groupDescription} onChange={e => setGroupDescription(e.target.value)} placeholder="What is this group for?" maxLength={180} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', color: '#0F172A', fontFamily: 'inherit' }} />
              </div>
              <div style={{ padding: '8px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Members <span style={{ color: '#94A3B8', fontWeight: 500 }}>({groupMemberIds.length + 1} selected)</span></label>
                <input value={groupMemberSearch} onChange={e => setGroupMemberSearch(e.target.value)} placeholder="Search members" style={{ width: 150, padding: '7px 9px', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, outline: 'none', color: '#0F172A' }} />
              </div>
              <div style={{ overflowY: 'auto', minHeight: 120, maxHeight: 260, borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
                {Object.values(users).filter(u => u.id !== currentUser.id && (!groupMemberSearch || u.name.toLowerCase().includes(groupMemberSearch.toLowerCase()) || (u.role || '').toLowerCase().includes(groupMemberSearch.toLowerCase()))).map(u => {
                  const selected = groupMemberIds.includes(u.id);
                  return <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', background: selected ? '#EFF6FF' : '#fff' }}><input type="checkbox" checked={selected} onChange={() => setGroupMemberIds(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])} style={{ width: 16, height: 16, accentColor: '#0A6ED1' }} /><div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color || '#0A6ED1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{u.initials}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{u.name}</div><div style={{ fontSize: 11, color: '#64748B' }}>{u.role}</div></div></label>;
                })}
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={closeCreateGroup} style={{ padding: '9px 14px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button><button type="submit" disabled={creatingGroup || !groupName.trim() || groupMemberIds.length === 0} style={{ padding: '9px 16px', border: 'none', background: creatingGroup || !groupName.trim() || groupMemberIds.length === 0 ? '#CBD5E1' : '#0A6ED1', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: creatingGroup ? 'wait' : 'pointer' }}>{creatingGroup ? 'Creating...' : 'Create group'}</button></div>
            </form>
          </div>
        )}
        {chatActionTarget && <ChatActionMenu chat={chatActionTarget} busy={chatActionBusy} onClose={() => setChatActionTarget(null)} onAction={handleChatAction} />}
      </div>
    </AppShell>
  );
}
