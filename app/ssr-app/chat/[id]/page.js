'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '../../AppShell';
import { useApp } from '../../AppContext';
import { ChatPanel } from '../../home/page';

export default function ChatDetailPage() {
  const params = useParams();
  const { currentUser, chats, setTargetChat } = useApp();
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
