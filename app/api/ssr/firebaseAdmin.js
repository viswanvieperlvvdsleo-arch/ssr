import admin from 'firebase-admin';
import { prisma } from './prisma.js';

let initialized = false;

function initAdmin() {
  if (initialized || admin.apps.length > 0) { initialized = true; return; }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  initialized = true;
}

/**
 * Send a push to one or more FCM tokens.
 * Returns { successCount, failedTokens }
 */
export async function sendPushToTokens(tokens, { title, body }, data = {}) {
  if (!tokens?.length) return { successCount: 0, failedTokens: [] };
  initAdmin();

  const stringData = {};
  for (const [k, v] of Object.entries(data)) stringData[k] = String(v);

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: title || 'SSR Learning Platform', body: body || '' },
    webpush: {
      notification: {
        title: title || 'SSR Learning Platform',
        body: body || '',
        icon: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
        badge: '/logo/SSR_Business_Solutions_192x192_uncropped.png',
        requireInteraction: true,
      },
      fcmOptions: { link: data.url || '/ssr-app/home' },
    },
    android: {
      priority: 'high',
      notification: { icon: 'notification_icon', color: '#0A6ED1', clickAction: data.url || '/ssr-app/home' },
    },
    data: stringData,
  });

  const failedTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('invalid-registration-token') || code.includes('not-registered')) {
        failedTokens.push(tokens[i]);
      }
    }
  });

  // Automatically clean up dead tokens
  if (failedTokens.length) {
    await prisma.appPushToken.deleteMany({ where: { token: { in: failedTokens } } }).catch(() => {});
  }

  return { successCount: response.successCount, failedTokens };
}

/**
 * Send push to all devices of a specific userId
 */
export async function sendPushToUser(userId, notification, data = {}) {
  const rows = await prisma.appPushToken.findMany({ where: { userId } });
  return sendPushToTokens(rows.map(r => r.token), notification, data);
}

/**
 * Broadcast push to all users (or a filtered list of userIds)
 */
export async function broadcastPush(notification, data = {}, userIds = null) {
  const where = userIds ? { userId: { in: userIds } } : {};
  const rows = await prisma.appPushToken.findMany({ where });
  return sendPushToTokens(rows.map(r => r.token), notification, data);
}
