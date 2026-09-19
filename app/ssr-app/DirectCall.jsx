'use client';

import { useCallback, useContext, useEffect, useRef, useState, createContext } from 'react';

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || 'bf0878574a024609ba7d798f24065d6e';

// ─── Global Call Context (shared across all pages) ────────────────────────────
export const CallContext = createContext(null);

export function useCallContext() {
  return useContext(CallContext);
}

/**
 * Notify the service worker about call lifecycle changes.
 * This keeps the persistent "Ongoing call" notification in sync.
 */
function notifySW(type, payload = {}) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
  try { navigator.serviceWorker.controller.postMessage({ type, ...payload }); } catch {}
}

export function CallProvider({ children }) {
  // activeCall = { id, callerName, calleeName, type, status, isCaller }
  const [activeCall, setActiveCall] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Start/stop the global call timer
  useEffect(() => {
    if (activeCall && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    }
    if (!activeCall && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setElapsed(0);
    }
    return () => {};
  }, [activeCall]);

  // Keep service worker's persistent notification timer in sync
  useEffect(() => {
    if (!activeCall) return;
    notifySW('CALL_TIMER_UPDATE', {
      callId: activeCall.id,
      peerName: activeCall.isCaller ? activeCall.calleeName : activeCall.callerName,
      elapsed,
      type: activeCall.type,
    });
  }, [elapsed, activeCall]);

  const startCall = useCallback((call) => {
    setActiveCall(call);
    setMinimized(false);
    setElapsed(0);
    notifySW('CALL_STARTED', {
      callId: call.id,
      peerName: call.isCaller ? call.calleeName : call.callerName,
      type: call.type,
    });
  }, []);

  const endCallContext = useCallback(() => {
    notifySW('CALL_ENDED');
    setActiveCall(null);
    setMinimized(false);
    setElapsed(0);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);
  const restore = useCallback(() => setMinimized(false), []);

  return (
    <CallContext.Provider value={{ activeCall, minimized, elapsed, startCall, endCallContext, minimize, restore }}>
      {children}
    </CallContext.Provider>
  );
}

// ─── Ongoing Call Pill (floating bar shown while call is minimized or app in bg)
export function OngoingCallPill() {
  const ctx = useCallContext();
  if (!ctx?.activeCall || !ctx.minimized) return null;

  const { activeCall, elapsed, restore } = ctx;
  const peerName = activeCall.isCaller ? activeCall.calleeName : activeCall.callerName;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div
      onClick={restore}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: '#16A34A',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: '#fff',
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{peerName}</span>
        <span style={{ fontSize: 13, opacity: 0.85 }}>
          {activeCall.type === 'video' ? '🎥' : '📞'} {fmt(elapsed)}
        </span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.2)',
        borderRadius: 20, padding: '4px 12px',
      }}>
        tap to return
      </div>
    </div>
  );
}

// ─── Pleasant Web Audio Ringtone (no external mp3 files needed) ───────────────
class RingtonePlayer {
  constructor(mode = 'ring') {
    this.mode = mode; // 'ring' (incoming) | 'dial' (outgoing)
    this.ctx = null;
    this.interval = null;
    this.running = false;
  }

  playBeep() {
    if (!this.running) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      if (this.mode === 'ring') {
        // Dual-tone ringing: 440 Hz & 480 Hz
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
      } else {
        // Outgoing dial ring: 440 Hz & 480 Hz gentle pulse
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
      }

      setTimeout(() => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          gain.disconnect();
        } catch {}
      }, 2000);
    } catch {
      // Audio context might be blocked prior to user interaction
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.playBeep();
    this.interval = setInterval(() => this.playBeep(), this.mode === 'ring' ? 3000 : 3500);
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

export function Avatar({ name = '?', size = 80, image = null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          flexShrink: 0,
        }}
      />
    );
  }
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  const hue = [...initials].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue},65%,50%), hsl(${(hue + 45) % 360},60%,38%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff', flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.2)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    }}>{initials}</div>
  );
}

