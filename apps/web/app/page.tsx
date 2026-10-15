import Link from 'next/link';
import { Header, Footer, Preview } from '../components/Shell';
import { s } from '../lib/strings/en';
import { env } from '../lib/env';
export default function Home() {
  return (
    <>
      <Header />
      <Preview />
      <main>
        <section className="hero">
          <div>
            <h1>{s.hero}</h1>
            <p className="lead">{s.intro}</p>
            <div className="actions">
              <Link className="button primary" href="/sign-up">
                {s.cta}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href={env.fake ? '/play' : '/sign-in'}>
                {env.fake ? s.demo : s.signIn}
              </Link>
            </div>
          </div>
          <div className="wonder-window">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="toy toy-a" />
            <div className="toy toy-b" />
            <div className="toy toy-c" />
            <div className="window-ground" />
            <p>{s.tagline}</p>
          </div>
        </section>
        <section className="story-strip">
          {[
            [s.feature1, s.feature1Body],
            [s.feature2, s.feature2Body],
            [s.feature3, s.feature3Body],
          ].map(([title, text], i) => (
            <article key={title}>
              <span className="small-orbit" aria-hidden="true">
                {['↗', '↔', '✦'][i]}
              </span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
