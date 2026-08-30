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
    uploadChatMedia,
    sendChatMessage,
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
        onSend={async ({ file, caption, onProgress }) => {
          const attachment = await uploadChatMedia(file, onProgress);
          await sendChatMessage(mediaComposer.chatId, caption || '', mediaComposer.replyTo, attachment);
          closeMediaComposer();
          router.back();
        }}
      />
    </main>
  );
}
