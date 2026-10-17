'use client';
import { useLanguage } from '../lib/i18n';
import { uiNumber } from '../lib/i18n/ui';
import { copy as uiText, uiError } from '../lib/i18n/ui';
import { LanguagePreferencesForm } from './LanguagePreferencesForm';
import { StoryPreferencesForm } from './StoryPreferencesForm';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AgeBandSchema,
  AvatarSchema,
  PLAN_LIMITS,
  conceptCard,
  type MeResponse,
  type ChildResponse,
  type WorldListResponse,
  type UsageTodayResponse,
  type SessionListResponse,
  type DiscoveryListResponse,
  type CreateChildBody,
} from '@just-imagine/protocol';
import { api } from '../lib/api';
import { env } from '../lib/env';
import { s } from '../lib/strings/en';
import { setLanguage, readLanguage, currentLanguage, type Language } from '../lib/i18n';
import { CompanionSetup } from './companion/CompanionSetup';
import { Avatar } from './ProfilePicker';
import { Modal } from './Modal';
import '../app/parent-polish.css';
export function ParentPanel({
  panel,
}: {
  panel: 'dashboard' | 'children' | 'billing' | 'settings';
}) {
  const { language: interfaceLanguage } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<MeResponse>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [usage, setUsage] = useState<UsageTodayResponse>(),
    [worlds, setWorlds] = useState<WorldListResponse['worlds']>([]),
    [sessions, setSessions] = useState<SessionListResponse['sessions']>([]),
    [discoveries, setDiscoveries] = useState<DiscoveryListResponse['discoveries']>([]),
    [confirm, setConfirm] = useState<{ kind: 'account' | 'child' | 'world'; id: string }>();
  async function load() {
    const requestedLanguage = currentLanguage();
    try {
      const me = await api<MeResponse>('me');
      const u = await api<UsageTodayResponse>('usageToday');
      const family = await Promise.all(
        me.children.map(async (child) => {
          const childId = child.id;
          const [w, ss, d] = await Promise.all([
            api<WorldListResponse>('listWorlds', { childId }),
            api<SessionListResponse>('listSessions', { childId }),
            api<DiscoveryListResponse>('listDiscoveries', { childId }),
          ]);
          return { worlds: w.worlds, sessions: ss.sessions, discoveries: d.discoveries };
        }),
      );
      if (requestedLanguage !== currentLanguage()) return;
      setData(me);
      setUsage(u);
      setWorlds([...new Map(family.flatMap((f) => f.worlds).map((w) => [w.id, w])).values()]);
      setSessions(family.flatMap((f) => f.sessions));
      setDiscoveries(family.flatMap((f) => f.discoveries));
    } catch (e) {
      setError(e instanceof Error ? uiError(e) : s.unavailable);
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [interfaceLanguage]);
  async function action(fn: () => Promise<unknown>) {
    setError('');
    setBusy(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? uiError(e) : s.unavailable);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm) return;
    await action(async () => {
      if (confirm.kind === 'account') {
        await api('deleteAccountData');
        localStorage.removeItem('ji-child');
        if (!env.fake) await fetch('/api/session', { method: 'DELETE' });
        router.replace('/sign-in');
      } else if (confirm.kind === 'child') {
        await api('deleteChild', { childId: confirm.id });
        try {
          if (JSON.parse(localStorage.getItem('ji-child') || 'null')?.id === confirm.id)
            localStorage.removeItem('ji-child');
        } catch {
          localStorage.removeItem('ji-child');
        }
      } else await api('deleteWorld', { worldId: confirm.id });
      setConfirm(undefined);
    });
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + i);
    day.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    const minutes = Math.round(
      sessions
        .filter((session) => session.startedAt >= +day && session.startedAt < +end)
        .reduce((sum, session) => sum + session.voiceSeconds, 0) / 60,
    );
    return { day, minutes };
  });
  const chartMax = Math.max(10, ...week.map((day) => day.minutes));
  return (
    <>
      <div className="page-heading">
        <h1>{uiText(s[panel])}</h1>
        <span className="subtle">{s.theme}</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {uiText(error)}
        </p>
      )}
      {!data ? (
        <p>{s.load}</p>
      ) : (
        <>
          {panel === 'dashboard' && (
            <>
              <section className="parent-overview">
                <div>
                  <h2>{s.minutes}</h2>
                  <p className="usage-number">
                    {uiNumber(Math.round((usage?.used.voiceSeconds || 0) / 60))}
                    {uiText(' ')}
                    <span>
                      / {uiNumber(Math.round((usage?.limits.voiceSecondsPerDay || 900) / 60))}
                    </span>
                  </p>
                  <progress
                    aria-label={s.minutes}
                    max={usage?.limits.voiceSecondsPerDay || 900}
                    value={usage?.used.voiceSeconds || 0}
                  />
                </div>
                <div>
                  <h2>{s.worldSaved}</h2>
                  <p className="usage-number">{uiNumber(worlds.length)}</p>
                </div>
              </section>
              <section className="parent-section exploration-section">
                <h2>{uiText("This week's exploration")}</h2>
                <p className="chart-description">
                  {uiText('Minutes spent talking and exploring together.')}
                </p>
                {week.some((day) => day.minutes > 0) ? (
                  <div className="exploration-chart">
                    {week.map(({ day, minutes }, i) => {
                      return (
                        <div className="exploration-day" key={i}>
                          <div
                            className="exploration-column"
                            role="img"
                            aria-label={uiText('{v0}: {v1} minutes', {
                              v0: day.toLocaleDateString(
                                interfaceLanguage === 'bn' ? 'bn-BD' : 'en-US',
                              ),
                              v1: minutes,
                            })}
                          >
                            <span
                              className="exploration-bar"
                              style={{ height: `${(minutes / chartMax) * 100}%` }}
                            />
                            <strong aria-hidden="true">{uiNumber(minutes)}</strong>
                          </div>
                          <span>
                            {uiText(
                              day.toLocaleDateString(
                                interfaceLanguage === 'bn' ? 'bn-BD' : 'en-US',
                                { weekday: 'short' },
                              ),
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="exploration-empty">
                    <p>{uiText('Your week starts with a little wonder.')}</p>
                    <Link className="text-link" href="/play">
                      {uiText('Start an adventure')}
                    </Link>
                  </div>
                )}
                <p className="exploration-summary">
                  {uiNumber(data.children.reduce((sum, c) => sum + c.loopsCompleted, 0))}
                  {uiText(' ')}
                  {uiText('completed learning loops ·')}
                  {uiNumber(new Set(discoveries.map((d) => d.concept)).size)}{' '}
                  {uiText('concepts discovered')}
                </p>
              </section>
              <section className="parent-section">
                <h2>{s.children}</h2>
                {data.children.map((child) => (
                  <div className="child-summary" key={child.id}>
                    <Avatar kind={child.avatar} />
                    <div>
                      <strong>{uiText(child.firstName)}</strong>
                      <p>
                        {s.agePrefix} {uiText(child.ageBand)} ·{' '}
                        {uiNumber(child.sessionTargetMinutes)} {uiText('min')}
                      </p>
                    </div>
                  </div>
                ))}
              </section>
              <section className="parent-section">
                <h2>{uiText('Discoveries')}</h2>
                {discoveries.length ? (
                  discoveries.map((d, index) => (
                    <article className="parent-discovery" key={`${d.concept}-${index}`}>
                      <h3>{uiText(d.title)}</h3>
                      <p>{uiText(d.kidExplanation)}</p>
                      <p>{uiText(d.realLifeNote)}</p>
                    </article>
                  ))
                ) : (
                  <p>{s.empty}</p>
                )}
              </section>
              <section className="parent-section">
                <h2>{s.gallery}</h2>
                {worlds.map((w) => (
                  <div className="data-row" key={w.id}>
                    <span>
                      <strong>{uiText(w.title)}</strong>
                      <p>
                        {w.concepts.map((c) => conceptCard(c, interfaceLanguage).title).join(' · ')}
                      </p>
                    </span>
                    <button disabled={busy} onClick={() => setConfirm({ kind: 'world', id: w.id })}>
                      {s.remove}
                    </button>
                  </div>
                ))}
              </section>
              <section className="parent-section">
                <h2>{s.sessions}</h2>
                {sessions.length ? (
                  sessions.map((ss) => (
                    <article className="session-entry" key={ss.id}>
                      <time dateTime={new Date(ss.startedAt).toISOString()}>
                        {uiText(
                          new Date(ss.startedAt).toLocaleDateString(
                            interfaceLanguage === 'bn' ? 'bn-BD' : 'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                            },
                          ),
                        )}
                      </time>
                      <p>{uiText(ss.summary)}</p>
                    </article>
                  ))
                ) : (
                  <p>{s.empty}</p>
                )}
              </section>
            </>
          )}
          {panel === 'children' && (
            <>
              <p>
                {uiNumber(data.children.length)} / {uiNumber(PLAN_LIMITS[data.user.plan].children)}
                {uiText(' ')}
                {s.children.toLowerCase()}
              </p>
              {data.children.map((child) => (
                <ChildForm
                  key={child.id}
                  child={child}
                  onCompanionSaved={load}
                  busy={busy}
                  save={(body) => action(() => api('updateChild', { childId: child.id }, body))}
                  remove={() => setConfirm({ kind: 'child', id: child.id })}
                />
              ))}
              {data.children.length < PLAN_LIMITS[data.user.plan].children && (
                <ChildForm
                  busy={busy}
                  save={(body) => action(() => api('createChild', {}, body))}
                />
              )}
            </>
          )}
          {panel === 'billing' && (
            <section className="parent-section billing">
              <h2>
                {s.plan}: {data.user.plan === 'family' ? s.family : s.free}
              </h2>
              <p>{s.billingInfo}</p>
              <p>{env.fake ? s.previewBilling : s.daily}</p>
              <div className="allowance">
                {Object.entries(PLAN_LIMITS[data.user.plan]).map(([key, value]) => (
                  <p key={key}>
                    <span>{uiText(key.replace(/([A-Z])/g, ' $1'))}</span>
                    <strong>{uiNumber(value)}</strong>
                  </p>
                ))}
              </div>
              <div className="actions">
                <button
                  disabled={busy || env.fake}
                  className="button primary"
                  onClick={() =>
                    void action(async () => {
                      const r = await api<{ url: string }>('checkout', {}, { tier: 'family' });
                      window.location.assign(r.url);
                    })
                  }
                >
                  {s.checkout}
                </button>
                <button
                  disabled={busy || env.fake || !data.subscription}
                  className="button secondary"
                  onClick={() =>
                    void action(async () => {
                      const r = await api<{ url: string }>('portal');
                      window.location.assign(r.url);
                    })
                  }
                >
                  {s.portal}
                </button>
              </div>
            </section>
          )}
          {panel === 'settings' && (
            <>
              <LanguagePreferencesForm
                key={
                  data.children.find((c) => c.id === readActiveChildId())?.id ??
                  data.children[0]?.id ??
                  'family'
                }
                child={data.children.find((c) => c.id === readActiveChildId()) ?? data.children[0]}
              />
              <section className="parent-section">
                <h2>{s.captions}</h2>
                <p>{s.captionHelp}</p>
                {data.children.map((child) => (
                  <div className="data-row" key={child.id}>
                    <span>{uiText(child.firstName)}</span>
                    <input
                      aria-label={`${uiText(child.firstName)} ${s.captions}`}
                      type="checkbox"
                      checked={child.captions}
                      disabled={busy}
                      onChange={(e) =>
                        void action(() =>
                          api('updateChild', { childId: child.id }, { captions: e.target.checked }),
                        )
                      }
                    />
                  </div>
                ))}
              </section>
              <section className="parent-section">
                <h2>{uiText('Learning through stories')}</h2>
                <p>
                  {uiText(
                    'Choose what your child discovers with Katha, their storytelling friend.',
                  )}
                </p>
                {data.children.map((child) => (
                  <StoryPreferencesForm key={child.id} child={child} />
                ))}
              </section>
              <section className="parent-section danger">
                <h2>{s.data}</h2>
                <p>{s.dangerInfo}</p>
                <button
                  className="button danger-button"
                  onClick={() => setConfirm({ kind: 'account', id: '' })}
                >
                  {s.danger}
                </button>
              </section>
            </>
          )}
        </>
      )}
      {confirm && (
        <Modal className="modal-wrap" onClose={() => setConfirm(undefined)}>
          <section
            className="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {confirm.kind === 'account'
                ? s.danger
                : confirm.kind === 'child'
                  ? s.childDelete
                  : s.worldDelete}
            </h2>
            <p>{s.dangerInfo}</p>
            <div className="actions">
              <button autoFocus className="button secondary" onClick={() => setConfirm(undefined)}>
                {s.cancel}
              </button>
              <button
                disabled={busy}
                className="button danger-button"
                onClick={() => void remove()}
              >
                {s.confirm}
              </button>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}
function ChildForm({
  child,
  onCompanionSaved,
  busy,
  save,
  remove,
}: {
  child?: ChildResponse;
  onCompanionSaved?: () => Promise<void>;
  busy: boolean;
  save: (body: CreateChildBody | Record<string, unknown>) => Promise<boolean>;
  remove?: () => void;
}) {
  useLanguage();
  const [name, setName] = useState(child?.firstName || ''),
    [age, setAge] = useState(child?.ageBand || '8-10'),
    [avatar, setAvatar] = useState(child?.avatar || 'fox'),
    [target, setTarget] = useState(child?.sessionTargetMinutes || 8),
    [labsUnlocked, setLabsUnlocked] = useState(child?.labsUnlocked || false),
    [tier, setTier] = useState(child?.tier || 'playground'),
    [language, setChildLanguage] = useState<Language>(child?.language ?? readLanguage());
  return (
    <form
      className="child-form"
      action={async () => {
        const saved = await save({
          firstName: name,
          ageBand: age,
          avatar,
          language,
          ...(child ? { sessionTargetMinutes: target, labsUnlocked, tier } : {}),
        });
        if (!saved) return;
        if (child && readActiveChildId() === child.id) setLanguage(language);
        if (!child) setName('');
      }}
    >
      <h2>{uiText(child?.firstName || s.newChild)}</h2>
      <div className="form-grid">
        <label>
          {s.name}
          <input
            type="text"
            required
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {s.age}
          <select value={age} onChange={(e) => setAge(AgeBandSchema.parse(e.target.value))}>
            {AgeBandSchema.options.map((band) => (
              <option key={band} value={band}>
                {uiText(band)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {s.avatar}
          <select value={avatar} onChange={(e) => setAvatar(AvatarSchema.parse(e.target.value))}>
            {AvatarSchema.options.map((a) => (
              <option key={a} value={a}>
                {uiText(a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {s.languageLabel}
          <select
            value={language}
            onChange={(e) => setChildLanguage(e.target.value === 'bn' ? 'bn' : 'en')}
          >
            <option value="en">{uiText('English')}</option>
            <option value="bn" lang="bn">
              {uiText('Bangla (Bangladesh)')}
            </option>
          </select>
        </label>
        {child && (
          <>
            <label>
              {uiText('Learning mode')}
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as 'playground' | 'lab')}
              >
                <option value="playground">{uiText('Playgrounds')}</option>
                <option value="lab" disabled={age === '6-7' && !labsUnlocked}>
                  {uiText('Labs')}
                </option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={labsUnlocked}
                onChange={(event) => {
                  setLabsUnlocked(event.target.checked);
                  if (!event.target.checked && age === '6-7') setTier('playground');
                }}
              />
              {uiText('Allow Labs for younger children')}
            </label>
          </>
        )}
        {child && (
          <label>
            {s.sessionTarget}
            <input
              type="number"
              min={8}
              max={20}
              required
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </label>
        )}
      </div>
      {child && onCompanionSaved && <CompanionSetup child={child} onSaved={onCompanionSaved} />}
      {!child && (
        <p>
          {uiText(
            'You can choose their friend or make a chibi from a photo after adding this explorer.',
          )}
        </p>
      )}
      <div className="actions">
        <button className="button primary" disabled={busy}>
          {child ? s.save : s.add}
        </button>
        {remove && (
          <button type="button" className="button secondary" disabled={busy} onClick={remove}>
            {s.remove}
          </button>
        )}
      </div>
    </form>
  );
}

function readActiveChildId(): string | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem('ji-child') || 'null') as { id?: unknown } | null;
    return typeof raw?.id === 'string' ? raw.id : undefined;
  } catch {
    return undefined;
  }
}
