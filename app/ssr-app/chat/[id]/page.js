'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import AppShell from '../../AppShell';
import { useApp, MOCK_CHATS } from '../../AppContext';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MOCK_MESSAGES = [
  { id: 'm1', senderId: 'u1', senderName: 'Rahul Sharma', senderInitials: 'RS', senderColor: '#0A6ED1', text: 'Welcome to the SAP S/4HANA batch! Please check the pinned resources.', time: '9:00 AM', status: 'seen', reaction: null, starred: false, replyTo: null },
  { id: 'm2', senderId: 'u3', senderName: 'Arun Kumar', senderInitials: 'AK', senderColor: '#D97706', text: 'Week 3 session recording has been uploaded. Please review before Thursday.', time: '9:45 AM', status: 'seen', reaction: '👍', starred: false, replyTo: null },
  { id: 'm3', senderId: 'u4', senderName: 'Neha Patel', senderInitials: 'NP', senderColor: '#DC2626', text: 'Thank you! I had a question about the GL configuration — can we go over it again?', time: '10:02 AM', status: 'delivered', reaction: null, starred: true, replyTo: 'm2' },
  { id: 'm4', senderId: 'u2', senderName: 'Priya Singh', senderInitials: 'PS', senderColor: '#059669', text: 'GL config session is scheduled for Friday 3PM. Please confirm your attendance.', time: '10:15 AM', status: 'seen', reaction: null, starred: false, replyTo: null },
];

function ReadReceipt({ status }) {
  if (status === 'sending') return <span style={{ color: '#94A3B8', fontSize: 12 }}>•</span>;
  if (status === 'delivered') return <span style={{ color: '#94A3B8', fontSize: 12 }}>••</span>;
  if (status === 'seen') return <span style={{ color: '#0A6ED1', fontSize: 12 }}>•••</span>;
  return null;
}

function ChatDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useApp();
  const chatId = params?.id;

  const chat = MOCK_CHATS.find(c => c.id === chatId) || { name: 'Chat', type: 'direct', initials: '?', color: '#0A6ED1', online: false };
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [longPressMsg, setLongPressMsg] = useState(null);
  const [showAttach, setShowAttach] = useState(false);
  const bottomRef = useRef(null);
  const lpTimer = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    const msg = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
      reaction: null,
      starred: false,
      replyTo: replyTo?.id || null,
    };
    setMessages(prev => [...prev, msg]);
    setText('');
    setReplyTo(null);
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'seen' } : m)), 1500);
  };

  const deleteMsg = (id, forAll = false) => {
    if (forAll) setMessages(prev => prev.map(m => m.id === id ? { ...m, text: '🗑️ This message was deleted', deleted: true } : m));
    else setMessages(prev => prev.filter(m => m.id !== id));
    setLongPressMsg(null);
  };

  const addReaction = (msgId, emoji) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: emoji } : m));
    setLongPressMsg(null);
  };

  const toggleStar = (msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, starred: !m.starred } : m));
    setLongPressMsg(null);
  };

  const handleLongPress = (msg) => {
    lpTimer.current = setTimeout(() => setLongPressMsg(msg), 500);
  };

  const getReplyMsg = (replyId) => messages.find(m => m.id === replyId);

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', maxWidth: 600, margin: '0 auto' }}>
        {/* Chat Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => router.push('/ssr-app/chat')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A6ED1', padding: 4 }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ width: 38, height: 38, background: chat.color, borderRadius: chat.type === 'group' ? 10 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>{chat.initials}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{chat.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: chat.online ? '#22C55E' : '#94A3B8' }}>{chat.type === 'group' ? `${chat.members} members` : (chat.online ? '● Online' : '○ Offline')}</p>
          </div>
          <button onClick={() => alert('📞 Starting call...')} style={{ background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#0A6ED1' }}>📞</button>
          <button onClick={() => alert('More options')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>⋮</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#F8FAFC' }}>
          {messages.map(msg => {
            const isMe = currentUser && msg.senderId === currentUser.id;
            const replyMsg = msg.replyTo ? getReplyMsg(msg.replyTo) : null;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                {/* Sender name for group chats */}
                {!isMe && chat.type === 'group' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: msg.senderColor, marginLeft: 42, marginBottom: 2 }}>{msg.senderName}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  {!isMe && (
                    <div style={{ width: 30, height: 30, background: msg.senderColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{msg.senderInitials}</div>
                  )}
                  <div
                    onMouseDown={() => handleLongPress(msg)}
                    onMouseUp={() => clearTimeout(lpTimer.current)}
                    onTouchStart={() => handleLongPress(msg)}
                    onTouchEnd={() => clearTimeout(lpTimer.current)}
                    style={{ maxWidth: '72%', cursor: 'pointer' }}
                  >
                    {replyMsg && (
                      <div style={{ background: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.06)', borderLeft: `3px solid ${isMe ? '#fff' : '#0A6ED1'}`, borderRadius: '6px 6px 0 0', padding: '4px 8px', marginBottom: -4 }}>
                        <p style={{ margin: 0, fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyMsg.text}</p>
                      </div>
                    )}
                    <div style={{ background: isMe ? '#0A6ED1' : '#fff', color: isMe ? '#fff' : '#0F172A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: isMe ? 'none' : '1px solid #E2E8F0', position: 'relative' }}>
                      {msg.starred && <span style={{ position: 'absolute', top: -6, right: isMe ? -2 : 'auto', left: isMe ? 'auto' : -2, fontSize: 12 }}>⭐</span>}
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{msg.text}</p>
                      {msg.reaction && <span style={{ position: 'absolute', bottom: -10, right: isMe ? 4 : 'auto', left: isMe ? 'auto' : 4, background: '#fff', borderRadius: 10, padding: '1px 5px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', fontSize: 14, border: '1px solid #E2E8F0' }}>{msg.reaction}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: msg.reaction ? 10 : 4 }}>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{msg.time}</span>
                      {isMe && <ReadReceipt status={msg.status} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Long press menu */}
        {longPressMsg && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setLongPressMsg(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px', width: '100%', maxWidth: 600, margin: '0 auto' }}>
              {/* Reactions */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20, background: '#F8FAFC', borderRadius: 40, padding: '10px 16px' }}>
                {REACTIONS.map(r => (
                  <button key={r} onClick={() => addReaction(longPressMsg.id, r)} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', padding: 4, transition: 'transform 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >{r}</button>
                ))}
              </div>
              {/* Actions */}
              {[
                { icon: '↩️', label: 'Reply', action: () => { setReplyTo(longPressMsg); setLongPressMsg(null); } },
                { icon: '⭐', label: longPressMsg.starred ? 'Unstar' : 'Star', action: () => toggleStar(longPressMsg.id) },
                { icon: '📋', label: 'Copy Text', action: () => { navigator.clipboard?.writeText(longPressMsg.text); setLongPressMsg(null); } },
                ...(currentUser && longPressMsg.senderId === currentUser.id ? [
                  { icon: '🗑️', label: 'Delete for Everyone', action: () => deleteMsg(longPressMsg.id, true), danger: true },
                ] : []),
                { icon: '🚫', label: 'Delete for Me', action: () => deleteMsg(longPressMsg.id, false), danger: true },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', color: item.danger ? '#DC2626' : '#0F172A', fontSize: 14, fontWeight: 500 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reply bar */}
        {replyTo && (
          <div style={{ background: '#EFF6FF', borderTop: '2px solid #0A6ED1', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#0A6ED1' }}>Replying to {replyTo.senderName}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Attachment sheet */}
        {showAttach && (
          <div style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flexShrink: 0 }}>
            {[{ icon: '📄', label: 'Document' }, { icon: '📷', label: 'Camera' }, { icon: '🖼️', label: 'Gallery' }, { icon: '🎵', label: 'Audio' }].map(a => (
              <button key={a.label} onClick={() => { alert(`Pick ${a.label}`); setShowAttach(false); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer' }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={sendMessage} style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => setShowAttach(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, padding: 4 }}>📎</button>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 22, fontSize: 14, outline: 'none', background: '#F8FAFC', color: '#0F172A' }} />
          <button type="submit" disabled={!text.trim()} style={{ width: 40, height: 40, background: text.trim() ? '#0A6ED1' : '#E2E8F0', border: 'none', borderRadius: '50%', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
            <svg width="18" height="18" fill="none" stroke={text.trim() ? '#fff' : '#94A3B8'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"/></svg>
          </button>
        </form>
      </div>
    </AppShell>
  );
}

export default function ChatDetailPage() {
  return (
    <Suspense>
      <ChatDetailContent />
    </Suspense>
  );
}
