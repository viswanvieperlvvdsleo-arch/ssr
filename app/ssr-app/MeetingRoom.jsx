'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './AppContext';
import styles from './meeting-room.module.css';

const Icons = {
  mic: <svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>,
  micOff: <svg viewBox="0 0 24 24"><path d="m3 3 18 18M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.8-1M17 17a7 7 0 0 0 2-5v-2M5 10v2a7 7 0 0 0 10.5 6M12 19v3M8 22h8"/></svg>,
  video: <svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>,
  videoOff: <svg viewBox="0 0 24 24"><path d="m3 3 18 18M10.5 6H14a2 2 0 0 1 2 2v3l5-3v9l-3.5-2M14 18H5a2 2 0 0 1-2-2V8c0-.7.3-1.3.8-1.7"/></svg>,
  screen: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4M9 10l3-3 3 3M12 7v7"/></svg>,
  record: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>,
  hand: <svg viewBox="0 0 24 24"><path d="M7 11V5a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8H9a6 6 0 0 1-5-3l-2-4a2 2 0 0 1 3-2l2 2"/></svg>,
  people: <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>,
  chat: <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>,
  copy: <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  leave: <svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg>,
  close: <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>,
  send: <svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/></svg>,
};

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function formatCode(code) {
  return String(code || '').replace(/(\d{3})(?=\d)/g, '$1 ');
}

const RECORDING_WIDTH = 1280;
const RECORDING_HEIGHT = 720;
const RECORDING_FPS = 25;
const RECORDING_VIDEO_BITS_PER_SECOND = 1_450_000;
const RECORDING_AUDIO_BITS_PER_SECOND = 96_000;

