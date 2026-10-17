'use client';
import { useState } from 'react';
import { WorldPackSchema, type WorldPack } from '@just-imagine/learning-content/schema';
import type { z } from 'zod';
import type { CatalogEntryDocSchema } from '@just-imagine/protocol';
import { useSchoolResource, schoolRequest } from '../../lib/school/api';
import { useSchoolLanguage } from '../../lib/i18n/study';
import {
  Field,
  ErrorNotice,
  Loading,
  ActionNotice,
  useSchoolAction,
  LanguageSwitch,
} from '../school/shared';
import '../../app/school.css';
type Entry = z.infer<typeof CatalogEntryDocSchema> & { id: string };
function ObjectEditor({
  value,
  onChange,
  path = 'pack',
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  path?: string;
}) {
  if (Array.isArray(value))
    return (
      <div>
        {value.map((v, i) => (
          <details key={i}>
            <summary>
              {path} {i + 1}
            </summary>
            <ObjectEditor
              value={v}
              path={path + '.' + i}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
            />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              −
            </button>
          </details>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, value.length ? structuredClone(value[0]) : ''])}
        >
          +
        </button>
      </div>
    );
  if (value && typeof value === 'object')
    return (
      <div className="sch-form">
        {Object.entries(value).map(([k, v]) => (
          <details key={k} open={typeof v !== 'object'}>
            <summary>{k}</summary>
            <ObjectEditor
              path={path + '.' + k}
              value={v}
              onChange={(next) => onChange({ ...value, [k]: next })}
            />
          </details>
        ))}
      </div>
    );
  return typeof value === 'boolean' ? (
    <input
      aria-label={path}
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
    />
  ) : typeof value === 'number' ? (
    <input
      aria-label={path}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ) : (
    <textarea
      aria-label={path}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
export function CatalogPanel() {
  const { s, text } = useSchoolLanguage(),
    r = useSchoolResource<{ entries: Entry[] }>('admin/catalog'),
    action = useSchoolAction();
  const templates = useSchoolResource<{ packs: WorldPack[] }>('admin/catalog/templates');
  const [tab, setTab] = useState<'world' | 'storyPack'>('world'),
    [selected, setSelected] = useState<Entry>(),
    [raw, setRaw] = useState(''),
    [pack, setPack] = useState<unknown>(),
    [validation, setValidation] = useState(''),
    [mode, setMode] = useState<'form' | 'json'>('form');
  function load(raw: string) {
    setRaw(raw);
    try {
      const parsed = WorldPackSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        setValidation(
          parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('\n'),
        );
        setPack(undefined);
      } else {
        setPack(parsed.data);
        setValidation('');
      }
    } catch {
      setValidation('Invalid JSON');
      setPack(undefined);
    }
  }
  return (
    <div className="sch sch-panel">
      <div className="sch-toolbar">
        <h1>{s('catalog')}</h1>
        <LanguageSwitch />
        <button onClick={r.reload}>{s('refresh')}</button>
      </div>
      <ActionNotice action={action} />
      <ErrorNotice error={r.error} retry={r.reload} />
      <div className="sch-tabs">
        {(['world', 'storyPack'] as const).map((v) => (
          <button
            key={v}
            aria-pressed={tab === v}
            onClick={() => {
              setTab(v);
              setSelected(undefined);
            }}
          >
            {s(v === 'world' ? 'worlds' : 'storyPacks')}
          </button>
        ))}
      </div>
      <form
        className="sch-form sch-section"
        key={selected?.id ?? tab}
        action={(f) =>
          void action.run(async () => {
            const reason = String(f.get('reason')),
              title = { en: String(f.get('titleEn')), bn: String(f.get('titleBn')) };
            const ageBands = f.getAll('ageBand');
            if (!ageBands.length) throw new Error('Choose at least one age band.');
            if (selected)
              await schoolRequest(
                'admin/catalog/' + selected.id,
                {
                  title,
                  ageBands,
                  reason,
                  ...(selected.kind === 'storyPack' ? { pack: WorldPackSchema.parse(pack) } : {}),
                },
                'PATCH',
              );
            else if (tab === 'world')
              await schoolRequest('admin/catalog/worlds', {
                worldId: String(f.get('worldId')),
                reason,
                title,
                ageBands,
              });
            else
              await schoolRequest('admin/catalog/packs', {
                pack: WorldPackSchema.parse(pack),
                title,
                ageBands,
                reason,
              });
            setSelected(undefined);
            r.reload();
          }, s('saved'))
        }
      >
        <h2>{s(selected ? 'edit' : tab === 'world' ? 'promote' : 'uploadPack')}</h2>
        <div className="sch-grid">
          <Field label={s('nameEn')}>
            <input name="titleEn" defaultValue={selected?.title.en} required />
          </Field>
          <Field label={s('nameBn')}>
            <input name="titleBn" defaultValue={selected?.title.bn} required />
          </Field>
        </div>
        <div className="sch-checks">
          {['6-7', '8-10', '11-13'].map((v) => (
            <label key={v}>
              <input
                type="checkbox"
                name="ageBand"
                value={v}
                defaultChecked={selected ? selected.ageBands.includes(v as '6-7') : v === '8-10'}
              />
              {v}
            </label>
          ))}
        </div>
        {tab === 'world' ? (
          <Field label={s('worldId')}>
            <input
              name="worldId"
              required
              defaultValue={selected?.worldId ?? ''}
              disabled={!!selected}
            />
          </Field>
        ) : (
          <>
            <Field label={s('storyPacks')}>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void file.text().then(load);
                }}
              />
            </Field>
            <select
              aria-label={s('copy')}
              defaultValue=""
              onChange={(e) => {
                const template = templates.data?.packs.find((p) => p.id === e.target.value);
                if (template) {
                  const copy = structuredClone(template);
                  copy.id = 'catalog_' + Date.now().toString(36);
                  copy.challenges = copy.challenges.map((challenge, i) => ({
                    ...challenge,
                    id: copy.id + '_' + (i + 1),
                  }));
                  load(JSON.stringify(copy, null, 2));
                }
              }}
            >
              <option value="">{s('copy')}</option>
              {(templates.data?.packs ?? []).map((p) => (
                <option value={p.id} key={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="sch-tabs">
              <button type="button" aria-pressed={mode === 'form'} onClick={() => setMode('form')}>
                {s('edit')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'json'}
                onClick={() => {
                  setRaw(JSON.stringify(pack ?? {}, null, 2));
                  setMode('json');
                }}
              >
                {s('json')}
              </button>
            </div>
            {mode === 'json' ? (
              <textarea
                className="sch-json"
                rows={15}
                aria-label={s('json')}
                value={raw}
                onChange={(e) => load(e.target.value)}
              />
            ) : pack ? (
              <ObjectEditor value={pack} onChange={setPack} />
            ) : (
              <p>{s('uploadPack')}</p>
            )}
            {validation && (
              <pre className="sch-error sch-pre" role="alert">
                {validation}
              </pre>
            )}
          </>
        )}
        <Field label={s('reason')}>
          <input name="reason" minLength={3} required />
        </Field>
        <div className="sch-toolbar">
          <button className="sch-primary" disabled={action.busy || (tab === 'storyPack' && !pack)}>
            {s('save')}
          </button>
          {selected && (
            <button type="button" onClick={() => setSelected(undefined)}>
              {s('cancel')}
            </button>
          )}
        </div>
      </form>
      {r.loading ? (
        <Loading />
      ) : (
        <div className="sch-list">
          {r.data?.entries
            .filter((e) => e.kind === tab)
            .map((entry) => (
              <article className="sch-list-row" key={entry.id}>
                <div>
                  <h2>{text(entry.title)}</h2>
                  <span className="sch-status" data-state={entry.status}>
                    {s(entry.status === 'retired' ? 'archived' : entry.status)}
                  </span>
                  <p>{entry.worldId ?? entry.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelected(entry);
                    if (entry.pack) load(JSON.stringify(entry.pack, null, 2));
                  }}
                >
                  {s('edit')}
                </button>
                <form
                  className="sch-inline-form"
                  action={(f) =>
                    void action.run(async () => {
                      await schoolRequest(
                        'admin/catalog/' + entry.id,
                        { status: String(f.get('status')), reason: String(f.get('reason')) },
                        'PATCH',
                      );
                      r.reload();
                    }, s('saved'))
                  }
                >
                  <input
                    name="reason"
                    minLength={3}
                    required
                    aria-label={s('reason')}
                    placeholder={s('reason')}
                  />
                  <button name="status" value="published" disabled={action.busy}>
                    {s('publish')}
                  </button>
                  <button name="status" value="retired" disabled={action.busy}>
                    {s('retire')}
                  </button>
                </form>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
