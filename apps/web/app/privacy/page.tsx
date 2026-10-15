import { Header, Footer } from '../../components/Shell';
import { s } from '../../lib/strings/en';
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="prose">
        <h1>{s.privacy}</h1>
        <p>{s.privacyBody}</p>
      </main>
      <Footer />
    </>
  );
}
