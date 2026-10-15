import Link from 'next/link';
import { Header, Footer, Preview } from '../components/Shell';
import { s } from '../lib/strings/en';
import { env } from '../lib/env';
import { GravityPlayground } from '../components/GravityPlayground';
import './welcome.css';
export default function Home() {
  return (
    <>
      <Header />
      <Preview />
      <main className="welcome">
        <section className="hero home-hero">
          <div>
            <h1>{s.hero}</h1>
            <p className="lead">{s.intro}</p>
            <div className="actions">
              <Link className="button primary" href={env.fake ? '/play' : '/sign-up'}>
                {s.cta}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </Link>
              {!env.fake && (
                <Link className="text-link" href="/sign-in">
                  {s.signIn}
                </Link>
              )}
            </div>
            <p className="hero-invitation">
              For curious minds, ages 6–13.
              <br />
              And the grown-ups who cheer them on.
            </p>
          </div>
          <GravityPlayground />
        </section>
        <section className="discovery-story">
          <h2>
            Little wonders.
            <br />
            <span>Big discoveries.</span>
          </h2>
          <ol>
            {[
              [s.feature1, s.feature1Body],
              [s.feature2, s.feature2Body],
              [s.feature3, s.feature3Body],
            ].map(([title, text], i) => (
              <li key={title}>
                <span className="story-step" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
