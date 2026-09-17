'use client';

import { useCallback, useEffect, useState } from 'react';

async function responseJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Could not load chat');
  return body;
}

function mediaId(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  if (attachment.mediaId) return attachment.mediaId;
  return String(attachment.url || '').match(/\/api\/ssr\/media\/([^/?#]+)/)?.[1] || null;
}

function Attachment({ attachment }) {
  if (!attachment || attachment.cloudDeleted) return <span className="company-attachment-missing">Attachment unavailable</span>;
  const id = mediaId(attachment);
  const src = id ? `/api/ssr/company-chat-media/${encodeURIComponent(id)}` : attachment.url || '';
  const type = String(attachment.type || '').toLowerCase();
  if (!src) return <span className="company-attachment-missing">Attachment unavailable</span>;
  if (type.startsWith('image/')) return <a className="company-message-media" href={src} target="_blank" rel="noreferrer"><img src={src} alt={attachment.name || 'Shared image'} /></a>;
  if (type.startsWith('video/')) return <video className="company-message-media" controls preload="metadata" src={src} />;
  if (type.startsWith('audio/') || attachment.voiceMessage) return <audio className="company-message-audio" controls preload="metadata" src={src} />;
  return <a className="company-file-link" href={src} target="_blank" rel="noreferrer">Open {attachment.name || 'attachment'}</a>;
}

export default function CompanyChat({ currentUser }) {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async chatId => {
    if (!chatId) return;
    try { setMessages(await responseJson(await fetch(`/api/ssr/messages?chatId=${encodeURIComponent(chatId)}`, { cache: 'no-store' }))); }
    catch (loadError) { setError(loadError.message); }
  }, []);

  const loadSupportChat = useCallback(async () => {
    try {
      const chats = await responseJson(await fetch('/api/ssr/chats', { cache: 'no-store' }));
      const support = chats.find(item => item.type === 'support') || null;
      setChat(support);
      if (support) await loadMessages(support.id);
    } catch (loadError) { setError(loadError.message); }
  }, [loadMessages]);

  useEffect(() => { loadSupportChat(); }, [loadSupportChat]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (chat?.id) loadMessages(chat.id); }, 10000);
    return () => window.clearInterval(timer);
  }, [chat?.id, loadMessages]);

  const startSupport = async () => {
    setBusy(true); setError('');
    try {
      const result = await responseJson(await fetch('/api/ssr/chats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'support', participants: [currentUser.id], createdBy: currentUser.id }),
      }));
      setChat(result);
      setMessages([]);
    } catch (startError) { setError(startError.message); }
    finally { setBusy(false); }
  };

  const sendMessage = async event => {
    event.preventDefault();
    const content = text.trim();
    if (!chat || !content || busy) return;
    setBusy(true); setError('');
    try {
      const message = await responseJson(await fetch('/api/ssr/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: currentUser.id, content }),
      }));
      setMessages(previous => [...previous, message]);
      setText('');
    } catch (sendError) { setError(sendError.message); }
    finally { setBusy(false); }
  };

  return <div className="company-chat company-service-chat">
    <aside className="company-chat-list"><div className="company-chat-title"><h2>Chat</h2><span>1</span></div><p className="company-chat-caption">SJ Info Business Solutions</p><button type="button" className="company-chat-row is-active" onClick={() => chat ? loadMessages(chat.id) : startSupport()}><span className="company-avatar">AS</span><span><strong>Admin Service</strong><small>Message the SJ team</small></span></button><p className="company-chat-empty">Your messages go to SJ Super Admin and SJ staff with service-chat access.</p></aside>
    <section className="company-chat-conversation">{chat ? <><header><span className="company-avatar">AS</span><span><strong>Admin Service</strong><small>SJ Info Business Solutions</small></span></header><div className="company-message-list">{messages.map(message => <div className={`company-message ${message.senderId === currentUser.id ? 'mine' : ''}`} key={message.id}>{message.content && <p>{message.content}</p>}{message.attachment && <Attachment attachment={message.attachment} />}<small>{message.senderName || 'SJ team'} | {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>)}{!messages.length && <p className="company-chat-empty">Send a message to start a conversation with SJ Admin Service.</p>}</div><form className="company-message-form" onSubmit={sendMessage}><input value={text} onChange={event => setText(event.target.value)} maxLength={5000} placeholder="Type a message..." /><button type="submit" disabled={busy || !text.trim()}>Send</button></form></> : <div className="company-chat-start"><h3>Admin Service</h3><p>Contact SJ Info Business Solutions for support, requirements, services, and meetings.</p><button type="button" className="company-start-chat" disabled={busy} onClick={startSupport}>{busy ? 'Opening...' : 'Start chat'}</button></div>}{error && <p className="company-chat-error">{error}</p>}</section>
  </div>;
}