// ─── Hook: Agora RTC Call logic ───────────────────────────────────────────────
export function useAgoraCall({ callId, callType }) {
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);
  const localVideoContainerRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState('');

  const start = useCallback(async () => {
    if (!callId) return;
    try {
      setError('');
      // Dynamic import to avoid SSR window/navigator issues
      const mod = await import('agora-rtc-sdk-ng');
      const AgoraRTC = mod.default || mod;

      AgoraRTC.setLogLevel(2); // WARNING and ERROR only

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Handle remote user publication
      client.on('user-published', async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          setRemoteUserJoined(true);
          if (mediaType === 'video' && remoteVideoContainerRef.current) {
            user.videoTrack.play(remoteVideoContainerRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        } catch (subErr) {
          console.warn('Agora subscribe error:', subErr);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
          // Video track unpublished
        }
      });

      client.on('user-left', () => {
        setRemoteUserJoined(false);
      });

      // Join the Agora RTC channel (clean channel name)
      const channelName = `call_${String(callId).replace(/[^a-zA-Z0-9_-]/g, '')}`;

      // Fetch dynamic RTC token from backend (required because Primary Certificate is enabled)
      let rtcToken = null;
      let rtcUid = null;
      try {
        const tokenRes = await fetch(`/api/ssr/direct-call/token?channelName=${encodeURIComponent(channelName)}`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.token) {
            rtcToken = tokenData.token;
            rtcUid = tokenData.uid ?? null;
          }
        } else {
          const errData = await tokenRes.json().catch(() => null);
          console.warn('Agora token fetch non-ok:', tokenRes.status, errData);
        }
      } catch (tokenErr) {
        console.warn('Could not fetch Agora RTC token:', tokenErr);
      }

      await client.join(AGORA_APP_ID, channelName, rtcToken, rtcUid);

      // Create and publish local tracks
      const tracksToPublish = [];

      try {
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = micTrack;
        tracksToPublish.push(micTrack);
      } catch (micErr) {
        console.warn('Microphone error:', micErr);
        setError('Microphone access denied or unavailable.');
      }

      if (callType === 'video') {
        try {
          const camTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrackRef.current = camTrack;
          tracksToPublish.push(camTrack);
          if (localVideoContainerRef.current) {
            camTrack.play(localVideoContainerRef.current);
          }
        } catch (camErr) {
          console.warn('Camera error:', camErr);
          setError(prev => (prev ? `${prev} Camera access denied.` : 'Camera access denied or unavailable.'));
        }
      }

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }

      setConnected(true);
    } catch (err) {
      console.error('Agora connection error:', err);
      setError(err.message || 'Could not connect to call server.');
    }
  }, [callId, callType]);

  const stop = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current.removeAllListeners();
        clientRef.current = null;
      }
    } catch (err) {
      console.warn('Agora cleanup error:', err);
    }
    setConnected(false);
    setRemoteUserJoined(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      setMuted(m => {
        const next = !m;
        localAudioTrackRef.current.setEnabled(!next);
        return next;
      });
    }
  }, []);

  const toggleCam = useCallback(() => {
    if (localVideoTrackRef.current) {
      setCamOff(c => {
        const next = !c;
        localVideoTrackRef.current.setEnabled(!next);
        return next;
      });
    }
  }, []);

  return {
    start,
    stop,
    connected,
    remoteUserJoined,
    muted,
    camOff,
    error,
    toggleMute,
    toggleCam,
    remoteVideoContainerRef,
    localVideoContainerRef,
  };
}

// ─── Incoming Call Banner (Rings on recipient's screen) ───────────────────────
export function IncomingCallBanner({ call, onAccept, onDecline }) {
  useEffect(() => {
    const ringtone = new RingtonePlayer('ring');
    ringtone.start();
    return () => ringtone.stop();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      background: '#0F172A',
      color: '#fff',
      borderRadius: 20,
      padding: '16px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1)',
      minWidth: 320,
      maxWidth: '92vw',
      animation: 'slideDown 0.3s ease-out',
    }}>
      <Avatar name={call.callerName} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {call.callerName}
        </div>
        <div style={{ fontSize: 13, color: '#38BDF8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{call.type === 'video' ? '🎥 Incoming Video Call' : '📞 Incoming Audio Call'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onDecline}
          title="Decline"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: '#EF4444', color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
          }}
        >
          ✕
        </button>
        <button
          onClick={onAccept}
          title="Accept"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: '#22C55E', color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
          }}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

