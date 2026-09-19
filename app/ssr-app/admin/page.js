import { redirect } from 'next/navigation';

export default function AdminEntry() {
  redirect('/ssr-app/admin/home');
}
