import { redirect } from 'next/navigation';
import { getParentSession } from '../../lib/session';
import { ParentShell } from '../../components/ParentShell';
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_FAKE !== '1' && !(await getParentSession())) redirect('/sign-in');
  return <ParentShell>{children}</ParentShell>;
}
