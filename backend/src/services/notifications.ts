// backend/src/services/notifications.ts
import { config } from '../config/env';
import { logger } from '../utils/logger';

interface NotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

let firebaseApp: any = null;

async function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase not configured — push notifications disabled');
    return null;
  }

  const admin = await import('firebase-admin');
  firebaseApp = admin.default.initializeApp({
    credential: admin.default.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  return firebaseApp;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const app = await getFirebaseApp();
    if (!app) return;

    const admin = await import('firebase-admin');
    const messaging = admin.default.messaging(app);

    await messaging.send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
  } catch (err: any) {
    // Don't throw — notifications are non-critical
    logger.error(`Push notification failed: ${err.message}`, {
      token: payload.token.slice(0, 20) + '...',
    });
  }
}

export async function sendMulticastNotification(
  tokens: string[],
  payload: Omit<NotificationPayload, 'token'>
): Promise<void> {
  if (!tokens.length) return;

  try {
    const app = await getFirebaseApp();
    if (!app) return;

    const admin = await import('firebase-admin');
    const messaging = admin.default.messaging(app);

    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
    }
  } catch (err: any) {
    logger.error(`Multicast notification failed: ${err.message}`);
  }
}
