import { redirect } from 'next/navigation';
import { adminGate } from '../_lib/session';
import { AdminSignIn } from '../../../components/admin/AdminSignIn';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NEXT_PUBLIC_FAKE === '1') redirect('/');
  const gate = await adminGate();
  if (gate.kind === 'admin') redirect('/admin');
  // A signed-in account without the operator claim is told why, not bounced away silently.
  const notOperator = gate.kind === 'not-admin' || (await searchParams).reason === 'not-operator';
  return <AdminSignIn notOperator={notOperator} />;
}
