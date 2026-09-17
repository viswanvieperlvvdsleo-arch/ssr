'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── ICE servers (free STUN, works for most networks) ────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
const POLL_MS = 1500;

function Avatar({ name = '?' }) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  const hue = [...initials].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: `hsl(${hue},55%,45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Hook: WebRTC peer connection logic ───────────────────────────────────────
function useCallPeer({ callId, myPeerId, isCaller, callType }) {
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const lastSince = useRef(new Date().toISOString());
  const pollTimer = useRef(null);

  const signal = useCallback(async (type, payload) => {
    await fetch(`/api/ssr/direct-call/${callId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    }).catch(() => {});
  }, [callId]);

  const handleSignal = useCallback(async ({ type, payload }) => {
    const p = pc.current;
    if (!p) return;
    if (type === 'offer') {
      await p.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await p.createAnswer();
      await p.setLocalDescription(answer);
      signal('answer', answer);
    } else if (type === 'answer') {
      await p.setRemoteDescription(new RTCSessionDescription(payload));
    } else if (type === 'ice') {
      await p.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
    }
  }, [signal]);

  const pollSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/ssr/direct-call/${callId}?since=${encodeURIComponent(lastSince.current)}`);
      if (!res.ok) return;
      const { signals, serverTime } = await res.json();
      if (serverTime) lastSince.current = serverTime;
      for (const s of signals || []) {
        await handleSignal(s);
      }
    } catch { /* network hiccup */ }
  }, [callId, handleSignal]);

  const start = useCallback(async () => {
    try {
      const constraints = { audio: true, video: callType === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const p = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.current = p;

      stream.getTracks().forEach(t => p.addTrack(t, stream));

      p.onicecandidate = ({ candidate }) => { if (candidate) signal('ice', candidate); };
      p.onconnectionstatechange = () => {
        if (p.connectionState === 'connected') setConnected(true);
        if (['disconnected', 'failed', 'closed'].includes(p.connectionState)) setConnected(false);
      };
      p.ontrack = ({ streams: [remote] }) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      };

      if (isCaller) {
        const offer = await p.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
        await p.setLocalDescription(offer);
        signal('offer', offer);
      }

      pollTimer.current = setInterval(pollSignals, POLL_MS);
    } catch (err) {
      setError(err.message || 'Could not access microphone/camera');
    }
  }, [callType, isCaller, pollSignals, signal]);

  const stop = useCallback(() => {
    clearInterval(pollTimer.current);
    pc.current?.close();
    localStream.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { start, stop, connected, error, remoteVideoRef, localVideoRef };
}

// ─── Incoming call banner ─────────────────────────────────────────────────────
export function IncomingCallBanner({ call, onAccept, onDecline }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#0F172A', color: '#fff',
      borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center',
      gap: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      minWidth: 280, maxWidth: 360,
    }}>
      <Avatar name={call.callerName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{call.callerName}</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>Incoming {call.type} call…</div>
      </div>
      <button onClick={onDecline} title="Decline" style={btnStyle('#EF4444')}>✕</button>
      <button onClick={onAccept} title="Accept" style={btnStyle('#22C55E')}>✓</button>
    </div>
  );
}
function btnStyle(bg) {
  return {
    width: 42, height: 42, borderRadius: '50%', border: 'none',
    background: bg, color: '#fff', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
}

// ─── Full call screen (shown after accept) ────────────────────────────────────
export function ActiveCallScreen({ call, isCaller, myPeerId, onEnd }) {
  const { start, stop, connected, error, remoteVideoRef, localVideoRef } = useCallPeer({
    callId: call.id,
    myPeerId,
    isCaller,
    callType: call.type,
  });

  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { start(); return () => stop(); }, [start, stop]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMute = () => {
    setMuted(m => {
      // mutate the live stream tracks
      return !m;
    });
  };

  const peerName = isCaller ? call.calleeName : call.callerName;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#0F172A', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {call.type === 'video' ? (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 100, right: 16, width: 120, height: 90, borderRadius: 8, objectFit: 'cover', border: '2px solid #334155' }} />
        </>
      ) : (
        <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />
      )}

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 32 }}>
        <Avatar name={peerName} />
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700 }}>{peerName}</div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
          {connected ? formatTime(elapsed) : 'Connecting…'}
        </div>
        {error && <div style={{ fontSize: 12, color: '#F87171', marginTop: 6 }}>{error}</div>}
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 20 }}>
        <button onClick={toggleMute} style={callBtn(muted ? '#475569' : '#1E293B')} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🎙️'}
        </button>
        <button onClick={onEnd} style={callBtn('#EF4444')} title="End call">📵</button>
      </div>
    </div>
  );
}

function callBtn(bg) {
  return {
    width: 56, height: 56, borderRadius: '50%', border: 'none',
    background: bg, fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ─── Outgoing call screen (ringing) ──────────────────────────────────────────
export function OutgoingCallScreen({ call, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#0F172A', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <Avatar name={call.calleeName} />
      <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>{call.calleeName}</div>
      <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Calling…</div>
      <button onClick={onCancel} style={{ ...callBtn('#EF4444'), marginTop: 40 }} title="Cancel">📵</button>
    </div>
  );
}

// ─── Call button (the small icon placed next to profile/avatar) ───────────────
export function CallButton({ targetUserId, targetUserName, callType = 'audio', currentUser }) {
  const [state, setState] = useState('idle'); // idle | calling | outgoing | incoming | active
  const [activeCall, setActiveCall] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [isCaller, setIsCaller] = useState(false);
  const pollRef = useRef(null);

  // Poll for incoming calls and call status updates
  useEffect(() => {
    if (!currentUser?.id) return;
    const poll = async () => {
      // If we have an active/outgoing call, poll its state
      if (activeCall?.id) {
        const res = await fetch(`/api/ssr/direct-call?callId=${activeCall.id}`).catch(() => null);
        if (!res?.ok) return;
        const updated = await res.json();
        setActiveCall(updated);
        // Caller: callee accepted → transition to active
        if (state === 'outgoing' && updated.status === 'accepted') {
          setMyPeerId(updated.peerId);
          setState('active');
        }
        // Either side: call ended/declined/missed → back to idle
        if (['ended', 'declined', 'missed', 'busy'].includes(updated.status)) {
          setState('idle');
          setActiveCall(null);
          clearInterval(pollRef.current);
        }
        return;
      }
      // Otherwise poll for an incoming call
      const res = await fetch('/api/ssr/direct-call').catch(() => null);
      if (!res?.ok) return;
      const { incoming } = await res.json();
      if (incoming && incoming.calleeId === currentUser.id && incoming.status === 'ringing') {
        setActiveCall(incoming);
        setState('incoming');
      }
    };
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [currentUser?.id, activeCall?.id, state]);

  const startCall = async () => {
    setState('calling');
    try {
      const res = await fetch('/api/ssr/direct-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calleeId: targetUserId, type: callType }),
      });
      if (!res.ok) { setState('idle'); return; }
      const data = await res.json();
      setActiveCall({ id: data.callId, callerId: currentUser.id, calleeId: targetUserId, callerName: currentUser.name, calleeName: targetUserName, type: callType, status: 'ringing', peerId: data.peerId });
      setMyPeerId(data.peerId);
      setIsCaller(true);
      setState('outgoing');
    } catch { setState('idle'); }
  };

  const acceptCall = async () => {
    const res = await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: activeCall.id, action: 'accept' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setActiveCall(data);
    setMyPeerId(data.calleePeerId);
    setIsCaller(false);
    setState('active');
  };

  const declineCall = async () => {
    await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: activeCall.id, action: 'decline' }),
    }).catch(() => {});
    setState('idle');
    setActiveCall(null);
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
    clearInterval(pollRef.current);
  };

  return (
    <>
      {/* The call button itself */}
      <button
        onClick={startCall}
        disabled={state !== 'idle'}
        title={`${callType === 'video' ? 'Video' : 'Audio'} call ${targetUserName}`}
        style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: state !== 'idle' ? '#CBD5E1' : '#0A6ED1',
          color: '#fff', cursor: state !== 'idle' ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0, transition: 'background 0.15s',
        }}
      >
        {callType === 'video' ? '🎥' : '📞'}
      </button>

      {/* Overlays */}
      {state === 'incoming' && activeCall && (
        <IncomingCallBanner call={activeCall} onAccept={acceptCall} onDecline={declineCall} />
      )}
      {state === 'outgoing' && activeCall && (
        <OutgoingCallScreen call={activeCall} onCancel={endCall} />
      )}
      {state === 'active' && activeCall && myPeerId && (
        <ActiveCallScreen call={activeCall} isCaller={isCaller} myPeerId={myPeerId} onEnd={endCall} />
      )}
    </>
  );
}

// ─── Global incoming call watcher (mount once in layout) ─────────────────────
export function IncomingCallWatcher({ currentUser }) {
  const [incoming, setIncoming] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    const poll = async () => {
      if (active) return; // don't poll while in a call
      const res = await fetch('/api/ssr/direct-call').catch(() => null);
      if (!res?.ok) return;
      const { incoming: call } = await res.json();
      if (call && call.status === 'ringing') setIncoming(call);
      else if (!call && incoming) setIncoming(null);
    };
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [currentUser?.id, active, incoming]);

  const accept = async () => {
    if (!incoming) return;
    const res = await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: incoming.id, action: 'accept' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setMyPeerId(data.calleePeerId);
    setActive(true);
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
    if (!incoming) return;
    await fetch('/api/ssr/direct-call', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: incoming.id, action: 'end' }),
    }).catch(() => {});
    setActive(false);
    setIncoming(null);
  };

  if (!incoming) return null;
  if (active && myPeerId) {
    return <ActiveCallScreen call={incoming} isCaller={false} myPeerId={myPeerId} onEnd={end} />;
  }
  return <IncomingCallBanner call={incoming} onAccept={accept} onDecline={decline} />;
}
