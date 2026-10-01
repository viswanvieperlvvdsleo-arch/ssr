'use client';

import { useParams } from 'next/navigation';
import AppShell from '../../AppShell';
import { useApp } from '../../AppContext';
import RequirementsProjectList from '../../../RequirementsProjectList';

export default function RequirementsProjectDetailPage() {
  const params = useParams();
  const { currentUser } = useApp();
  return <AppShell><RequirementsProjectList currentUser={currentUser} clientKey={String(params?.clientKey || '')} /></AppShell>;
}
