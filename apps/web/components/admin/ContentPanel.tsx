'use client';
import type { AdminContentResponse } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatCount, formatPercent } from './format';
import { Empty, LoadError, PageHeading, Skeleton } from './parts';

const loadContent = () => adminApi<AdminContentResponse>('content');

export function ContentPanel() {
  const { data, error, loading, reload } = useAdminResource(loadContent);
  return (
    <>
      <PageHeading
        title="Content"
        detail="Saved worlds, Learning World packs, generated-game checks and the asset library."
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="worlds">
            <h2 id="worlds">Saved worlds</h2>
            <dl className="adm-figures">
              {(
                [
                  ['All worlds', data.worlds.total],
                  ['Ready', data.worlds.ready],
                  ['Building', data.worlds.building],
                  ['Failed', data.worlds.failed],
                  ['Hidden for review', data.worlds.hidden],
                ] as const
              ).map(([label, n]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{formatCount(n)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="adm-section" aria-labelledby="packs">
            <h2 id="packs">Learning World packs</h2>
            {!data.packs.connected ? (
              <Empty title="The pack catalogue is not connected to the api yet.">
                Packs ship inside the web and gateway builds; once the api reads the content
                package, each pack and its version is listed here.
              </Empty>
            ) : data.packs.items.length === 0 ? (
              <Empty title="No packs published." />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Pack</th>
                      <th scope="col">Version</th>
                      <th scope="col" className="num">
                        Challenges
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packs.items.map((pack) => (
                      <tr key={pack.id}>
                        <th scope="row">{pack.title}</th>
                        <td>{pack.version}</td>
                        <td className="num">{pack.challenges}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-section" aria-labelledby="smoke">
            <h2 id="smoke">Generated-game smoke runs</h2>
            {data.gameSmoke.runs === 0 ? (
              <Empty title="No smoke runs recorded.">
                Each generated game script runs headless before a child sees it; results appear here
                once the builder records them.
              </Empty>
            ) : (
              <>
                <p className="adm-sentence">
                  <strong>{formatPercent(data.gameSmoke.passRate)}</strong> passed (
                  {formatCount(data.gameSmoke.passed)} of {formatCount(data.gameSmoke.runs)} recent
                  runs).
                </p>
                {data.gameSmoke.topFailures.length > 0 && (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th scope="col">Top failure reasons</th>
                          <th scope="col" className="num">
                            Runs
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.gameSmoke.topFailures.map((f) => (
                          <tr key={f.reason}>
                            <th scope="row">{f.reason}</th>
                            <td className="num">{f.count}</td>
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
            <h2 id="library">Asset library QA</h2>
            {data.assetLibrary.total === 0 ? (
              <Empty title="No library assets recorded.">
                Curated art appears here with its review status once library generation starts.
              </Empty>
            ) : (
              <dl className="adm-figures">
                {(
                  [
                    ['Assets', data.assetLibrary.total],
                    ['Approved', data.assetLibrary.approved],
                    ['Rejected', data.assetLibrary.rejected],
                    ['Waiting for review', data.assetLibrary.pending],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label}>
                    <dt>{label}</dt>
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
