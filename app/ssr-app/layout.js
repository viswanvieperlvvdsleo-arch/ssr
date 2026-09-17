'use client';

import { AppProvider, useApp } from './AppContext';
import BackNavigationGuard from './BackNavigationGuard';
import NotificationTrigger from './NotificationTrigger';
import { IncomingCallWatcher } from './DirectCall';

function InnerLayout({ children }) {
  const { currentUser } = useApp();
  return (
    <>
      <NotificationTrigger />
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
      <InnerLayout>{children}</InnerLayout>
    </AppProvider>
  );
}
