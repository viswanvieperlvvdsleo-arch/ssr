'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, MOCK_CHATS } from '../AppContext';
import { useBackHandler } from '../useBackHandler';

/* ─── helpers ─────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    setW(window.innerWidth);
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

const isAdmin = (u) => u && (u.role === 'Admin' || u.role === 'Super Admin');
const hasEmployeePermission = (u, permission) => {
  if (isAdmin(u)) return true;
  if (u?.role !== 'Employee') return false;
  const permissions = Array.isArray(u.permissions) ? u.permissions : [];
  return permissions.includes('all_access') || permissions.includes(permission);
};

/* ─── constants ───────────────────────────────────── */
const FEED_TABS = ['All', 'Announcements', 'Training Updates', 'Discussions', 'Videos'];

// Monochrome SVG icons for nav
const NavIcons = {
  feed:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  learning:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  courses:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  meetings:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  bookmarks: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  settings:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  accounts:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  data:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12v7c0 1.66 3.58 3 8 3s8-1.34 8-3v-7"/></svg>,
  help:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  trainers:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  requests:  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
};

const getLeftNav = (user) => {
  const nav = [
    { id: 'feed',      label: 'Feed' },
    { id: 'courses',   label: 'Services' },
    { id: 'meetings',  label: 'Meetings' },
    { id: 'trainers',  label: 'Trainers / Users' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'settings',  label: 'Settings' },
  ];

  if (user && (user.role === 'Admin' || user.role === 'Super Admin') && !user.isImpersonating) {
    nav.push({ id: 'accounts', label: 'Account Management' });
    nav.push({ id: 'data-management', label: 'Data Management' });
  }
  if (user && hasEmployeePermission(user, 'request_access') && !user.isImpersonating) {
    nav.push({ id: 'requests', label: 'Requests' });
  }
  return nav;
};

const MenuIcons = {
  bell: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  profile: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  help: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  logout: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  accounts: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  bookmark: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  announcement: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>,
  chat: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  course: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
};


/* ─── sub-components ──────────────────────────────── */
function Avatar({ initials, color, size = 38, src, online = false, shape = 'circle' }) {
  const radius = shape === 'rounded' ? Math.max(8, size * 0.24) : '50%';
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      {src ? (
        <img src={src} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: radius, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.32 }}>
          {initials}
        </div>
      )}
      {online && (
        <span style={{ position: 'absolute', top: -2, right: -2, width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24), background: '#10B981', borderRadius: '50%', border: '2px solid #fff', boxSizing: 'border-box' }} />
      )}
    </div>
  );
}