// ─── SVG Icons for Android/iOS Native Style Dialer ────────────────────────────
const DialerIcons = {
  record: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <circle cx="8" cy="12" r="2.5" />
      <circle cx="16" cy="12" r="2.5" />
      <line x1="8" y1="14.5" x2="16" y2="14.5" />
    </svg>
  ),
  hold: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </svg>
  ),
  video: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="3" ry="3" />
    </svg>
  ),
  mic: (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  micMuted: (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  speaker: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  endCall: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  minimize: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
};

// ─── Circular Dialer Action Button with bottom label ──────────────────────────
function DialerActionBtn({ icon, label, onClick, active = false, danger = false, disabled = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
    }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          width: 68,
          height: 68,
          borderRadius: '50%',
          border: danger
            ? 'none'
            : active
              ? '1px solid rgba(255,255,255,0.45)'
              : '1px solid rgba(255,255,255,0.12)',
          background: danger
            ? '#EF4444'
            : active
              ? '#FFFFFF'
              : 'rgba(255, 255, 255, 0.14)',
          color: danger ? '#FFFFFF' : active ? '#18181B' : '#FFFFFF',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          boxShadow: danger
            ? '0 10px 28px rgba(239, 68, 68, 0.5)'
            : active
              ? '0 8px 20px rgba(255, 255, 255, 0.25)'
              : '0 4px 16px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.18s ease',
          outline: 'none',
        }}
      >
        {icon}
      </button>
      <span style={{
        marginTop: 9,
        fontSize: 13,
        fontWeight: 500,
        color: active ? '#FFFFFF' : '#D1D5DB',
        letterSpacing: '-0.01em',
        textAlign: 'center',
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── Outgoing Call Screen (Ringing for caller) ───────────────────────────────
export function OutgoingCallScreen({ call, onCancel }) {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  useEffect(() => {
    const dialTone = new RingtonePlayer('dial');
    dialTone.start();
    return () => dialTone.stop();
  }, []);

  const peerName = call.calleeName || 'User';
  const peerSubtitle = call.calleePhone || call.companyName || 'SSR Direct Connect';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'linear-gradient(180deg, #2D2D31 0%, #1A1A1D 55%, #121214 100%)',
      color: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 24px 8px',
      }}>
        <button
          onClick={onCancel}
          title="Minimize or Cancel"
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
            width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)',
          }}
        >
          {DialerIcons.minimize}
        </button>
        <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>
          {call.type === 'video' ? '🎥 Video Calling' : '📞 Calling'}
        </div>
      </div>

      {/* Main Contact Block (matching user's screenshot layout) */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '20px 28px 0',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
          <h1 style={{
            fontSize: 'clamp(26px, 6.5vw, 34px)',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {peerName}
          </h1>
          <div style={{
            fontSize: 15,
            color: '#9CA3AF',
            marginTop: 6,
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {peerSubtitle}
          </div>
          <div style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 5px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.18)',
              color: '#FFFFFF',
            }}>
              VoIP
            </span>
            <span style={{ color: '#E4E4E7' }}>Waiting...</span>
          </div>
        </div>

        <div style={{ flexShrink: 0, position: 'relative' }}>
          <Avatar name={peerName} size={78} />
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* 3x2 Dialer Action Grid (matching uploaded screenshot) */}
      <div style={{
        padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 42px)',
        width: '100%',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px 16px',
          maxWidth: 340,
          margin: '0 auto',
        }}>
          {/* Row 1 */}
          <DialerActionBtn
            icon={DialerIcons.record}
            label="Record"
            disabled={true}
          />
          <DialerActionBtn
            icon={DialerIcons.hold}
            label="Hold"
            disabled={true}
          />
          <DialerActionBtn
            icon={DialerIcons.video}
            label="Video call"
            active={call.type === 'video'}
          />

          {/* Row 2 */}
          <DialerActionBtn
            icon={muted ? DialerIcons.micMuted : DialerIcons.mic}
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={() => setMuted(m => !m)}
          />
          <DialerActionBtn
            icon={DialerIcons.endCall}
            label="End"
            danger={true}
            onClick={onCancel}
          />
          <DialerActionBtn
            icon={DialerIcons.speaker}
            label="Speaker"
            active={speakerOn}
            onClick={() => setSpeakerOn(s => !s)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Full Active Call Screen (Agora connected) ───────────────────────────────
export function ActiveCallScreen({ call, isCaller, onEnd }) {
  const callCtx = useCallContext();
  const {
    start,
    stop,
    connected,
    remoteUserJoined,
    muted,
    camOff,
    error,
    toggleMute,
    toggleCam,
    remoteVideoContainerRef,
    localVideoContainerRef,
  } = useAgoraCall({
    callId: call.id,
    callType: call.type,
  });

  const [localElapsed, setLocalElapsed] = useState(0);
  const [onHold, setOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const elapsed = callCtx?.elapsed ?? localElapsed;
  const isMinimized = callCtx?.minimized ?? false;

  useEffect(() => {
    start();
    if (callCtx?.startCall) {
      callCtx.startCall({ ...call, isCaller });
    }
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (callCtx) return;
    const timer = setInterval(() => setLocalElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [callCtx]);

  const handleEnd = () => {
    if (callCtx?.endCallContext) callCtx.endCallContext();
    onEnd();
  };

  const handleMinimize = () => {
    if (callCtx?.minimize) callCtx.minimize();
  };

  const toggleHold = () => {
    setOnHold(h => {
      const next = !h;
      if (toggleMute && next !== muted) {
        toggleMute();
      }
      return next;
    });
  };

  const toggleRecord = () => {
    setIsRecording(r => !r);
  };

  const toggleSpeaker = () => {
    setSpeakerOn(s => !s);
  };

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const peerName = isCaller ? call.calleeName : call.callerName;
  const peerSubtitle = call.calleePhone || call.companyName || 'SSR Direct Connect';

  if (isMinimized) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'linear-gradient(180deg, #2D2D31 0%, #1A1A1D 55%, #121214 100%)',
      color: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Top Bar: minimize button & rec indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 24px 8px',
        zIndex: 20,
      }}>
        <button
          onClick={handleMinimize}
          title="Minimize call (continues in background)"
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
            width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)',
          }}
        >
          {DialerIcons.minimize}
        </button>

        {isRecording && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#FCA5A5',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
            REC
          </div>
        )}
      </div>

      {/* Main Contact Block (matching user's screenshot layout) */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '16px 28px 0',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        zIndex: 20,
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
          <h1 style={{
            fontSize: 'clamp(26px, 6.5vw, 34px)',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {peerName}
          </h1>
          <div style={{
            fontSize: 15,
            color: '#9CA3AF',
            marginTop: 6,
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {peerSubtitle}
          </div>
          <div style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 5px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.18)',
              color: '#FFFFFF',
            }}>
              VoIP
            </span>
            <span style={{ color: onHold ? '#FBBF24' : connected ? '#38BDF8' : '#E4E4E7' }}>
              {onHold ? 'On Hold' : connected ? (remoteUserJoined ? formatTime(elapsed) : 'Connecting...') : 'Joining...'}
            </span>
          </div>
          {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ flexShrink: 0, position: 'relative' }}>
          <Avatar name={peerName} size={78} />
        </div>
      </div>

      {/* Middle Video or Audio Spacer */}
      <div style={{ flex: 1, position: 'relative', minHeight: 80, width: '100%' }}>
        {call.type === 'video' && (
          <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <div
              ref={remoteVideoContainerRef}
              style={{
                width: '100%', height: '100%',
                background: '#090D16', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            />
            <div
              ref={localVideoContainerRef}
              style={{
                position: 'absolute', top: 12, right: 20, width: 110, height: 150,
                borderRadius: 14, overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                background: '#1E293B', zIndex: 10,
                display: camOff ? 'none' : 'block',
              }}
            />
          </div>
        )}
      </div>

      {/* 3x2 Dialer Action Grid (matching uploaded screenshot) */}
      <div style={{
        padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 42px)',
        width: '100%',
        zIndex: 20,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px 16px',
          maxWidth: 340,
          margin: '0 auto',
        }}>
          {/* Row 1 */}
          <DialerActionBtn
            icon={isRecording ? (
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#EF4444' }} />
            ) : DialerIcons.record}
            label={isRecording ? 'Recording' : 'Record'}
            active={isRecording}
            onClick={toggleRecord}
            disabled={!connected}
          />
          <DialerActionBtn
            icon={DialerIcons.hold}
            label={onHold ? 'On Hold' : 'Hold'}
            active={onHold}
            onClick={toggleHold}
            disabled={!connected}
          />
          <DialerActionBtn
            icon={DialerIcons.video}
            label="Video call"
            active={call.type === 'video' && !camOff}
            onClick={toggleCam}
          />

          {/* Row 2 */}
          <DialerActionBtn
            icon={muted ? DialerIcons.micMuted : DialerIcons.mic}
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={toggleMute}
          />
          <DialerActionBtn
            icon={DialerIcons.endCall}
            label="End"
            danger={true}
            onClick={handleEnd}
          />
          <DialerActionBtn
            icon={DialerIcons.speaker}
            label="Speaker"
            active={speakerOn}
            onClick={toggleSpeaker}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Call Button (Mount anywhere: profile modal, chat header, etc.) ───────────
export function CallButton({
  targetUserId,
  targetUserName = 'User',
  callType = 'audio',
  currentUser,
  variant = 'icon', // 'icon' | 'button'
  checkAccess = null,
  onRequestAccess = null,
  label = null,
  style = {},
}) {
  const [state, setState] = useState('idle'); // idle | calling | outgoing | active
  const [activeCall, setActiveCall] = useState(null);
  const pollRef = useRef(null);

  // Poll for outgoing call status changes
  useEffect(() => {
    if (!activeCall?.id || state === 'idle') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ssr/direct-call?callId=${activeCall.id}`).catch(() => null);
        if (!res?.ok) return;
        const updated = await res.json();
        setActiveCall(updated);

        // Callee accepted -> active call
        if (state === 'outgoing' && updated.status === 'accepted') {
          setState('active');
        }

        // Call ended / declined / missed -> back to idle
        if (['ended', 'declined', 'missed', 'busy'].includes(updated.status)) {
          setState('idle');
          setActiveCall(null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };

    pollRef.current = setInterval(poll, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeCall?.id, state]);

  const startCall = async (e) => {
    if (e) e.stopPropagation();
    if (!currentUser?.id || !targetUserId || state !== 'idle') return;

    // Enforce message/call restriction
    if (checkAccess && !checkAccess(targetUserId)) {
      const typeLabel = callType === 'video' ? 'video' : 'audio';
      const shouldRequest = window.confirm(`Send request to Admin Service for ${typeLabel} call access?`);
      if (shouldRequest && onRequestAccess) {
        const result = await onRequestAccess(targetUserId);
        alert(
          result?.success
            ? (result.existing
                ? 'Request is already pending with Admin Service.'
                : 'Request sent to Admin Service. You will be able to call once approved.')
            : (result?.error || 'Could not send request.')
        );
      }
      return;
    }

    setState('calling');
    try {
      const res = await fetch('/api/ssr/direct-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calleeId: targetUserId, type: callType }),
      });

      if (!res.ok) {
        setState('idle');
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Could not initiate call');
        return;
      }

      const data = await res.json();
      setActiveCall({
        id: data.callId,
        callerId: currentUser.id,
        calleeId: targetUserId,
        callerName: currentUser.name || 'Caller',
        calleeName: targetUserName,
        type: callType,
        status: 'ringing',
      });
      setState('outgoing');
    } catch {
      setState('idle');
    }
  };

  const endCall = async () => {
    if (activeCall?.id) {
      await fetch('/api/ssr/direct-call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCall.id, action: 'end' }),
      }).catch(() => {});
    }
    setState('idle');
    setActiveCall(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const isVideo = callType === 'video';
  const defaultLabel = label || (isVideo ? 'Video' : 'Call');

  return (
    <>
      {variant === 'button' ? (
        <button
          onClick={startCall}
          disabled={state !== 'idle'}
          title={`${isVideo ? 'Video' : 'Audio'} call ${targetUserName}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#0F172A',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 800,
            cursor: state !== 'idle' ? 'default' : 'pointer',
            opacity: state !== 'idle' ? 0.6 : 1,
            transition: 'background 0.15s, opacity 0.15s',
            ...style,
          }}
        >
          {isVideo ? (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          )}
          <span>{defaultLabel}</span>
        </button>
      ) : (
        <button
          onClick={startCall}
          disabled={state !== 'idle'}
          title={`${isVideo ? 'Video' : 'Audio'} call ${targetUserName}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: state !== 'idle' ? '#94A3B8' : (isVideo ? '#0A6ED1' : '#10B981'),
            color: '#fff',
            cursor: state !== 'idle' ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'background 0.15s, transform 0.1s',
            ...style,
          }}
        >
          {isVideo ? (
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          )}
        </button>
      )}

      {state === 'outgoing' && activeCall && (
        <OutgoingCallScreen call={activeCall} onCancel={endCall} />
      )}
      {state === 'active' && activeCall && (
        <ActiveCallScreen call={activeCall} isCaller={true} onEnd={endCall} />
      )}
    </>
  );
}

// ─── Global Incoming Call Watcher (Mounted once in layout) ────────────────────
export function IncomingCallWatcher({ currentUser }) {
  const [incoming, setIncoming] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const callCtx = useCallContext();

  // Listen for service-worker messages (restore call from ongoing-call notification tap)
  useEffect(() => {
    if (!navigator?.serviceWorker) return;
    const handler = (event) => {
      if (event.data?.type === 'ssr-restore-call') {
        // Un-minimize the call
        if (callCtx?.restore) callCtx.restore();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [callCtx]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const poll = async () => {
      // Don't poll while an active call is underway
      if (activeCall) return;

      const res = await fetch('/api/ssr/direct-call').catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      const call = data.incoming;

      if (call && call.status === 'ringing') {
        setIncoming(call);
      } else if (!call && incoming) {
        setIncoming(null);
      }
    };

    const timer = setInterval(poll, 2500);
    return () => clearInterval(timer);
  }, [currentUser?.id, activeCall, incoming]);

  const accept = async () => {
    if (!incoming) return;
    const res = await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: incoming.id, action: 'accept' }),
    });
    if (!res.ok) {
      setIncoming(null);
      return;
    }
    setActiveCall(incoming);
    setIncoming(null);
  };

  const decline = async () => {
    if (!incoming) return;
    await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: incoming.id, action: 'decline' }),
    }).catch(() => {});
    setIncoming(null);
  };

  const end = async () => {
    if (activeCall) {
      await fetch('/api/ssr/direct-call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCall.id, action: 'end' }),
      }).catch(() => {});
    }
    setActiveCall(null);
    setIncoming(null);
  };

  if (activeCall) {
    return <ActiveCallScreen call={activeCall} isCaller={false} onEnd={end} />;
  }

  if (incoming) {
    return <IncomingCallBanner call={incoming} onAccept={accept} onDecline={decline} />;
  }

  return null;
}

// ─── Call History Panel (shows per-user call log) ─────────────────────────────
export function CallHistoryPanel({ targetUserId, currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: LIMIT, page: p });
      if (targetUserId) params.set('userId', targetUserId);
      const res = await fetch(`/api/ssr/call-logs?${params}`).catch(() => null);
      if (!res?.ok) { setLoading(false); return; }
      const data = await res.json();
      setLogs(p === 1 ? data.logs : prev => [...prev, ...data.logs]);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  const fmt = (s) => {
    if (s == null) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const timeAgo = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const statusIcon = (log) => {
    if (log.status === 'missed') return { icon: '📵', color: '#EF4444', label: 'Missed' };
    if (log.status === 'declined') return { icon: '🚫', color: '#F59E0B', label: 'Declined' };
    if (log.isOutgoing) return { icon: '📤', color: '#3B82F6', label: 'Outgoing' };
    return { icon: '📥', color: '#10B981', label: 'Incoming' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {loading && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 14 }}>Loading call history…</div>
      )}
      {!loading && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📵</div>
          No call history yet
        </div>
      )}
      {logs.map((log) => {
        const st = statusIcon(log);
        const peerName = log.isOutgoing ? log.calleeName : log.callerName;
        return (
          <div key={log.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid #F1F5F9',
          }}>
            {/* Status icon */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `${st.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
            }}>
              {st.icon}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {peerName}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: st.color }}>{st.label}</span>
                <span>·</span>
                <span>{log.type === 'video' ? '🎥 Video' : '📞 Audio'}</span>
                {log.duration != null && log.duration > 0 && (
                  <><span>·</span><span>{fmt(log.duration)}</span></>
                )}
              </div>
            </div>
            {/* Time */}
            <div style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>
              {timeAgo(log.createdAt)}
            </div>
          </div>
        );
      })}
      {/* Load more */}
      {logs.length < total && !loading && (
        <button
          onClick={() => { const next = page + 1; setPage(next); load(next); }}
          style={{
            margin: '8px 16px', padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#F8FAFC', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Load more
        </button>
      )}
      {loading && logs.length > 0 && (
        <div style={{ textAlign: 'center', padding: 12, color: '#94A3B8', fontSize: 13 }}>Loading…</div>
      )}
    </div>
  );
}

export default CallButton;
