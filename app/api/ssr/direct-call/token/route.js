import { NextResponse } from 'next/server';
import { getSessionActor } from '../../session';
import { generateAgoraRtcToken } from '../agoraToken';

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || 'bf0878574a024609ba7d798f24065d6e';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '96d457f787064af18dc5b37e29f3c1ed';

async function handleTokenRequest(channelNameParam, uidParam) {
  if (!channelNameParam) {
    return NextResponse.json({ error: 'channelName or callId is required' }, { status: 400 });
  }

  const channelName = channelNameParam.startsWith('call_')
    ? channelNameParam
    : `call_${String(channelNameParam).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const uid = uidParam ? (Number.isNaN(Number(uidParam)) ? uidParam : Number(uidParam)) : 0;

  try {
    const token = generateAgoraRtcToken({
      appId: AGORA_APP_ID,
      appCertificate: AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      expireSeconds: 3600, // 1 hour validity
    });

    return NextResponse.json({
      success: true,
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid,
    });
  } catch (err) {
    console.error('Failed to generate Agora RTC token:', err);
    return NextResponse.json(
      { error: 'Failed to generate RTC token', details: err?.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const actor = await getSessionActor(req).catch(() => null);
    if (!actor && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const channelName = searchParams.get('channelName') || searchParams.get('callId');
    const uid = searchParams.get('uid') || 0;

    return await handleTokenRequest(channelName, uid);
  } catch (err) {
    console.error('Token GET route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const actor = await getSessionActor(req).catch(() => null);
    if (!actor && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const channelName = body.channelName || body.callId;
    const uid = body.uid || 0;

    return await handleTokenRequest(channelName, uid);
  } catch (err) {
    console.error('Token POST route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
