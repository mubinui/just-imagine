import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'Operator console · Just Imagine',
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
