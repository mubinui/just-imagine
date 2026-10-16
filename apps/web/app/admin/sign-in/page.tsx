import { redirect } from 'next/navigation';
import { adminGate } from '../_lib/session';
import { AdminSignIn } from '../../../components/admin/AdminSignIn';

export default async function Page() {
  if (process.env.NEXT_PUBLIC_FAKE === '1') redirect('/');
  if ((await adminGate()).kind === 'admin') redirect('/admin');
  return <AdminSignIn />;
}
