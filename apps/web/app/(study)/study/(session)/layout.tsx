import { SchoolShell } from '../../../../components/school/SchoolShell';
import './study.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SchoolShell student>{children}</SchoolShell>;
}
