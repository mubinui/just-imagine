'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useState } from 'react';
import { WorldPackSchema, type WorldPack } from '@just-imagine/learning-content/schema';
import type { z } from 'zod';
import type { CatalogEntryDocSchema } from '@just-imagine/protocol';
import { AdminApiError, adminRequest, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import {
  Drawer,
  Empty,
  Field,
  FormResult,
  LoadError,
  PageHeading,
  ReasonField,
  Skeleton,
  Status,
  reasonReady,
  type Tone,
} from './parts';

type Entry = z.infer<typeof CatalogEntryDocSchema> & { id: string };
type Kind = Entry['kind'];
type Band = Entry['ageBands'][number];
const BANDS: Band[] = ['6-7', '8-10', '11-13'];
const loadCatalog = () => adminRequest<{ entries: Entry[] }>('catalog');
const loadTemplates = () => adminRequest<{ packs: WorldPack[] }>('catalog/templates');

const STATUS: Record<Entry['status'], [Tone, string]> = {
  draft: ['warn', 'Draft'],
  published: ['good', 'Published'],
  retired: ['quiet', 'Retired'],
};
function EntryStatus({ status }: { status: Entry['status'] }) {
  const [tone, label] = STATUS[status];
  return <Status tone={tone}>{uiText(label)}</Status>;
}
const bandLabel = (band: string) => uiText('Ages {v0}', { v0: band.replace('-', '–') });

/** A schema-shaped editor for one story pack: every leaf is a labelled control. */
function ObjectEditor({
  value,
  onChange,
  path = 'pack',
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  path?: string;
}) {
  useLanguage();
  if (Array.isArray(value))
    return (
      <div className="adm-tree">
        {value.map((v, i) => (
          <details key={i}>
            <summary>
              {path.split('.').at(-1)} {i + 1}
            </summary>
            <ObjectEditor
              value={v}
              path={path + '.' + i}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
            />
            <button
              type="button"
              className="adm-button adm-quiet adm-small"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              {uiText('Remove')}
            </button>
          </details>
        ))}
        <button
          type="button"
          className="adm-button adm-quiet adm-small"
          onClick={() => onChange([...value, value.length ? structuredClone(value[0]) : ''])}
        >
          {uiText('Add another')}
        </button>
      </div>
    );
  if (value && typeof value === 'object')
    return (
      <div className="adm-tree">
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
      rows={String(value ?? '').length > 70 ? 3 : 1}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function CatalogPanel() {
  const { language } = useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadCatalog);
  const [tab, setTab] = useState<Kind>('world');
  // undefined: closed; null: adding to the current tab; an entry: editing it.
  const [open, setOpen] = useState<Entry | null>();
  const rows = data?.entries.filter((e) => e.kind === tab) ?? [];
  const title = (e: Entry) => e.title[language] || e.title.en;
  return (
    <>
      <PageHeading
        title={uiText('Catalog')}
        detail={uiText(
          'Worlds and story packs offered to every family. New items start as drafts; publishing needs a title in both languages.',
        )}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      <section className="adm-section" aria-labelledby="catalog-list">
        <h2 id="catalog-list" className="adm-visually-hidden">
          {uiText('Catalog items')}
        </h2>
        <div className="adm-section-head">
          <div className="adm-segments" role="group" aria-label={uiText('Catalog items')}>
            {(['world', 'storyPack'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={tab === kind}
                onClick={() => setTab(kind)}
              >
                {kind === 'world' ? uiText('Worlds') : uiText('Story packs')}
              </button>
            ))}
          </div>
          <button type="button" className="adm-button adm-primary" onClick={() => setOpen(null)}>
            {tab === 'world' ? uiText('Add a world') : uiText('Upload a story pack')}
          </button>
        </div>
        {!data ? (
          loading && <Skeleton rows={4} />
        ) : rows.length === 0 ? (
          <Empty
            title={
              tab === 'world' ? uiText('No catalog worlds yet.') : uiText('No story packs yet.')
            }
          >
            {tab === 'world'
              ? uiText(
                  'Add a ready world by its id to offer it to every family. It stays a draft until you publish it.',
                )
              : uiText(
                  'Upload a story pack file or start from a built-in pack. It stays a draft until you publish it.',
                )}
          </Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-cards">
              <thead>
                <tr>
                  <th scope="col">{uiText('Title')}</th>
                  <th scope="col">{tab === 'world' ? uiText('World id') : uiText('Pack id')}</th>
                  <th scope="col">{uiText('Age bands')}</th>
                  <th scope="col">{uiText('Status')}</th>
                  <th scope="col">{uiText('Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row" data-label={uiText('Title')}>
                      <button
                        type="button"
                        className="adm-row-open"
                        aria-haspopup="dialog"
                        onClick={() => setOpen(entry)}
                      >
                        {title(entry)}
                      </button>
                    </th>
                    <td data-label={tab === 'world' ? uiText('World id') : uiText('Pack id')}>
                      <code translate="no">
                        {entry.worldId ?? (entry.pack as { id?: string } | null)?.id ?? entry.id}
                      </code>
                    </td>
                    <td data-label={uiText('Age bands')}>
                      {entry.ageBands.map(bandLabel).join(', ')}
                    </td>
                    <td data-label={uiText('Status')}>
                      <EntryStatus status={entry.status} />
                    </td>
                    <td className="adm-when" data-label={uiText('Updated')}>
                      {formatWhen(entry.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open !== undefined && (
        <CatalogDrawer
          key={open?.id ?? 'new-' + tab}
          entry={open}
          kind={open?.kind ?? tab}
          onClose={() => setOpen(undefined)}
          onSaved={() => void reload()}
        />
      )}
    </>
  );
}

function CatalogDrawer({
  entry: initial,
  kind,
  onClose,
  onSaved,
}: {
  entry: Entry | null;
  kind: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = useLanguage();
  const templates = useAdminResource(loadTemplates);
  const [entry, setEntry] = useState(initial);
  const [titleEn, setTitleEn] = useState(initial?.title.en ?? '');
  const [titleBn, setTitleBn] = useState(initial?.title.bn ?? '');
  const [bands, setBands] = useState<Band[]>(initial?.ageBands ?? ['8-10']);
  const [worldId, setWorldId] = useState(initial?.worldId ?? '');
  const [pack, setPack] = useState<unknown>(initial?.pack ?? undefined);
  const [raw, setRaw] = useState(initial?.pack ? JSON.stringify(initial.pack, null, 2) : '');
  const [validation, setValidation] = useState('');
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [reason, setReason] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [statusFailure, setStatusFailure] = useState('');
  const isPack = kind === 'storyPack';

  function loadPack(text: string) {
    setRaw(text);
    try {
      const parsed = WorldPackSchema.safeParse(JSON.parse(text));
      if (parsed.success) {
        setPack(parsed.data);
        setValidation('');
      } else {
        setPack(undefined);
        setValidation(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
        );
      }
    } catch {
      setPack(undefined);
      setValidation(uiText('That file is not valid JSON.'));
    }
  }
  const ready =
    titleEn.trim() &&
    titleBn.trim() &&
    bands.length > 0 &&
    reasonReady(reason) &&
    (isPack ? !!pack : entry || worldId.trim());

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setNotice('');
    setFailure('');
    const title = { en: titleEn.trim(), bn: titleBn.trim() };
    try {
      const body = { title, ageBands: bands, reason: reason.trim() };
      const response = entry
        ? await adminRequest<{ entry: Entry }>('catalog/' + entry.id, 'PATCH', {
            ...body,
            ...(isPack ? { pack: WorldPackSchema.parse(pack) } : {}),
          })
        : isPack
          ? await adminRequest<{ entry: Entry }>('catalog/packs', 'POST', {
              ...body,
              pack: WorldPackSchema.parse(pack),
            })
          : await adminRequest<{ entry: Entry }>('catalog/worlds', 'POST', {
              ...body,
              worldId: worldId.trim(),
            });
      setEntry(response.entry);
      setReason('');
      setNotice(
        entry
          ? uiText('Changes saved. Recorded in the audit log.')
          : uiText('Added as a draft. Publish it below when it is ready.'),
      );
      onSaved();
    } catch (e) {
      setFailure(
        !entry && !isPack && e instanceof AdminApiError && e.status === 404
          ? uiText('No saved world has that id. Check the id and try again.')
          : e instanceof Error
            ? uiError(e)
            : uiText('That change did not go through. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: Entry['status']) {
    if (!entry || busy || !reasonReady(statusReason)) return;
    setBusy(true);
    setStatusNotice('');
    setStatusFailure('');
    try {
      const response = await adminRequest<{ entry: Entry }>('catalog/' + entry.id, 'PATCH', {
        status,
        reason: statusReason.trim(),
      });
      setEntry(response.entry);
      setStatusReason('');
      setStatusNotice(
        status === 'published'
          ? uiText('Published to every family. Recorded in the audit log.')
          : status === 'retired'
            ? uiText('Retired from the catalog. Recorded in the audit log.')
            : uiText('Moved back to draft. Recorded in the audit log.'),
      );
      onSaved();
    } catch (e) {
      setStatusFailure(
        e instanceof Error ? uiError(e) : uiText('That change did not go through. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      title={
        entry
          ? entry.title[language] || entry.title.en
          : isPack
            ? uiText('Upload a story pack')
            : uiText('Add a world')
      }
      titleId="catalog-title"
      onClose={onClose}
      wide={isPack}
    >
      {entry && (
        <dl className="adm-facts">
          <div>
            <dt>{uiText('Status')}</dt>
            <dd>
              <EntryStatus status={entry.status} />
            </dd>
          </div>
          <div>
            <dt>{uiText('Updated')}</dt>
            <dd>{formatWhen(entry.updatedAt)}</dd>
          </div>
        </dl>
      )}
      <form className="adm-form adm-drawer-section" onSubmit={(e) => void save(e)}>
        <h3>{entry ? uiText('Details') : uiText('New draft')}</h3>
        <div className="adm-form-grid">
          <Field label={uiText('Title in English')}>
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
          </Field>
          <Field label={uiText('Title in Bangla')}>
            <input
              lang="bn"
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
              required
            />
          </Field>
        </div>
        <fieldset className="adm-checks">
          <legend>{uiText('Age bands')}</legend>
          {BANDS.map((band) => (
            <label key={band}>
              <input
                type="checkbox"
                checked={bands.includes(band)}
                onChange={(e) =>
                  setBands((current) =>
                    e.target.checked
                      ? BANDS.filter((b) => b === band || current.includes(b))
                      : current.filter((b) => b !== band),
                  )
                }
              />
              {bandLabel(band)}
            </label>
          ))}
        </fieldset>
        {bands.length === 0 && (
          <p className="adm-detail">{uiText('Choose at least one age band.')}</p>
        )}
        {!isPack ? (
          <Field
            label={uiText('World id')}
            hint={uiText('The id of a ready, visible world. It cannot change later.')}
          >
            <input
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              disabled={!!entry}
              required
              spellCheck={false}
              autoComplete="off"
              translate="no"
            />
          </Field>
        ) : (
          <div className="adm-pack">
            {!entry && (
              <div className="adm-form-grid">
                <Field label={uiText('Story pack file')} hint={uiText('A .json story pack.')}>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void file.text().then(loadPack);
                    }}
                  />
                </Field>
                <Field label={uiText('Or start from a built-in pack')}>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const template = templates.data?.packs.find((p) => p.id === e.target.value);
                      if (!template) return;
                      const copy = structuredClone(template);
                      copy.id = 'catalog_' + Date.now().toString(36);
                      copy.challenges = copy.challenges.map((challenge, i) => ({
                        ...challenge,
                        id: copy.id + '_' + (i + 1),
                      }));
                      loadPack(JSON.stringify(copy, null, 2));
                    }}
                  >
                    <option value="">{uiText('Choose a template…')}</option>
                    {(templates.data?.packs ?? []).map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
            <div className="adm-segments" role="group" aria-label={uiText('Pack editor')}>
              <button type="button" aria-pressed={mode === 'form'} onClick={() => setMode('form')}>
                {uiText('Form')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'json'}
                onClick={() => {
                  if (pack) setRaw(JSON.stringify(pack, null, 2));
                  setMode('json');
                }}
              >
                {uiText('JSON')}
              </button>
            </div>
            {mode === 'json' ? (
              <textarea
                className="adm-json"
                rows={16}
                aria-label={uiText('Story pack JSON')}
                value={raw}
                spellCheck={false}
                onChange={(e) => loadPack(e.target.value)}
              />
            ) : pack ? (
              <ObjectEditor value={pack} onChange={setPack} />
            ) : (
              <p className="adm-detail">
                {uiText('Choose a file or a built-in pack to start editing.')}
              </p>
            )}
            {validation && (
              <pre className="adm-alert adm-pre" role="alert">
                {validation}
              </pre>
            )}
          </div>
        )}
        <ReasonField id="catalog-reason" value={reason} onChange={setReason} />
        <div className="adm-toolbar">
          <button type="submit" className="adm-button adm-primary" disabled={!ready || busy}>
            {busy ? uiText('Saving…') : entry ? uiText('Save changes') : uiText('Add as draft')}
          </button>
        </div>
        <FormResult notice={notice} failure={failure} />
      </form>
      {entry && (
        <section className="adm-drawer-section adm-actions" aria-labelledby="catalog-status">
          <h3 id="catalog-status">{uiText('Availability')}</h3>
          <p className="adm-detail">
            {entry.status === 'published'
              ? uiText('Families can find this item in the catalog now.')
              : entry.status === 'retired'
                ? uiText('Retired items are hidden from families. Publish again to restore it.')
                : uiText('Drafts are visible only here until you publish them.')}
          </p>
          <ReasonField id="catalog-status-reason" value={statusReason} onChange={setStatusReason} />
          <div className="adm-action-row">
            {entry.status !== 'published' && (
              <button
                type="button"
                className="adm-button adm-primary"
                disabled={busy || !reasonReady(statusReason)}
                onClick={() => void setStatus('published')}
              >
                {isPack ? uiText('Publish story pack') : uiText('Publish world')}
              </button>
            )}
            {entry.status !== 'retired' && (
              <button
                type="button"
                className="adm-button"
                disabled={busy || !reasonReady(statusReason)}
                onClick={() => void setStatus('retired')}
              >
                {uiText('Retire')}
              </button>
            )}
          </div>
          <FormResult notice={statusNotice} failure={statusFailure} />
        </section>
      )}
    </Drawer>
  );
}
