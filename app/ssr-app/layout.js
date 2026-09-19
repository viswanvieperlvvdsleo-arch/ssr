'use client';

import { AppProvider, useApp } from './AppContext';
import BackNavigationGuard from './BackNavigationGuard';
import NotificationTrigger from './NotificationTrigger';
import { IncomingCallWatcher, CallProvider, OngoingCallPill } from './DirectCall';

function InnerLayout({ children }) {
  const { currentUser } = useApp();
  return (
    <>
      <NotificationTrigger />
      {/* Floating green bar visible on every page when a call is minimized */}
      <OngoingCallPill />
      <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#F9FAFB', minHeight: '100vh' }}>
        {children}
      </div>
      <BackNavigationGuard />
      <IncomingCallWatcher currentUser={currentUser} />
    </>
  );
}

export default function SsrAppLayout({ children }) {
  return (
    <AppProvider>
      <CallProvider>
        <InnerLayout>{children}</InnerLayout>
      </CallProvider>
    </AppProvider>
  );
}
