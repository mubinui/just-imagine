'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { ADMIN_COST_PER_UNIT_USD, type AdminOverviewResponse } from '@just-imagine/protocol';
import { adminApi, adminRequest, useAdminResource } from './adminApi';
import {
  ageBandCounts,
  formatCount,
  formatDateKey,
  formatPercent,
  formatUsd,
  formatWhen,
} from './format';
import { LoadError, PageHeading, Skeleton } from './parts';
import type { School } from '../../lib/school/types';

const loadOverview = () => adminApi<AdminOverviewResponse>('overview');
const loadSchools = () => adminRequest<{ schools: School[] }>('schools');

export function OverviewPanel() {
  useLanguage();
  const schools = useAdminResource(loadSchools);
  const { data, error, loading, reload } = useAdminResource(loadOverview);
  return (
    <>
      <PageHeading
        title={uiText('Overview')}
        detail={
          data
            ? uiText('Figures as of {v0}', { v0: String(formatWhen(data.generatedAt)) })
            : uiText('Loading live figures')
        }
        onRefresh={() => {
          void reload();
          void schools.reload();
        }}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="fleet">
            <h2 id="fleet">{uiText('Families')}</h2>
            <dl className="adm-figures">
              <div>
                <dt>{uiText('Families')}</dt>
                <dd>{formatCount(data.families)}</dd>
              </div>
              <div>
                <dt>{uiText('Explorer profiles')}</dt>
                <dd>{formatCount(data.children)}</dd>
                <dd className="adm-figure-note">{ageBandCounts(data.childrenByAgeBand)}</dd>
              </div>
              <div>
                <dt>{uiText('Paying Family plans')}</dt>
                <dd>{formatCount(data.subscriptions.family)}</dd>
              </div>
              <div>
                <dt>{uiText('Comped Family plans')}</dt>
                <dd>{formatCount(data.subscriptions.comped)}</dd>
              </div>
              <div>
                <dt>{uiText('Free plan')}</dt>
                <dd>{formatCount(data.subscriptions.free)}</dd>
              </div>
            </dl>
          </section>

          <section className="adm-section" aria-labelledby="school-fleet">
            <h2 id="school-fleet">{uiText('Schools')}</h2>
            <LoadError message={schools.error} onRetry={() => void schools.reload()} />
            {schools.loading && !schools.data ? (
              <Skeleton rows={2} />
            ) : (
              schools.data && (
                <dl className="adm-figures">
                  <div>
                    <dt>{uiText('Schools')}</dt>
                    <dd>{formatCount(schools.data.schools.length)}</dd>
                  </div>
                  <div>
                    <dt>{uiText('Students / seats')}</dt>
                    <dd>
                      {formatCount(
                        schools.data.schools.reduce((n, s) => n + (s.studentCount ?? 0), 0),
                      )}{' '}
                      / {formatCount(schools.data.schools.reduce((n, s) => n + s.seats, 0))}
                    </dd>
                  </div>
                  <div>
                    <dt>{uiText('Teachers')}</dt>
                    <dd>
                      {formatCount(
                        schools.data.schools.reduce((n, s) => n + (s.teacherCount ?? 0), 0),
                      )}
                    </dd>
                  </div>
                  {schools.data.schools.every((s) => s.voiceSecondsToday !== undefined) && (
                    <div>
                      <dt>{uiText('Voice minutes today')}</dt>
                      <dd>
                        {formatCount(
                          Math.round(
                            schools.data.schools.reduce(
                              (n, s) => n + (s.voiceSecondsToday ?? 0),
                              0,
                            ) / 60,
                          ),
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              )
            )}
          </section>

          <section className="adm-section" aria-labelledby="activity">
            <h2 id="activity">{uiText('Activity')}</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{uiText('Measure')}</th>
                    <th scope="col" className="num">
                      {uiText('Today')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('7 days')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('30 days')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [uiText('Sessions'), data.sessions],
                      [uiText('Voice minutes'), data.voiceMinutes],
                      [uiText('Worlds built'), data.worldsBuilt],
                      [uiText('Images generated'), data.images],
                      [uiText('Moderation blocks'), data.moderationBlocks],
                    ] as const
                  ).map(([label, w]) => (
                    <tr key={label}>
                      <th scope="row">{uiText(label)}</th>
                      <td className="num">{formatCount(w.today)}</td>
                      <td className="num">{formatCount(w.last7)}</td>
                      <td className="num">{formatCount(w.last30)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">{uiText('Estimated model cost')}</th>
                    <td className="num">{formatUsd(data.estimatedCostUsd.today)}</td>
                    <td className="num">{formatUsd(data.estimatedCostUsd.last7)}</td>
                    <td className="num">{formatUsd(data.estimatedCostUsd.last30)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="adm-note">
              {data.builder.finished30 || data.builder.failed30
                ? uiText('World builds in the last 30 days: {v0} finished, {v1} failed ({v2}).', {
                    v0: data.builder.finished30,
                    v1: data.builder.failed30,
                    v2: formatPercent(data.builder.failureRate),
                  })
                : uiText('No world builds in the last 30 days.')}
            </p>
          </section>

          <section className="adm-section" aria-labelledby="week">
            <h2 id="week">{uiText('Last seven days')}</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{uiText('Day (UTC)')}</th>
                    <th scope="col" className="num">
                      {uiText('Sessions')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('Voice min')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('Worlds')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('Images')}
                    </th>
                    <th scope="col" className="num">
                      {uiText('Est. cost')}
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
              {uiText(
                'Cost is an estimate from usage counters at {v0} per voice minute, {v1} per world build and {v2} per image. Compare it with the Cloud Billing export before acting on it.',
                {
                  v0: formatUsd(ADMIN_COST_PER_UNIT_USD.voiceMinute),
                  v1: formatUsd(ADMIN_COST_PER_UNIT_USD.worldBuild),
                  v2: formatUsd(ADMIN_COST_PER_UNIT_USD.image),
                },
              )}
            </p>
          </section>
        </>
      )}
    </>
  );
}
