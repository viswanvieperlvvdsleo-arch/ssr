'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || 'bf0878574a024609ba7d798f24065d6e';

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

export function Avatar({ name = '?', size = 80 }) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  const hue = [...initials].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue},65%,50%), hsl(${(hue + 45) % 360},60%,38%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff', flexShrink: 0,
      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
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

// ─── Outgoing Call Screen (Ringing for caller) ───────────────────────────────
export function OutgoingCallScreen({ call, onCancel }) {
  useEffect(() => {
    const dialTone = new RingtonePlayer('dial');
    dialTone.start();
    return () => dialTone.stop();
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
      color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{
          position: 'absolute', inset: -16, borderRadius: '50%',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        }} />
        <Avatar name={call.calleeName} size={110} />
      </div>

      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6, textAlign: 'center' }}>
        {call.calleeName}
      </div>
      <div style={{ fontSize: 14, color: '#94A3B8', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{call.type === 'video' ? '🎥 Video Calling…' : '📞 Calling…'}</span>
      </div>

      <button
        onClick={onCancel}
        style={{
          width: 64, height: 64, borderRadius: '50%', border: 'none',
          background: '#EF4444', color: '#fff', fontSize: 26, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)',
          transition: 'transform 0.15s',
        }}
        title="Cancel Call"
      >
        📵
      </button>
    </div>
  );
}

// ─── Full Active Call Screen (Agora connected) ───────────────────────────────
export function ActiveCallScreen({ call, isCaller, onEnd }) {
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

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    start();
    return () => { stop(); };
  }, [start, stop]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const peerName = isCaller ? call.calleeName : call.callerName;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: '#090D16', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {call.type === 'video' ? (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* Remote user video container */}
          <div
            ref={remoteVideoContainerRef}
            style={{
              width: '100%', height: '100%', position: 'absolute', inset: 0,
              background: '#090D16', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!remoteUserJoined && (
              <div style={{ textAlign: 'center', zIndex: 1 }}>
                <Avatar name={peerName} size={90} />
                <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700 }}>{peerName}</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Connecting video stream…</div>
              </div>
            )}
          </div>

          {/* Local user self preview */}
          <div
            ref={localVideoContainerRef}
            style={{
              position: 'absolute', top: 20, right: 20, width: 130, height: 170,
              borderRadius: 14, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              background: '#1E293B', zIndex: 10,
              display: camOff ? 'none' : 'block',
            }}
          />
        </div>
      ) : (
        /* Audio Only View */
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 40 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
            <div style={{
              position: 'absolute', inset: -14, borderRadius: '50%',
              border: '2px solid rgba(14, 165, 233, 0.35)',
              animation: 'pulse 2.5s infinite',
            }} />
            <Avatar name={peerName} size={110} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{peerName}</div>
          <div style={{ fontSize: 14, color: connected ? '#38BDF8' : '#94A3B8', marginTop: 6, fontWeight: 600 }}>
            {connected ? (remoteUserJoined ? formatTime(elapsed) : 'Connecting audio…') : 'Joining…'}
          </div>
          {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 10 }}>{error}</div>}
        </div>
      )}

      {/* Top Overlay for Video Time */}
      {call.type === 'video' && (
        <div style={{
          position: 'absolute', top: 24, left: 24, zIndex: 10,
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
          padding: '8px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{peerName}</span>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>{formatTime(elapsed)}</span>
        </div>
      )}

      {/* Floating Bottom Control Bar */}
      <div style={{
        position: 'absolute', bottom: 36, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 18,
        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
        padding: '12px 24px', borderRadius: 36,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
      }}>
        {/* Mute Mic Toggle */}
        <button
          onClick={toggleMute}
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
          style={{
            width: 50, height: 50, borderRadius: '50%', border: 'none',
            background: muted ? '#EF4444' : '#334155',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          {muted ? '🔇' : '🎙️'}
        </button>

        {/* Camera Toggle (Video Call Only) */}
        {call.type === 'video' && (
          <button
            onClick={toggleCam}
            title={camOff ? 'Turn camera on' : 'Turn camera off'}
            style={{
              width: 50, height: 50, borderRadius: '50%', border: 'none',
              background: camOff ? '#EF4444' : '#334155',
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            {camOff ? '🚫' : '📹'}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={onEnd}
          title="End Call"
          style={{
            width: 54, height: 54, borderRadius: '50%', border: 'none',
            background: '#DC2626', color: '#fff', fontSize: 22, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
          }}
        >
          📵
        </button>
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

export default CallButton;
