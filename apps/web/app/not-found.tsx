import Link from 'next/link';
import { s } from '../lib/strings/en';
export default function NotFound() {
  return (
    <main className="prose">
      <h1>{s.errorTitle}</h1>
      <Link href="/">{s.home}</Link>
    </main>
  );
}