function recordingMimeType() {
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ].find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function drawVideo(ctx, video, x, y, width, height, contain = false, mirror = false) {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return false;
  const scale = contain
    ? Math.min(width / video.videoWidth, height / video.videoHeight)
    : Math.max(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  if (mirror) {
    ctx.translate(x + width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, width - (drawX - x) - drawWidth, drawY, drawWidth, drawHeight);
  } else {
    ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
  }
  ctx.restore();
  return true;
}

function drawRecordingTile(ctx, video, participant, bounds, options = {}) {
  const { x, y, width, height } = bounds;
  const { featured = false, mirror = false } = options;
  ctx.fillStyle = '#30333a';
  ctx.fillRect(x, y, width, height);

  const hasVideo = Boolean(
    video
    && participant
    && (participant.cameraOn || participant.screenSharing)
    && video.srcObject?.getVideoTracks().some(track => track.enabled && track.readyState === 'live')
  );
  const drewVideo = hasVideo && drawVideo(ctx, video, x, y, width, height, featured || participant.screenSharing, mirror && !participant.screenSharing);

  if (!drewVideo) {
    const radius = Math.max(28, Math.min(width, height) * 0.16);
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#9ab9a9';
    ctx.fill();
    ctx.fillStyle = '#20362c';
    ctx.font = `700 ${Math.max(22, radius * 0.72)}px Inter, Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(participant?.name), x + width / 2, y + height / 2);
  }

  const metaHeight = featured ? 48 : 34;
  const metaGradient = ctx.createLinearGradient(0, y + height - metaHeight, 0, y + height);
  metaGradient.addColorStop(0, 'rgba(0,0,0,0)');
  metaGradient.addColorStop(1, 'rgba(0,0,0,.82)');
  ctx.fillStyle = metaGradient;
  ctx.fillRect(x, y + height - metaHeight, width, metaHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${featured ? 18 : 14}px Inter, Segoe UI, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const role = participant?.role === 'host' ? ' (Host)' : '';
  ctx.fillText(`${participant?.name || 'Participant'}${role}`, x + 14, y + height - 12, Math.max(40, width - 52));
  if (participant && !participant.micOn) {
    ctx.fillStyle = '#ff6b72';
    ctx.font = `700 ${featured ? 15 : 12}px Inter, Segoe UI, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('Muted', x + width - 14, y + height - 12);
  }
  ctx.strokeStyle = participant?.screenSharing ? '#12b76a' : '#484d55';
  ctx.lineWidth = participant?.screenSharing ? 4 : 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
}

function ParticipantTile({ participant, stream, muted = false, featured = false }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const hasVideo = Boolean(stream?.getVideoTracks().some(track => track.enabled && track.readyState === 'live')) && (participant.cameraOn || participant.screenSharing);
  return (
    <div className={`${styles.participantTile} ${featured ? styles.featuredTile : ''}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className={hasVideo ? '' : styles.hiddenMedia} />
      {!hasVideo && <div className={styles.avatarFallback}>{participant.avatar ? <img src={participant.avatar} alt="" /> : <span>{initials(participant.name)}</span>}</div>}
      <div className={styles.tileMeta}>
        <span>{participant.name}{participant.role === 'host' ? ' (Host)' : ''}</span>
        {!participant.micOn && <span className={styles.mutedIcon}>{Icons.micOff}</span>}
      </div>
      {participant.screenSharing && <span className={styles.sharingBadge}>Presenting</span>}
    </div>
  );
}

export default function MeetingRoom({ meetingCode }) {
  const router = useRouter();
  const { currentUser } = useApp();
  const localVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const sessionRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const dataChannelsRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const seenSignalsRef = useRef(new Set());
  const pollCursorRef = useRef('');
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const participantsRef = useRef([]);
  const remoteStreamsRef = useRef({});
  const recordingCanvasRef = useRef(null);
  const recordingAnimationRef = useRef(0);
  const recordingVideosRef = useRef(new Map());
  const recordingAudioSourcesRef = useRef(new Map());
  const recordingOutputStreamRef = useRef(null);
  const recordingSinkRef = useRef(null);
  const recordingWriteChainRef = useRef(Promise.resolve());
  const recordingWriteErrorRef = useRef(null);
  const recordingWakeLockRef = useRef(null);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [password, setPassword] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [deviceError, setDeviceError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [sidePanel, setSidePanel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [roomError, setRoomError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hostPassword, setHostPassword] = useState('');
  const [raisedHands, setRaisedHands] = useState({});

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { remoteStreamsRef.current = remoteStreams; }, [remoteStreams]);

  useEffect(() => {
    try {
      const savedPassword = sessionStorage.getItem(`ssr_meeting_password_${meetingCode}`);
      if (savedPassword) setPassword(savedPassword);
    } catch { /* Session storage may be unavailable in private browsing. */ }
  }, [meetingCode]);

  useEffect(() => {
    if (!meetingCode) return;
    if (!currentUser?.id) {
      setLoading(false);
      setLoadError('Sign in to view this meeting.');
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError('');
    fetch(`/api/ssr/meetings?code=${encodeURIComponent(meetingCode)}&userId=${encodeURIComponent(currentUser.id)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Meeting not found.');
        if (active) setMeeting(data);
      })
      .catch(error => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id, meetingCode]);

  useEffect(() => {
    if (!meeting?.id || !currentUser?.id || meeting.hostId !== currentUser.id) return;
    fetch(`/api/ssr/meetings?id=${encodeURIComponent(meeting.id)}&userId=${encodeURIComponent(currentUser.id)}&includeCredentials=true`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.joinPassword) setHostPassword(data.joinPassword); })
      .catch(() => {});
  }, [currentUser?.id, meeting?.hostId, meeting?.id]);

  useEffect(() => {
    if (session || !currentUser || loading || loadError) return undefined;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (cancelled) return stream.getTracks().forEach(track => track.stop());
        previewStreamRef.current = stream;
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(() => {
        setCameraOn(false);
        setMicOn(false);
        setDeviceError('Camera or microphone is blocked. You can still enter the room.');
      });
    return () => { cancelled = true; };
  }, [currentUser, loadError, loading, session]);

  const api = useCallback(async (method, body, query = '') => {
    const token = sessionRef.current?.token;
    const response = await fetch(`/api/ssr/meeting-room/signal${query}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      keepalive: method === 'DELETE',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Meeting connection failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }, []);

  const sendSignal = useCallback((recipientPeerId, type, payload) => {
    return api('POST', { recipientPeerId, type, payload }).catch(() => null);
  }, [api]);

  const appendDataMessage = useCallback((payload) => {
    if (payload.type === 'chat' && payload.message) {
      setMessages(previous => previous.some(item => item.id === payload.message.id) ? previous : [...previous, payload.message]);
    }
    if (payload.type === 'hand') setRaisedHands(previous => ({ ...previous, [payload.peerId]: payload.raised }));
  }, []);

  const setupDataChannel = useCallback((remotePeerId, channel) => {
    dataChannelsRef.current.set(remotePeerId, channel);
    channel.onmessage = event => {
      try { appendDataMessage(JSON.parse(event.data)); } catch { /* Ignore malformed peer data. */ }
    };
    channel.onclose = () => dataChannelsRef.current.delete(remotePeerId);
  }, [appendDataMessage]);

  const createPeer = useCallback(async (remotePeerId, initiate = false) => {
    if (!remotePeerId || remotePeerId === sessionRef.current?.peerId) return null;
    if (peerConnectionsRef.current.has(remotePeerId)) return peerConnectionsRef.current.get(remotePeerId);

    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnectionsRef.current.set(remotePeerId, connection);
    localStreamRef.current?.getTracks().forEach(track => connection.addTrack(track, localStreamRef.current));
    connection.ontrack = event => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams(previous => ({ ...previous, [remotePeerId]: stream }));
    };
    connection.onicecandidate = event => {
      if (event.candidate) sendSignal(remotePeerId, 'ice', event.candidate.toJSON());
    };
    connection.ondatachannel = event => setupDataChannel(remotePeerId, event.channel);
    connection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(connection.connectionState)) {
        peerConnectionsRef.current.delete(remotePeerId);
        dataChannelsRef.current.delete(remotePeerId);
        setRemoteStreams(previous => {
          const next = { ...previous };
          delete next[remotePeerId];
          return next;
        });
      }
    };

    if (initiate) {
      setupDataChannel(remotePeerId, connection.createDataChannel('meeting-chat'));
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal(remotePeerId, 'offer', offer);
    }
    return connection;
  }, [sendSignal, setupDataChannel]);

  const processSignal = useCallback(async signal => {
    if (seenSignalsRef.current.has(signal.id)) return;
    seenSignalsRef.current.add(signal.id);
    if (seenSignalsRef.current.size > 1000) seenSignalsRef.current = new Set(Array.from(seenSignalsRef.current).slice(-500));
    const connection = await createPeer(signal.senderPeerId, false);
    if (!connection) return;
    try {
      if (signal.type === 'offer') {
        await connection.setRemoteDescription(new RTCSessionDescription(signal.payload));
        for (const candidate of pendingCandidatesRef.current.get(signal.senderPeerId) || []) await connection.addIceCandidate(candidate);
        pendingCandidatesRef.current.delete(signal.senderPeerId);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        await sendSignal(signal.senderPeerId, 'answer', answer);
      } else if (signal.type === 'answer' && connection.signalingState === 'have-local-offer') {
        await connection.setRemoteDescription(new RTCSessionDescription(signal.payload));
        for (const candidate of pendingCandidatesRef.current.get(signal.senderPeerId) || []) await connection.addIceCandidate(candidate);
        pendingCandidatesRef.current.delete(signal.senderPeerId);
      } else if (signal.type === 'ice') {
        const candidate = new RTCIceCandidate(signal.payload);
        if (connection.remoteDescription) await connection.addIceCandidate(candidate);
        else pendingCandidatesRef.current.set(signal.senderPeerId, [...(pendingCandidatesRef.current.get(signal.senderPeerId) || []), candidate]);
      }
    } catch (error) {
      console.warn('WebRTC signal could not be applied.', error);
    }
  }, [createPeer, sendSignal]);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    let polling = false;
    const poll = async () => {
      if (!active || polling) return;
      polling = true;
      try {
        const query = pollCursorRef.current ? `?since=${encodeURIComponent(pollCursorRef.current)}` : '';
        const data = await api('GET', null, query);
        if (!active) return;
        pollCursorRef.current = new Date(Date.parse(data.serverTime) - 1500).toISOString();
        setParticipants(data.participants || []);
        const activePeers = new Set((data.participants || []).map(item => item.peerId));
        for (const participant of data.participants || []) {
          if (participant.peerId !== session.peerId && !peerConnectionsRef.current.has(participant.peerId)) {
            await createPeer(participant.peerId, session.peerId > participant.peerId);
          }
        }
        for (const [peerId, connection] of peerConnectionsRef.current.entries()) {
          if (!activePeers.has(peerId)) {
            connection.close();
            peerConnectionsRef.current.delete(peerId);
            dataChannelsRef.current.delete(peerId);
            setRemoteStreams(previous => { const next = { ...previous }; delete next[peerId]; return next; });
          }
        }
        for (const signal of data.signals || []) await processSignal(signal);
      } catch (error) {
        if (error.status === 410 || error.status === 401) {
          setLoadError(error.message);
          setSession(null);
        } else {
          setRoomError('Connection is unstable. Reconnecting...');
        }
      } finally {
        polling = false;
      }
    };
    poll();
    const timer = window.setInterval(poll, 1400);
    return () => { active = false; window.clearInterval(timer); };
  }, [api, createPeer, processSignal, session]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => setRecordingSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const closeConnections = useCallback(() => {
    for (const connection of peerConnectionsRef.current.values()) connection.close();
    peerConnectionsRef.current.clear();
    dataChannelsRef.current.clear();
    setRemoteStreams({});
  }, []);

  const leaveMeeting = useCallback(async (navigate = true) => {
    if (sessionRef.current) await api('DELETE').catch(() => null);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    closeConnections();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    sessionRef.current = null;
    setSession(null);
    if (navigate) router.replace('/ssr-app/home?section=meetings');
  }, [api, closeConnections, router]);

  useEffect(() => {
    const beforeUnload = () => {
      closeConnections();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      if (sessionRef.current) fetch('/api/ssr/meeting-room/signal', { method: 'DELETE', headers: { Authorization: `Bearer ${sessionRef.current.token}` }, keepalive: true }).catch(() => {});
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      closeConnections();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [closeConnections]);

  const joinMeeting = async () => {
    if (!currentUser) return setJoinError('Sign in to SJ INFO BUSINESS SOLUTIONS before joining.');
    if (!displayName.trim()) return setJoinError('Enter your display name.');
    setJoining(true);
    setJoinError('');
    try {
      const response = await fetch('/api/ssr/meeting-room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingCode, password, userId: currentUser.id, displayName, cameraOn, micOn }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not join the meeting.');
      localStreamRef.current = previewStreamRef.current || new MediaStream();
      sessionRef.current = data;
      try { sessionStorage.removeItem(`ssr_meeting_password_${meetingCode}`); } catch {}
      setMeeting(data.meeting);
      setParticipants(data.participants || []);
      setSession(data);
      setRoomError('');
    } catch (error) {
      setJoinError(error.message);
    } finally {
      setJoining(false);
    }
  };

  const updatePresence = values => api('PATCH', values).catch(() => null);
  const toggleMic = () => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
    setMicOn(next);
    if (session) updatePresence({ micOn: next });
  };
  const toggleCamera = () => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next; });
    setCameraOn(next);
    if (session) updatePresence({ cameraOn: next });
  };

  const stopScreenShare = useCallback(async () => {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    for (const connection of peerConnectionsRef.current.values()) {
      const sender = connection.getSenders().find(item => item.track?.kind === 'video');
      if (sender) await sender.replaceTrack(cameraTrack || null);
    }
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    updatePresence({ screenSharing: false });
  }, []);

  const toggleScreenShare = async () => {
    if (screenSharing) return stopScreenShare();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      screenStreamRef.current = stream;
      track.onended = stopScreenShare;
      for (const connection of peerConnectionsRef.current.values()) {
        const sender = connection.getSenders().find(item => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(track);
        else connection.addTrack(track, stream);
      }
      setScreenSharing(true);
      updatePresence({ screenSharing: true });
    } catch { /* The user cancelled the browser's sharing picker. */ }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try { recorder.requestData(); } catch {}
    recorder.stop();
  };

  const startRecording = async () => {
    if (recording) return stopRecording();
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return setRoomError('Local recording is not supported by this browser.');
    }

    const title = meeting.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'SJ-Meeting';
    const mimeType = recordingMimeType();
    const extension = mimeType.startsWith('video/mp4') ? '.mp4' : '.webm';
    const filename = `${title}-${new Date().toISOString().slice(0, 10)}${extension}`;
    let sink = { mode: 'memory', writable: null, filename };

    try {
      setRoomError('');
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'Meeting recording', accept: { [mimeType.split(';')[0] || 'video/webm']: [extension] } }],
          });
          sink = { mode: 'device', writable: await handle.createWritable(), filename };
        } catch (error) {
          if (error.name === 'AbortError') return;
          throw error;
        }
      } else if (navigator.storage?.getDirectory) {
        await navigator.storage.persist?.().catch(() => false);
        const root = await navigator.storage.getDirectory();
        const temporaryName = `.sj-${crypto.randomUUID()}${extension}`;
        const handle = await root.getFileHandle(temporaryName, { create: true });
        sink = { mode: 'opfs', writable: await handle.createWritable(), filename, root, handle, temporaryName };
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Meeting audio recording is not supported by this browser.');
      const audioContext = new AudioContextClass();
      await audioContext.resume();
      const destination = audioContext.createMediaStreamDestination();
      audioContextRef.current = audioContext;

      const canvas = document.createElement('canvas');
      canvas.width = RECORDING_WIDTH;
      canvas.height = RECORDING_HEIGHT;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not prepare the meeting video recorder.');
      recordingCanvasRef.current = canvas;

      const syncRecordingMedia = () => {
        const currentParticipants = participantsRef.current.length ? participantsRef.current : [{
          peerId: sessionRef.current?.peerId,
          name: displayName,
          role: sessionRef.current?.participant?.role,
          cameraOn,
          micOn,
          screenSharing,
        }];
        const activeVideoKeys = new Set();

        for (const participant of currentParticipants) {
          const isSelf = participant.peerId === sessionRef.current?.peerId;
          const stream = isSelf
            ? (participant.screenSharing ? screenStreamRef.current : localStreamRef.current)
            : remoteStreamsRef.current[participant.peerId];
          if (!stream) continue;
          activeVideoKeys.add(participant.peerId);
          const existing = recordingVideosRef.current.get(participant.peerId);
          if (existing?.stream === stream) continue;
          existing?.video.pause();
          if (existing?.video) existing.video.srcObject = null;
          const video = document.createElement('video');
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          video.play().catch(() => {});
          recordingVideosRef.current.set(participant.peerId, { stream, video });
        }

        for (const [peerId, entry] of recordingVideosRef.current.entries()) {
          if (activeVideoKeys.has(peerId)) continue;
          entry.video.pause();
          entry.video.srcObject = null;
          recordingVideosRef.current.delete(peerId);
        }

        const meetingAudioStreams = [localStreamRef.current, ...Object.values(remoteStreamsRef.current)]
          .filter(stream => stream?.getAudioTracks().some(track => track.readyState === 'live'));
        const activeAudioKeys = new Set(meetingAudioStreams.map(stream => stream.id));
        for (const stream of meetingAudioStreams) {
          if (recordingAudioSourcesRef.current.has(stream.id)) continue;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(destination);
          recordingAudioSourcesRef.current.set(stream.id, source);
        }
        for (const [streamId, source] of recordingAudioSourcesRef.current.entries()) {
          if (activeAudioKeys.has(streamId)) continue;
          source.disconnect();
          recordingAudioSourcesRef.current.delete(streamId);
        }
        return currentParticipants;
      };

      const drawFrame = () => {
        const currentParticipants = syncRecordingMedia();
        const presenter = currentParticipants.find(item => item.screenSharing);
        const remoteParticipant = currentParticipants.find(item => item.peerId !== sessionRef.current?.peerId);
        const featured = presenter || remoteParticipant || currentParticipants[0];
        const others = currentParticipants.filter(item => item.peerId !== featured?.peerId);
        const featuredVideo = recordingVideosRef.current.get(featured?.peerId)?.video;

        ctx.fillStyle = '#101214';
        ctx.fillRect(0, 0, RECORDING_WIDTH, RECORDING_HEIGHT);
        if (others.length) {
          const padding = 16;
          const gap = 12;
          const railWidth = 250;
          const mainWidth = RECORDING_WIDTH - railWidth - gap - (padding * 2);
          drawRecordingTile(ctx, featuredVideo, featured, {
            x: padding, y: padding, width: mainWidth, height: RECORDING_HEIGHT - (padding * 2),
          }, { featured: true, mirror: featured?.peerId === sessionRef.current?.peerId });
          const visibleOthers = others.slice(0, 4);
          const tileHeight = (RECORDING_HEIGHT - (padding * 2) - (gap * (visibleOthers.length - 1))) / visibleOthers.length;
          visibleOthers.forEach((participant, index) => {
            drawRecordingTile(ctx, recordingVideosRef.current.get(participant.peerId)?.video, participant, {
              x: padding + mainWidth + gap,
              y: padding + index * (tileHeight + gap),
              width: railWidth,
              height: tileHeight,
            }, { mirror: participant.peerId === sessionRef.current?.peerId });
          });
          if (others.length > visibleOthers.length) {
            ctx.fillStyle = 'rgba(0,0,0,.72)';
            ctx.fillRect(RECORDING_WIDTH - railWidth - padding, RECORDING_HEIGHT - 58, railWidth, 42);
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 15px Inter, Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`+${others.length - visibleOthers.length} more`, RECORDING_WIDTH - padding - railWidth / 2, RECORDING_HEIGHT - 31);
          }
        } else {
          drawRecordingTile(ctx, featuredVideo, featured, {
            x: 16, y: 16, width: RECORDING_WIDTH - 32, height: RECORDING_HEIGHT - 32,
          }, { featured: true, mirror: featured?.peerId === sessionRef.current?.peerId });
        }
        recordingAnimationRef.current = window.requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const canvasStream = canvas.captureStream(RECORDING_FPS);
      const outputStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
      recordingOutputStreamRef.current = outputStream;
      recordingSinkRef.current = sink;
      recordingChunksRef.current = [];
      recordingWriteChainRef.current = Promise.resolve();
      recordingWriteErrorRef.current = null;

      const recorderOptions = {
        videoBitsPerSecond: RECORDING_VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND,
        ...(mimeType ? { mimeType } : {}),
      };
      const recorder = new MediaRecorder(outputStream, recorderOptions);
      recorder.ondataavailable = event => {
        if (!event.data.size) return;
        if (!sink.writable) {
          recordingChunksRef.current.push(event.data);
          return;
        }
        recordingWriteChainRef.current = recordingWriteChainRef.current
          .then(() => sink.writable.write(event.data))
          .catch(error => {
            recordingWriteErrorRef.current = error;
            if (recorder.state !== 'inactive') recorder.stop();
          });
      };
      recorder.onerror = event => {
        recordingWriteErrorRef.current = event.error || new Error('The browser could not continue recording.');
      };
      recorder.onstop = async () => {
        window.cancelAnimationFrame(recordingAnimationRef.current);
        await recordingWriteChainRef.current.catch(() => {});
        if (sink.writable) await sink.writable.close().catch(error => { recordingWriteErrorRef.current ||= error; });

        const writeError = recordingWriteErrorRef.current;
        if (!writeError && sink.mode !== 'device') {
          const file = sink.mode === 'opfs'
            ? await sink.handle.getFile()
            : new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || 'video/webm' });
          const url = URL.createObjectURL(file);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = sink.filename;
          anchor.click();
          window.setTimeout(async () => {
            URL.revokeObjectURL(url);
            if (sink.mode === 'opfs') await sink.root.removeEntry(sink.temporaryName).catch(() => {});
          }, 60_000);
        } else if (writeError && sink.mode === 'opfs') {
          await sink.root.removeEntry(sink.temporaryName).catch(() => {});
        }

        for (const { video } of recordingVideosRef.current.values()) {
          video.pause();
          video.srcObject = null;
        }
        recordingVideosRef.current.clear();
        for (const source of recordingAudioSourcesRef.current.values()) source.disconnect();
        recordingAudioSourcesRef.current.clear();
        recordingOutputStreamRef.current?.getTracks().forEach(track => track.stop());
        recordingOutputStreamRef.current = null;
        recordingCanvasRef.current = null;
        recordingSinkRef.current = null;
        recordingChunksRef.current = [];
        await audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        await recordingWakeLockRef.current?.release().catch(() => {});
        recordingWakeLockRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        setRecordingSeconds(0);
        if (writeError) setRoomError('Recording stopped because this device could not save more data. Check its available storage.');
      };

      recorderRef.current = recorder;
      recorder.start(5000);
      if (navigator.wakeLock?.request) recordingWakeLockRef.current = await navigator.wakeLock.request('screen').catch(() => null);
      setRecording(true);
      setRecordingSeconds(0);
    } catch (error) {
      window.cancelAnimationFrame(recordingAnimationRef.current);
      if (sink.writable) await sink.writable.abort?.().catch(() => {});
      if (sink.mode === 'opfs') await sink.root.removeEntry(sink.temporaryName).catch(() => {});
      for (const { video } of recordingVideosRef.current.values()) {
        video.pause();
        video.srcObject = null;
      }
      recordingVideosRef.current.clear();
      for (const source of recordingAudioSourcesRef.current.values()) source.disconnect();
      recordingAudioSourcesRef.current.clear();
      recordingOutputStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingOutputStreamRef.current = null;
      await audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      setRoomError(error.message || 'Could not start local recording.');
    }
  };

  const broadcast = payload => {
    for (const channel of dataChannelsRef.current.values()) {
      if (channel.readyState === 'open') channel.send(JSON.stringify(payload));
    }
  };
  const sendChat = event => {
    event.preventDefault();
    if (!chatText.trim()) return;
    const message = { id: `${session.peerId}-${Date.now()}`, peerId: session.peerId, name: displayName, text: chatText.trim(), sentAt: new Date().toISOString() };
    setMessages(previous => [...previous, message]);
    broadcast({ type: 'chat', message });
    setChatText('');
  };
  const toggleHand = () => {
    const raised = !raisedHands[session.peerId];
    setRaisedHands(previous => ({ ...previous, [session.peerId]: raised }));
    broadcast({ type: 'hand', peerId: session.peerId, raised });
  };
  const endMeeting = async () => {
    if (!window.confirm('End this meeting for everyone? The link will stop working immediately.')) return;
    const response = await fetch('/api/ssr/meetings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meeting.id, userId: currentUser.id, action: 'end' }) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setRoomError(data.error || 'Could not end the meeting.');
    }
    await leaveMeeting();
  };

  const selfParticipant = useMemo(() => participants.find(item => item.peerId === session?.peerId) || {
    peerId: session?.peerId, name: displayName, role: meeting?.hostId === currentUser?.id ? 'host' : 'participant', cameraOn, micOn, screenSharing,
  }, [cameraOn, currentUser?.id, displayName, meeting?.hostId, micOn, participants, screenSharing, session?.peerId]);
  const remoteParticipants = participants.filter(item => item.peerId !== session?.peerId);
  const presenter = participants.find(item => item.screenSharing);
  const featuredParticipant = presenter || (remoteParticipants.length ? remoteParticipants[0] : selfParticipant);
  const featuredStream = featuredParticipant.peerId === session?.peerId ? (screenStreamRef.current || localStreamRef.current) : remoteStreams[featuredParticipant.peerId];

  if (loading) return <div className={styles.statePage}><div className={styles.spinner} /><span>Loading meeting...</span></div>;
  if (loadError || !meeting) return <div className={styles.statePage}><h1>Meeting unavailable</h1><p>{loadError || 'This meeting could not be found.'}</p><button onClick={() => router.replace('/ssr-app/home?section=meetings')}>Back to meetings</button></div>;
  if (!currentUser) return <div className={styles.statePage}><h1>Sign in required</h1><p>Open this meeting after signing in to your SJ INFO BUSINESS SOLUTIONS account.</p><button onClick={() => router.replace('/ssr-app')}>Sign in</button></div>;

  if (!session) {
    return (
      <div className={styles.prejoinPage}>
        <header><img src="/ssrlogo.jpeg" alt="Company logo"/><strong>SJ Meet</strong><button onClick={() => router.replace('/ssr-app/home?section=meetings')}>{Icons.close}</button></header>
        <main className={styles.prejoin}>
          <div className={styles.previewPane}>
            <div className={styles.prejoinVideo}>
              <video ref={localVideoRef} autoPlay playsInline muted className={cameraOn ? '' : styles.hiddenMedia} />
              {!cameraOn && <div className={styles.avatarFallback}><span>{initials(displayName)}</span></div>}
              <div className={styles.previewButtons}>
                <button onClick={toggleCamera} className={!cameraOn ? styles.off : ''} title={cameraOn ? 'Turn camera off' : 'Turn camera on'}>{cameraOn ? Icons.video : Icons.videoOff}</button>
                <button onClick={toggleMic} className={!micOn ? styles.off : ''} title={micOn ? 'Mute microphone' : 'Unmute microphone'}>{micOn ? Icons.mic : Icons.micOff}</button>
              </div>
            </div>
            <strong>Check your audio and video</strong>
            {deviceError && <p>{deviceError}</p>}
          </div>
          <div className={styles.joinPane}>
            <span>SJ MEETING</span>
            <h1>{meeting.title}</h1>
            <div className={styles.meetingFacts}><span>{meeting.date}</span><span>{meeting.time} - {meeting.endTime}</span><span>ID {formatCode(meeting.meetingCode)}</span></div>
            {meeting.hostId !== currentUser.id && <><label htmlFor="room-password">Meeting password</label><input id="room-password" type="password" value={password} onChange={event => setPassword(event.target.value.toUpperCase())} placeholder="Enter password" autoComplete="off" /></>}
            <label htmlFor="room-name">Your name</label>
            <input id="room-name" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={100} />
            {joinError && <p className={styles.error}>{joinError}</p>}
            <button className={styles.enterButton} onClick={joinMeeting} disabled={joining}>{joining ? 'Joining...' : meeting.hostId === currentUser.id ? 'Start meeting' : 'Join meeting'}</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.roomPage}>
      <header className={styles.roomHeader}>
        <div><img src="/ssrlogo.jpeg" alt="Company logo"/><strong>{meeting.title}</strong></div>
        <div className={styles.roomHeaderMeta}><span>ID {formatCode(meeting.meetingCode)}{hostPassword ? ` | Password ${hostPassword}` : ''}</span><button onClick={async () => { await navigator.clipboard.writeText([meeting.title, `Join: ${meeting.link}`, `Meeting ID: ${meeting.meetingCode}`, hostPassword ? `Password: ${hostPassword}` : ''].filter(Boolean).join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title="Copy meeting invitation">{Icons.copy}{copied ? 'Copied' : 'Copy invitation'}</button></div>
      </header>
      {roomError && <div className={styles.roomNotice}>{roomError}</div>}
      {recording && <div className={styles.recordingPill}><span />REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</div>}

      <div className={`${styles.roomBody} ${sidePanel ? styles.withPanel : ''}`}>
        <main className={styles.stage}>
          <ParticipantTile participant={featuredParticipant} stream={featuredStream} muted={featuredParticipant.peerId === session.peerId} featured />
          {participants.length === 1 && <div className={styles.aloneMessage}><strong>It is just you here.</strong><span>Share the meeting link and password to invite people.</span></div>}
          {participants.length > 1 && (
            <div className={styles.participantRail}>
              {participants.filter(item => item.peerId !== featuredParticipant.peerId).map(item => <ParticipantTile key={item.peerId} participant={item} stream={item.peerId === session.peerId ? localStreamRef.current : remoteStreams[item.peerId]} muted={item.peerId === session.peerId} />)}
            </div>
          )}
        </main>

        {sidePanel && <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}><strong>{sidePanel === 'people' ? `People (${participants.length})` : 'Meeting chat'}</strong><button onClick={() => setSidePanel(null)}>{Icons.close}</button></div>
          {sidePanel === 'people' ? <div className={styles.peopleList}>{participants.map(item => <div key={item.peerId}><span className={styles.smallAvatar}>{item.avatar ? <img src={item.avatar} alt=""/> : initials(item.name)}</span><div><strong>{item.name}</strong><span>{item.role === 'host' ? 'Host' : 'Participant'}{raisedHands[item.peerId] ? ' | Hand raised' : ''}</span></div><span className={styles.personMedia}>{!item.micOn && Icons.micOff}{!item.cameraOn && Icons.videoOff}</span></div>)}</div> : <><div className={styles.chatMessages}>{messages.length === 0 ? <span className={styles.emptyChat}>Messages are visible only during this meeting.</span> : messages.map(message => <div key={message.id} className={message.peerId === session.peerId ? styles.myMessage : ''}><strong>{message.name}</strong><p>{message.text}</p><span>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>)}</div><form className={styles.chatComposer} onSubmit={sendChat}><input value={chatText} onChange={event => setChatText(event.target.value)} placeholder="Message everyone" maxLength={1000}/><button title="Send message">{Icons.send}</button></form></>}
        </aside>}
      </div>

      <footer className={styles.toolbar}>
        <div className={styles.elapsed}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className={styles.mainTools}>
          <button onClick={toggleMic} className={!micOn ? styles.dangerTool : ''} title={micOn ? 'Mute' : 'Unmute'}>{micOn ? Icons.mic : Icons.micOff}<span>Mic</span></button>
          <button onClick={toggleCamera} className={!cameraOn ? styles.dangerTool : ''} title={cameraOn ? 'Stop video' : 'Start video'}>{cameraOn ? Icons.video : Icons.videoOff}<span>Video</span></button>
          <button onClick={toggleScreenShare} className={screenSharing ? styles.activeTool : ''} title="Share screen">{Icons.screen}<span>{screenSharing ? 'Stop share' : 'Share'}</span></button>
          <button onClick={startRecording} className={recording ? styles.recordingTool : ''} title="Record to this device">{Icons.record}<span>{recording ? 'Stop' : 'Record'}</span></button>
          <button onClick={toggleHand} className={raisedHands[session.peerId] ? styles.activeTool : ''} title="Raise hand">{Icons.hand}<span>Raise</span></button>
          <button onClick={() => leaveMeeting()} className={styles.hangup} title="Leave meeting">{Icons.leave}<span>Leave</span></button>
        </div>
        <div className={styles.sideTools}>
          <button onClick={() => setSidePanel(sidePanel === 'people' ? null : 'people')} className={sidePanel === 'people' ? styles.activeTool : ''}>{Icons.people}<span>People</span></button>
          <button onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')} className={sidePanel === 'chat' ? styles.activeTool : ''}>{Icons.chat}<span>Chat</span></button>
          {session.participant?.role === 'host' && <button onClick={endMeeting} className={styles.endForAll}>End for all</button>}
        </div>
      </footer>
    </div>
  );
}
