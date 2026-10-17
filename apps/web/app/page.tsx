'use client';
import { langAttr, useLanguage } from '../lib/i18n';
import Link from 'next/link';
import { Header, Footer, Preview } from '../components/Shell';
import { s } from '../lib/strings/en';
import { env } from '../lib/env';
import { GravityPlayground } from '../components/GravityPlayground';
import { Actor } from '../components/acting/Actor';
import { UiIcon } from '../components/UiIcon';
import './welcome.css';
export default function Home() {
  const { language } = useLanguage();
  const copy = s.landing;
  const entrances = [
    {
      role: 'parents',
      actor: 'katha',
      title: copy.parents,
      body: copy.parentBody,
      action: env.fake ? s.previewSignIn : copy.parentAction,
      href: env.fake ? '/play' : '/sign-in',
    },
    {
      role: 'students',
      actor: 'pori',
      title: copy.students,
      body: copy.studentBody,
      action: copy.studentAction,
      href: '/study/sign-in',
    },
    {
      role: 'teachers',
      actor: 'onkomama',
      title: copy.teachers,
      body: copy.teacherBody,
      action: copy.teacherAction,
      href: '/school/sign-in',
    },
  ];
  return (
    <>
      <Header />
      <Preview />
      <main className="welcome" lang={langAttr(language)}>
        <section className="hero home-hero">
          <div className="home-invitation">
            <h1>{copy.title}</h1>
            <p className="lead">{copy.intro}</p>
          </div>
          <div className="home-entrances">
            <nav aria-label={copy.entryLabel}>
              <ul className="role-entries">
                {entrances.map((entry) => (
                  <li key={entry.role}>
                    <Link className="role-entry" id={entry.role} href={entry.href}>
                      <span className="role-art" aria-hidden="true">
                        <svg viewBox="0 0 100 100" focusable="false">
                          <Actor id={entry.actor} />
                        </svg>
                      </span>
                      <div className="role-copy">
                        <h2>{entry.title}</h2>
                        <p>{entry.body}</p>
                        <span className="role-action">{entry.action}</span>
                      </div>
                      <UiIcon className="role-arrow" name="back" width="22" height="22" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {!env.fake && (
              <p className="home-registration">
                {copy.newFamily} <Link href="/sign-up">{copy.createAccount}</Link>
              </p>
            )}
          </div>
          <GravityPlayground compact autoPlay />
        </section>
        <section
          className="home-experiment"
          id="home-experiment"
          aria-labelledby="home-experiment-title"
        >
          <div className="home-experiment-copy">
            <h2 id="home-experiment-title">{copy.experimentTitle}</h2>
            <p className="lead">{copy.experimentIntro}</p>
          </div>
          <ul className="home-discoveries">
            {[
              [s.feature1, s.feature1Body],
              [s.feature2, s.feature2Body],
              [s.feature3, s.feature3Body],
            ].map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="home-together" aria-labelledby="home-together-title">
          <div>
            <h2 id="home-together-title">{copy.togetherTitle}</h2>
            <p>{copy.togetherBody}</p>
          </div>
          <p>
            {copy.schoolHelp} <Link href="/study/sign-in">{copy.studentAction}</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
