'use client';
import { useLanguage } from '../../lib/i18n';
import { uiNumber } from '../../lib/i18n/ui';
import { copy as uiText } from '../../lib/i18n/ui';
import type { AdminContentResponse } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatCount, formatPercent } from './format';
import { Empty, LoadError, PageHeading, Skeleton } from './parts';

const loadContent = () => adminApi<AdminContentResponse>('content');

export function ContentPanel() {
  useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadContent);
  return (
    <>
      <PageHeading
        title={uiText('Content')}
        detail={uiText(
          'Saved worlds, Learning World packs, generated-game checks and the asset library.',
        )}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="worlds">
            <h2 id="worlds">{uiText('Saved worlds')}</h2>
            <dl className="adm-figures">
              {(
                [
                  [uiText('All worlds'), data.worlds.total],
                  [uiText('Ready'), data.worlds.ready],
                  [uiText('Building'), data.worlds.building],
                  [uiText('Failed'), data.worlds.failed],
                  [uiText('Hidden for review'), data.worlds.hidden],
                ] as const
              ).map(([label, n]) => (
                <div key={label}>
                  <dt>{uiText(label)}</dt>
                  <dd>{formatCount(n)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="adm-section" aria-labelledby="packs">
            <h2 id="packs">{uiText('Learning World packs')}</h2>
            {!data.packs.connected ? (
              <Empty title={uiText('The pack catalogue is not connected to the api yet.')}>
                {uiText(
                  'Packs ship inside the web and gateway builds; once the api reads the content package, each pack and its version is listed here.',
                )}
              </Empty>
            ) : data.packs.items.length === 0 ? (
              <Empty title={uiText('No packs published.')} />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">{uiText('Pack')}</th>
                      <th scope="col">{uiText('Version')}</th>
                      <th scope="col" className="num">
                        {uiText('Challenges')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packs.items.map((pack) => (
                      <tr key={pack.id}>
                        <th scope="row">{uiText(pack.title)}</th>
                        <td>{uiText(pack.version)}</td>
                        <td className="num">{uiNumber(pack.challenges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-section" aria-labelledby="smoke">
            <h2 id="smoke">{uiText('Generated-game smoke runs')}</h2>
            {data.gameSmoke.runs === 0 ? (
              <Empty title={uiText('No smoke runs recorded.')}>
                {uiText(
                  'Each generated game script runs headless before a child sees it; results appear here once the builder records them.',
                )}
              </Empty>
            ) : (
              <>
                <p className="adm-sentence">
                  <strong>{formatPercent(data.gameSmoke.passRate)}</strong> {uiText('passed (')}
                  {formatCount(data.gameSmoke.passed)} {uiText('of')}
                  {formatCount(data.gameSmoke.runs)} {uiText('recent runs).')}
                </p>
                {data.gameSmoke.topFailures.length > 0 && (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th scope="col">{uiText('Top failure reasons')}</th>
                          <th scope="col" className="num">
                            {uiText('Runs')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.gameSmoke.topFailures.map((f) => (
                          <tr key={f.reason}>
                            <th scope="row">{uiText(f.reason)}</th>
                            <td className="num">{uiNumber(f.count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="adm-section" aria-labelledby="library">
            <h2 id="library">{uiText('Asset library QA')}</h2>
            {data.assetLibrary.total === 0 ? (
              <Empty title={uiText('No library assets recorded.')}>
                {uiText(
                  'Curated art appears here with its review status once library generation starts.',
                )}
              </Empty>
            ) : (
              <dl className="adm-figures">
                {(
                  [
                    [uiText('Assets'), data.assetLibrary.total],
                    [uiText('Approved'), data.assetLibrary.approved],
                    [uiText('Rejected'), data.assetLibrary.rejected],
                    [uiText('Waiting for review'), data.assetLibrary.pending],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label}>
                    <dt>{uiText(label)}</dt>
                    <dd>{formatCount(n)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </>
      )}
    </>
  );
}
