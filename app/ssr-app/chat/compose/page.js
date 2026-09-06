'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../AppContext';
import { MediaPreviewModal } from '../../home/page';

export default function ChatComposePage() {
  const router = useRouter();
  const {
    currentUser,
    mediaComposer,
    closeMediaComposer,
    sendChatMediaInBackground,
  } = useApp();

  useEffect(() => {
    if (!mediaComposer && currentUser) router.replace('/ssr-app/home');
  }, [currentUser, mediaComposer, router]);

  if (!mediaComposer) return null;

  const close = () => {
    closeMediaComposer();
    router.back();
  };

  return (
    <main style={{ minHeight: '100dvh', background: '#020617' }}>
      <MediaPreviewModal
        file={mediaComposer.file}
        onClose={close}
        onSend={({ file, caption }) => {
          sendChatMediaInBackground({ chatId: mediaComposer.chatId, file, caption: caption || '', replyTo: mediaComposer.replyTo });
          closeMediaComposer();
          router.back();
        }}
      />
    </main>
  );
}