/* ─── Media Preview Modal ──────────────────────────── */
export function MediaPreviewModal({ file, attachment, onClose, onSend }) {
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mode, setMode] = useState('preview'); // 'preview' | 'crop' | 'draw' | 'text' | 'emoji'
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialBox: null, handle: null });
  const [drawColor, setDrawColor] = useState('#DC2626');
  const [texts, setTexts] = useState([]); // { text, x, y, color }
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const isViewOnly = !!attachment;
  const target = attachment || file;
  const isImage = target?.type?.startsWith('image/') || attachment?.isImage || /\.(jpg|jpeg|png|gif|webp)$/i.test(target?.name);
  const isVideo = target?.type?.startsWith('video/') || attachment?.isVideo || /\.(mp4|webm|ogg|mov)$/i.test(target?.name);
  const isAudio = target?.type?.startsWith('audio/') || attachment?.isAudio || /\.(mp3|wav|m4a)$/i.test(target?.name);
  const [initialUrl] = useState(() => attachment ? attachment.url : (file ? URL.createObjectURL(file) : ''));
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [currentFile, setCurrentFile] = useState(file);
  const imageRef = useRef(null);
  const mediaFrameStyle = { width: 'min(92vw, 1100px)', height: 'min(72vh, 700px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: 0, minHeight: 0 };

  useBackHandler(Boolean(file || attachment), onClose);

  const startDraw = (e) => {
    drawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const draw = (e) => {
    if (!drawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    ctx.strokeStyle = drawColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(x, y); ctx.stroke();
    lastPos.current = { x, y };
  };
  const stopDraw = () => { drawing.current = false; };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragRef.current?.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { startX, startY, initialBox, handle, rect } = dragRef.current;
      const dx = ((clientX - startX) / rect.width) * 100;
      const dy = ((clientY - startY) / rect.height) * 100;
      let { x, y, w, h } = initialBox;
      if (handle === 'center') { x += dx; y += dy; }
      if (handle.includes('l')) { x += dx; w -= dx; }
      if (handle.includes('r')) { w += dx; }
      if (handle.includes('t')) { y += dy; h -= dy; }
      if (handle.includes('b')) { h += dy; }
      if (w < 10) { if(handle.includes('l')) x += (w-10); w = 10; }
      if (h < 10) { if(handle.includes('t')) y += (h-10); h = 10; }
      x = Math.max(0, Math.min(x, 100 - w));
      y = Math.max(0, Math.min(y, 100 - h));
      setCropBox({ x, y, w, h });
    };
    const handleUp = () => { if (dragRef.current) dragRef.current.isDragging = false; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const onCropDown = (e, handle) => {
    e.stopPropagation(); e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = imageRef.current.getBoundingClientRect();
    dragRef.current = { isDragging: true, startX: clientX, startY: clientY, initialBox: { ...cropBox }, handle, rect };
  };

  const [textInput, setTextInput] = useState({ visible: false, x: 50, y: 50, text: '' });

  const handleApplyCrop = () => {
    if (!imageRef.current) return;
    const canvas = document.createElement('canvas');
    const img = imageRef.current;

    // The image displayed is rendered via objectFit: contain.
    // However, if we know the natural size, we can crop exactly.
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const sx = (cropBox.x / 100) * nw;
    const sy = (cropBox.y / 100) * nh;
    const sw = (cropBox.w / 100) * nw;
    const sh = (cropBox.h / 100) * nh;

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(blob => {
      if (blob) {
        const croppedFile = new File([blob], target.name, { type: target.type || 'image/jpeg' });
        setCurrentFile(croppedFile);
        setCurrentUrl(URL.createObjectURL(croppedFile));
        setMode('preview');
      }
    }, target.type || 'image/jpeg');
  };

  const handleApplyDrawAndText = () => {
    if (!imageRef.current && !canvasRef.current) return;
    const canvas = document.createElement('canvas');
    const img = imageRef.current || document.querySelector('img[src="'+currentUrl+'"]');
    if (!img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Draw the drawings (the canvasRef contains the drawn lines, but it's sized 600x400)
    if (canvasRef.current) {
      // we need to scale the drawing canvas to the natural image size
      ctx.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw texts
    texts.forEach(t => {
      ctx.font = `bold ${Math.floor(canvas.height * 0.05)}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, (t.x / 100) * canvas.width, (t.y / 100) * canvas.height);
    });

    canvas.toBlob(blob => {
      if (blob) {
        const newFile = new File([blob], target.name, { type: target.type || 'image/jpeg' });
        setCurrentFile(newFile);
        setCurrentUrl(URL.createObjectURL(newFile));
        setMode('preview');
        setTexts([]);
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }, target.type || 'image/jpeg');
  };

  const addText = () => {
    if (textInput.text.trim()) {
      setTexts([...texts, { ...textInput, color: drawColor }]);
    }
    setTextInput({ ...textInput, visible: false, text: '' });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', zIndex: 10, background: 'linear-gradient(rgba(0,0,0,0.5), transparent)' }}>
        <button onClick={() => {
          if (mode !== 'preview') {
            setMode('preview');
            setTexts([]);
          } else {
            onClose();
          }
        }} style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '7px 12px 7px 8px', fontSize: 14, fontWeight: 700 }}>
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {!isViewOnly && 'Cancel'}
        </button>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {isViewOnly ? (
            target?.cloudDeleted || !currentUrl ? (
              <span style={{ background: 'rgba(127,29,29,0.75)', borderRadius: 8, color: '#FECACA', padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>Unable to download</span>
            ) : (
              <a href={currentUrl} download={target?.name} style={{ background: 'rgba(255,255,255,0.2)', textDecoration: 'none', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </a>
            )
          ) : (
            isImage && (
              <>
                {mode === 'crop' ? (
                  <button onClick={handleApplyCrop} style={{ background: '#10B981', border: 'none', borderRadius: 20, color: '#fff', padding: '6px 20px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                    Done
                  </button>
                ) : mode === 'draw' || mode === 'text' ? (
                  <button onClick={handleApplyDrawAndText} style={{ background: '#10B981', border: 'none', borderRadius: 20, color: '#fff', padding: '6px 20px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                    Done
                  </button>
                ) : (
                  <>
                    <button onClick={() => setMode('crop')} title="Crop" style={{ background: 'none', border: 'none', color: mode === 'crop' ? '#10B981' : '#fff', cursor: 'pointer', padding: 4 }}>
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 2 6 6 2 6"/><path d="M6 6L2 2"/><polyline points="18 22 18 18 22 18"/><path d="M18 18l4 4"/><path d="M2 18h12V6"/><path d="M22 6H10v12"/></svg>
                    </button>
                    <button onClick={() => { setMode('text'); setTextInput({ visible: true, x: 50, y: 50, text: '' }); }} title="Text" style={{ background: 'none', border: 'none', color: mode === 'text' ? '#10B981' : '#fff', cursor: 'pointer', padding: 4, fontWeight: 700, fontSize: 18, fontFamily: 'serif' }}>
                      Aa
                    </button>
                    <button onClick={() => setMode(mode === 'draw' ? 'preview' : 'draw')} title="Draw" style={{ background: 'none', border: 'none', color: mode === 'draw' ? '#10B981' : '#fff', cursor: 'pointer', padding: 4 }}>
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button onClick={() => alert('Emoji overlay coming soon!')} title="Emoji" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                    </button>
                  </>
                )}
                {(mode === 'draw' || mode === 'text') && (
                  <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer' }} />
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', height: '100%', padding: '80px 20px 100px', minHeight: 0, minWidth: 0, boxSizing: 'border-box' }}>
        {isImage && mode === 'preview' && (
          <div style={mediaFrameStyle}>
            <img src={currentUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 8, display: 'block' }} />
          </div>
        )}
        {isImage && (mode === 'draw' || mode === 'text') && (
          <div style={mediaFrameStyle}>
            <div style={{ position: 'relative', display: 'flex', maxWidth: '100%', maxHeight: '100%' }}>
            <img ref={imageRef} src={currentUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block' }} />
            <canvas ref={canvasRef} width={600} height={400} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: mode === 'draw' ? 'crosshair' : 'default', pointerEvents: mode === 'draw' ? 'auto' : 'none' }} />

            {/* Render added texts */}
            {texts.map((t, i) => (
              <div key={i} style={{ position: 'absolute', left: t.x + '%', top: t.y + '%', transform: 'translate(-50%, -50%)', color: t.color, fontSize: 32, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                {t.text}
              </div>
            ))}

            {/* Text Input */}
            {mode === 'text' && textInput.visible && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input autoFocus value={textInput.text} onChange={e => setTextInput({ ...textInput, text: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addText(); }} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${drawColor}`, color: drawColor, fontSize: 32, fontWeight: 'bold', outline: 'none', textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }} placeholder="Type..." />
                <button onClick={addText} style={{ position: 'absolute', right: 20, top: 20, background: '#10B981', border: 'none', borderRadius: 20, color: '#fff', padding: '6px 20px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>Done</button>
              </div>
            )}
          </div>
          </div>
        )}
        {isImage && mode === 'crop' && (
          <div style={mediaFrameStyle}>
          <div style={{ position: 'relative', display: 'flex', maxWidth: '100%', maxHeight: '100%' }}>
            <img ref={imageRef} src={currentUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block', opacity: 0.5, userSelect: 'none' }} draggable={false} />
            {/* Interactive Crop Box */}
            <div
              style={{ position: 'absolute', border: '2px solid #0A6ED1', background: 'rgba(255,255,255,0.1)', left: cropBox.x + '%', top: cropBox.y + '%', width: cropBox.w + '%', height: cropBox.h + '%', cursor: 'move', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' }}
              onMouseDown={e => onCropDown(e, 'center')}
              onTouchStart={e => onCropDown(e, 'center')}
            >
              {/* Handles */}
              {['tl', 'tr', 'bl', 'br'].map(pos => (
                <div key={pos} onMouseDown={e => onCropDown(e, pos)} onTouchStart={e => onCropDown(e, pos)} style={{ position: 'absolute', width: 24, height: 24, background: '#0A6ED1', border: '2px solid #fff', borderRadius: '50%', cursor: pos.includes('t') ? (pos.includes('l') ? 'nwse-resize' : 'nesw-resize') : (pos.includes('l') ? 'nesw-resize' : 'nwse-resize'), ...(pos.includes('t') ? { top: -12 } : { bottom: -12 }), ...(pos.includes('l') ? { left: -12 } : { right: -12 }) }} />
              ))}
            </div>
          </div>
          </div>
        )}
        {isVideo && <video src={currentUrl} controls style={{ maxWidth: 'min(92vw, 1100px)', maxHeight: 'min(72vh, 700px)', width: 'auto', height: 'auto', borderRadius: 8 }} />}
        {isAudio && <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, textAlign: 'center' }}><p style={{ color: '#fff', marginBottom: 16, fontSize: 18 }}>{target?.name}</p><audio src={currentUrl} controls /></div>}
        {!isImage && !isVideo && !isAudio && (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 48, textAlign: 'center', color: '#fff' }}>
            <svg width="48" height="48" fill="none" stroke="#94A3B8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p style={{ marginTop: 16, color: '#F1F5F9', fontSize: 16 }}>{target?.name}</p>
          </div>
        )}
      </div>

      {/* Caption + Send */}
      {!isViewOnly && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 700, display: 'flex', gap: 12, alignItems: 'center' }}>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 24, padding: '14px 20px', color: '#fff', fontSize: 15, outline: 'none' }} />
            {isSending && <span style={{ position: 'absolute', bottom: 72, color: '#fff', fontSize: 12, fontWeight: 700 }}>{uploadProgress}% uploaded</span>}
            {isSending && <div style={{ position: 'absolute', left: '50%', bottom: 62, transform: 'translateX(-50%)', width: 'min(700px, calc(100% - 48px))', height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${uploadProgress}%`, height: '100%', background: '#10B981', transition: 'width 0.2s' }} /></div>}
            <button disabled={isSending} onClick={async () => { setIsSending(true); setUploadProgress(0); try { await onSend({ file: currentFile, caption, onProgress: setUploadProgress }); } finally { setIsSending(false); } }} style={{ background: isSending ? '#64748B' : '#0A6ED1', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSending ? 'wait' : 'pointer', flexShrink: 0 }}>
              <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Notifications Panel ──────────────────────────── */
function NotificationsPanel() {
  const { notifications: notifs, markNotificationRead, markAllNotificationsRead, deleteNotification, deleteAllNotifications } = useApp();
  const unreadCount = notifs.filter(n => !n.read).length;

  const iconFor = (type) => {
    if (type === 'announce') return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>;
    if (['chat', 'comment', 'like'].includes(type)) return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
  };

  return (
    <div style={{ padding: '20px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1.5px solid #F1F5F9' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Notifications</h2>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>{unreadCount} unread</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={markAllNotificationsRead} style={{ padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#0A6ED1', cursor: 'pointer' }}>
            Mark all read
          </button>
          <button onClick={deleteAllNotifications} style={{ padding: '8px 14px', border: '1px solid #FEE2E2', borderRadius: 8, background: '#FFF5F5', fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>
            Delete all
          </button>
        </div>
      </div>

      {notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#CBD5E1' }}>
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <p style={{ fontWeight: 600, fontSize: 15 }}>No notifications</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notifs.map((n, i) => (
            <div key={n.id} style={{ display: 'flex', gap: 14, padding: '16px 12px', borderBottom: i < notifs.length - 1 ? '1px solid #F8FAFC' : 'none', background: n.read ? '#fff' : '#F0F7FF', borderRadius: 10, marginBottom: 4, cursor: 'pointer' }}
              onClick={() => { markNotificationRead(n.id); if (n.url) window.location.href = n.url; }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: n.read ? '#F1F5F9' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: n.read ? '#64748B' : '#0A6ED1' }}>
                {iconFor(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#0F172A', fontWeight: n.read ? 400 : 600, lineHeight: 1.5 }}>{n.body}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', display: 'flex', alignItems: 'center', padding: 4, flexShrink: 0 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, senderAvatar, onReply, onViewMedia, onDownloadMedia, selectionMode, isSelected, onToggleSelect, onEdit, deliveryStatus, isHighlighted, onReplyClick, isMobile }) {
  const { autoDownloadMedia, currentUser } = useApp();
  const mediaRemovedForUser = Boolean(msg.attachment?.deletedFor?.includes(currentUser?.id));
  const mediaDeletedFromCloud = Boolean(msg.attachment?.cloudDeleted);
  const [isDownloaded, setIsDownloaded] = useState(() => {
    if (mediaRemovedForUser || mediaDeletedFromCloud) return false;
    if (msg.isMe) return true;
    if (msg.attachment?.isDownloaded) return true;
    return autoDownloadMedia;
  });
  const [downloadState, setDownloadState] = useState('idle');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (mediaRemovedForUser || mediaDeletedFromCloud) {
      setIsDownloaded(false);
      return;
    }
    setIsDownloaded(Boolean(msg.isMe || msg.attachment?.isDownloaded || autoDownloadMedia));
  }, [msg.id, msg.isMe, msg.attachment?.url, msg.attachment?.deletedFor?.join(','), msg.attachment?.cloudDeleted, currentUser?.id, autoDownloadMedia]);

  const handleMediaDownload = async (event) => {
    event?.stopPropagation();
    if (mediaDeletedFromCloud) {
      setDownloadError('Unable to download: this file was deleted from cloud storage.');
      return;
    }
    if (!onDownloadMedia || downloadState === 'loading') return;
    setDownloadError('');
    setDownloadState('loading');
    try {
      const result = await onDownloadMedia(msg.attachment);
      if (!result?.success) throw new Error(result?.error || 'Unable to download media');
      setIsDownloaded(true);
      setDownloadState('done');
    } catch (error) {
      setDownloadState('error');
      setDownloadError(error.message || 'Unable to download media');
    }
  };

  const [isHovered, setIsHovered] = useState(false);

  const [showReactions, setShowReactions] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [myReaction, setMyReaction] = useState(null);

  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false);

  const startX = useRef(0);
  const currentX = useRef(0);
  const pressTimer = useRef(null);
  const swipeOffsetRef = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsSwiping(true);
    pressTimer.current = setTimeout(() => {
      setShowReactions(true);
      setShowAllEmojis(false);
      onToggleSelect && onToggleSelect(msg.id, true);
      setIsSwiping(false);
    }, 500);
  };

  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (Math.abs(diff) > 10 && pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (isSwiping && !selectionMode) {
      const bounded = Math.max(Math.min(diff, 60), -60);
      swipeOffsetRef.current = bounded;
      setSwipeOffset(bounded);
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsSwiping(false);

    if (!selectionMode && swipeOffsetRef.current < -40) { onReply && onReply(msg); }

    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
  };

  const handleMouseDown = (e) => {
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setIsSwiping(true);
    pressTimer.current = setTimeout(() => {
      onToggleSelect && onToggleSelect(msg.id, true);
      setIsSwiping(false);
    }, 500);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    if (Math.abs(diff) > 10 && pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!selectionMode) {
      const bounded = Math.max(Math.min(diff, 60), -60);
      swipeOffsetRef.current = bounded;
      setSwipeOffset(bounded);
    }
  };
  const handleMouseUp = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (isSwiping) {
      setIsSwiping(false);
      if (!selectionMode && swipeOffsetRef.current < -40) { onReply && onReply(msg); }
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
    }
  };

  return (
    <div style={{ position: 'relative', marginBottom: 8, overflow: 'visible' }}>
      {/* Background hint icons */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 16, display: 'flex', alignItems: 'center', opacity: swipeOffset > 0 ? Math.min(swipeOffset / 40, 1) : 0, color: '#DC2626' }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 16, display: 'flex', alignItems: 'center', opacity: swipeOffset < 0 ? Math.min(Math.abs(swipeOffset) / 40, 1) : 0, color: '#0A6ED1' }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
      </div>

      <div
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={(e) => { handleMouseUp(e); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start', transform: `translateX(${swipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.2s ease-out' }}
      >
        {!msg.isMe && <span style={{ fontSize: 10, color: msg.senderColor, fontWeight: 600, marginLeft: 34, marginBottom: 2 }}>{msg.senderName}</span>}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexDirection: msg.isMe ? 'row-reverse' : 'row', maxWidth: 'min(620px, 82%)', position: 'relative' }}>
          {!msg.isMe && <Avatar initials={msg.senderInitials} color={msg.senderColor} src={senderAvatar || msg.senderAvatar} size={24} />}
          <div style={{
            maxWidth: '100%',
            width: 'fit-content',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            background: msg.isMe ? '#0A6ED1' : '#fff',
            color: msg.isMe ? '#fff' : '#0F172A',
            borderRadius: msg.isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '8px 11px',
            fontSize: 13,
            lineHeight: 1.45,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: msg.isMe ? 'none' : '1px solid #E8ECF0',
            userSelect: 'none', WebkitUserSelect: 'none'
          }}>
            {/* Reply context */}
            {msg.replyTo && (
              <div onClick={(e) => { e.stopPropagation(); onReplyClick && onReplyClick(msg.replyTo.id); }} style={{ borderLeft: '3px solid', borderColor: msg.isMe ? 'rgba(255,255,255,0.5)' : '#0A6ED1', paddingLeft: 8, marginBottom: 6, opacity: 0.85, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: msg.isMe ? 'rgba(255,255,255,0.9)' : '#0A6ED1', marginBottom: 2 }}>{msg.replyTo.senderName || 'You'}</div>
                <div style={{ fontSize: 11, color: msg.isMe ? 'rgba(255,255,255,0.75)' : '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{msg.replyTo.text}</div>
              </div>
            )}
            {/* Attachment */}
            {msg.attachment && (
              <div style={{ marginBottom: msg.text ? 8 : 0, borderRadius: 8, overflow: 'hidden', minWidth: msg.attachment.isImage || msg.attachment.isVideo ? 180 : 0 }}>
                {!isDownloaded ? (
                  <div style={{ position: 'relative', minHeight: msg.attachment.isImage || msg.attachment.isVideo ? 150 : 82, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.isMe ? 'rgba(255,255,255,0.15)' : '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    {msg.attachment.isImage && !mediaDeletedFromCloud && <img src={msg.attachment.url} alt="Attached image" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', filter: 'blur(14px)', opacity: 0.75, transform: 'scale(1.08)' }} />}
                    {msg.attachment.isVideo && !mediaDeletedFromCloud && <video src={msg.attachment.url} muted style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', filter: 'blur(14px)', opacity: 0.75, transform: 'scale(1.08)' }} />}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, padding: 12, background: 'rgba(15,23,42,0.28)', color: '#fff', textAlign: 'center' }}>
                      {mediaDeletedFromCloud ? (
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Unable to download</span>
                      ) : (
                        <button type="button" onClick={handleMediaDownload} style={{ width: 42, height: 42, borderRadius: '50%', background: '#0A6ED1', border: '2px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: downloadState === 'loading' ? 'wait' : 'pointer' }} aria-label="Download media">
                          {downloadState === 'loading' ? <span style={{ fontSize: 11, fontWeight: 800 }}>...</span> : <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                        </button>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{mediaDeletedFromCloud ? 'File removed from cloud storage' : (downloadState === 'loading' ? 'Downloading...' : (msg.attachment.size ? (msg.attachment.size / (1024*1024)).toFixed(1) + ' MB' : 'Download'))}</span>
                      {downloadError && <span style={{ fontSize: 11, color: '#FECACA', maxWidth: 220 }}>{downloadError}</span>}
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.attachment.isImage && <img src={msg.attachment.url} alt="Attached image" onClick={() => onViewMedia && onViewMedia(msg.attachment)} style={{ maxWidth: '100%', maxHeight: 240, display: 'block', objectFit: 'cover', cursor: 'pointer' }} />}
                    {msg.attachment.isVideo && <video src={msg.attachment.url} controls style={{ maxWidth: '100%', maxHeight: 240, display: 'block' }} />}
                    {msg.attachment.isAudio && <audio src={msg.attachment.url} controls style={{ maxWidth: 220, display: 'block' }} />}
                    {!msg.attachment.isImage && !msg.attachment.isVideo && !msg.attachment.isAudio && (
                      <div onClick={() => onViewMedia && onViewMedia(msg.attachment)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: msg.isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)', borderRadius: 8, cursor: 'pointer' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{msg.attachment.name}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {msg.text && (
              <div style={{ fontStyle: msg.isDeletedForEveryone ? 'italic' : 'normal', opacity: msg.isDeletedForEveryone ? 0.8 : 1 }}>
                {msg.text.includes('Voice message') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, paddingRight: 10 }}>
                    <button style={{ width: 32, height: 32, borderRadius: '50%', background: msg.isMe ? 'rgba(255,255,255,0.2)' : '#0A6ED1', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center', height: 20 }}>
                      {[3,7,4,9,5,8,3,6,4,7,5,8,4].map((h, i) => <div key={i} style={{ width: 3, height: h * 2, background: msg.isMe ? 'rgba(255,255,255,0.6)' : '#CBD5E1', borderRadius: 2 }} />)}
                    </div>
                    <span style={{ fontSize: 11, color: msg.isMe ? 'rgba(255,255,255,0.8)' : '#64748B' }}>0:04</span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      display: isExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'unset' : 10,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {msg.text}
                    </div>
                    {(!isExpanded && msg.text.split('\n').length > 10 || (!isExpanded && msg.text.length > 400)) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                        style={{ background: 'none', border: 'none', color: msg.isMe ? 'rgba(255,255,255,0.9)' : '#0A6ED1', fontWeight: 600, padding: '4px 0 0', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                      >
                        Read more
                      </button>
                    )}
                    {(isExpanded && (msg.text.split('\n').length > 10 || msg.text.length > 400)) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                        style={{ background: 'none', border: 'none', color: msg.isMe ? 'rgba(255,255,255,0.9)' : '#0A6ED1', fontWeight: 600, padding: '4px 0 0', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                      >
                        Read less
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 3, paddingRight: 3 }}>
            <span style={{ fontSize: 10, color: msg.isMe ? '#64748B' : '#94A3B8' }}>{msg.time}</span>
            {msg.isMe && (
              <span title={deliveryStatus === 'seen' ? 'Seen' : deliveryStatus === 'delivered' ? 'Delivered to an online recipient' : deliveryStatus === 'sending' ? 'Sending' : 'Recipient is offline'} style={{ fontSize: 11, letterSpacing: 1, color: deliveryStatus === 'seen' ? '#0A6ED1' : '#94A3B8', lineHeight: 1 }}>
                {deliveryStatus === 'sending' ? '…' : deliveryStatus === 'seen' ? '...' : deliveryStatus === 'delivered' ? '..' : '.'}
              </span>
            )}
          </div>

          {/* Sibling emoji button on hover */}
          {isHovered && (
            <div
              onClick={(e) => { e.stopPropagation(); setShowReactions(true); }}
              style={{ cursor: 'pointer', color: '#94A3B8', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', opacity: 0.7 }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-3.5-9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5 5.5c-2.03 0-3.8-1.11-4.75-2.75a.5.5 0 11.86-.5c.76 1.3 2.14 2.25 3.89 2.25s3.13-.95 3.89-2.25a.5.5 0 11.86.5c-.95 1.64-2.72 2.75-4.75 2.75z"/>
              </svg>
            </div>
          )}

          {/* Reaction Overlay */}
          {(showReactions || showAllEmojis) && (
            <div
              onClick={(e) => { e.stopPropagation(); setShowReactions(false); setShowAllEmojis(false); }}
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
            />
          )}

          {/* Reaction Popup */}
          {showReactions && !showAllEmojis && (
            <div style={{ position: 'absolute', top: -45, [msg.isMe ? 'right' : 'left']: 0, background: '#111', borderRadius: 30, padding: '6px 12px', display: 'flex', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <span key={emoji} onClick={(e) => { e.stopPropagation(); setMyReaction(emoji); setShowReactions(false); }} style={{ cursor: 'pointer', fontSize: 20, transition: 'transform 0.1s' }} onMouseEnter={e => e.target.style.transform = 'scale(1.2)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>{emoji}</span>
              ))}
              <span onClick={(e) => { e.stopPropagation(); setShowAllEmojis(true); }} style={{ cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>+</span>
              {msg.isMe && onEdit && !msg.isDeletedForEveryone && (
                <button onClick={(e) => { e.stopPropagation(); setShowReactions(false); onEdit(msg); }} title="Edit message" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1-1 4 4-1L19.5 6.5"/></svg>
                </button>
              )}
            </div>
          )}

          {/* Expanded Emoji Picker */}
          {showAllEmojis && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: -140, [msg.isMe ? 'right' : 'left']: 0, background: '#111', borderRadius: 12, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6, width: 220, maxHeight: 120, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100 }}>
              {['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'].map(emoji => (
                <span key={emoji} onClick={(e) => { e.stopPropagation(); setMyReaction(emoji); setShowReactions(false); setShowAllEmojis(false); }} style={{ cursor: 'pointer', fontSize: 18 }}>{emoji}</span>
              ))}
            </div>
          )}

          {/* Display Reactions */}
          {myReaction && (
            <div style={{ position: 'absolute', bottom: -12, [msg.isMe ? 'right' : 'left']: 20, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '2px 6px', fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 4, zIndex: 2 }}>
              {myReaction}
            </div>
          )}
        </div>
      </div>

      {isSelected && (
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: msg.isMe ? 12 : undefined, right: !msg.isMe ? 12 : undefined }}>
          <div style={{ width: 22, height: 22, background: '#0A6ED1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}
    </div>
  );
}

function PostBanner({ banner, category }) {
  if (!banner) return null;
  const isVideo = category === 'Training Updates';
  return (
    <div style={{ background: 'linear-gradient(135deg, #0F2B5B 0%, #0A6ED1 100%)', borderRadius: 12, padding: '20px 24px', margin: '10px 0 12px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{category}</p>
        <h3 style={{ margin: '4px 0 2px', color: '#fff', fontSize: 18, fontWeight: 800 }}>{banner.title}</h3>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{banner.subtitle}</p>
        {banner.date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>📅</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{banner.date}</span>
          </div>
        )}
        {banner.duration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▶️</div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{banner.duration}</span>
          </div>
        )}
        {banner.date && (
          <button style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => alert('Opening details...')}>
            Know More
          </button>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, isDesktop }) {
  const { toggleLike, toggleSave, deletePost, addComment, deleteComment, viewUserProfile, viewProfilePic, users } = useApp();
  const [showComments, setShowComments] = useState(false);
  useBackHandler(showComments, () => setShowComments(false));
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const canDelete = isAdmin(currentUser) && !currentUser?.isImpersonating;
  const canModerateComments = !currentUser?.isImpersonating && (isAdmin(currentUser) || hasEmployeePermission(currentUser, 'post_feeds'));
  const tagBg = '#0A6ED1';

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText('');
  };


  return (
    <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
      {!showComments ? (
        <>
          {/* Header */}
          <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div onClick={() => viewProfilePic({ ...(users?.[post.authorId] || {}), id: post.authorId, name: post.authorName, initials: post.authorInitials, color: post.authorColor })} style={{ cursor: 'pointer' }}>
                <Avatar initials={post.authorInitials} color={post.authorColor} src={users?.[post.authorId]?.avatar} size={40} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span onClick={() => viewUserProfile(post.authorId)} style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', cursor: 'pointer' }}>{post.authorName}</span>
                  <span style={{ background: '#F0F4FF', color: post.authorColor, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, border: `1px solid ${post.authorColor}30` }}>{post.authorRole}</span>
                </div>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{post.createdAt}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: `${tagBg}18`, color: tagBg, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${tagBg}30`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{post.tag}</span>
              {canDelete && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowMenu(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>···</button>
                  {showMenu && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 140 }}>
                      <button onClick={() => { deletePost(post.id); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Delete Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '10px 18px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>{post.title}</h3>
            <p style={{
              margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.65, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap',
              display: isExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {post.content}
            </p>
            {((post.content?.length > 200) || (post.content?.match(/\n/g) || []).length >= 3) && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'none', border: 'none', color: '#0A6ED1', fontWeight: 600, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}
              >
                {isExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
            {(post.image || post.mediaUrl) && (post.mediaType === 'image' || !post.mediaType) && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                <img onClick={() => window.open(post.image || post.mediaUrl, '_blank')} src={post.image || post.mediaUrl} alt="Post media" style={{ maxWidth: '100%', maxHeight: 500, height: 'auto', width: 'auto', borderRadius: 8, border: '1px solid #E2E8F0', display: 'block', cursor: 'pointer' }} />
              </div>
            )}
            {(post.image || post.mediaUrl) && post.mediaType === 'video' && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                <video src={post.image || post.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: 500, height: 'auto', width: 'auto', borderRadius: 8, border: '1px solid #E2E8F0', background: '#000', display: 'block' }} />
              </div>
            )}
            <PostBanner banner={post.banner} category={post.category} />
          </div>

          {/* Action bar */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 2 }}>
            <ActionBtn iconEl={ActionIcons.like(post.likedBy?.includes(currentUser?.id))} label={`${post.likes || 0}`} active={post.likedBy?.includes(currentUser?.id)} activeColor="#E11D48" onClick={() => !currentUser?.isImpersonating && toggleLike(post.id)} />
            <ActionBtn iconEl={ActionIcons.comment()} label={`${(post.commentsList || []).length}`} active={showComments} activeColor="#0A6ED1" onClick={() => setShowComments(true)} />
            <ActionBtn iconEl={ActionIcons.share()} label="Share" onClick={() => alert('Link copied!')} />
            <div style={{ marginLeft: 'auto' }}>
              <ActionBtn iconEl={ActionIcons.save(post.savedBy?.includes(currentUser?.id))} active={post.savedBy?.includes(currentUser?.id)} activeColor="#0A6ED1" onClick={() => !currentUser?.isImpersonating && toggleSave(post.id)} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280, maxHeight: 500 }}>
          {/* Comments Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
            <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: 4 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Comments ({(post.commentsList || []).length})</span>
          </div>

          {/* Comments List */}
          <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto', background: '#FAFBFC' }}>
            {(!post.commentsList || post.commentsList.length === 0) && <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 10px', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>}
            {(post.commentsList || []).map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
                <div onClick={() => viewProfilePic({ ...(users?.[c.authorId] || {}), id: c.authorId, name: c.authorName, initials: c.authorInitials, color: c.authorColor })} style={{ cursor: 'pointer' }}>
                  <Avatar initials={c.authorInitials} color={c.authorColor} src={users?.[c.authorId]?.avatar} size={28} />
                </div>
                <div style={{ flex: 1, background: '#fff', border: '1px solid #E8ECF0', borderRadius: 10, padding: '9px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span onClick={() => viewUserProfile(c.authorId)} style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>{c.authorName}</span>
                    <span style={{ fontSize: 11, color: '#CBD5E1' }}>{c.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{c.text}</p>
                </div>
                {(currentUser?.id === c.authorId || canModerateComments) && (
                  <button onClick={() => deleteComment(post.id, c.id)} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 14, paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', background: '#fff' }}>
            {currentUser?.isImpersonating ? (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', padding: '4px 0' }}>
                Commenting is disabled in View-Only mode.
              </div>
            ) : (
              <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar initials={currentUser?.initials || '?'} color={currentUser?.color || '#94A3B8'} src={currentUser?.avatar} size={30} />
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
                <button type="submit" disabled={!commentText.trim()} style={{ background: commentText.trim() ? '#0A6ED1' : '#E2E8F0', color: commentText.trim() ? '#fff' : '#94A3B8', border: 'none', borderRadius: 20, padding: '9px 16px', cursor: commentText.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, transition: 'background 0.2s' }}>Post</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// SVG icons for post actions
const ActionIcons = {
  like:    (filled) => <svg width="16" height="16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  comment: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  share:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  save:    (saved) => <svg width="16" height="16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
};

function ActionBtn({ iconEl, label, active, activeColor = '#0A6ED1', onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: active ? `${activeColor}10` : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: active ? activeColor : '#94A3B8', fontSize: 13, fontWeight: active ? 700 : 500, transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = active ? `${activeColor}18` : '#F1F5F9'}
      onMouseLeave={e => e.currentTarget.style.background = active ? `${activeColor}10` : 'transparent'}
    >
      {iconEl}{label && <span>{label}</span>}
    </button>
  );
}


function CreatePostModal({ onClose, onSubmit }) {
  const { currentUser } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Announcements');

  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({
      id: `p${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorInitials: currentUser.initials,
      authorColor: currentUser.color,
      tag: category.slice(0, -1),
      tagColor: '#0A6ED1',
      category,
      title,
      content,
      mediaUrl,
      mediaType,
      banner: null,
      likes: 0,
      saved: false,
      liked: false,
      createdAt: 'Just now',
      comments: []
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create Post</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <Avatar initials={currentUser?.initials} color={currentUser?.color} src={currentUser?.avatar} size={38} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{currentUser?.name}</p>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#0A6ED1', fontWeight: 600, background: '#EFF6FF', cursor: 'pointer', marginTop: 2 }}>
                {FEED_TABS.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <input
            value={title}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= 100) setTitle(val);
            }}
            placeholder="Post title (max 100 chars)..."
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 600, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: -8, marginBottom: 8 }}>{title.length}/100</div>

          <textarea
            value={content}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= 1000) setContent(val);
            }}
            placeholder="What do you want to share with the batch? (max 1000 chars)"
            rows={4}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
          <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4, marginBottom: 12 }}>{content.length}/1000</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Attach Media (Image max 30MB, Video max 80MB)</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setMediaUrl(null);
                  setMediaType(null);
                  return;
                }
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                if (isImage && file.size > 5 * 1024 * 1024) { // Reduced to 5MB for base64 storage limits
                  alert('Image file size exceeds 5MB limit.');
                  e.target.value = '';
                  return;
                } else if (isVideo && file.size > 10 * 1024 * 1024) { // Reduced to 10MB
                  alert('Video file size exceeds 10MB limit.');
                  e.target.value = '';
                  return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                  setMediaUrl(reader.result);
                  setMediaType(isImage ? 'image' : 'video');
                };
                reader.readAsDataURL(file);
              }}
              style={{ fontSize: 12 }}
            />
            {mediaUrl && mediaType === 'image' && (
              <div style={{ marginTop: 12 }}>
                <img src={mediaUrl} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </div>
            )}
            {mediaUrl && mediaType === 'video' && (
              <div style={{ marginTop: 12 }}>
                <video src={mediaUrl} controls style={{ width: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={!title.trim() || !content.trim()} style={{ padding: '9px 20px', border: 'none', borderRadius: 10, background: title.trim() && content.trim() ? '#0A6ED1' : '#CBD5E1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Publish Post</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AutoSendModal({ onClose, onSave }) {
  const [interval, setInterval] = useState('none');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sendTime, setSendTime] = useState('09:00');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState(new Set());
  const [selectedMonths, setSelectedMonths] = useState(new Set());
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState(new Set());

  const toggleDayOfWeek = (day) => {
    const next = new Set(selectedDaysOfWeek);
    if (next.has(day)) next.delete(day); else next.add(day);
    setSelectedDaysOfWeek(next);
  };

  const toggleMonth = (month) => {
    const next = new Set(selectedMonths);
    if (next.has(month)) next.delete(month); else next.add(month);
    setSelectedMonths(next);
  };

  const toggleDayOfMonth = (day) => {
    const next = new Set(selectedDaysOfMonth);
    if (next.has(day)) next.delete(day); else next.add(day);
    setSelectedDaysOfMonth(next);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div style={{ background: '#fff', width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Schedule Auto Send</h3>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Repeat Interval</label>
            <select value={interval} onChange={e => setInterval(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 14 }}>
              <option value="none">Once</option>
              <option value="daily">Daily (Everyday)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 14 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 14 }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Send Time</label>
            <input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 14 }} />
          </div>

          {interval === 'weekly' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Select Days of the Week</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOfWeek(day)}
                    style={{ flex: 1, padding: '8px 0', border: '1px solid', borderColor: selectedDaysOfWeek.has(day) ? '#0A6ED1' : '#E2E8F0', background: selectedDaysOfWeek.has(day) ? '#EFF6FF' : '#fff', color: selectedDaysOfWeek.has(day) ? '#0A6ED1' : '#64748B', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {interval === 'monthly' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Select Months</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(month)}
                      style={{ padding: '6px 0', border: '1px solid', borderColor: selectedMonths.has(month) ? '#0A6ED1' : '#E2E8F0', background: selectedMonths.has(month) ? '#EFF6FF' : '#fff', color: selectedMonths.has(month) ? '#0A6ED1' : '#64748B', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Select Days of the Month</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDayOfMonth(day)}
                      style={{ padding: '6px 0', border: '1px solid', borderColor: selectedDaysOfMonth.has(day) ? '#0A6ED1' : '#E2E8F0', background: selectedDaysOfMonth.has(day) ? '#EFF6FF' : '#fff', color: selectedDaysOfMonth.has(day) ? '#0A6ED1' : '#64748B', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onTouchEnd={(e) => { e.stopPropagation(); onClose(); }}
            style={{ flex: 1, padding: '16px', border: 'none', background: '#F8FAFC', cursor: 'pointer', color: '#64748B', fontSize: 15, fontWeight: 700, textAlign: 'center' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave({ recurrence: interval, startDate, endDate, time: sendTime, weekdays: Array.from(selectedDaysOfWeek), monthlyDates: Array.from(selectedDaysOfMonth).join(',') });
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onSave({ recurrence: interval, startDate, endDate, time: sendTime, weekdays: Array.from(selectedDaysOfWeek), monthlyDates: Array.from(selectedDaysOfMonth).join(',') });
            }}
            style={{ flex: 1, padding: '16px', border: 'none', background: startDate && sendTime ? '#0A6ED1' : '#CBD5E1', cursor: startDate && sendTime ? 'pointer' : 'default', color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center' }}
            disabled={!startDate || !sendTime}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatActionMenu({ chat, onClose, onAction, busy = false }) {
  if (!chat) return null;
  const isGroup = chat.type === 'group';
  const actions = [
    { id: 'view', label: isGroup ? 'View group info' : 'View contact', color: '#0A6ED1' },
    { id: 'togglePin', label: chat.pinned ? 'Unpin from top' : 'Pin on top', color: '#0A6ED1' },
    { id: 'deleteChat', label: 'Delete chat', color: '#DC2626' },
    { id: 'leave', label: isGroup ? 'Exit group' : 'Exit chat', color: '#475569' },
    { id: 'exitAndDelete', label: isGroup ? 'Exit and delete group chat' : 'Exit and delete chat', color: '#DC2626' },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)' }}>
      <div style={{ width: '100%', maxWidth: 330, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{chat.name || 'Chat'}</div>
          <div style={{ marginTop: 3, fontSize: 12, color: '#64748B' }}>Chat options</div>
        </div>
        <div style={{ padding: 8 }}>
          {actions.map(action => (
            <button key={action.id} type="button" disabled={busy} onClick={() => onAction(action.id)} style={{ width: '100%', padding: '12px 10px', textAlign: 'left', border: 'none', borderRadius: 8, background: '#fff', color: action.color, fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              {action.label}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={onClose} style={{ width: '100%', marginTop: 4, padding: '12px 10px', textAlign: 'left', border: 'none', borderTop: '1px solid #F1F5F9', background: '#fff', color: '#64748B', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddMembersModal({ users, currentUser, participants, onClose, onSave, busy = false }) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const existingIds = new Set(participants || []);
  const availableUsers = Object.values(users).filter(user => {
    if (!user || !['Participant', 'Trainer', 'Employee'].includes(user.role) || user.id === currentUser?.id || existingIds.has(user.id)) return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return user.name.toLowerCase().includes(query) || (user.role || '').toLowerCase().includes(query);
  });

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)' }}>
      <div style={{ width: '100%', maxWidth: 420, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h3 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>Add members</h3><p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>Choose participants, trainers, or employees.</p></div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', color: '#64748B', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13 }} />
        </div>
        <div style={{ overflowY: 'auto', minHeight: 150, flex: 1, borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
          {availableUsers.map(user => {
            const selected = selectedIds.includes(user.id);
            return (
              <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', cursor: 'pointer', background: selected ? '#EFF6FF' : '#fff' }}>
                <input type="checkbox" checked={selected} onChange={() => setSelectedIds(ids => selected ? ids.filter(id => id !== user.id) : [...ids, user.id])} style={{ width: 16, height: 16, accentColor: '#0A6ED1' }} />
                <Avatar initials={user.initials} color={user.color} src={user.avatar} size={34} online={user.online} />
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{user.name}</div><div style={{ fontSize: 11, color: '#64748B' }}>{user.role}</div></div>
              </label>
            );
          })}
          {availableUsers.length === 0 && <p style={{ margin: 0, padding: 28, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No accounts available.</p>}
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 14px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button type="button" disabled={busy || selectedIds.length === 0} onClick={() => onSave(selectedIds)} style={{ padding: '9px 16px', border: 'none', background: busy || selectedIds.length === 0 ? '#CBD5E1' : '#0A6ED1', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Adding...' : 'Add members'}</button>
        </div>
      </div>
    </div>
  );
}

function ChatListRow({ children, onOpen, onLongPress, active, isMobile }) {
  const handlers = useLongPress(onLongPress, onOpen, { delay: 550, shouldPreventDefault: false });
  return (
    <div {...handlers} onContextMenu={e => { e.preventDefault(); onLongPress(e); }} style={{ padding: '10px 12px', cursor: 'pointer', background: active && !isMobile ? '#EFF6FF' : '#fff', borderBottom: '1px solid #F8FAFC', borderLeft: active && !isMobile ? '3px solid #0A6ED1' : '3px solid transparent', transition: 'all 0.15s' }}>
      {children}
    </div>
  );
}

export function ChatPanel({ currentUser, isMobile, isExpanded, onExpandToggle, conversationOnly = false }) {
  const router = useRouter();
  const { chats, chatMessages, sendChatMessage, markChatRead, scheduleMessage, users, deleteMessages, editMessage, forwardMessages, targetChat, setTargetChat, updateChat, performChatAction, viewUserProfile, viewProfilePic, addMeeting, openScheduleMeeting, startDirectChat, createGroup, canUseStaffChatAccess, openMediaComposer } = useApp();
  const [chatTab, setChatTab] = useState('Chats');

  const [search, setSearch] = useState('');
  const [activeChat, setActiveChat] = useState(MOCK_CHATS[1]);
  const [msgText, setMsgText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAutoSendModal, setShowAutoSendModal] = useState(false);
  const [showMessageInfoModal, setShowMessageInfoModal] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState(new Set());
  const [editingMsgId, setEditingMsgId] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState(conversationOnly ? 'convo' : 'list'); // 'list' | 'convo'

  // Details pane state
  const [showDetails, setShowDetails] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [mediaTab, setMediaTab] = useState('Media');
  const [mediaFile, setMediaFile] = useState(null);
  const [viewMedia, setViewMedia] = useState(null);
  const [chatActionTarget, setChatActionTarget] = useState(null);
  const [chatActionBusy, setChatActionBusy] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const fileInputRefs = { cam: useRef(null), photos: useRef(null), audio: useRef(null), videos: useRef(null), docs: useRef(null) };

  const [showChatEmojis, setShowChatEmojis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPreview, setRecordingPreview] = useState(false);
  const [highlightMsgId, setHighlightMsgId] = useState(null);
  const highlightTimerRef = useRef(null);
  const lastChatId = useRef(activeChat?.id);
  const canCreateGroup = canUseStaffChatAccess(currentUser);

  useBackHandler(isMobile && !conversationOnly && mobileView === 'convo', () => setMobileView('list'));
  useBackHandler(showDetails, () => setShowDetails(false));
  useBackHandler(showAllMedia, () => setShowAllMedia(false));
  useBackHandler(Boolean(chatActionTarget), () => setChatActionTarget(null));
  useBackHandler(Boolean(viewMedia), () => setViewMedia(null));
  useBackHandler(showAddMembers, () => setShowAddMembers(false));

  const handleChatAction = async (action) => {
    if (!chatActionTarget) return;
    if (action === 'view') {
      setActiveChat(chatActionTarget);
      setChatActionTarget(null);
      setMobileView('convo');
      setShowDetails(true);
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
    if (action === 'leave' || action === 'exitAndDelete') {
      setShowDetails(false);
      if (isMobile) setMobileView('list');
    }
  };

  const handleAddMembers = async (memberIds) => {
    if (!activeChat?.id || memberIds.length === 0) return;
    setAddingMembers(true);
    const result = await performChatAction(activeChat.id, 'addParticipants', memberIds);
    setAddingMembers(false);
    if (!result.success) {
      alert(result.error || 'Could not add members');
      return;
    }
    setActiveChat(result.chat);
    setShowAddMembers(false);
  };

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
    setActiveChat(result.chat);
    setChatTab('Groups');
    closeCreateGroup();
    if (isMobile) setMobileView('convo');
  };

  useEffect(() => {
    if (textareaRef.current && msgText === '') {
      textareaRef.current.style.height = 'auto';
    }
  }, [msgText]);

  useEffect(() => {
    const parent = bottomRef.current?.parentElement;
    if (parent && !targetChat) {
      if (lastChatId.current !== activeChat?.id) {
        parent.scrollTo({ top: parent.scrollHeight, behavior: 'auto' });
        lastChatId.current = activeChat?.id;
      } else {
        parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [chatMessages, activeChat, mobileView, showDetails, targetChat]);

  useEffect(() => {
    if (targetChat) {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      const chat = chats.find(c => c.id === targetChat.chatId);
      if (chat && chat.id !== activeChat?.id) {
        setActiveChat(chat);
      }
      setMobileView('convo');
      setShowDetails(false);
      setShowAllMedia(false);

      // Give it a tiny delay to allow React to render the chat messages before scrolling
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`msg-${targetChat.msgId}`);
        if (el) {
          setHighlightMsgId(targetChat.msgId);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTargetChat(null);
          highlightTimerRef.current = setTimeout(() => {
            setHighlightMsgId(null);
            highlightTimerRef.current = null;
          }, 3000);
        }
      }, 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [targetChat, chats, chatMessages, activeChat?.id, setTargetChat]);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  const mappedChats = chats.filter(c => !c.deletedFor?.includes(currentUser.id)).map(c => {
    if (c.type === 'direct') {
      const otherUserId = c.participants?.find(id => id !== currentUser.id);
      const otherUser = users[otherUserId];
      if (otherUser) {
        return {
          ...c,
          name: otherUser.name,
          initials: otherUser.initials,
          color: otherUser.color,
          avatar: otherUser.avatar,
          online: Boolean(otherUser.online),
          muted: c.mutedBy?.includes(currentUser.id),
          unread: Number(c.unreadBy?.[currentUser.id] || c.unread || 0)
        };
      }
    } else if (c.type === 'support') {
      // Staff see each support thread by sender; regular users see one Admin Service contact.
      const hasStaffAccess = canUseStaffChatAccess(currentUser);
      if (hasStaffAccess) {
        const supportUserId = c.participants && c.participants[0];
        const supportUser = users[supportUserId];
        return {
          ...c,
          name: `Admin Service: ${supportUser ? supportUser.name : 'Unknown User'}`,
          initials: supportUser?.initials || 'AS',
          color: '#F59E0B', // Orange color for support tickets
          avatar: supportUser?.avatar,
          online: Boolean(supportUser?.online),
          muted: c.mutedBy?.includes(currentUser.id),
          unread: Number(c.unreadBy?.[currentUser.id] || c.unread || 0)
        };
      } else {
        return {
          ...c,
          name: 'Admin Service Contact',
          initials: 'SA',
          color: '#0A6ED1', // Blue color for admin
          muted: c.mutedBy?.includes(currentUser.id),
          unread: Number(c.unreadBy?.[currentUser.id] || c.unread || 0)
        };
      }
    }
    return {
      ...c,
      muted: c.mutedBy?.includes(currentUser.id),
      unread: Number(c.unreadBy?.[currentUser.id] || c.unread || 0)
    };
  }).map(c => ({ ...c, pinned: Boolean(c.pinned || c.pinnedBy?.includes(currentUser.id)) }));

  const filteredChats = mappedChats.filter(c => {
    if (chatTab === 'Groups' && c.type !== 'group') return false;
    if (chatTab === 'Chats' && c.type === 'group') return false;
    const chatName = c.name || '';
    if (search && !chatName.toLowerCase().includes(search.toLowerCase())) return false;

    const hasStaffAccess = canUseStaffChatAccess(currentUser);

    // If it's a support chat, admins/employees can see ALL of them. Users can only see their own.
    if (c.type === 'support') {
      if (hasStaffAccess) return true;
      if (c.participants && c.participants.includes(currentUser.id)) return true;
      return false;
    }

    // Only show chats where the user is a participant
    if (c.participants && !c.participants.includes(currentUser.id)) {
      // Admins and chat-access employees can see all groups, but direct chats stay participant-only.
      if (!(hasStaffAccess && c.type === 'group')) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    // Pin support chat to top for normal users
    const hasStaffAccess = canUseStaffChatAccess(currentUser);
    if (!hasStaffAccess) {
      if (a.type === 'support' && b.type !== 'support') return -1;
      if (b.type === 'support' && a.type !== 'support') return 1;
    }

    // Sort by latest message timestamp
    const msgsA = chatMessages[a.id] || [];
    const msgsB = chatMessages[b.id] || [];

    // Fallback to createdAt if no messages exist
    const timeA = msgsA.length > 0 && msgsA[msgsA.length - 1].timestamp ? Number(msgsA[msgsA.length - 1].timestamp) : new Date(a.createdAt || 0).getTime();
    const timeB = msgsB.length > 0 && msgsB[msgsB.length - 1].timestamp ? Number(msgsB[msgsB.length - 1].timestamp) : new Date(b.createdAt || 0).getTime();

    return timeB - timeA;
  });

  useEffect(() => {
    if (!currentUser || filteredChats.length === 0) return;
    const freshActiveChat = filteredChats.find(c => c.id === activeChat?.id);
    if (!freshActiveChat) {
      setActiveChat(filteredChats[0]);
    } else if (
      freshActiveChat.name !== activeChat.name ||
      freshActiveChat.initials !== activeChat.initials ||
      freshActiveChat.color !== activeChat.color ||
      freshActiveChat.avatar !== activeChat.avatar
    ) {
      setActiveChat(freshActiveChat);
    }
  }, [chats, currentUser?.id, users]);

  const msgs = chatMessages[activeChat?.id] || [];
  const activeChatSnapshot = chats.find(chat => chat.id === activeChat?.id) || activeChat;

  const getDeliveryStatus = (message) => {
    if (!message.isMe) return null;
    if (message.status === 'sending') return 'sending';
    const recipientIds = (activeChatSnapshot?.participants || []).filter(id => id !== currentUser?.id);
    if (recipientIds.length === 0) return 'sent';
    const allSeen = recipientIds.every(id => Number(activeChatSnapshot?.unreadBy?.[id] || 0) === 0);
    if (allSeen) return 'seen';
    return recipientIds.some(id => users[id]?.online) ? 'delivered' : 'sent';
  };

  const downloadChatMedia = async (attachment) => {
    if (!attachment?.url || attachment.cloudDeleted) {
      return { success: false, error: 'Unable to download: this file was deleted from cloud storage.' };
    }
    if (currentUser?.mediaStorageMode !== 'device') {
      return { success: true, cloudOnly: true };
    }
    const response = await fetch(attachment.url);
    if (!response.ok) {
      return { success: false, error: response.status === 410 || response.status === 404
        ? 'Unable to download: this file is no longer available in cloud storage.'
        : 'Unable to download media.' };
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = attachment.name || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return { success: true };
  };

  useEffect(() => {
    if (activeChat?.id && mobileView === 'convo') markChatRead(activeChat.id);
  }, [activeChat?.id, mobileView, msgs.length]);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const chatScrollRef = useRef(null);

  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show arrow if scrolled up more than 100px from bottom
    if (scrollHeight - scrollTop - clientHeight > 100) {
      setShowScrollDown(true);
    } else {
      setShowScrollDown(false);
    }
  };

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };
  const handleReplyClick = (replyMsgId) => {
    const el = document.getElementById(`msg-${replyMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightMsgId(replyMsgId);
      setTimeout(() => setHighlightMsgId(null), 3000);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const finalMsg = msgText.trim();
    if (!finalMsg) return;

    if (editingMsgId) {
      editMessage(activeChat.id, editingMsgId, finalMsg);
      setEditingMsgId(null);
    } else {
      sendChatMessage(activeChat.id, finalMsg, replyingTo);
    }

    setMsgText('');
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const renderList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : (isExpanded ? 300 : 200), borderRight: isMobile ? 'none' : '1px solid #F1F5F9', flexShrink: 0, height: '100%', minHeight: 0, transition: 'width 0.2s' }}>
      {/* Chat Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Chat</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {!isMobile && (
              <button onClick={onExpandToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }} title={isExpanded ? "Collapse" : "Expand Fullscreen"}>
                {isExpanded ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
              </button>
            )}
            <button onClick={() => canCreateGroup ? setShowCreateGroup(true) : setShowNewChat(true)} style={{ background: canCreateGroup ? '#EFF6FF' : 'none', border: canCreateGroup ? '1px solid #BFDBFE' : 'none', borderRadius: 7, cursor: 'pointer', color: '#0A6ED1', display: 'flex', alignItems: 'center', gap: 5, padding: canCreateGroup ? '5px 8px' : 0, fontSize: 11, fontWeight: 700 }} title={canCreateGroup ? 'Create group' : 'New chat'}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {canCreateGroup && <span>Group</span>}
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #E2E8F0', borderRadius: 20, fontSize: 13, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {['Chats', 'Groups'].map(t => (
            <button key={t} onClick={() => setChatTab(t)} style={{ padding: '5px 14px', border: 'none', background: chatTab === t ? '#0A6ED1' : 'transparent', color: chatTab === t ? '#fff' : '#64748B', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: chatTab === t ? 700 : 500 }}>{t}</button>
          ))}
        </div>
      </div>
      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {filteredChats.map(c => (
          <ChatListRow key={c.id} onOpen={() => { setActiveChat(c); setMobileView('convo'); setShowDetails(false); }} onLongPress={() => setChatActionTarget(c)} active={activeChat?.id === c.id} isMobile={isMobile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                const otherUserId = c.type === 'direct' ? c.participants?.find(id => id !== currentUser.id) : null;
                const supportUserId = c.type === 'support' && canUseStaffChatAccess(currentUser) ? c.participants?.[0] : null;
                const onlineUserId = otherUserId || supportUserId;
                const isOnline = Boolean(onlineUserId && users[onlineUserId]?.online);
                return (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      viewProfilePic(c);
                    }}
                    style={{ position: 'relative', cursor: 'pointer' }}
                  >
                    <Avatar initials={c.initials} color={c.color} src={c.avatar} size={34} online={isOnline} shape={c.type === 'group' ? 'rounded' : 'circle'} />
                  </div>
                );
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>
                      {(() => {
                        const cMsgs = chatMessages[c.id] || [];
                        if (cMsgs.length > 0) return cMsgs[cMsgs.length - 1].time;
                        return c.time;
                      })()}
                    </span>
                    {c.unread > 0 && <span style={{ background: '#0A6ED1', color: '#fff', fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{c.unread}</span>}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(() => {
                    const cMsgs = chatMessages[c.id] || [];
                    if (cMsgs.length > 0) {
                      const last = cMsgs[cMsgs.length - 1];
                      const prefix = c.type === 'group' ? (last.isMe ? 'You: ' : `${last.senderName.split(' ')[0]}: `) : '';
                      const content = last.isDeletedForEveryone ? '🚫 This message was deleted' : last.text || '📷 Media attached';
                      return `${prefix}${content}`;
                    }
                    return c.sub;
                  })()}
                </p>
              </div>
            </div>
          </ChatListRow>
        ))}
      </div>
    </div>
  );

  const renderConvo = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFBFC' }}>
      {/* Convo header */}
      {activeChat && (
        selectedMsgIds.size > 0 ? (
          <div style={{ padding: '8px 12px', background: '#EFF6FF', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setSelectedMsgIds(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: 4 }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{selectedMsgIds.size}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
              {(() => {
                const isSingle = selectedMsgIds.size === 1;
                const selMsg = isSingle ? msgs.find(m => m.id === Array.from(selectedMsgIds)[0]) : null;
                const canEdit = isSingle && selMsg?.isMe && !selMsg.isDeletedForEveryone;

                return (
                  <>
                    {isSingle && !isMobile && (
                      <div style={{ display: 'flex', gap: 2, marginRight: 4, flexShrink: 0 }}>
                        {['👍', '❤️', '😂', '😮'].map(emoji => (
                          <button key={emoji} onClick={() => setSelectedMsgIds(new Set())} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 2 }}>{emoji}</button>
                        ))}
                      </div>
                    )}
                    {isSingle && (
                      <button onClick={() => {
                        setShowAutoSendModal(true);
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A6ED1', padding: 8 }} title="Auto Send">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => {
                        setEditingMsgId(selMsg.id);
                        setMsgText(selMsg.text);
                        setSelectedMsgIds(new Set());
                        if (textareaRef.current) textareaRef.current.focus();
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', padding: 8 }} title="Edit">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    {isSingle && (
                      <button onClick={() => {
                        setShowMessageInfoModal(true);
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', padding: 8 }} title="Message Info">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      </button>
                    )}
                    <button onClick={() => {
                      setShowForwardModal(true);
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F172A', padding: 8 }} title="Forward">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/></svg>
                    </button>
                    <button onClick={() => {
                      setShowDeleteModal(true);
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 8 }} title="Delete">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 12px', background: '#fff', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isMobile && (
              <button onClick={() => conversationOnly ? router.push('/ssr-app/chat') : setMobileView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#0A6ED1', marginRight: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
            )}
            <div onClick={() => setShowDetails(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
              {(() => {
                const otherUserId = activeChat.type === 'direct' ? activeChat.participants?.find(id => id !== currentUser.id) : null;
                const supportUserId = activeChat.type === 'support' && canUseStaffChatAccess(currentUser) ? activeChat.participants?.[0] : null;
                const onlineUserId = otherUserId || supportUserId;
                const isOnline = Boolean(onlineUserId && users[onlineUserId]?.online);
                return (
                  <div style={{ position: 'relative' }}>
                    <Avatar initials={activeChat.initials} color={activeChat.color} src={activeChat.avatar} size={32} online={isOnline} shape={activeChat.type === 'group' ? 'rounded' : 'circle'} />
                  </div>
                );
              })()}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{activeChat.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{activeChat.type === 'group' ? 'Group' : 'Direct'} · tap for details</p>
              </div>
            </div>

            {activeChat.type === 'group' && (currentUser.role === 'Admin' || currentUser.role === 'Super Admin' || (currentUser.role === 'Employee' && (currentUser.permissions?.includes('arrange_meetings') || currentUser.permissions?.includes('all_access')))) && (
              <button onClick={() => openScheduleMeeting(activeChat)} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                Meeting
              </button>
            )}
          </div>
        )
      )}

      {/* Messages */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          onClick={(e) => {
            if (selectedMsgIds.size > 0 && e.target === e.currentTarget) {
              setSelectedMsgIds(new Set());
            }
          }}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 12px' }}
        >
          {msgs.length === 0 && <p style={{ color: '#CBD5E1', fontSize: 12, textAlign: 'center', marginTop: 20 }}>No messages yet</p>}
        {msgs.map(msg => {
          const isTarget = targetChat?.msgId === msg.id;
          const isSelected = selectedMsgIds.has(msg.id);
          const selectionMode = selectedMsgIds.size > 0;
          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              onClick={(e) => {
                if (selectionMode) {
                  e.stopPropagation();
                  // Check if this click was just generated by a long press release
                  if (msg.longPressJustFinished) {
                    msg.longPressJustFinished = false;
                    return;
                  }
                  setSelectedMsgIds(prev => {
                    const next = new Set(prev);
                    if (next.has(msg.id)) next.delete(msg.id);
                    else next.add(msg.id);
                    return next;
                  });
                }
              }}
              style={{
                background: isSelected ? 'rgba(10, 110, 209, 0.15)' : (isTarget ? '#FEF3C7' : 'transparent'),
                transition: 'background 0.2s',
                borderRadius: 8,
                padding: isTarget || isSelected ? '4px 0' : 0,
                marginBottom: 4,
                cursor: selectionMode ? 'pointer' : 'default',
                animation: highlightMsgId === msg.id ? 'highlight-blink 1s ease-in-out 3' : 'none'
              }}
            >
              <MessageBubble
                msg={msg}
                senderAvatar={users[msg.senderId]?.avatar}
                onReply={(m) => { setReplyingTo(m); textareaRef.current?.focus(); }}
                onViewMedia={(attachment) => setViewMedia(attachment)}
                onDownloadMedia={downloadChatMedia}
                onEdit={(message) => {
                  setEditingMsgId(message.id);
                  setMsgText(message.text || '');
                  textareaRef.current?.focus();
                }}
                deliveryStatus={getDeliveryStatus(msg)}
                selectionMode={selectionMode}
                isSelected={isSelected}
                isMobile={isMobile}
                isHighlighted={highlightMsgId === msg.id}
                onReplyClick={handleReplyClick}
                onToggleSelect={(id, isLongPress) => {
                  if (currentUser?.isImpersonating || msg.isDeletedForEveryone) return;
                  if (isLongPress) {
                    msg.longPressJustFinished = true;
                    setTimeout(() => { msg.longPressJustFinished = false; }, 300);
                  }
                  setSelectedMsgIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
        </div>
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fff',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0F172A',
              zIndex: 10
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        )}
      </div>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        {/* Hidden file inputs */}
        {(() => {
          const handleFileSelect = (e) => {
            const file = e.target.files[0];
            if (file) {
              if (file.size > 15 * 1024 * 1024) {
                alert("File size exceeds 15MB limit for security.");
                e.target.value = '';
                return;
              }
              openMediaComposer({ file, chatId: activeChat?.id, replyTo: replyingTo });
              setShowAttachMenu(false);
              if (activeChat?.id) router.push('/ssr-app/chat/compose');
            }
          };
          return (
            <>
              <input ref={fileInputRefs.cam} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
              <input ref={fileInputRefs.photos} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
              <input ref={fileInputRefs.audio} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileSelect} />
              <input ref={fileInputRefs.videos} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
              <input ref={fileInputRefs.docs} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" style={{ display: 'none' }} onChange={handleFileSelect} />
            </>
          );
        })()}

        {/* View media modal */}
        {viewMedia && (
          <MediaPreviewModal
            attachment={viewMedia}
            onClose={() => setViewMedia(null)}
          />
        )}

        {showAttachMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 8, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden', minWidth: 160 }}>
            {[
              { id: 'cam', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Camera', ref: fileInputRefs.cam },
              { id: 'photos', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: 'Photos', ref: fileInputRefs.photos },
              { id: 'audio', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>, label: 'Audio', ref: fileInputRefs.audio },
              { id: 'videos', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, label: 'Videos', ref: fileInputRefs.videos },
              { id: 'docs', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, label: 'Documents', ref: fileInputRefs.docs },
            ].map(item => (
              <button key={item.id} onClick={() => { item.ref.current?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: 'none', borderWidth: 0, textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#334155', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#0A6ED1' }}>{item.icon}</span>
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && !editingMsgId && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#EFF6FF', borderTop: '1px solid #DBEAFE', gap: 10 }}>
            <div style={{ width: 3, alignSelf: 'stretch', background: '#0A6ED1', borderRadius: 4, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0A6ED1', marginBottom: 2 }}>{replyingTo.isMe ? 'You' : replyingTo.senderName}</div>
              <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyingTo.text}</div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Edit Preview */}
        {editingMsgId && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#FFFBEB', borderTop: '1px solid #FEF3C7', gap: 10 }}>
            <div style={{ width: 3, alignSelf: 'stretch', background: '#F59E0B', borderRadius: 4, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 2 }}>Editing Message</div>
              <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msgs.find(m => m.id === editingMsgId)?.text}</div>
            </div>
            <button onClick={() => { setEditingMsgId(null); setMsgText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {currentUser?.isImpersonating ? (
          <div style={{ padding: '16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', textAlign: 'center', fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
            Chat is disabled in View-Only mode.
          </div>
        ) : recordingPreview ? (
          <div style={{ display: 'flex', gap: 12, padding: '10px 16px', background: '#fff', borderTop: '1px solid #F1F5F9', alignItems: 'center', flexShrink: 0 }}>
            <button type="button" onClick={() => { setRecordingPreview(false); setIsRecording(false); }} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 4px' }}>Cancel</button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#F1F5F9', padding: '8px 16px', borderRadius: 20 }}>
              <span style={{ fontSize: 18 }}>▶️</span>
              <div style={{ height: 4, flex: 1, background: '#CBD5E1', borderRadius: 2 }}><div style={{ height: '100%', width: '40%', background: '#0A6ED1' }}/></div>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>0:04</span>
            </div>
            <button type="button" onClick={() => { sendChatMessage(activeChat.id, '🎤 Voice message (0:04)'); setRecordingPreview(false); }} style={{ background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12, padding: '10px 16px', background: '#fff', borderTop: '1px solid #F1F5F9', alignItems: 'flex-end', flexShrink: 0, position: 'relative' }}>

            {showChatEmojis && (
              <div style={{ position: 'absolute', bottom: '100%', left: 16, background: '#fff', borderRadius: 12, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6, width: 260, maxHeight: 160, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100, border: '1px solid #E2E8F0', marginBottom: 8 }}>
                {['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'].map(emoji => (
                  <span key={emoji} onClick={() => { setMsgText(t => t + emoji); setShowChatEmojis(false); textareaRef.current?.focus(); }} style={{ cursor: 'pointer', fontSize: 20 }}>{emoji}</span>
                ))}
              </div>
            )}

            {/* Add Attachment Button (+) */}
            <button type="button" onClick={() => setShowAttachMenu(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '0 0 8px 0' }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#F1F5F9', borderRadius: 20, padding: '0 14px' }}>
              {/* Emoji Button */}
              <button type="button" onClick={() => setShowChatEmojis(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '0 8px 0 0' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-3.5-9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5 5.5c-2.03 0-3.8-1.11-4.75-2.75a.5.5 0 11.86-.5c.76 1.3 2.14 2.25 3.89 2.25s3.13-.95 3.89-2.25a.5.5 0 11.86.5c-.95 1.64-2.72 2.75-4.75 2.75z"/>
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                value={msgText}
                onChange={e => {
                  if (e.target.value.length > 30000) {
                    alert('Message cannot exceed 30,000 characters.');
                    return;
                  }
                  setMsgText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                maxLength={30000}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                style={{ flex: 1, padding: '12px 0', border: 'none', background: 'transparent', color: '#0F172A', fontSize: 14, outline: 'none', resize: 'none', minHeight: 20, maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit', lineHeight: 1.4 }}
              />
            </div>

            {msgText.trim() ? (
              <button type="submit" style={{ background: '#0A6ED1', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', padding: 0, marginBottom: 2 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    setIsRecording(false);
                    setRecordingPreview(true);
                  } else {
                    setIsRecording(true);
                  }
                }}
                style={{ background: isRecording ? '#DC2626' : 'none', border: 'none', cursor: 'pointer', color: isRecording ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', padding: 0, marginBottom: 2, transition: 'background 0.2s' }}
              >
                {isRecording ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                    <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.468 2.349 8.468 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zm6.238-3.531c0 3.531-2.942 6.002-6.238 6.002s-6.238-2.471-6.238-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.001z"/>
                  </svg>
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );

  const renderDetails = () => {
    const chatMedia = msgs.filter(m => m.attachment).map(m => m.attachment);
    const isGroup = activeChat.type === 'group';
    const targetUser = !isGroup ? Object.values(users).find(u => activeChat.name.includes(u.name)) : null;
    const isGroupAdmin = isGroup && activeChat.admins?.includes(currentUser.id);
    const isGroupCreator = isGroup && activeChat.createdBy === currentUser.id;
    const canEditGroup = (isGroupAdmin || isGroupCreator) && !currentUser?.isImpersonating;

    // Group Participants
    const participants = isGroup && activeChat.participants ? activeChat.participants.map(pid => users[pid]).filter(Boolean) : [];

    const handleCall = () => {
      // Open device dialer
      if (targetUser) window.location.href = `tel:+919876543210`;
    };

    return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflowY: 'auto' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => setShowDetails(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A6ED1', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{isGroup ? 'Group Info' : 'Contact Info'}</h3>
      </div>

      <div style={{ padding: '24px 16px', textAlign: 'center', borderBottom: '10px solid #F1F5F9' }}>
        <div
          onClick={() => {
            if (!isGroup && targetUser) viewProfilePic(targetUser);
            if (isGroup) viewProfilePic(activeChat);
          }}
          style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px', cursor: 'pointer' }}
        >
          <div style={{ width: '100%', height: '100%', background: activeChat.color, borderRadius: isGroup ? 20 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 800, overflow: 'hidden' }}>
            {activeChat.groupImage ? <img src={activeChat.groupImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeChat.avatar ? <img src={activeChat.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeChat.initials}
          </div>
          {canEditGroup && (
            <button onClick={() => {
              const url = prompt('Enter new image URL (or leave blank to remove):');
              if (url !== null) updateChat(activeChat.id, { groupImage: url });
            }} style={{ position: 'absolute', bottom: -4, right: -4, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0A6ED1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{activeChat.name}</h2>
          {canEditGroup && (
            <button onClick={() => {
              const name = prompt('Enter new group name:', activeChat.name);
              if (name) updateChat(activeChat.id, { name });
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: 2 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"/></svg>
            </button>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{isGroup ? `Group · ${participants.length} Members` : 'Direct Message'}</p>

        {/* Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
          <div onClick={() => setShowDetails(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#0A6ED1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Chat</span>
          </div>
          {isGroup && canEditGroup && (
            <div onClick={() => setShowAddMembers(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EFF6FF', color: '#0A6ED1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Add members</span>
            </div>
          )}
          {!isGroup && (
            <div onClick={handleCall} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#0A6ED1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Call</span>
            </div>
          )}
          <div onClick={() => {
            navigator.clipboard.writeText(isGroup ? `Join group ${activeChat.name}` : targetUser?.email || '');
            alert('Copied to clipboard!');
          }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', color: '#0A6ED1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Copy</span>
          </div>
        </div>

        {/* Profile Details for Direct Chats */}
        {!isGroup && targetUser && (() => {
          const isAdminOrEmp = currentUser.role === 'Admin' || currentUser.role === 'Employee' || currentUser.role === 'Super Admin';

          return (
            <div style={{ marginTop: 24, textAlign: 'left', background: '#F8FAFC', borderRadius: 12, padding: '16px' }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Role</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, color: '#0F172A', fontWeight: 600 }}>{targetUser.role} {targetUser.title ? `· ${targetUser.title}` : ''}</p>
              </div>
              <div style={{ marginBottom: isAdminOrEmp ? 12 : 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Experience & Rating</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, color: '#0F172A', fontWeight: 600 }}>{targetUser.experience || 'Not specified'} · ⭐ 4.8/5</p>
              </div>

              {/* Only admins and employees see full details */}
              {isAdminOrEmp && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Email</span>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: '#0F172A', fontWeight: 600 }}>{targetUser.email}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Phone</span>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: '#0F172A', fontWeight: 600 }}>+91 98765 43210</p>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>

      <div style={{ padding: '16px', borderBottom: '10px solid #F1F5F9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            Stop Notifications
          </h4>
          <button onClick={() => updateChat(activeChat.id, { muted: !activeChat.muted })} style={{ width: 44, height: 24, borderRadius: 12, background: activeChat.muted ? '#10B981' : '#E2E8F0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: activeChat.muted ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', borderBottom: '10px solid #F1F5F9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Media, links, and docs</h4>
          <span onClick={() => setShowAllMedia(true)} style={{ fontSize: 12, color: '#0A6ED1', cursor: 'pointer', fontWeight: 600 }}>View All ❯</span>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {chatMedia.length === 0 ? <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>No media shared</p> : null}
          {chatMedia.map((media, i) => (
            <div key={i} onClick={() => setViewMedia(media)} style={{ width: 70, height: 70, background: '#F1F5F9', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12, overflow: 'hidden', cursor: 'pointer' }}>
              {media.isImage ? <img src={media.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
               media.isVideo ? <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
               <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            </div>
          ))}
        </div>
      </div>

      {isGroup && (
        <div style={{ padding: '16px', borderBottom: '10px solid #F1F5F9' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{participants.length} Participants</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {participants.map(p => {
              const isAdmin = activeChat.admins?.includes(p.id);
              const isCreator = activeChat.createdBy === p.id;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div onClick={() => viewProfilePic(p)} style={{ cursor: 'pointer' }}><Avatar initials={p.initials} color={p.color} src={p.avatar} size={40} online={p.online} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span onClick={() => viewUserProfile(p.id)} style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>{p.id === currentUser.id ? 'You' : p.name}</span>
                      {isAdmin && <span style={{ fontSize: 10, fontWeight: 800, color: '#0A6ED1', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>Group Admin</span>}
                      {isCreator && <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}>Creator</span>}
                    </div>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{p.role}</span>
                  </div>
                  {p.id !== currentUser.id && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={async () => {
                        const direct = await startDirectChat(p.id);
                        if (!direct) return alert('Private chat is disabled for this group.');
                        setActiveChat(direct);
                        setShowDetails(false);
                        if (isMobile) setMobileView('convo');
                      }} title="Private chat" style={{ background: '#EFF6FF', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0A6ED1' }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
                      </button>
                      <button
                      onClick={() => { window.location.href = `tel:+919876543210`; }}
                      style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0A6ED1' }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </button>
                      {canEditGroup && (
                        <button type="button" onClick={async () => {
                          if (!window.confirm(`Remove ${p.name} from this group?`)) return;
                          const result = await performChatAction(activeChat.id, 'removeParticipant', p.id);
                          if (!result.success) return alert(result.error || 'Could not remove member');
                          setActiveChat(result.chat);
                        }} title="Remove from group" style={{ border: 'none', borderRadius: 7, background: '#FEF2F2', color: '#DC2626', padding: '0 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Remove</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isGroup && (
        <div style={{ padding: '16px', borderBottom: '10px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Private chats between members</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>Members can start one-to-one chats from this group.</p>
            </div>
            {(isGroupAdmin || isGroupCreator) ? (
              <button onClick={() => { const enabled = activeChat.privateChatEnabled !== false; updateChat(activeChat.id, { privateChatEnabled: !enabled }); setActiveChat(prev => ({ ...prev, privateChatEnabled: !enabled })); }} style={{ width: 44, height: 24, borderRadius: 12, background: activeChat.privateChatEnabled !== false ? '#10B981' : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }} title="Only group admins can change this">
                <span style={{ position: 'absolute', top: 2, left: activeChat.privateChatEnabled !== false ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', transition: 'left 0.2s' }} />
              </button>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: activeChat.privateChatEnabled !== false ? '#059669' : '#94A3B8' }}>{activeChat.privateChatEnabled !== false ? 'On' : 'Off'}</span>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '16px' }}>
        <button style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', fontSize: 14, fontWeight: 600 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          {isGroup ? 'Exit Group' : 'Block Contact'}
        </button>
        <button style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 14, fontWeight: 600 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Clear Chat
        </button>
      </div>
    </div>
    );
  };

  const renderAllMedia = () => {
    const chatMedia = msgs.filter(m => m.attachment).map(m => m.attachment);
    const mediaFiles = chatMedia.filter(m => m.isImage || m.isVideo);
    const docFiles = chatMedia.filter(m => !m.isImage && !m.isVideo && !m.isAudio);
    // links, audios can be added as needed

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0F172A', color: '#fff', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, background: '#0F172A', zIndex: 10 }}>
          <button onClick={() => setShowAllMedia(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style={{ display: 'flex', gap: 24, flex: 1 }}>
            {['Media', 'Docs', 'Links'].map(tab => (
              <span key={tab} onClick={() => setMediaTab(tab)} style={{ fontSize: 14, fontWeight: 600, color: mediaTab === tab ? '#fff' : '#94A3B8', borderBottom: mediaTab === tab ? '2px solid #10B981' : 'none', paddingBottom: 10, cursor: 'pointer', transition: 'color 0.2s' }}>
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>THIS MONTH</h4>

          {mediaTab === 'Media' && (
            mediaFiles.length === 0 ? <p style={{ fontSize: 13, color: '#94A3B8' }}>No media found.</p> :
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: 8 }}>
              {mediaFiles.map((media, i) => (
                <div key={i} onClick={() => setViewMedia(media)} style={{ aspectRatio: '1', background: '#1E293B', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                  {media.isImage ? <img src={media.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  media.isVideo ? <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  {!media.isDownloaded && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mediaTab === 'Docs' && (
            docFiles.length === 0 ? <p style={{ fontSize: 13, color: '#94A3B8' }}>No documents found.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {docFiles.map((doc, i) => (
                <div key={i} onClick={() => setViewMedia(doc)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#1E293B', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8' }}>{doc.size ? (doc.size / 1024).toFixed(0) + ' KB' : 'Document'}</p>
                  </div>
                  {!doc.isDownloaded && (
                    <svg width="20" height="20" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                </div>
              ))}
            </div>
          )}

          {mediaTab === 'Links' && (() => {
            const links = msgs.filter(m => /https?:\/\/[^\s]+/.test(m.text)).map(m => m.text.match(/https?:\/\/[^\s]+/)[0]);
            return links.length === 0 ? <p style={{ fontSize: 13, color: '#94A3B8' }}>No links found.</p> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#1E293B', borderRadius: 8, textDecoration: 'none' }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(56,189,248,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#38BDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</h5>
                  </div>
                </a>
              ))}
            </div>
          })()}

        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {isMobile ? (
        // Mobile Layout: Only show one active pane
        mobileView === 'list' ? renderList() : (showAllMedia ? renderAllMedia() : (showDetails ? renderDetails() : renderConvo()))
      ) : (
        // Desktop Layout: Always show list on left. Right side toggles between Convo and Details.
        <>
          {renderList()}
          {showAllMedia ? renderAllMedia() : (showDetails ? renderDetails() : renderConvo())}
        </>
      )}
      {showCreateGroup && canCreateGroup && (
        <div onClick={(e) => { if (e.target === e.currentTarget) closeCreateGroup(); }} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.6)' }}>
          <form onSubmit={handleCreateGroup} style={{ width: '100%', maxWidth: 420, maxHeight: '88vh', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15,23,42,0.24)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Create group</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>Choose who can communicate in this group.</p>
              </div>
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
                return (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', background: selected ? '#EFF6FF' : '#fff' }}>
                    <input type="checkbox" checked={selected} onChange={() => setGroupMemberIds(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])} style={{ width: 16, height: 16, accentColor: '#0A6ED1' }} />
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color || '#0A6ED1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{u.initials}</div>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div><div style={{ fontSize: 11, color: '#64748B' }}>{u.role}</div></div>
                  </label>
                );
              })}
              {Object.values(users).filter(u => u.id !== currentUser.id).length === 0 && <p style={{ padding: '20px', margin: 0, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No members available.</p>}
            </div>

            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={closeCreateGroup} style={{ padding: '9px 14px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={creatingGroup || !groupName.trim() || groupMemberIds.length === 0} style={{ padding: '9px 16px', border: 'none', background: creatingGroup || !groupName.trim() || groupMemberIds.length === 0 ? '#CBD5E1' : '#0A6ED1', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: creatingGroup ? 'wait' : 'pointer' }}>{creatingGroup ? 'Creating...' : 'Create group'}</button>
            </div>
          </form>
        </div>
      )}
      {showNewChat && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowNewChat(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', width: '90%', maxWidth: 400, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Chat</h3>
              <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
            </div>

            {(() => {
                const hasStaffAccess = canUseStaffChatAccess(currentUser);
                return (
                  <div style={{ padding: '10px 20px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', fontSize: 12, color: '#0A6ED1' }}>
                    {hasStaffAccess ?
                      "You can start a direct chat with anyone in the system." :
                      "You can message Admin directly. Other private chats need approval from Admin Service."}
                  </div>
                );
            })()}

            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0' }}>
              {(() => {
                const hasStaffAccess = canUseStaffChatAccess(currentUser);
                const contactList = Object.values(users).filter(u => {
                  if (u.id === currentUser.id || u.name === 'System Admin') return false;
                  if (hasStaffAccess) return true;
                  if (u.role === 'Admin' || u.role === 'Super Admin') return true;
                  return chats.some(c => c.type === 'direct' && c.participants?.includes(currentUser.id) && c.participants?.includes(u.id));
                });

                return contactList.map(u => (
                  <div key={u.id} onClick={async () => {
                    const existing = await startDirectChat(u.id);
                    if (!existing) return alert('Please send a chat access request from the profile page.');
                    setActiveChat(existing);
                    setChatTab('Chats');
                    setShowNewChat(false);
                    if (isMobile) setMobileView('convo');
                  }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}>
                    <div style={{ width: 40, height: 40, background: u.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{u.initials}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{u.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{u.role}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
      {showForwardModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowForwardModal(false); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
        >
          <div style={{ background: '#fff', width: '100%', maxWidth: 360, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Forward Message</h3>
              <button onClick={() => setShowForwardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
              {filteredChats.map(c => (
                <div key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    forwardMessages(Array.from(selectedMsgIds), activeChat.id, c.id);
                    setShowForwardModal(false);
                    setSelectedMsgIds(new Set());
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    forwardMessages(Array.from(selectedMsgIds), activeChat.id, c.id);
                    setShowForwardModal(false);
                    setSelectedMsgIds(new Set());
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, background: c.color, borderRadius: c.type === 'group' ? 10 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>{c.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{c.type === 'group' ? 'Group' : 'Direct'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
        >
          <div style={{ background: '#fff', width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Delete Message?</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(() => {
                const selectedMsgs = msgs.filter(m => selectedMsgIds.has(m.id));
                const allMine = selectedMsgs.every(m => m.isMe);
                return (
                  <>
                    {allMine && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteMessages(activeChat.id, Array.from(selectedMsgIds), true); setShowDeleteModal(false); setSelectedMsgIds(new Set()); }}
                        onTouchEnd={(e) => { e.stopPropagation(); deleteMessages(activeChat.id, Array.from(selectedMsgIds), true); setShowDeleteModal(false); setSelectedMsgIds(new Set()); }}
                        style={{ padding: '16px', border: 'none', background: '#fff', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', color: '#DC2626', fontSize: 15, fontWeight: 600, textAlign: 'center' }}
                      >
                        Delete for everyone
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteMessages(activeChat.id, Array.from(selectedMsgIds), false); setShowDeleteModal(false); setSelectedMsgIds(new Set()); }}
                      onTouchEnd={(e) => { e.stopPropagation(); deleteMessages(activeChat.id, Array.from(selectedMsgIds), false); setShowDeleteModal(false); setSelectedMsgIds(new Set()); }}
                      style={{ padding: '16px', border: 'none', background: '#fff', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', color: '#0F172A', fontSize: 15, fontWeight: 600, textAlign: 'center' }}
                    >
                      Delete for me
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}
                      onTouchEnd={(e) => { e.stopPropagation(); setShowDeleteModal(false); }}
                      style={{ padding: '16px', border: 'none', background: '#F8FAFC', cursor: 'pointer', color: '#64748B', fontSize: 15, fontWeight: 700, textAlign: 'center' }}
                    >
                      Cancel
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showAutoSendModal && (
        <AutoSendModal
          onClose={() => setShowAutoSendModal(false)}
          onSave={async (scheduleData) => {
            const selMsg = msgs.find(m => m.id === Array.from(selectedMsgIds)[0]);
            if (selMsg) {
              await scheduleMessage({
                chatId: activeChat.id,
                senderId: currentUser.id,
                content: selMsg.text || selMsg.content,
                attachment: selMsg.attachment || null,
                ...scheduleData
              });
              alert('Message scheduled for auto-send!');
            }
            setShowAutoSendModal(false);
            setSelectedMsgIds(new Set());
          }}
        />
      )}

      {showMessageInfoModal && (() => {
        const selMsg = msgs.find(m => m.id === Array.from(selectedMsgIds)[0]);
        const participants = activeChat.participants || [];
        const deliveredTo = participants.filter(id => id !== currentUser.id).map(id => users[id]?.name || 'Unknown');
        const readBy = selMsg?.status === 'seen' ? deliveredTo : [];
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={() => setShowMessageInfoModal(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)' }} />
            <div style={{ position: 'relative', width: '90%', maxWidth: 400, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Message Info</h3>
                <button onClick={() => setShowMessageInfoModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#0A6ED1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 12h4l2-9 4 18 2-9h4"/></svg>
                    Read by
                  </h4>
                  {readBy.length > 0 ? readBy.map(n => <p key={n} style={{ margin: '4px 0', fontSize: 14, color: '#0F172A' }}>{n}</p>) : <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>None yet</p>}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Delivered to
                  </h4>
                  {deliveredTo.length > 0 ? deliveredTo.map(n => <p key={n} style={{ margin: '4px 0', fontSize: 14, color: '#0F172A' }}>{n}</p>) : <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>No one</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {showAddMembers && (
        <AddMembersModal
          users={users}
          currentUser={currentUser}
          participants={activeChat?.participants}
          busy={addingMembers}
          onClose={() => setShowAddMembers(false)}
          onSave={handleAddMembers}
        />
      )}
      {chatActionTarget && <ChatActionMenu chat={chatActionTarget} busy={chatActionBusy} onClose={() => setChatActionTarget(null)} onAction={handleChatAction} />}
    </div>
  );
}
/* ─── Confirm Modal ─────────────────────────── */
function ConfirmModal({ title, message, confirmLabel = 'Delete', confirmColor = '#DC2626', onConfirm, onCancel }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '10px 20px', background: confirmColor, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Service Upload Modal ─────────────────── */
function ServiceUploadModal({ onClose, onSubmit, users }) {
  const { uploadChatMedia } = useApp();
  const [form, setForm] = useState({ title: '', module: 'Finance', shortDesc: '', fullDesc: '', imageUrl: '' });
  const [benefits, setBenefits] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [servers, setServers] = useState([]);
  const [attachedSkills, setAttachedSkills] = useState([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [jobInput, setJobInput] = useState('');
  const [serverInput, setServerInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const MODULES = ['Finance', 'Supply Chain', 'Sales', 'HR', 'Manufacturing', 'Quality', 'Maintenance', 'Technology'];
  const availableSkills = [...new Set(Object.values(users || {})
    .filter(user => user.role === 'Trainer')
    .flatMap(user => Array.isArray(user.profession) ? user.profession : [])
    .map(skill => String(skill).trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const addTag = (list, setList, input, setInput) => {
    if (input.trim() && !list.includes(input.trim())) {
      setList([...list, input.trim()]);
      setInput('');
    }
  };
  const removeTag = (list, setList, item) => setList(list.filter(i => i !== item));

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Image file size exceeds 15MB limit.');
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setImageFile(file);
    setForm(f => ({ ...f, imageUrl: '' }));
  };

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Title is required');
    const selectedSkillKeys = new Set(attachedSkills.map(skill => skill.toLowerCase()));
    const trainers = Object.values(users || {})
      .filter(user => user.role === 'Trainer' && (user.profession || []).some(skill => selectedSkillKeys.has(String(skill).trim().toLowerCase())))
      .map(user => user.id);
    setUploading(true);
    setUploadProgress(imageFile ? 0 : 100);
    try {
      let image = form.imageUrl || '';
      if (imageFile) {
        const uploaded = await uploadChatMedia(imageFile, setUploadProgress);
        image = uploaded?.url || '';
      }
      await onSubmit({ ...form, image, imageUrl: image, benefits, jobs, servers, attachedSkills, trainers });
    } catch (error) {
      alert(error.message || 'Could not upload the service image.');
    } finally {
      setUploading(false);
    }
  };

  const tagStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#0A6ED1', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6 };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6, display: 'block' };
  const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#0F172A', background: '#fff', boxSizing: 'border-box' };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '16px 16px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Upload New Service</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Service Image</label>
            <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 160, border: '2px dashed #CBD5E1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F8FAFC', overflow: 'hidden', position: 'relative' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Click to upload image</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>PNG, JPG up to 15MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
            <input value={form.imageUrl} onChange={e => { setImageFile(null); setForm(f => ({ ...f, imageUrl: e.target.value })); setImagePreview(e.target.value); }} placeholder="Or paste image URL..." style={{ ...inputStyle, marginTop: 8 }} />
            {uploading && imageFile && <div style={{ marginTop: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}><span>Uploading image...</span><strong>{uploadProgress}%</strong></div><div style={{ height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${uploadProgress}%`, height: '100%', background: '#0A6ED1', transition: 'width 0.2s' }} /></div></div>}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Service Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. SAP FICO (Financial Accounting)" required style={inputStyle} maxLength={200} />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>{form.title.length}/200 characters</p>
          </div>

          {/* Module Category */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category / Module</label>
              <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Module Type</label>
              <select value={form.moduleType || 'Functional'} onChange={e => setForm(f => ({ ...f, moduleType: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="Functional">Functional</option>
                <option value="Technical">Technical</option>
                <option value="Techno-Functional">Techno-Functional</option>
                <option value="Industry Specific">Industry Specific</option>
              </select>
            </div>
          </div>

          {/* Short Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Short Description</label>
            <input value={form.shortDesc} onChange={e => setForm(f => ({ ...f, shortDesc: e.target.value }))} placeholder="One-line summary for the card" style={inputStyle} maxLength={200} />
          </div>

          {/* Full Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Full Description</label>
            <textarea value={form.fullDesc} onChange={e => setForm(f => ({ ...f, fullDesc: e.target.value }))} placeholder="Detailed description of the service..." rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} maxLength={2000} />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>{form.fullDesc.length}/2000 characters</p>
          </div>

          {/* Key Benefits */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Key Benefits / Details</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={benefitInput} onChange={e => setBenefitInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(benefits, setBenefits, benefitInput, setBenefitInput); }}} placeholder="Type and press Enter" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => addTag(benefits, setBenefits, benefitInput, setBenefitInput)} style={{ padding: '10px 16px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Add</button>
            </div>
            <div style={{ marginTop: 10 }}>{benefits.map(b => <span key={b} style={tagStyle}>{b} <span onClick={() => removeTag(benefits, setBenefits, b)} style={{ cursor: 'pointer', opacity: 0.6, marginLeft: 2 }}>✕</span></span>)}</div>
          </div>

          {/* Target Jobs */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Targeted Job Roles</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={jobInput} onChange={e => setJobInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(jobs, setJobs, jobInput, setJobInput); }}} placeholder="e.g. SAP FICO Consultant" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => addTag(jobs, setJobs, jobInput, setJobInput)} style={{ padding: '10px 16px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Add</button>
            </div>
            <div style={{ marginTop: 10 }}>{jobs.map(j => <span key={j} style={{ ...tagStyle, background: '#F0FDF4', color: '#16A34A' }}>{j} <span onClick={() => removeTag(jobs, setJobs, j)} style={{ cursor: 'pointer', opacity: 0.6, marginLeft: 2 }}>✕</span></span>)}</div>
          </div>

          {/* Trainer Skill Attachments */}
          <div style={{ marginBottom: 20, padding: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
            <label style={labelStyle}>Attach Trainers by Skill</label>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B' }}>Choose a skill and every trainer with that skill will appear on this service.</p>
            {availableSkills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableSkills.map(skill => {
                  const selected = attachedSkills.some(item => item.toLowerCase() === skill.toLowerCase());
                  return (
                    <button key={skill} type="button" onClick={() => setAttachedSkills(prev => selected ? prev.filter(item => item.toLowerCase() !== skill.toLowerCase()) : [...prev, skill])} style={{ padding: '7px 12px', borderRadius: 20, border: `1px solid ${selected ? '#0A6ED1' : '#CBD5E1'}`, background: selected ? '#DBEAFE' : '#fff', color: selected ? '#0A6ED1' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {selected ? '✓ ' : ''}{skill}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: 13, color: '#94A3B8' }}>No trainer skills have been added yet.</span>
            )}
            {attachedSkills.length > 0 && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#0A6ED1', fontWeight: 700 }}>{Object.values(users || {}).filter(user => user.role === 'Trainer' && (user.profession || []).some(skill => attachedSkills.some(selected => selected.toLowerCase() === String(skill).toLowerCase()))).length} trainers will be attached</p>}
          </div>

          {/* Visibility Toggle */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12, background: '#EFF6FF', padding: 16, borderRadius: 8, border: '1px solid #BFDBFE' }}>
            <input
              type="checkbox"
              checked={form.publishToWebsite !== false}
              onChange={e => setForm(f => ({ ...f, publishToWebsite: e.target.checked }))}
              style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2 }}
            />
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', display: 'block' }}>Sync to Public Website</label>
              <span style={{ fontSize: 12, color: '#3B82F6', display: 'block', marginTop: 4 }}>If checked, this course will automatically go live on your main public-facing website. Uncheck to keep it internal for employees only.</span>
            </div>
          </div>

          {/* Servers */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Required Servers / Systems</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={serverInput} onChange={e => setServerInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(servers, setServers, serverInput, setServerInput); }}} placeholder="e.g. SAP S/4HANA 2023" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => addTag(servers, setServers, serverInput, setServerInput)} style={{ padding: '10px 16px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Add</button>
            </div>
            <div style={{ marginTop: 10 }}>{servers.map(s => <span key={s} style={{ ...tagStyle, background: '#F8FAFC', color: '#334155' }}>{s} <span onClick={() => removeTag(servers, setServers, s)} style={{ cursor: 'pointer', opacity: 0.6, marginLeft: 2 }}>✕</span></span>)}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" disabled={uploading} onClick={onClose} style={{ padding: '12px 24px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#475569', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>Cancel</button>
            <button type="submit" disabled={uploading} style={{ padding: '12px 28px', background: uploading ? '#93C5FD' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(10,110,209,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {uploading ? 'Uploading...' : 'Upload & Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CoursesPanel({ currentUser }) {
  const { courses, toggleCourseSave, addCourse, deleteCourse, users, viewUserProfile, getTrainerRatingSummary } = useApp();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdminUser = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
  const canManageServices = !currentUser?.isImpersonating && (isAdminUser || hasEmployeePermission(currentUser, 'post_services'));

  const handleUpload = (courseData) => {
    addCourse({ ...courseData, creatorId: currentUser?.id });
    setShowUpload(false);
  };

  if (selectedCourse) {
    return (
      <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <button onClick={() => setSelectedCourse(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A6ED1', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          ← Back to Services
        </button>
        <div style={{ background: '#fff', borderRadius: 12, padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E8ECF0', position: 'relative' }}>

          <button onClick={() => {
            toggleCourseSave(selectedCourse.id);
            setSelectedCourse({ ...selectedCourse, saved: !selectedCourse.saved });
          }} style={{ position: 'absolute', top: 20, right: 20, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: (selectedCourse.savedBy?.includes(currentUser?.id) || selectedCourse.saved) ? '#0A6ED1' : '#64748B', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <svg width="22" height="22" fill={(selectedCourse.savedBy?.includes(currentUser?.id) || selectedCourse.saved) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>

          {selectedCourse.image ? (
            <div style={{ height: 240, borderRadius: 8, overflow: 'hidden', marginBottom: 24, background: '#0F172A' }}>
              <img src={selectedCourse.image} alt={selectedCourse.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
            </div>
          ) : (
            <div style={{ width: 80, height: 80, background: '#EFF6FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0, marginBottom: 20 }}>
              {selectedCourse.icon || '📚'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <span style={{ background: '#E0F2FE', color: '#0A6ED1', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{selectedCourse.module}</span>
              <h1 style={{ margin: '8px 0 12px', fontSize: 24, fontWeight: 800, color: '#0F172A', paddingRight: 60 }}>{selectedCourse.title}</h1>
              <p style={{ margin: 0, fontSize: 15, color: '#475569', lineHeight: 1.6 }}>{selectedCourse.shortDesc}</p>
            </div>
            <button style={{ background: '#0A6ED1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,110,209,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              Book a call to buy
            </button>
          </div>

          <hr style={{ borderWidth: 0, borderTop: '1px solid #E8ECF0', margin: '32px 0' }} />

          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>About this service</h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, marginBottom: 32 }}>{selectedCourse.fullDesc}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
            {(selectedCourse.benefits?.length > 0) && (
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Key Benefits</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
                  {selectedCourse.benefits.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}
            {(selectedCourse.jobs?.length > 0) && (
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Target Job Roles</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
                  {selectedCourse.jobs.map((j, i) => <li key={i}>{j}</li>)}
                </ul>
              </div>
            )}
          </div>

          {(selectedCourse.servers?.length > 0) && (
            <div style={{ marginBottom: 32 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Required Servers / Systems</h4>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {selectedCourse.servers.map((s, i) => (
                  <span key={i} style={{ background: '#F1F5F9', color: '#334155', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Attached Trainers</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(selectedCourse.trainers || []).map(tKey => {
              const t = users[tKey];
              if (!t) return null;
              const summary = getTrainerRatingSummary(t.id);
              return (
                <button key={tKey} type="button" onClick={() => viewUserProfile(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '16px', borderRadius: 8, border: '1px solid #E8ECF0', width: 280, textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{t.initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{t.name}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(t.profession || []).join(' · ') || t.title || 'SAP Trainer'}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>★ {summary.average || '—'} <span style={{ color: '#94A3B8', fontWeight: 500 }}>({summary.count})</span></p>
                  </div>
                </button>
              );
            })}
          </div>
          {(selectedCourse.trainers || []).length === 0 && <p style={{ margin: 0, color: '#94A3B8', fontSize: 14 }}>No trainers attached to this service.</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {showUpload && <ServiceUploadModal users={users} onClose={() => setShowUpload(false)} onSubmit={handleUpload} />}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Service?"
          message={`"${deleteTarget.title}" will be permanently removed from the platform.`}
          onConfirm={() => { deleteCourse(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>SAP Services</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#64748B', fontSize: 14 }}>{courses.length} Available</span>
          {canManageServices && (
            <button onClick={() => setShowUpload(true)} style={{ background: '#0A6ED1', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(10,110,209,0.25)' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {courses.map(course => (
          <div key={course.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
               onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; }}
               onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
               onClick={() => setSelectedCourse(course)}>

            {/* Bookmark */}
            <button onClick={e => { e.stopPropagation(); toggleCourseSave(course.id); }} style={{ position: 'absolute', top: 12, right: isAdminUser ? 44 : 12, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: (course.savedBy?.includes(currentUser?.id) || course.saved) ? '#0A6ED1' : '#64748B', zIndex: 10 }}>
              <svg width="16" height="16" fill={(course.savedBy?.includes(currentUser?.id) || course.saved) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            </button>

            {/* Admin Delete */}
            {canManageServices && isAdminUser && (
              <button onClick={e => { e.stopPropagation(); setDeleteTarget(course); }} title="Delete service" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626', zIndex: 10 }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}

            <div style={{ height: 160, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              {course.image ? (
                <img src={course.image} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
              ) : (
                <div style={{ fontSize: 54 }}>{course.icon || '📚'}</div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}></div>
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{course.module}</span>
                {course.moduleType && (
                  <span style={{ background: '#EFF6FF', color: '#0A6ED1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{course.moduleType}</span>
                )}
                {course.publishToWebsite === false && (
                  <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Internal Only</span>
                )}
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{course.title}</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B', lineHeight: 1.5, flex: 1 }}>{course.shortDesc}</p>

              <button style={{ width: '100%', padding: '10px', background: '#fff', border: '1.5px solid #0A6ED1', color: '#0A6ED1', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#0A6ED1'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0A6ED1'; }}>
                View Service & Buy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function TrainersPanel() {
  const { users, viewUserProfile, viewProfilePic, getTrainerRatingSummary } = useApp();
  const width = useWindowWidth();
  const isMobile = width < 900;
  const [search, setSearch] = useState('');

  const directoryUsers = Object.values(users).filter(u =>
    (u.role === 'Trainer' || u.role === 'Participant' || u.role === 'Admin' || u.role === 'Super Admin') &&
    u.name !== 'System Admin'
  );

  const sortedDirectoryUsers = [...directoryUsers].map(t => {
    const summary = getTrainerRatingSummary(t.id);
    const rating = summary.average || t.rating || 0;
    const reviews = summary.count || t.reviews || 0;
    return { ...t, rating, reviews };
  }).sort((a, b) => {
    if ((a.role === 'Admin' || a.role === 'Super Admin') && !(b.role === 'Admin' || b.role === 'Super Admin')) return -1;
    if ((b.role === 'Admin' || b.role === 'Super Admin') && !(a.role === 'Admin' || a.role === 'Super Admin')) return 1;
    return b.reviews - a.reviews;
  });

  const profiles = sortedDirectoryUsers.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.profession || []).some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  const MOCK_TRAINER_EXTRAS = {
    u1: { location: 'Mumbai', clients: '50+ clients served', mode: 'Online + In-person', specializations: ['SAP FICO Configuration', 'Financial Reporting', 'S/4HANA Migration'] },
    u3: { location: 'Pune', clients: '30+ clients served', mode: 'Online', specializations: ['SAP FICO', 'Cost Center Accounting', 'Asset Management'] },
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748B' }}><strong style={{ color: '#0F172A' }}>{profiles.length} profiles</strong> found</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, or specialization..."
          style={{ width: '100%', padding: '10px 16px', border: '1.5px solid #E2E8F0', borderRadius: 22, fontSize: 14, outline: 'none', color: '#0F172A', background: '#fff', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {profiles.map((trainer, idx) => {
          const extras = MOCK_TRAINER_EXTRAS[trainer.id] || { location: 'Varanasi', clients: '10+ clients served', mode: 'Online + In-person', specializations: ['SAP Training', 'Corporate Consulting'] };
          const isAdminProfile = trainer.role === 'Admin' || trainer.role === 'Super Admin';
          const isTrainerProfile = trainer.role === 'Trainer' || isAdminProfile;
          const isFirst = idx === 0 && isTrainerProfile;
          return (
            <div key={trainer.id} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${isFirst ? '#E11D48' : '#E8ECF0'}`, padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 18, alignItems: isMobile ? 'stretch' : 'flex-start', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', boxSizing: 'border-box', minWidth: 0 }}>
              {/* Avatar */}
              <div onClick={() => viewProfilePic(trainer)} style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <Avatar initials={trainer.initials} color={trainer.color} src={trainer.avatar} size={isMobile ? 72 : 90} online={trainer.online} shape="rounded" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{trainer.name}</h3>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569', fontWeight: 600 }}>{trainer.title || (isAdminProfile ? 'CEO' : trainer.role === 'Trainer' ? 'SAP Instructor' : 'Learner')}</p>

                {/* Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {isTrainerProfile && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {trainer.location || extras.location}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                        {extras.clients}
                      </span>
                      <span style={{ background: '#EFF6FF', color: '#0A6ED1', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{trainer.teachingMode || trainer.mode || extras.mode}</span>
                    </>
                  )}
                  <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{trainer.role}</span>
                  {trainer.role === 'Trainer' && <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700 }}>★ {trainer.rating || '—'} <span style={{ color: '#94A3B8', fontWeight: 500 }}>({trainer.reviews})</span></span>}
                </div>

                {/* Bio */}
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  {(trainer.bio || trainer.shortDesc || trainer.description || (isTrainerProfile ? 'Experienced SAP professional with a strong track record of successful implementations and corporate training.' : 'SAP Learning Platform member.')).slice(0, 150)}
                  {(trainer.bio || trainer.shortDesc || trainer.description || '').length > 150 ? '...' : ''}
                </p>

                {/* Specialization tags */}
                {isTrainerProfile && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(trainer.profession?.length ? trainer.profession : extras.specializations).map(s => (
                      <span key={s} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <button onClick={() => viewUserProfile(trainer.id)} style={{ alignSelf: isMobile ? 'stretch' : 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#0F172A', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0A6ED1'}
                onMouseLeave={e => e.currentTarget.style.background = '#0F172A'}
              >
                View profile <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          );
        })}
        {profiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#CBD5E1' }}>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No profiles found</p>
          </div>
        )}
      </div>
    </div>
  );
}


function MeetingsPanel({ currentUser }) {
  const { meetings, users } = useApp();

  return (
    <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Meetings</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {meetings.filter(m => {
          if (currentUser.role === 'Admin' || currentUser.role === 'Super Admin') return true;
          if (m.hostId === currentUser.id) return true;
          if (m.participants && m.participants.includes(currentUser.id)) return true;
          if (!m.participants) return true; // legacy mock meetings
          return false;
        }).map(m => {
          const host = users[m.hostId];
          return (
            <div key={m.id} style={{ background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #E8ECF0', display: 'flex', gap: 20, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>

              <div style={{ width: 80, height: 80, background: '#F8FAFC', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{m.date.split(' ')[1]}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#0A6ED1', lineHeight: 1 }}>{m.date.split(' ')[0]}</span>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{m.title}</h3>
                  <span style={{ background: '#EFF6FF', color: '#0A6ED1', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{m.module}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B' }}>
                  🕒 {m.time} ({m.duration}) · Hosted by {host?.name || 'Instructor'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>Upcoming</span>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                <a href={m.link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', textDecoration: 'none', background: '#0F172A', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, transition: 'background 0.15s' }}>
                  Join / Start
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function BookmarksPanel({ currentUser }) {
  const { posts, courses, toggleCourseSave } = useApp();
  const bookmarkedPosts = posts.filter(p => p.savedBy?.includes(currentUser?.id));
  const bookmarkedCourses = courses.filter(c => c.savedBy?.includes(currentUser?.id) || c.saved);

  const hasBookmarks = bookmarkedPosts.length > 0 || bookmarkedCourses.length > 0;

  return (
    <div style={{ padding: '20px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1.5px solid #F1F5F9' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Saved Items</h2>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Your bookmarked courses and feed posts</p>
      </div>

      {!hasBookmarks ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#CBD5E1' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#CBD5E1', transform: 'scale(2)' }}>{MenuIcons.bookmark}</div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>No saved items yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {bookmarkedCourses.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Saved Services</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {bookmarkedCourses.map(course => (
                  <div key={course.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      toggleCourseSave(course.id);
                    }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: (course.savedBy?.includes(currentUser?.id) || course.saved) ? '#0A6ED1' : '#64748B', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <svg width="14" height="14" fill={(course.savedBy?.includes(currentUser?.id) || course.saved) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                    </button>
                    <div style={{ height: 100, background: '#0F172A', position: 'relative' }}>
                      <img src={course.image} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{course.title}</h4>
                      <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{course.shortDesc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookmarkedPosts.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Saved Posts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
                {bookmarkedPosts.map(post => (
                  <PostCard key={`bookmark-${post.id}`} post={post} currentUser={currentUser} isDesktop={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useLongPress(onLongPress, onClick, { shouldPreventDefault = true, delay = 500 } = {}) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback(
    event => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener("touchend", preventDefault, { passive: false });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered && onClick(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener("touchend", preventDefault);
      }
    },
    [onClick, longPressTriggered, shouldPreventDefault]
  );

  return {
    onMouseDown: e => start(e),
    onTouchStart: e => start(e),
    onMouseUp: e => clear(e),
    onMouseLeave: e => clear(e, false),
    onTouchEnd: e => clear(e)
  };
}
const preventDefault = event => {
  if (!("touches" in event)) return;
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

const MediaGridItem = ({ media, isSelected, selectionMode, onToggle }) => {
  const unavailable = Boolean(media.cloudDeleted || media.isUnavailable);
  const handlers = useLongPress(() => {
    if (!selectionMode) onToggle();
  }, () => {
    if (selectionMode) onToggle();
  }, { delay: 500 });

  return (
    <div
      {...handlers}
      style={{
        position: 'relative',
        aspectRatio: '1',
        background: '#F1F5F9',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        border: isSelected ? '3px solid #0A6ED1' : '3px solid transparent',
        boxSizing: 'border-box'
      }}>
      {media.isImage && !media.cloudDeleted ? <img src={media.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: unavailable ? 'blur(10px)' : 'none', opacity: unavailable ? 0.65 : 1, transform: unavailable ? 'scale(1.08)' : 'none' }} /> :
       media.isVideo && !media.cloudDeleted ? <video src={media.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: unavailable ? 'blur(10px)' : 'none', opacity: unavailable ? 0.65 : 1, transform: unavailable ? 'scale(1.08)' : 'none' }} /> :
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 8, textAlign: 'center', color: '#64748B' }}>
         <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
         <span style={{ fontSize: 10, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{media.name}</span>
       </div>
      }
      {unavailable && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.28)', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: 8 }}>
          {media.cloudDeleted ? 'Cloud file deleted' : 'Removed from this device'}
        </div>
      )}
      {isSelected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, background: '#0A6ED1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 9, padding: '4px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {media.chatName}
      </div>
    </div>
  );
};

function SettingsPanel({ currentUser, onNavigateToChat }) {
  const { autoDownloadMedia, setAutoDownloadMedia, chatMessages, deleteChatMedia, chats, updateUserProfile, uploadChatMedia, deleteAccount } = useApp();
  const width = useWindowWidth();
  const isMobile = width < 900;
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedMediaIds, setSelectedMediaIds] = useState(new Set());
  const [mediaStorageMode, setMediaStorageMode] = useState(currentUser?.mediaStorageMode || 'cloud');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setMediaStorageMode(currentUser?.mediaStorageMode || 'cloud');
  }, [currentUser?.id, currentUser?.mediaStorageMode]);

  const saveMediaStorageMode = async (mode) => {
    const previousMode = mediaStorageMode;
    setMediaStorageMode(mode);
    const result = await updateUserProfile(currentUser.id, { mediaStorageMode: mode });
    if (!result?.success) {
      setMediaStorageMode(previousMode);
      alert(result?.error || 'Could not save media storage preference');
    }
  };

  const allMedia = Object.entries(chatMessages).flatMap(([chatId, msgs]) =>
      msgs.filter(m => m.attachment).map(m => ({
      ...m.attachment,
      msgId: m.id,
      chatId,
      chatName: chats.find(c => c.id === chatId)?.name || 'Unknown',
      isUnavailable: m.attachment.deletedFor?.includes(currentUser.id),
    }))
  );

  const [notifs, setNotifs] = useState({
    email: true,
    push: true,
    courses: true,
    messages: true,
    announcements: false
  });
  const [pushPermission, setPushPermission] = useState('default');
  const [profilePic, setProfilePic] = useState(currentUser?.avatar || null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropScale, setCropScale] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title || currentUser.role);
  const [description, setDescription] = useState(currentUser.description || currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [teachingMode, setTeachingMode] = useState(currentUser.teachingMode || currentUser.mode || 'Online + In-person');
  const [profession, setProfession] = useState(currentUser.profession || []);
  const [profInput, setProfInput] = useState('');
  const [resumeName, setResumeName] = useState(currentUser.resumeName || currentUser.resume || '');
  const picInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(window.Notification.permission);
    }
  }, []);

  const enableHardwareNotifications = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ssr-enable-push'));
      window.setTimeout(() => {
        if ('Notification' in window) setPushPermission(window.Notification.permission);
      }, 500);
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <div onClick={onChange} style={{ width: 44, height: 24, background: checked ? '#0A6ED1' : '#E2E8F0', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
      <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: checked ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24, minHeight: 'calc(100vh - 100px)', minWidth: 0 }}>
      {/* Settings Sidebar */}
      <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0, minWidth: 0 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Settings</h2>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 2 : 0 }}>
          {[{id: 'profile', label: 'My Profile'}, {id: 'security', label: 'Security & Password'}, {id: 'notifications', label: 'Notifications'}, {id: 'chat-media', label: 'Chat & Media'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 14px', textAlign: 'left', background: activeTab === tab.id ? '#EFF6FF' : 'transparent', color: activeTab === tab.id ? '#0A6ED1' : '#475569', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 14, border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div style={{ flex: 1, width: '100%', minWidth: 0, boxSizing: 'border-box', background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', padding: isMobile ? '18px 14px' : '32px' }}>
        {activeTab === 'profile' && (
          <div>
            <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Profile Details</h3>

            {/* Profile picture + crop */}
            <input ref={picInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { const file = e.target.files[0]; setProfilePicFile(file); setProfilePic(URL.createObjectURL(file)); setCropMode(true); } }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 32 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E8ECF0' }}>
                  {profilePic ? (
                    <img src={profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${cropX}% ${cropY}%`, transform: `scale(${cropScale})` }} />
                  ) : (
                    <Avatar initials={currentUser.initials} color={currentUser.color} src={currentUser.avatar} size={90} />
                  )}
                </div>
                <button onClick={() => picInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#0A6ED1', border: '2px solid #fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>

              <div style={{ flex: 1 }}>
                <button onClick={() => picInputRef.current?.click()} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
                  Change Picture
                </button>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: profilePic ? 12 : 0 }}>JPG, GIF or PNG. Max size 2MB.</div>

                {/* Crop controls */}
                {profilePic && cropMode && (
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, border: '1px solid #E8ECF0' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Adjust Photo</p>
                    {[
                      ['Zoom', cropScale, setCropScale, 0.5, 3, 0.05],
                      ['Horizontal', cropX, setCropX, 0, 100, 1],
                      ['Vertical', cropY, setCropY, 0, 100, 1],
                    ].map(([label, val, setter, min, max, step]) => (
                      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                        <span style={{ minWidth: 70 }}>{label}</span>
                        <input type="range" min={min} max={max} step={step} value={val} onChange={e => setter(Number(e.target.value))} style={{ flex: 1 }} />
                      </label>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={() => setCropMode(false)} style={{ flex: 1, padding: '7px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
                      <button onClick={() => { setProfilePic(null); setProfilePicFile(null); setCropMode(false); setCropScale(1); }} style={{ flex: 1, padding: '7px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email Address</label>
                <input type="email" defaultValue={currentUser.email} disabled style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#94A3B8', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Role / Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
              </div>
            </div>

            {currentUser.role === 'Trainer' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Bio / Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={currentUser?.isImpersonating} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} disabled={currentUser?.isImpersonating} placeholder="e.g. Mumbai" style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Teaching Mode</label>
                  <select value={teachingMode} onChange={e => setTeachingMode(e.target.value)} disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }}>
                    <option value="Online">Online</option>
                    <option value="In-person">In-person</option>
                    <option value="Online + In-person">Online + In-person</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Profession / Technologies</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: profession.length > 0 ? 8 : 0 }}>
                    {profession.map((prof, idx) => (
                      <span key={idx} style={{ background: '#EFF6FF', color: '#0A6ED1', padding: '4px 10px', borderRadius: 16, fontSize: 13, fontWeight: 600, border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {prof}
                        <button type="button" onClick={() => setProfession(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#0A6ED1', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%' }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={profInput} onChange={e => setProfInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (profInput.trim()) { setProfession(p => [...p, profInput.trim()]); setProfInput(''); } } }} disabled={currentUser?.isImpersonating} placeholder="e.g. FICO (press enter or +)" style={{ flex: 1, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
                    <button type="button" onClick={() => { if (profInput.trim()) { setProfession(p => [...p, profInput.trim()]); setProfInput(''); } }} disabled={currentUser?.isImpersonating} style={{ background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, width: 44, cursor: currentUser?.isImpersonating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold', opacity: currentUser?.isImpersonating ? 0.7 : 1 }}>+</button>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Resume / CV</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => resumeInputRef.current?.click()} disabled={currentUser?.isImpersonating} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#334155', cursor: currentUser?.isImpersonating ? 'not-allowed' : 'pointer' }}>Update Resume</button>
                    <span style={{ fontSize: 14, color: '#64748B' }}>{resumeName || 'No file selected'}</span>
                    <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setResumeName(e.target.files[0].name); }} />
                  </div>
                </div>
              </div>
            )}
            <button onClick={async () => {
              if (currentUser?.isImpersonating) return;
              const updates = { name, title, description, location, teachingMode, profession, resumeName, avatar: profilePic };
              if (profilePicFile) {
                const uploaded = await uploadChatMedia(profilePicFile);
                if (!uploaded?.url) return alert('Could not upload profile picture.');
                updates.avatar = uploaded.url;
                setProfilePic(uploaded.url);
                setProfilePicFile(null);
              }
              const result = await updateUserProfile(currentUser.id, updates);
              if (!result?.success) {
                return alert(result?.error || 'Could not save profile. Run Prisma generate and try again.');
              }
              alert('Profile updated successfully!');
            }} disabled={currentUser?.isImpersonating} style={{ padding: '10px 20px', background: currentUser?.isImpersonating ? '#94A3B8' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: currentUser?.isImpersonating ? 'not-allowed' : 'pointer' }}>Save Changes</button>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Current Password</label>
                <input type="password" disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>New Password</label>
                <input type="password" disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
              </div>
              <button disabled={currentUser?.isImpersonating} style={{ padding: '10px 20px', background: currentUser?.isImpersonating ? '#94A3B8' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: currentUser?.isImpersonating ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', marginTop: 8 }}>Update Password</button>
            </div>

            <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />

            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#DC2626' }}>Delete Account</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', maxWidth: 400 }}>
              Permanently delete your account and all associated data. Enter your current password to confirm this action.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              <div>
                <input type="password" placeholder="Confirm Current Password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} disabled={currentUser?.isImpersonating} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', opacity: currentUser?.isImpersonating ? 0.7 : 1 }} />
              </div>
              {deleteError && <div style={{ color: '#DC2626', fontSize: 13 }}>{deleteError}</div>}
              <button
                disabled={currentUser?.isImpersonating || !deletePassword}
                onClick={async () => {
                  if (!confirm("Are you absolutely sure you want to delete your account? This cannot be undone.")) return;
                  const res = await deleteAccount(currentUser.email, deletePassword);
                  if (res.success) {
                    router.push('/ssr-app');
                  } else {
                    setDeleteError(res.error || 'Failed to delete account');
                  }
                }}
                style={{ padding: '10px 20px', background: (currentUser?.isImpersonating || !deletePassword) ? '#FCA5A5' : '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: (currentUser?.isImpersonating || !deletePassword) ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', marginTop: 8 }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 500 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: currentUser?.isImpersonating ? 0.6 : 1 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#0F172A' }}>Push Notifications</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Enable desktop and mobile push notifications.</p>
                  {!currentUser?.isImpersonating && pushPermission !== 'granted' && (
                    <button type="button" onClick={enableHardwareNotifications} style={{ marginTop: 10, border: 'none', borderRadius: 7, padding: '8px 12px', background: '#0A6ED1', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Enable on this device
                    </button>
                  )}
                  {pushPermission === 'granted' && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#059669', fontWeight: 700 }}>This device is enabled</p>}
                </div>
                <Toggle checked={notifs.push} onChange={() => !currentUser?.isImpersonating && setNotifs(n => ({...n, push: !n.push}))} />
              </div>

              <hr style={{ borderWidth: 0, borderTop: '1px solid #F1F5F9', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: currentUser?.isImpersonating ? 0.6 : 1 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#0F172A' }}>Service Updates</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Get notified when new modules or recordings are added.</p>
                </div>
                <Toggle checked={notifs.courses} onChange={() => setNotifs(n => ({...n, courses: !n.courses}))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#0F172A' }}>Direct Messages</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Receive alerts for new chat messages.</p>
                </div>
                <Toggle checked={notifs.messages} onChange={() => setNotifs(n => ({...n, messages: !n.messages}))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#0F172A' }}>Announcements</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Hear about upcoming batches and general news.</p>
                </div>
                <Toggle checked={notifs.announcements} onChange={() => setNotifs(n => ({...n, announcements: !n.announcements}))} />
              </div>

            </div>
          </div>
        )}

        {activeTab === 'chat-media' && (
          <div>
            <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Chat & Media Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 500 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#0F172A' }}>Auto-Download Media</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Automatically download photos, videos, and documents when received.</p>
                </div>
                <Toggle checked={autoDownloadMedia} onChange={() => setAutoDownloadMedia(!autoDownloadMedia)} />
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
                <h4 style={{ margin: '0 0 5px', fontSize: 15, color: '#0F172A' }}>When I download media</h4>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748B' }}>Choose whether the file is saved on this device or opened from cloud storage only.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { id: 'cloud', label: 'Cloud only', description: 'View from the server; do not save to this device.' },
                    { id: 'device', label: 'Download to device', description: 'Save a copy in your browser downloads.' },
                  ].map(option => (
                    <button key={option.id} type="button" onClick={() => saveMediaStorageMode(option.id)} style={{ textAlign: 'left', padding: '12px 13px', border: `1.5px solid ${mediaStorageMode === option.id ? '#0A6ED1' : '#E2E8F0'}`, background: mediaStorageMode === option.id ? '#EFF6FF' : '#fff', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${mediaStorageMode === option.id ? '#0A6ED1' : '#94A3B8'}`, background: mediaStorageMode === option.id ? '#0A6ED1' : '#fff', boxShadow: mediaStorageMode === option.id ? 'inset 0 0 0 3px #fff' : 'none' }} />
                        {option.label}
                      </span>
                      <span style={{ display: 'block', marginTop: 6, paddingLeft: 22, fontSize: 11, lineHeight: 1.35, color: '#64748B' }}>{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 32, borderTop: '1px solid #E2E8F0', paddingTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#0F172A', fontWeight: 700 }}>Media Storage</h4>
                  {selectedMediaIds.size > 0 && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => {
                        if (selectedMediaIds.size === allMedia.length) {
                          setSelectedMediaIds(new Set());
                        } else {
                          setSelectedMediaIds(new Set(allMedia.map(m => m.msgId)));
                        }
                      }} style={{ padding: '6px 14px', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {selectedMediaIds.size === allMedia.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button onClick={() => {
                        selectedMediaIds.forEach(msgId => {
                          const media = allMedia.find(m => m.msgId === msgId);
                          if (media) deleteChatMedia(media.chatId, msgId);
                        });
                        setSelectedMediaIds(new Set());
                      }} style={{ padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Delete ({selectedMediaIds.size})
                      </button>
                      {selectedMediaIds.size === 1 && (
                        <button onClick={() => {
                          const msgId = Array.from(selectedMediaIds)[0];
                          const media = allMedia.find(m => m.msgId === msgId);
                          if (media) onNavigateToChat(media.chatId, msgId);
                        }} style={{ padding: '6px 14px', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          Show in chat
                        </button>
                      )}
                      <button onClick={() => setSelectedMediaIds(new Set())} style={{ padding: '6px 14px', background: 'transparent', color: '#64748B', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                  {allMedia.length === 0 ? <p style={{ fontSize: 13, color: '#94A3B8' }}>No media downloaded.</p> : null}
                  {allMedia.map((media) => {
                    const isSelected = selectedMediaIds.has(media.msgId);
                    return (
                      <MediaGridItem
                        key={media.msgId}
                        media={media}
                        isSelected={isSelected}
                        selectionMode={selectedMediaIds.size > 0}
                        onToggle={() => {
                          setSelectedMediaIds(prev => {
                            const next = new Set(prev);
                            if (next.has(media.msgId)) next.delete(media.msgId);
                            else next.add(media.msgId);
                            return next;
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataManagementPanel({ currentUser }) {
  const [records, setRecords] = useState({ stats: {}, media: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const loadRecords = async () => {
    if (!isAdmin(currentUser)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ssr/data-management?adminId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load data');
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Could not load data management records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, [currentUser?.id]);

  const removeMedia = async (mediaId) => {
    if (!confirm('Permanently delete this file from cloud storage? Chat users will not be able to download it again.')) return;
    setBusyId(mediaId);
    try {
      const res = await fetch('/api/ssr/data-management', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id, action: 'deleteMedia', mediaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete media');
      await loadRecords();
    } catch (err) {
      setError(err.message || 'Could not delete media');
    } finally {
      setBusyId(null);
    }
  };

  const removeMessage = async (messageId) => {
    if (!confirm('Permanently delete this message and its unused attachment?')) return;
    setBusyId(messageId);
    try {
      const res = await fetch('/api/ssr/data-management', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentUser.id, action: 'deleteMessage', messageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete message');
      await loadRecords();
    } catch (err) {
      setError(err.message || 'Could not delete message');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin(currentUser)) return null;
  const formatSize = (bytes = 0) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(0, Math.round(bytes / 1024))} KB`;
  const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Unknown date';

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#0F172A' }}>Data Management</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Review chat files and messages stored in MongoDB.</p>
        </div>
        <button onClick={loadRecords} style={{ padding: '9px 14px', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          ['Stored files', records.stats.mediaCount || 0],
          ['Messages', records.stats.messageCount || 0],
          ['Cloud storage', formatSize(records.stats.storageBytes || 0)],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{label}</div>
            <strong style={{ fontSize: 20, color: '#0F172A' }}>{value}</strong>
          </div>
        ))}
      </div>

      <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}><h3 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>Stored media</h3></div>
        {loading ? <p style={{ padding: 16, color: '#64748B', fontSize: 13 }}>Loading records...</p> : records.media.length === 0 ? <p style={{ padding: 16, color: '#64748B', fontSize: 13 }}>No stored media.</p> : (
          <div style={{ overflowX: 'auto' }}>
            {records.media.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid #F1F5F9', minWidth: 650 }}>
                <div style={{ width: 42, height: 42, borderRadius: 8, background: '#EFF6FF', color: '#0A6ED1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.mimeType?.startsWith('image/') ? 'IMG' : item.mimeType?.startsWith('video/') ? 'VID' : 'FILE'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{item.mimeType} · {formatSize(item.size)} · {item.messageCount} message{item.messageCount === 1 ? '' : 's'}</div>
                </div>
                <div style={{ fontSize: 11, color: item.complete ? '#15803D' : '#B45309' }}>{item.complete ? 'Complete' : 'Incomplete'}</div>
                <button onClick={() => removeMedia(item.id)} disabled={busyId === item.id} style={{ padding: '7px 10px', background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: busyId === item.id ? 'wait' : 'pointer' }}>{busyId === item.id ? 'Deleting...' : 'Delete cloud file'}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0' }}><h3 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>Message records</h3></div>
        {loading ? <p style={{ padding: 16, color: '#64748B', fontSize: 13 }}>Loading records...</p> : records.messages.length === 0 ? <p style={{ padding: 16, color: '#64748B', fontSize: 13 }}>No messages.</p> : (
          <div style={{ overflowX: 'auto' }}>
            {records.messages.map(message => (
              <div key={message.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid #F1F5F9', minWidth: 700 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{message.senderName || 'Unknown'} · {message.chatName} · {formatDate(message.createdAt)}</div>
                  <div style={{ fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.content || (message.attachment?.name ? `Attachment: ${message.attachment.name}` : 'Empty message')}</div>
                </div>
                {message.attachment && <span style={{ fontSize: 11, color: message.attachment.cloudDeleted ? '#B91C1C' : '#64748B' }}>{message.attachment.cloudDeleted ? 'Cloud file deleted' : message.attachment.name}</span>}
                <button onClick={() => removeMessage(message.id)} disabled={busyId === message.id} style={{ padding: '7px 10px', background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: busyId === message.id ? 'wait' : 'pointer' }}>{busyId === message.id ? 'Deleting...' : 'Delete record'}</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AccountManagementPanel({ currentUser, onViewEmployeeChats }) {
  const { users, login, deleteUser, restrictUser, addEmployee, updateUserPermissions, updateEmployeeProfile, viewUserProfile, posts, courses } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateEmp, setShowCreateEmp] = useState(null); // null or userId for editing
  const [empForm, setEmpForm] = useState({ name: '', email: '' });
  const [empPerms, setEmpPerms] = useState([]);
  const [editingPermsFor, setEditingPermsFor] = useState(null);
  const [editPerms, setEditPerms] = useState([]);
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

  if (currentUser.role !== 'Admin' && currentUser.role !== 'Super Admin') return null;

  const allUsers = Object.values(users);
  const participants = allUsers.filter(u => u.role === 'Participant');
  const trainers = allUsers.filter(u => u.role === 'Trainer');
  const employees = allUsers.filter(u => u.role === 'Employee');
  const restricted = allUsers.filter(u => u.restricted);

  const PERMS = [
    { id: 'view_users', label: 'View User/Trainer Accounts' },
    { id: 'view_chats', label: 'View Chats' },
    { id: 'request_access', label: 'Manage Chat Requests' },
    { id: 'post_feeds', label: 'Post Feeds' },
    { id: 'post_services', label: 'Post Services' },
    { id: 'arrange_meetings', label: 'Arrange Meetings' },
    { id: 'all_access', label: 'All Access' },
  ];

  const togglePerm = (arr, setArr, id) => {
    if (id === 'all_access') { setArr(['all_access']); return; }
    const without = arr.filter(p => p !== 'all_access');
    setArr(without.includes(id) ? without.filter(p => p !== id) : [...without, id]);
  };

  const roleColor = (role) => {
    if (role === 'Admin' || role === 'Super Admin') return { bg: '#FEF2F2', color: '#DC2626' };
    if (role === 'Trainer') return { bg: '#F0FDF4', color: '#16A34A' };
    if (role === 'Employee') return { bg: '#FFF7ED', color: '#D97706' };
    return { bg: '#EFF6FF', color: '#0A6ED1' };
  };

  const UserRow = ({ u, actions }) => {
    const rc = roleColor(u.role);
    return (
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 16, background: u.restricted ? '#FFFBEB' : '#fff' }}>
        <Avatar initials={u.initials} color={u.color} src={u.avatar} size={42} online={u.online} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{u.name}</span>
            {u.restricted && <span style={{ background: '#FEF9C3', color: '#92400E', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Restricted</span>}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{u.email}</div>
          {u.permissions?.length > 0 && (
            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {u.permissions.map(p => <span key={p} style={{ background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{PERMS.find(x => x.id === p)?.label || p}</span>)}
            </div>
          )}
        </div>
        <span style={{ background: rc.bg, color: rc.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{u.role}</span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {actions}
        </div>
      </div>
    );
  };

  const btnSm = (label, onClick, color = '#475569', bg = '#F1F5F9') => (
    <button onClick={onClick} style={{ padding: '6px 12px', background: bg, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );

  const tabStyle = (t) => ({
    padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#0A6ED1' : 'transparent'}`,
    color: tab === t ? '#0A6ED1' : '#64748B', fontSize: 14, fontWeight: tab === t ? 700 : 500, cursor: 'pointer'
  });

  return (
    <div style={{ padding: '20px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.role}?`}
          message={`"${deleteTarget.name}" will be permanently removed. This cannot be undone.`}
          onConfirm={() => { deleteUser(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Account Management</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid #E8ECF0', marginBottom: 24 }}>
        {[['dashboard','Dashboard'],['users','Users'],['trainers','Trainers'],['employees','Employees']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{label}</button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Users', value: participants.length, icon: '👥', color: '#EFF6FF', border: '#BFDBFE' },
              { label: 'Trainers', value: trainers.length, icon: '🎓', color: '#F0FDF4', border: '#BBF7D0' },
              { label: 'Employees', value: employees.length, icon: '🏢', color: '#FFF7ED', border: '#FED7AA' },
              { label: 'Total Accounts', value: allUsers.length, icon: '🔑', color: '#F5F3FF', border: '#DDD6FE' },
              { label: 'Restricted', value: restricted.length, icon: '🚫', color: '#FFF1F2', border: '#FECDD3' },
              { label: 'Services', value: courses.length, icon: '📚', color: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Total Posts', value: posts.length, icon: '📝', color: '#F0F9FF', border: '#BAE6FD' },
              { label: 'Total Likes', value: posts.reduce((sum, p) => sum + (p.likes || 0), 0), icon: '❤️', color: '#FFF1F2', border: '#FECDD3' },
              { label: 'Comments', value: posts.reduce((sum, p) => sum + (Array.isArray(p.comments) ? p.comments.length : (p.comments || 0)), 0), icon: '💬', color: '#F5F3FF', border: '#DDD6FE' },
              { label: 'Total Views', value: posts.reduce((sum, p) => sum + (p.likes || 0) * 14 + (Array.isArray(p.comments) ? p.comments.length : (p.comments || 0)) * 7 + 34, 0), icon: '👁️', color: '#EFF6FF', border: '#BFDBFE' },
              { label: 'Online Now', value: allUsers.filter(u => u.online).length, icon: '🟢', color: '#F7FEE7', border: '#BBF7D0' },
            ].map(s => (
              <div key={s.label} style={{ background: s.color, border: `1px solid ${s.border}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent Users */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>All Accounts</h3>
              <span style={{ fontSize: 13, color: '#64748B' }}>{allUsers.length} total</span>
            </div>
            {allUsers.map(u => {
              const rc = roleColor(u.role);
              return (
                <div key={u.id} style={{ padding: '14px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar initials={u.initials} color={u.color} src={u.avatar} size={38} online={u.online} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{u.email}</div>
                  </div>
                  <span style={{ background: rc.bg, color: rc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.role}</span>
                  {u.restricted && <span style={{ background: '#FEF9C3', color: '#92400E', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Restricted</span>}
                  {u.id !== currentUser.id && !currentUser.isImpersonating && btnSm('View As', () => login(u.email, null, u.id))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{participants.length} Users (Participants)</span>
          </div>
          {participants.length === 0 && <p style={{ padding: '24px', color: '#94A3B8', textAlign: 'center' }}>No users found</p>}
          {participants.map(u => (
            <UserRow key={u.id} u={u} actions={<>
              {btnSm(u.restricted ? 'Unrestrict' : 'Restrict', () => restrictUser(u.id), u.restricted ? '#16A34A' : '#D97706', u.restricted ? '#F0FDF4' : '#FFF7ED')}
              {btnSm('Delete', () => setDeleteTarget(u), '#DC2626', '#FEF2F2')}
              {btnSm('Details', () => viewUserProfile(u.id), '#475569', '#F1F5F9')}
              {btnSm('Activity', () => alert(`Activity for ${u.name}: Joined 3 months ago. 12 posts liked, 3 comments posted.`), '#0A6ED1', '#EFF6FF')}
              {u.id !== currentUser.id && !currentUser.isImpersonating && btnSm('View As', () => login(u.email, null, u.id))}
            </>} />
          ))}
        </div>
      )}

      {/* Trainers tab */}
      {tab === 'trainers' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{trainers.length} Trainers</span>
          </div>
          {trainers.length === 0 && <p style={{ padding: '24px', color: '#94A3B8', textAlign: 'center' }}>No trainers found</p>}
          {trainers.map(u => (
            <UserRow key={u.id} u={u} actions={<>
              {btnSm(u.restricted ? 'Unrestrict' : 'Restrict', () => restrictUser(u.id), u.restricted ? '#16A34A' : '#D97706', u.restricted ? '#F0FDF4' : '#FFF7ED')}
              {btnSm('Delete', () => setDeleteTarget(u), '#DC2626', '#FEF2F2')}
              {btnSm('Details', () => viewUserProfile(u.id), '#475569', '#F1F5F9')}
              {btnSm('Activity', () => alert(`Activity for ${u.name}: 3 sessions hosted this week. 28 students mentored.`), '#0A6ED1', '#EFF6FF')}
              {u.id !== currentUser.id && !currentUser.isImpersonating && btnSm('View As', () => login(u.email, null, u.id))}
            </>} />
          ))}
        </div>
      )}

      {/* Employees tab */}
      {tab === 'employees' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => { setShowCreateEmp(true); setEmpForm({ name: '', email: '' }); setEmpPerms([]); setEmployeeError(''); }} style={{ background: '#0A6ED1', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Employee ID
            </button>
          </div>

          {/* Create Employee Form */}
          {showCreateEmp && (
            <div style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8ECF0', padding: 20, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>New Employee Account</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Full Name *</label>
                  <input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} placeholder="Employee name" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Email *</label>
                  <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@ssr.com" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Password *</label>
                  <input type="text" value={empForm.password || ''} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Access Permissions <span style={{ color: '#94A3B8', fontWeight: 400 }}>(default: none)</span></label>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B' }}>Select <strong>View Chats</strong> to let this employee see chats and create groups.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {PERMS.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                      <input type="checkbox" checked={empPerms.includes(p.id)} onChange={() => togglePerm(empPerms, setEmpPerms, p.id)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              {employeeError && <p style={{ margin: '0 0 12px', padding: '9px 11px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>{employeeError}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button disabled={savingEmployee} onClick={async () => { if (!empForm.name?.trim() || !empForm.email?.trim()) { setEmployeeError('Name and email are required'); return; } setSavingEmployee(true); setEmployeeError(''); const result = await addEmployee({ ...empForm, permissions: empPerms }); setSavingEmployee(false); if (!result.success) { setEmployeeError(result.error); return; } setShowCreateEmp(false); }} style={{ padding: '9px 20px', background: savingEmployee ? '#93C5FD' : '#0A6ED1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: savingEmployee ? 'wait' : 'pointer' }}>{savingEmployee ? 'Saving...' : 'Create Account'}</button>
                <button disabled={savingEmployee} onClick={() => setShowCreateEmp(false)} style={{ padding: '9px 20px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: savingEmployee ? 'default' : 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{employees.length} Employees</span>
            </div>
            {employees.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                <p style={{ fontWeight: 600 }}>No employees yet. Create the first employee ID above.</p>
              </div>
            )}
            {employees.map(u => {
              const isEditingThis = editingPermsFor === u.id;
              return (
                <div key={u.id}>
                  <UserRow u={u} actions={<>
                    {onViewEmployeeChats && btnSm('View Chats', () => onViewEmployeeChats(u), '#0A6ED1', '#EFF6FF')}
                    <button onClick={() => { setEditingPermsFor(isEditingThis ? null : u.id); setEditPerms(u.permissions || []); setEditPassword(u.password || ''); setEditName(u.name || ''); }} style={{ padding: '6px 12px', background: isEditingThis ? '#EFF6FF' : '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color: isEditingThis ? '#0A6ED1' : '#475569', cursor: 'pointer' }}>Edit Access</button>
                    {btnSm(u.restricted ? 'Unrestrict' : 'Restrict', () => restrictUser(u.id), u.restricted ? '#16A34A' : '#D97706', u.restricted ? '#F0FDF4' : '#FFF7ED')}
                    {btnSm('Delete', () => setDeleteTarget(u), '#DC2626', '#FEF2F2')}
                  </>} />
                  {isEditingThis && (
                    <div style={{ padding: '16px 20px 16px 72px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 20, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Full Name</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Password</label>
                          <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Permissions</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {PERMS.map(p => (
                              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#334155' }}>
                                <input type="checkbox" checked={editPerms.includes(p.id)} onChange={() => togglePerm(editPerms, setEditPerms, p.id)} />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { updateEmployeeProfile(u.id, { permissions: editPerms, password: editPassword, name: editName }); setEditingPermsFor(null); }} style={{ padding: '7px 16px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
                        <button onClick={() => setEditingPermsFor(null)} style={{ padding: '7px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestsPanel() {
  const { chatRequests, users, currentUser, decideChatRequest, canManageChatRequests } = useApp();
  const [busyId, setBusyId] = useState(null);

  if (!canManageChatRequests(currentUser)) {
    return (
      <div style={{ padding: '32px', maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Requests</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>You do not have access to manage chat requests.</p>
        </div>
      </div>
    );
  }

  const sortedRequests = [...chatRequests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const pendingCount = sortedRequests.filter(r => r.status === 'pending').length;

  const statusStyle = (status) => {
    if (status === 'approved') return { bg: '#F0FDF4', color: '#16A34A', text: 'Approved' };
    if (status === 'rejected') return { bg: '#FEF2F2', color: '#DC2626', text: 'Rejected' };
    return { bg: '#FFFBEB', color: '#B45309', text: 'Pending' };
  };

  const handleDecision = async (request, action) => {
    setBusyId(request.id);
    const result = await decideChatRequest(request.id, action);
    setBusyId(null);
    if (!result.success) {
      alert(result.error || 'Could not update request');
      return;
    }
    alert(action === 'approve' ? 'Chat access approved.' : 'Chat request rejected.');
  };

  return (
    <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Chat Requests</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748B' }}>
          {pendingCount} pending request{pendingCount === 1 ? '' : 's'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sortedRequests.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>No chat access requests yet</p>
          </div>
        )}

        {sortedRequests.map(request => {
          const requester = users[request.requesterId];
          const target = users[request.targetId];
          const decidedBy = request.decidedById ? users[request.decidedById] : null;
          const status = statusStyle(request.status);
          const isBusy = busyId === request.id;

          return (
            <div key={request.id} style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{status.text}</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{request.createdAt ? new Date(request.createdAt).toLocaleString() : ''}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <Avatar initials={requester?.initials || 'NA'} color={requester?.color || '#94A3B8'} src={requester?.avatar} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requester?.name || 'Deleted account'}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Requester - {requester?.role || 'Unknown'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#CBD5E1', fontWeight: 800 }}>to</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <Avatar initials={target?.initials || 'NA'} color={target?.color || '#94A3B8'} src={target?.avatar} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target?.name || 'Deleted account'}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Requested contact - {target?.role || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              {decidedBy && (
                <p style={{ margin: '14px 0 0', fontSize: 12, color: '#64748B' }}>Handled by {decidedBy.name}</p>
              )}

              {request.status === 'pending' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                  <button disabled={isBusy} onClick={() => handleDecision(request, 'reject')} style={{ padding: '8px 14px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.6 : 1 }}>Reject</button>
                  <button disabled={isBusy} onClick={() => handleDecision(request, 'approve')} style={{ padding: '8px 14px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.6 : 1 }}>Approve</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function GlobalUserProfileModal() {
  const { currentUser, userProfileToView, closeUserProfile, viewProfilePic, startDirectChat, requestChatAccess, canDirectChatWith, canViewPrivateUserDetails, setTargetChat, getTrainerRatingSummary, rateTrainer, trainerRatings, users } = useApp();
  const router = useRouter();
  const width = useWindowWidth();
  const isMobile = width < 900;
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [ratingDraftFor, setRatingDraftFor] = useState(null);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');
  useBackHandler(Boolean(userProfileToView), closeUserProfile);

  useEffect(() => {
    if (!userProfileToView?.id || userProfileToView.id === ratingDraftFor) return;
    const summary = getTrainerRatingSummary(userProfileToView.id);
    setRatingDraftFor(userProfileToView.id);
    setDraftRating(summary.myRating);
    setDraftComment(summary.myComment || '');
    setRatingError('');
  }, [userProfileToView?.id, trainerRatings]);

  if (!userProfileToView) return null;
  const user = userProfileToView;
  const isTrainer = user.role === 'Trainer';
  const ratingSummary = isTrainer ? getTrainerRatingSummary(user.id) : { average: 0, count: 0, myRating: 0 };
  const isAdminViewer = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Super Admin');
  const canViewPrivateDetails = canViewPrivateUserDetails(currentUser) || currentUser?.id === user.id;
  const displayTitle = user.title || (isAdmin(user) ? 'CEO' : user.role);
  const descriptionText = user.bio || user.shortDesc || user.description || `Experienced ${user.role} on the SAP Learning Platform.`;
  const contactPhone = user.phone || user.mobile || 'Not provided';

  const handleRatingSubmit = async () => {
    if (!draftRating || !draftComment.trim()) {
      setRatingError('Choose stars and write a comment before sending.');
      return;
    }
    setSavingRating(true);
    setRatingError('');
    const result = await rateTrainer(user.id, draftRating, draftComment);
    setSavingRating(false);
    if (!result.success) setRatingError(result.error || 'Could not save your review.');
  };

  const handleProfileChat = async () => {
    if (!currentUser || currentUser.id === user.id) return;
    if (canDirectChatWith(user.id)) {
      const chat = await startDirectChat(user.id);
      if (chat) {
        setTargetChat({ chatId: chat.id });
        closeUserProfile();
        router.push(`/ssr-app/chat/${chat.id}`);
      }
      return;
    }

    const shouldRequest = window.confirm('Send request to Admin Service for chat access?');
    if (!shouldRequest) return;
    const result = await requestChatAccess(user.id);
    if (result.chat) {
      setTargetChat({ chatId: result.chat.id });
      closeUserProfile();
      router.push(`/ssr-app/chat/${result.chat.id}`);
      return;
    }
    alert(result.success ? (result.existing ? 'Request is already pending with Admin Service.' : 'Request sent to Admin Service.') : (result.error || 'Could not send request.'));
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) closeUserProfile(); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px'
      }}
    >
      <div style={{
        background: '#fff', width: '100%', height: '100%', overflowY: 'auto', position: 'relative'
      }}>
        <button
          onClick={closeUserProfile}
          style={{
            position: 'absolute', top: 20, right: 20, width: 36, height: 36,
            background: '#F1F5F9', border: 'none', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B', zIndex: 10
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div style={{ padding: '40px', display: 'flex', gap: 40, flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto' }}>
          {/* Left: Profile Picture */}
          <div
            onClick={() => viewProfilePic(user)}
            style={{ position: 'relative', flexShrink: 0, margin: '0 auto', cursor: 'pointer' }}
          >
            <Avatar initials={user.initials} color={user.color || '#0A6ED1'} src={user.avatar} size={160} online={user.online} />
          </div>

          {/* Right: Info */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, color: '#0F172A' }}>{user.name}</h2>
            <p style={{ margin: '0 0 12px', fontSize: 18, color: '#0A6ED1', fontWeight: 600 }}>{displayTitle}</p>
            {currentUser?.id !== user.id && !currentUser?.isImpersonating && (
              <button onClick={handleProfileChat} style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0F172A', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"/></svg>
                Chat
              </button>
            )}

            {user.profession && Array.isArray(user.profession) && user.profession.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {user.profession.map((prof, i) => (
                  <span key={i} style={{ background: '#EFF6FF', color: '#0A6ED1', padding: '4px 10px', borderRadius: 16, fontSize: 13, fontWeight: 600, border: '1px solid #BFDBFE' }}>
                    {prof}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              {isTrainer && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#F59E0B', fontSize: 20 }}>★</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{ratingSummary.average || '—'}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>({ratingSummary.count})</span>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} />
                </>
              )}
              <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
                {user.experience || 'Experienced Professional'}
              </div>
            </div>

            <p style={{ margin: '0 0 32px', fontSize: 16, color: '#475569', lineHeight: 1.6 }}>
              {descriptionText}
            </p>

            {isTrainer && (
              <>
                <div style={{ marginBottom: 24, padding: '16px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Rate this trainer</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map(value => (
                      <button key={value} type="button" disabled={currentUser?.id === user.id} onClick={() => { setDraftRating(value); setRatingError(''); }} aria-label={`Give ${value} star${value === 1 ? '' : 's'}`} style={{ border: 'none', background: 'transparent', padding: '2px 3px', color: value <= draftRating ? '#F59E0B' : '#CBD5E1', fontSize: 26, lineHeight: 1, cursor: currentUser?.id === user.id ? 'default' : 'pointer' }}>★</button>
                    ))}
                    <span style={{ marginLeft: 8, fontSize: 13, color: '#92400E', fontWeight: 600 }}>{ratingSummary.average ? `${ratingSummary.average} average from ${ratingSummary.count} review${ratingSummary.count === 1 ? '' : 's'}` : 'No reviews yet'}</span>
                  </div>
                  <textarea value={draftComment} onChange={e => { setDraftComment(e.target.value); setRatingError(''); }} disabled={currentUser?.id === user.id || savingRating} placeholder="Write a review about this trainer..." maxLength={1000} rows={3} style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, padding: '10px 12px', border: '1px solid #FDE68A', borderRadius: 8, resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: '#0F172A', background: '#fff' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: ratingError ? '#DC2626' : '#92400E' }}>{ratingError || (ratingSummary.myRating ? 'Sending again will update your existing review.' : 'Your account can leave one review per trainer.')}</span>
                    <button type="button" disabled={currentUser?.id === user.id || savingRating} onClick={handleRatingSubmit} style={{ flexShrink: 0, border: 'none', borderRadius: 7, padding: '8px 14px', background: savingRating ? '#93C5FD' : '#0A6ED1', color: '#fff', fontSize: 12, fontWeight: 800, cursor: savingRating ? 'wait' : 'pointer' }}>{savingRating ? 'Sending...' : 'Send review'}</button>
                  </div>
                </div>
                {ratingSummary.reviews?.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Reviews</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ratingSummary.reviews.slice(0, 5).map(review => (
                        <div key={review.id} style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{users[review.raterId]?.name || 'Platform member'}</span>
                            <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 800 }}>★ {review.rating}</span>
                          </div>
                          <p style={{ margin: '5px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.45 }}>{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!isTrainer && !canViewPrivateDetails && (
               <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 8, border: '1px solid #E2E8F0', textAlign: 'center', marginBottom: canViewPrivateDetails ? 24 : 0 }}>
                 <p style={{ margin: 0, fontSize: 14, color: '#64748B', fontWeight: 600 }}>More details are private for this user.</p>
               </div>
            )}

            {canViewPrivateDetails && (
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px dashed #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{isAdminViewer && currentUser?.id !== user.id ? 'Administrative Details' : 'Private Details'}</h3>
                </div>
                <div style={{ background: '#FFFBEB', padding: '16px 20px', borderRadius: 8, border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', alignItems: isMobile ? 'start' : 'center', gap: isMobile ? 4 : 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Email Address</span>
                    <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 500 }}>{user.email || 'Not provided'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', alignItems: isMobile ? 'start' : 'center', gap: isMobile ? 4 : 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Mobile Number</span>
                    <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 500 }}>{contactPhone}</span>
                  </div>
                  {isTrainer && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', alignItems: isMobile ? 'start' : 'center', gap: isMobile ? 4 : 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Resume / CV</span>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert(`Downloading ${user.resumeName || 'Resume.pdf'}...`); }} style={{ fontSize: 14, color: '#0A6ED1', fontWeight: 600, textDecoration: 'none' }}>Download {user.resumeName || 'Resume.pdf'}</a>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', alignItems: isMobile ? 'start' : 'center', gap: isMobile ? 4 : 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Join Date</span>
                    <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 500 }}>{user.createdAt || 'August 2024'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePicViewerModal() {
  const { profilePicToView, closeProfilePic } = useApp();
  useBackHandler(Boolean(profilePicToView), closeProfilePic);

  if (!profilePicToView) return null;

  // Render a large square for the profile picture (WhatsApp style)
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#0a0a0a', zIndex: 10000, display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, position: 'relative' }}>
            <div style={{ width: 40, height: 40, background: profilePicToView.color || '#0A6ED1', borderRadius: profilePicToView.type === 'group' ? 12 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 800, overflow: 'hidden' }}>
              {profilePicToView.groupImage || profilePicToView.avatar ? <img src={profilePicToView.groupImage || profilePicToView.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profilePicToView.initials}
            </div>
            {profilePicToView.online === true && (
              <span style={{ position: 'absolute', top: -1, right: -1, width: 11, height: 11, background: '#10B981', borderRadius: '50%', border: '2px solid #000', boxSizing: 'border-box' }} />
            )}
          </div>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{profilePicToView.name}</span>
        </div>
        <button onClick={closeProfilePic} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 8 }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div
        onClick={closeProfilePic}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 500, aspectRatio: '1', background: profilePicToView.color || '#0A6ED1', borderRadius: profilePicToView.type === 'group' ? 24 : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 140, fontWeight: 800, overflow: 'visible', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', position: 'relative' }}
        >
          {profilePicToView.groupImage || profilePicToView.avatar ? <img src={profilePicToView.groupImage || profilePicToView.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profilePicToView.initials}
          {profilePicToView.online === true && (
            <span style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, background: '#10B981', borderRadius: '50%', border: '4px solid #0a0a0a', boxSizing: 'border-box' }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────── */
function ScheduleMeetingModal() {
  const { showScheduleMeeting, closeScheduleMeeting, activeChatForMeeting, addMeeting, sendChatMessage, currentUser } = useApp();
  useBackHandler(showScheduleMeeting, closeScheduleMeeting);
  const [meetingForm, setMeetingForm] = useState({
    title: '', link: '', startDate: '', endDate: '', time: '',
    recurrence: 'none', weekdays: [], monthlyDates: ''
  });

  if (!showScheduleMeeting) return null;

  const handleScheduleMeeting = () => {
    if (!meetingForm.title || !meetingForm.link || !meetingForm.startDate || !meetingForm.time) {
      alert('Please fill all required meeting details (Title, Link, Start Date, Time).');
      return;
    }

    // Add meeting to state
    addMeeting({
      id: `m${Date.now()}`,
      title: meetingForm.title,
      module: activeChatForMeeting?.name || 'General',
      hostId: currentUser.id,
      date: meetingForm.startDate,
      endDate: meetingForm.endDate,
      time: meetingForm.time,
      duration: '1 hour',
      link: meetingForm.link,
      status: 'upcoming',
      recurrence: meetingForm.recurrence,
      weekdays: meetingForm.weekdays,
      monthlyDates: meetingForm.monthlyDates,
      chatId: activeChatForMeeting?.id,
      participants: activeChatForMeeting?.participants || []
    });

    // Send a system message in the chat
    let recurrenceMsg = '';
    if (meetingForm.recurrence === 'daily') recurrenceMsg = '(Daily)';
    else if (meetingForm.recurrence === 'weekly') recurrenceMsg = `(Weekly on ${meetingForm.weekdays.join(', ')})`;
    else if (meetingForm.recurrence === 'monthly') recurrenceMsg = `(Monthly on dates: ${meetingForm.monthlyDates})`;

    sendChatMessage(activeChatForMeeting.id, `📅 **Meeting Scheduled:** ${meetingForm.title} ${recurrenceMsg}\n🕒 ${meetingForm.startDate} at ${meetingForm.time}\n🔗 [Join Meeting](${meetingForm.link})`, null);

    closeScheduleMeeting();
  };

  const toggleWeekday = (day) => {
    setMeetingForm(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day) ? prev.weekdays.filter(d => d !== day) : [...prev.weekdays, day]
    }));
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Schedule Meeting</h3>
          <button onClick={closeScheduleMeeting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Meeting Title</label>
            <input type="text" value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} placeholder="e.g. Weekly Sync" style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Meeting Link (Zoom / Jio)</label>
            <input type="text" value={meetingForm.link} onChange={e => setMeetingForm({...meetingForm, link: e.target.value})} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Start Date</label>
              <input type="date" value={meetingForm.startDate} onChange={e => setMeetingForm({...meetingForm, startDate: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>End Date (Optional)</label>
              <input type="date" value={meetingForm.endDate} onChange={e => setMeetingForm({...meetingForm, endDate: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Time</label>
              <input type="time" value={meetingForm.time} onChange={e => setMeetingForm({...meetingForm, time: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Recurrence</label>
              <select value={meetingForm.recurrence} onChange={e => setMeetingForm({...meetingForm, recurrence: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {meetingForm.recurrence === 'weekly' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Select Weekdays</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {daysOfWeek.map(day => (
                  <button key={day} onClick={() => toggleWeekday(day)} style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid', borderColor: meetingForm.weekdays.includes(day) ? '#10B981' : '#E2E8F0', background: meetingForm.weekdays.includes(day) ? '#ECFDF5' : '#fff', color: meetingForm.weekdays.includes(day) ? '#10B981' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {meetingForm.recurrence === 'monthly' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Dates in Month</label>
              <input type="text" value={meetingForm.monthlyDates} onChange={e => setMeetingForm({...meetingForm, monthlyDates: e.target.value})} placeholder="e.g. 1, 15, 28" style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>Enter comma-separated dates (1-31).</p>
            </div>
          )}

        </div>
        <div style={{ padding: '20px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={handleScheduleMeeting} style={{ width: '100%', background: '#10B981', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Schedule & Notify Group</button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { posts, chats, currentUser, addPost, setTargetChat, endImpersonation, login, logout, notifications, markNotificationRead } = useApp();
  const width = useWindowWidth();
  const isMobile = width < 900;
  const isDesktop = width >= 1100;
  const unreadChatCount = (chats || []).reduce((total, chat) => total + Number(chat.unreadBy?.[currentUser?.id] || 0), 0);

  const [activeNav, setActiveNav] = useState('feed');
  const [feedTab, setFeedTab] = useState('All');
  const [mobilePage, setMobilePage] = useState('feed'); // 'feed' | 'chat'
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [viewRestored, setViewRestored] = useState(false);
  const [randomOffsets, setRandomOffsets] = useState({});

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ssr_app_user') || sessionStorage.getItem('ssr_app_user');
    if (!currentUser && saved) { /* user is set from context */ }
    if (!currentUser && !saved) { router.replace('/ssr-app'); }

    // Generate random engagement offsets on mount for feed shuffle
    const offsets = {};
    posts.forEach(p => { offsets[p.id] = Math.random() * 25; });
    setRandomOffsets(offsets);
  }, [currentUser, router]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const savedView = sessionStorage.getItem(`ssr_home_view_${currentUser.id}`);
      if (savedView) {
        const parsed = JSON.parse(savedView);
        if (parsed.activeNav) setActiveNav(parsed.activeNav);
        if (parsed.mobilePage) setMobilePage(parsed.mobilePage);
      }
    } catch {
      // Ignore malformed or unavailable view state.
    }
    setViewRestored(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !viewRestored) return;
    try {
      sessionStorage.setItem(`ssr_home_view_${currentUser.id}`, JSON.stringify({ activeNav, mobilePage }));
    } catch {
      // Storage may be unavailable in a privacy-restricted browser.
    }
  }, [currentUser?.id, activeNav, mobilePage, viewRestored]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chatId');
    const messageId = params.get('messageId');
    if (!currentUser || !chatId || !messageId) return;
    setTargetChat({ chatId, msgId: messageId });
    setActiveNav('feed');
    setMobilePage('chat');
  }, [currentUser, setTargetChat]);

  if (!mounted || !currentUser) return null;

  const filteredPosts = [...posts].filter(p => {
    if (feedTab === 'All') return true;
    return p.category === feedTab;
  }).sort((a, b) => {
    // Engagement Score = Likes (1pt) + Comments (3pts)
    // + randomOffset to shuffle feed on refresh while keeping popular posts near top
    const commentsA = Array.isArray(a.comments) ? a.comments.length : (a.comments || 0);
    const commentsB = Array.isArray(b.comments) ? b.comments.length : (b.comments || 0);
    const scoreA = (a.likes || 0) + commentsA * 3 + (randomOffsets[a.id] || 10);
    const scoreB = (b.likes || 0) + commentsB * 3 + (randomOffsets[b.id] || 10);
    return scoreB - scoreA;
  });

  const handleNavClick = (id) => {
    setActiveNav(id);
    if (!['feed', 'courses', 'meetings', 'learning', 'bookmarks', 'settings', 'trainers', 'accounts', 'data-management', 'requests', 'notifications'].includes(id)) {
      alert(`${id.charAt(0).toUpperCase() + id.slice(1)} section coming soon!`);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.replace('/ssr-app');
  };

  const viewEmployeeChats = async (employee) => {
    if (!employee?.id || !isAdmin(currentUser) || currentUser.isImpersonating) return;
    const result = await login('', null, employee.id);
    if (result) {
      setActiveNav('feed');
      setMobilePage('chat');
    }
  };

  /* ── DESKTOP LAYOUT ──────────────────────────────── */
  if (!isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
        <GlobalUserProfileModal />
        <ProfilePicViewerModal />
        <ScheduleMeetingModal />

        {showCreatePost && isAdmin(currentUser) && (
          <CreatePostModal onClose={() => setShowCreatePost(false)} onSubmit={(post) => { addPost(post); setShowCreatePost(false); }} />
        )}

        {currentUser?.isImpersonating && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 40, background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>
              👁️ You are currently viewing as <strong>{currentUser.name}</strong>
            </span>
            <button onClick={() => { endImpersonation(); setActiveNav('accounts'); }} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Exit View Mode
            </button>
          </div>
        )}

        {/* Top Header */}
        <div style={{ position: 'fixed', top: currentUser?.isImpersonating ? 40 : 0, left: 0, right: 0, height: 58, background: '#fff', borderBottom: '1px solid #E8ECF0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, zIndex: 400, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 210, flexShrink: 0 }}>
            <img src="/ssrlogo.jpeg" alt="SSR Logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', whiteSpace: 'nowrap' }}>SAP Learning Platform</span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 13 }}>🔍</span>
            <input placeholder="Search for posts, videos, resources..." style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: 22, fontSize: 13, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box', color: '#0F172A' }} />
          </div>

          {/* Right controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Notification */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveNav('notifications')} style={{ width: 38, height: 38, background: activeNav === 'notifications' ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeNav === 'notifications' ? '#0A6ED1' : '#64748B', position: 'relative' }}>
                {MenuIcons.bell}
                {notifications?.some(notification => !notification.read) && <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, background: '#DC2626', borderRadius: '50%', border: '1.5px solid #fff' }} />}
              </button>
            </div>

            {/* User */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: userMenuOpen ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 22, padding: '5px 12px 5px 5px', cursor: 'pointer' }}>
                <Avatar initials={currentUser.initials} color={currentUser.color} src={currentUser.avatar} size={30} online={currentUser.online} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{currentUser.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{currentUser.role}</p>
                </div>
                <span style={{ color: '#94A3B8', fontSize: 12 }}>▾</span>
              </button>
              {userMenuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 180, zIndex: 300, overflow: 'hidden' }}>
                  <button onClick={() => { setActiveNav('settings'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  ><span style={{ color: '#64748B' }}>{MenuIcons.profile}</span>View Profile</button>
                  <button onClick={() => { setActiveNav('settings'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  ><span style={{ color: '#64748B' }}>{MenuIcons.settings}</span>Settings</button>
                  {currentUser && hasEmployeePermission(currentUser, 'request_access') && !currentUser.isImpersonating && (
                    <button onClick={() => { setActiveNav('requests'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    ><span style={{ color: '#64748B' }}>{NavIcons.requests}</span>Requests</button>
                  )}
                  <button onClick={() => { alert('Help'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  ><span style={{ color: '#64748B' }}>{MenuIcons.help}</span>Help</button>
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 4, paddingTop: 4 }}>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '11px 14px', background: 'none', borderWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#DC2626', fontWeight: 600 }}>
                      <span>{MenuIcons.logout}</span>Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body below header */}
        <div style={{ display: 'flex', paddingTop: currentUser?.isImpersonating ? 98 : 58, minHeight: '100vh' }}>

          {/* Left Sidebar — compact, monochrome SVG icons */}
          <div style={{ width: 180, flexShrink: 0, position: 'sticky', top: currentUser?.isImpersonating ? 98 : 58, height: `calc(100vh - ${currentUser?.isImpersonating ? 98 : 58}px)`, overflowY: 'auto', background: '#fff', borderRight: '1px solid #E8ECF0', display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
            {getLeftNav(currentUser).map(item => (
              <button key={item.id} onClick={() => handleNavClick(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: activeNav === item.id ? '#EFF6FF' : 'transparent', borderWidth: 0, borderLeft: `3px solid ${activeNav === item.id ? '#0A6ED1' : 'transparent'}`, cursor: 'pointer', fontSize: 13, fontWeight: activeNav === item.id ? 700 : 500, color: activeNav === item.id ? '#0A6ED1' : '#4B5563', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (activeNav !== item.id) { e.currentTarget.style.background = '#F8FAFC'; }}}
                onMouseLeave={e => { if (activeNav !== item.id) { e.currentTarget.style.background = 'transparent'; }}}
              >
                <span style={{ opacity: activeNav === item.id ? 1 : 0.55, flexShrink: 0 }}>{NavIcons[item.id]}</span>
                {item.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => alert('Help & Support')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', fontWeight: 500, textAlign: 'left', width: '100%' }}>
              <span style={{ opacity: 0.5 }}>{NavIcons.help}</span> Help
            </button>
          </div>

          {/* Center Content Area */}
          {!isChatExpanded && (
            <>
              {activeNav === 'feed' && (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', minWidth: 0 }}>
                  {/* Feed header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Home Feed</h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isAdmin(currentUser) && !currentUser?.isImpersonating && (
                        <button onClick={() => setShowCreatePost(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(10,110,209,0.3)' }}>
                          <span style={{ fontSize: 16 }}>＋</span> Create Post
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid #F1F5F9', marginBottom: 16 }}>
                    {FEED_TABS.map(tab => (
                      <button key={tab} onClick={() => setFeedTab(tab)} style={{ padding: '10px 16px', borderWidth: 0, background: 'transparent', borderBottom: `2.5px solid ${feedTab === tab ? '#0A6ED1' : 'transparent'}`, color: feedTab === tab ? '#0A6ED1' : '#64748B', fontWeight: feedTab === tab ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1.5 }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Posts */}
                  {filteredPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#CBD5E1' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>No posts in this category</p>
                    </div>
                  ) : (
                    filteredPosts.map(post => (
                      <PostCard key={post.id} post={post} currentUser={currentUser} isDesktop={true} />
                    ))
                  )}
                </div>
              )}

              {activeNav === 'courses' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <CoursesPanel currentUser={currentUser} />
                </div>
              )}


              {activeNav === 'bookmarks' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <BookmarksPanel currentUser={currentUser} />
                </div>
              )}

              {activeNav === 'settings' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <SettingsPanel currentUser={currentUser} onNavigateToChat={(chatId, msgId) => {
                    setTargetChat({ chatId, msgId });
                    setActiveNav('feed');
                  }} />
                </div>
              )}

              {activeNav === 'accounts' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <AccountManagementPanel currentUser={currentUser} onViewEmployeeChats={viewEmployeeChats} />
                </div>
              )}

              {activeNav === 'data-management' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <DataManagementPanel currentUser={currentUser} />
                </div>
              )}

              {activeNav === 'requests' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <RequestsPanel />
                </div>
              )}

              {activeNav === 'notifications' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <NotificationsPanel />
                </div>
              )}

              {activeNav === 'meetings' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <MeetingsPanel currentUser={currentUser} />
                </div>
              )}

              {activeNav === 'trainers' && (
                <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                  <TrainersPanel />
                </div>
              )}
            </>
          )}

          {/* Right Chat Panel (desktop only) - Only show on Feed page */}
          {isDesktop && activeNav === 'feed' && (
            <div style={{ width: isChatExpanded ? 'auto' : 560, flexGrow: isChatExpanded ? 1 : 0, flexShrink: 0, position: 'sticky', top: 58, height: 'calc(100vh - 58px)', background: '#fff', borderLeft: '1px solid #E8ECF0', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.2s', zIndex: 300 }}>
              <ChatPanel currentUser={currentUser} isMobile={false} isExpanded={isChatExpanded} onExpandToggle={() => setIsChatExpanded(!isChatExpanded)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── MOBILE LAYOUT ───────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 64 }}>
      <GlobalUserProfileModal />
      <ProfilePicViewerModal />
      <ScheduleMeetingModal />

      {showCreatePost && isAdmin(currentUser) && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} onSubmit={(post) => { addPost(post); setShowCreatePost(false); }} />
      )}

      {/* Impersonation Banner */}
      {currentUser?.isImpersonating && (
        <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 40, background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101, gap: 12, padding: '0 16px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            👁️ Viewing as <strong>{currentUser.name}</strong>
          </span>
          <button onClick={() => { endImpersonation(); setActiveNav('accounts'); }} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Exit View Mode
          </button>
        </div>
      )}

      {/* Mobile Header */}
      <div style={{ position: 'sticky', top: currentUser?.isImpersonating ? 40 : 0, background: '#fff', borderBottom: '1px solid #E8ECF0', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/ssrlogo.jpeg" alt="SSR Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', textTransform: 'capitalize' }}>
            {mobilePage === 'feed' ? 'Home Feed' : mobilePage === 'meetings' ? 'Live Meetings' : mobilePage === 'trainers' ? 'Trainers / Users' : mobilePage === 'requests' ? 'Requests' : mobilePage === 'data-management' ? 'Data Management' : mobilePage}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
          <button onClick={() => setNotifOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}>
            {MenuIcons.bell}
            {notifications?.some(notification => !notification.read) && <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, background: '#DC2626', borderRadius: '50%', border: '1.5px solid #fff' }} />}
          </button>

          <button onClick={() => setUserMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar initials={currentUser.initials} color={currentUser.color} src={currentUser.avatar} size={30} online={currentUser.online} />
          </button>

          {/* Mobile Notifications Dropdown */}
          {notifOpen && (
            <div style={{ position: 'absolute', right: 0, top: '120%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: 280, zIndex: 300, padding: 14 }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14 }}>Notifications</p>
              {(notifications || []).slice(0, 5).map((n, i) => (
                <div key={n.id} onClick={() => { markNotificationRead(n.id); if (n.url) window.location.href = n.url; }} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < Math.min((notifications || []).length, 5) - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}>
                  <span style={{ color: n.read ? '#94A3B8' : '#0A6ED1', display: 'flex', alignItems: 'center' }}>{['chat', 'comment', 'like'].includes(n.type) ? MenuIcons.chat : n.type === 'service' ? MenuIcons.course : MenuIcons.announcement}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: '#0F172A', fontWeight: n.read ? 400 : 600 }}>{n.body}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && <p style={{ margin: 0, padding: '12px 0', color: '#94A3B8', fontSize: 13 }}>No notifications yet.</p>}
            </div>
          )}

          {/* Mobile User Menu Dropdown */}
          {userMenuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '120%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 180, zIndex: 300, overflow: 'hidden' }}>
              <button onClick={() => { setMobilePage('settings'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                <span style={{ color: '#64748B' }}>{MenuIcons.profile}</span>View Profile
              </button>
              <button onClick={() => { setMobilePage('settings'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                <span style={{ color: '#64748B' }}>{MenuIcons.settings}</span>Settings
              </button>

              {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && (
                <button onClick={() => { setMobilePage('accounts'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                  <span style={{ color: '#64748B' }}>{MenuIcons.accounts}</span>Account Mgmt
                </button>
              )}
              {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && !currentUser.isImpersonating && (
                <button onClick={() => { setMobilePage('data-management'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                  <span style={{ color: '#64748B' }}>{NavIcons.data}</span>Data Management
                </button>
              )}
              {currentUser && hasEmployeePermission(currentUser, 'request_access') && !currentUser.isImpersonating && (
                <button onClick={() => { setMobilePage('requests'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                  <span style={{ color: '#64748B' }}>{NavIcons.requests}</span>Requests
                </button>
              )}
              <button onClick={() => { setMobilePage('bookmarks'); setUserMenuOpen(false); }} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600 }}>
                <span style={{ color: '#64748B' }}>{MenuIcons.bookmark}</span>Bookmarks
              </button>
              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 4, paddingTop: 4 }}>
                <button onClick={handleLogout} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#DC2626', fontWeight: 600 }}>
                  <span>{MenuIcons.logout}</span>Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile content */}
      {mobilePage === 'feed' && (
        <div style={{ padding: '12px 12px 0' }}>
          {/* Feed filter tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 4 }}>
            {FEED_TABS.map(tab => (
              <button key={tab} onClick={() => setFeedTab(tab)} style={{ padding: '7px 14px', border: `1.5px solid ${feedTab === tab ? '#0A6ED1' : '#E2E8F0'}`, background: feedTab === tab ? '#0A6ED1' : '#fff', color: feedTab === tab ? '#fff' : '#64748B', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: feedTab === tab ? 700 : 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {tab}
              </button>
            ))}
          </div>

          {isAdmin(currentUser) && !currentUser?.isImpersonating && (
            <button onClick={() => setShowCreatePost(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: '#0A6ED1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 2px 8px rgba(10,110,209,0.3)' }}>
              ＋ Create Post
            </button>
          )}

          {filteredPosts.map(post => (
            <PostCard key={post.id} post={post} currentUser={currentUser} isDesktop={false} />
          ))}
        </div>
      )}

      {mobilePage === 'chat' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 300 }}>
          <ChatPanel currentUser={currentUser} isMobile={true} />
        </div>
      )}

      {mobilePage === 'courses' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <CoursesPanel currentUser={currentUser} />
        </div>
      )}


      {mobilePage === 'bookmarks' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <BookmarksPanel currentUser={currentUser} />
        </div>
      )}

      {mobilePage === 'accounts' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <AccountManagementPanel currentUser={currentUser} onViewEmployeeChats={viewEmployeeChats} />
        </div>
      )}

      {mobilePage === 'data-management' && isAdmin(currentUser) && !currentUser.isImpersonating && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <DataManagementPanel currentUser={currentUser} />
        </div>
      )}

      {mobilePage === 'requests' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <RequestsPanel />
        </div>
      )}

      {mobilePage === 'settings' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <SettingsPanel currentUser={currentUser} onNavigateToChat={(chatId, msgId) => {
            setTargetChat({ chatId, msgId });
            setMobilePage('chat');
          }} />
        </div>
      )}

      {mobilePage === 'meetings' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <MeetingsPanel currentUser={currentUser} />
        </div>
      )}

      {mobilePage === 'trainers' && (
        <div style={{ height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <TrainersPanel />
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E8ECF0', display: 'flex', zIndex: 100, boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
        {[
          { id: 'feed', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Feed' },
          { id: 'chat', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>, label: 'Chat' },
          { id: 'courses', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>, label: 'Services' },
          { id: 'meetings', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Meetings' },
          { id: 'trainers', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, label: 'Users' },
          { id: 'settings', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label: 'Settings' },
        ].map(item => {
          const active = mobilePage === item.id;
          return (
            <button key={item.id} onClick={() => {
              setMobilePage(item.id);
            }} style={{ flex: 1, padding: '10px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', borderWidth: 0, cursor: 'pointer', borderTop: `2px solid ${active ? '#0A6ED1' : 'transparent'}` }}>
              <span style={{ position: 'relative', fontSize: 20, filter: active ? 'none' : 'grayscale(1) opacity(0.5)' }}>
                {item.icon}
                {item.id === 'chat' && unreadChatCount > 0 && (
                  <span style={{ position: 'absolute', top: -7, right: -10, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 10, background: '#DC2626', color: '#fff', fontSize: 10, lineHeight: '17px', fontWeight: 800, textAlign: 'center', boxSizing: 'border-box' }}>
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#0A6ED1' : '#94A3B8', letterSpacing: '0.03em' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes highlight-blink {
          0% { background-color: transparent; }
          50% { background-color: rgba(10, 110, 209, 0.3); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
}
