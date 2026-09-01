import { NextResponse } from 'next/server';

export async function GET() {
  // Safe diagnostics — no secrets are returned
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  
  let diagnosis = {
    hasServiceAccountVar: !!raw,
    hasVapidKey: !!vapidKey,
    serviceAccountLength: raw?.length,
    startsWithBrace: raw?.trimStart().startsWith('{'),
    startsWithEyJ: raw?.startsWith('eyJ'), // base64 encoded
  };

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      diagnosis.parseMethod = 'direct-json';
      diagnosis.hasClientEmail = !!parsed.client_email;
      diagnosis.hasPrivateKey = !!parsed.private_key;
      diagnosis.hasProjectId = !!parsed.project_id;
      diagnosis.projectId = parsed.project_id;
    } catch {
      try {
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        diagnosis.parseMethod = 'base64-json';
        diagnosis.hasClientEmail = !!parsed.client_email;
        diagnosis.hasPrivateKey = !!parsed.private_key;
        diagnosis.hasProjectId = !!parsed.project_id;
        diagnosis.projectId = parsed.project_id;
      } catch (e2) {
        diagnosis.parseMethod = 'FAILED';
        diagnosis.parseError = e2.message;
      }
    }
  }
  
  return NextResponse.json(diagnosis);
}
