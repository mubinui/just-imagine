import { redirect } from 'next/navigation';
import { getParentArea } from '../../lib/session';
import { ParentShell } from '../../components/ParentShell';
import { ParentGate } from '../../components/ParentGate';
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_FAKE !== '1') {
    const { session, open } = await getParentArea();
    if (!session) redirect('/sign-in');
    // A child screen has been open since the grown-up last signed in: ask them to sign in again.
    if (!open) return <ParentGate />;
  }
  return <ParentShell>{children}</ParentShell>;
}
