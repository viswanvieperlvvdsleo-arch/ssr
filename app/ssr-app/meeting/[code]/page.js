'use client';

import { useParams } from 'next/navigation';
import MeetingRoom from '../../MeetingRoom';

export default function MeetingRoomPage() {
  const { code } = useParams();
  return <MeetingRoom meetingCode={Array.isArray(code) ? code[0] : code} />;
}
