import { createSign } from 'node:crypto';
import { prisma } from './prisma';

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const account = JSON.parse(raw);
    return account?.private_key ? { ...account, private_key: account.private_key.replace(/\\n/g, '\n') } : account;
  } catch {
    try {
      const account = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      return account?.private_key ? { ...account, private_key: account.private_key.replace(/\\n/g, '\n') } : account;
    } catch (error) {
      console.error('Firebase service account secret is not valid JSON:', error);
      return null;
    }
  }
}

async function getAccessToken(account) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) return cachedAccessToken;

  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = encodeBase64Url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${encodeBase64Url(signer.sign(account.private_key))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || 'Could not get Firebase access token');
  }

  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(60, Number(result.expires_in || 3600) - 120) * 1000;
  return cachedAccessToken;
}

function makeAbsoluteUrl(url) {
  if (!url) return null;
  if (/^https:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  return base ? new URL(url, base).toString() : null;
}

function isInvalidToken(response, result) {
  const details = result?.error?.details || [];
  const code = details.find(detail => detail?.errorCode)?.errorCode;
  return response.status === 404 || code === 'UNREGISTERED' || (
    code === 'INVALID_ARGUMENT' && /token|registration/i.test(result?.error?.message || '')
  );
}

async function sendToToken(accessToken, projectId, token, notification, data, url) {
  const message = {
    token,
    notification,
    data,
    webpush: url ? { fcm_options: { link: url } } : undefined,
  };
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ message }),
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

export async function notifyUsers(userIds, { title, body, url, data = {} }) {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!uniqueUserIds.length) return { sent: 0, skipped: 'no-recipients' };

  const notificationData = Object.fromEntries(
    Object.entries({ ...data, url: url || '' }).map(([key, value]) => [key, String(value ?? '')])
  );
  // Chat messages use hardware push only; the in-app bell is reserved for
  // feed, service, meeting, like, and comment activity.
  if (!['chat', 'chat-reaction'].includes(notificationData.type)) {
    try {
      await Promise.all(uniqueUserIds.map(userId => prisma.appNotification.create({
        data: {
          userId,
          type: notificationData.type || 'general',
          title: title || 'SSR Learning Platform',
          body: body || 'You have a new notification.',
          url: url || null,
          data: notificationData,
        },
      })));
    } catch (error) {
      console.error('Mongo notification record failed:', error);
    }
  }

  const account = readServiceAccount();
  if (!account?.project_id || !account?.client_email || !account?.private_key) {
    console.warn('Push notification skipped: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    return { sent: 0, skipped: 'missing-credentials' };
  }

  try {
    const pushTokens = await prisma.appPushToken.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: { token: true },
    });
    if (!pushTokens.length) return { sent: 0, skipped: 'no-device-tokens' };

    const accessToken = await getAccessToken(account);
    const notification = { title, body };
    const absoluteUrl = makeAbsoluteUrl(url);
    const results = await Promise.all(pushTokens.map(async ({ token }) => {
      const result = await sendToToken(accessToken, account.project_id, token, notification, notificationData, absoluteUrl);
      if (!result.response.ok && isInvalidToken(result.response, result.result)) {
        await prisma.appPushToken.deleteMany({ where: { token } });
      }
      return { ok: result.response.ok, status: result.response.status, tokenSuffix: token.slice(-8), error: result.result?.error?.message || null };
    }));

    const sent = results.filter(result => result.ok).length;
    const failed = results.length - sent;
    if (failed) {
      console.error('Firebase rejected push notification:', results.filter(result => !result.ok));
    } else {
      console.info(`Firebase accepted ${sent} push notification${sent === 1 ? '' : 's'}.`);
    }
    return { sent, failed };
  } catch (error) {
    console.error('Firebase push notification failed:', error);
    return { sent: 0, error: error.message };
  }
}

export async function getSupportRecipientIds(senderId) {
  const [supportUsers, sender] = await Promise.all([
    prisma.appUser.findMany({
      where: {
        OR: [
          { role: { in: ['Admin', 'Super Admin'] } },
          { role: 'Employee', permissions: { has: 'all_access' } },
          { role: 'Employee', permissions: { has: 'view_chats' } },
        ],
      },
      select: { id: true },
    }),
    senderId ? prisma.appUser.findUnique({ where: { id: senderId }, select: { id: true } }) : null,
  ]);
  return supportUsers.map(user => user.id).filter(id => id !== sender?.id);
}
