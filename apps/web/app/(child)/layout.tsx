import { ChildGuard } from '../../components/ChildGuard';
import { Header, Preview } from '../../components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ChildGuard>
      <div data-world="child">
        <Header />
        <Preview />
        {children}
      </div>
    </ChildGuard>
  );
}
