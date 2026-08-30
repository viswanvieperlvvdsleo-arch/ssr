'use client';

import { AppProvider } from './AppContext';
import BackNavigationGuard from './BackNavigationGuard';
import NotificationTrigger from './NotificationTrigger';

export default function SsrAppLayout({ children }) {
  return (
    <AppProvider>
      <NotificationTrigger />
      <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#F9FAFB', minHeight: '100vh' }}>
        {children}
      </div>
      <BackNavigationGuard />
    </AppProvider>
  );
}
