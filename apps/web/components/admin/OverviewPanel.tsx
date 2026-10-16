'use client';
import { ADMIN_COST_PER_UNIT_USD, type AdminOverviewResponse } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatCount, formatDateKey, formatPercent, formatUsd, formatWhen } from './format';
import { LoadError, PageHeading, Skeleton } from './parts';

const loadOverview = () => adminApi<AdminOverviewResponse>('overview');

export function OverviewPanel() {
  const { data, error, loading, reload } = useAdminResource(loadOverview);
  return (
    <>
      <PageHeading
        title="Overview"
        detail={data ? `Figures as of ${formatWhen(data.generatedAt)}` : 'Loading live figures'}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="fleet">
            <h2 id="fleet">Families</h2>
            <dl className="adm-figures">
              <div>
                <dt>Families</dt>
                <dd>{formatCount(data.families)}</dd>
              </div>
              <div>
                <dt>Explorer profiles</dt>
                <dd>{formatCount(data.children)}</dd>
                <dd className="adm-figure-note">
                  {data.childrenByAgeBand['6-7']} aged 6–7 · {data.childrenByAgeBand['8-10']} aged
                  8–10 · {data.childrenByAgeBand['11-13']} aged 11–13
                </dd>
              </div>
              <div>
                <dt>Paying Family plans</dt>
                <dd>{formatCount(data.subscriptions.family)}</dd>
              </div>
              <div>
                <dt>Comped Family plans</dt>
                <dd>{formatCount(data.subscriptions.comped)}</dd>
              </div>
              <div>
                <dt>Free plan</dt>
                <dd>{formatCount(data.subscriptions.free)}</dd>
              </div>
            </dl>
          </section>

          <section className="adm-section" aria-labelledby="activity">
            <h2 id="activity">Activity</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Measure</th>
                    <th scope="col" className="num">
                      Today
                    </th>
                    <th scope="col" className="num">
                      7 days
                    </th>
                    <th scope="col" className="num">
                      30 days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['Sessions', data.sessions],
                      ['Voice minutes', data.voiceMinutes],
                      ['Worlds built', data.worldsBuilt],
                      ['Images generated', data.images],
                      ['Moderation blocks', data.moderationBlocks],
                    ] as const
                  ).map(([label, w]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td className="num">{formatCount(w.today)}</td>
                      <td className="num">{formatCount(w.last7)}</td>
                      <td className="num">{formatCount(w.last30)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Estimated model cost</th>
                    <td className="num">{formatUsd(data.estimatedCostUsd.today)}</td>
                    <td className="num">{formatUsd(data.estimatedCostUsd.last7)}</td>
                    <td className="num">{formatUsd(data.estimatedCostUsd.last30)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="adm-note">
              World builds in the last 30 days: {formatCount(data.builder.finished30)} finished,{' '}
              {formatCount(data.builder.failed30)} failed (
              {data.builder.finished30 ? formatPercent(data.builder.failureRate) : 'no builds yet'}
              ).
            </p>
          </section>

          <section className="adm-section" aria-labelledby="week">
            <h2 id="week">Last seven days</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Day (UTC)</th>
                    <th scope="col" className="num">
                      Sessions
                    </th>
                    <th scope="col" className="num">
                      Voice min
                    </th>
                    <th scope="col" className="num">
                      Worlds
                    </th>
                    <th scope="col" className="num">
                      Images
                    </th>
                    <th scope="col" className="num">
                      Est. cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((day) => (
                    <tr key={day.date}>
                      <th scope="row" className="adm-when">
                        {formatDateKey(day.date)}
                      </th>
                      <td className="num">{formatCount(day.sessions)}</td>
                      <td className="num">{formatCount(day.voiceMinutes)}</td>
                      <td className="num">{formatCount(day.worlds)}</td>
                      <td className="num">{formatCount(day.images)}</td>
                      <td className="num">{formatUsd(day.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-note">
              Cost is an estimate from usage counters at{' '}
              {formatUsd(ADMIN_COST_PER_UNIT_USD.voiceMinute)} per voice minute,{' '}
              {formatUsd(ADMIN_COST_PER_UNIT_USD.worldBuild)} per world build and{' '}
              {formatUsd(ADMIN_COST_PER_UNIT_USD.image)} per image. Compare it with the Cloud
              Billing export before acting on it.
            </p>
          </section>
        </>
      )}
    </>
  );
}
