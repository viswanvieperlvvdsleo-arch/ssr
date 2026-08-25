'use client';

import { AppProvider } from './AppContext';

export default function SsrAppLayout({ children }) {
  return (
    <AppProvider>
      <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#F9FAFB', minHeight: '100vh' }}>
        {children}
      </div>
    </AppProvider>
  );
}
