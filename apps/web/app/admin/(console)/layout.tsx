import { redirect } from 'next/navigation';
import { adminGate } from '../_lib/session';
import { AdminShell } from '../../../components/admin/AdminShell';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_FAKE === '1') redirect('/');
  const gate = await adminGate();
  if (gate.kind === 'signed-out') redirect('/admin/sign-in');
  if (gate.kind === 'not-admin') redirect('/');
  return <AdminShell email={gate.email}>{children}</AdminShell>;
}
