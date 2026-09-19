import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionActor } from '../../api/ssr/session';
import { usesAdminPortal } from '../portal.mjs';

// Server-side role guard: only Admin and Employee users can access /ssr-app/admin/*
// The parent ssr-app/layout.js already provides AppProvider, NotificationTrigger, and IncomingCallWatcher.
export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const actor = await getSessionActor({ cookies: cookieStore });
  if (!actor) redirect('/ssr-app');
  if (!usesAdminPortal(actor)) redirect('/ssr-app/home');
  return children;
}
