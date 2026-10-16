import { CompanionProvider } from '../../components/companion/Companion';
import { ChildGuard } from '../../components/ChildGuard';
import { Header, Preview } from '../../components/Shell';
import { LanguageRoot } from '../../components/LanguageRoot';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ChildGuard>
      <CompanionProvider>
        <div data-world="child">
          <Header />
          <Preview />
          <LanguageRoot>{children}</LanguageRoot>
        </div>
      </CompanionProvider>
    </ChildGuard>
  );
}
