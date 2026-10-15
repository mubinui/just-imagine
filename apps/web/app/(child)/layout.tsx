import { CompanionProvider } from '../../components/companion/Companion';
import { ChildGuard } from '../../components/ChildGuard';
import { Header, Preview } from '../../components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ChildGuard>
      <CompanionProvider>
        <div data-world="child">
          <Header />
          <Preview />
          {children}
        </div>
      </CompanionProvider>
    </ChildGuard>
  );
}
