'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../AppShell';
import { useApp } from '../../AppContext';
import { ChatPanel } from '../../home/page';

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, chats, setTargetChat, runBackHandler } = useApp();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 900);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (params?.id && chats.some(chat => chat.id === params.id)) {
      setTargetChat({ chatId: params.id });
    }
  }, [params?.id, chats, setTargetChat]);

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return undefined;

    // Keep the app-level exit guard out of chat detail history.
    window.history.pushState({ ...(window.history.state || {}), ssrChatEntry: true }, '', window.location.href);
    const handlePopState = () => {
      if (runBackHandler()) {
        window.history.pushState({ ...(window.history.state || {}), ssrChatLayerRestored: true }, '', window.location.href);
        return;
      }
      window.history.replaceState({ ...(window.history.state || {}), ssrChatReturn: true }, '', window.location.href);
      router.replace('/ssr-app/chat');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser?.id, router, runBackHandler]);

  return (
    <AppShell>
      <div style={{ height: '100dvh', minHeight: 560, overflow: 'hidden', background: '#FAFBFC' }}>
        <ChatPanel
          key={isMobile ? 'mobile' : 'desktop'}
          currentUser={currentUser}
          isMobile={isMobile}
          isExpanded={!isMobile}
          onExpandToggle={() => {}}
          conversationOnly={isMobile}
        />
      </div>
    </AppShell>
  );
}
