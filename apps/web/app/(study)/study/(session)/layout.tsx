import { SchoolShell } from '../../../../components/school/SchoolShell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SchoolShell student>{children}</SchoolShell>;
}
