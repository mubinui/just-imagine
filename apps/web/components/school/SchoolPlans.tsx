'use client';
import { planOffers } from '@just-imagine/protocol';
import { schoolRequest } from '../../lib/school/api';
import { useConsoleCopy } from '../../lib/school/console-copy';
import type { SchoolMe } from '../../lib/school/types';
import { ActionNotice, useSchoolAction } from './shared';
import { UiIcon } from '../UiIcon';

/** School plans a teacher can take as a free promotion while payments are off. */
export function SchoolPlans({ me }: { me: SchoolMe }) {
  const { c, n, language } = useConsoleCopy();
  const action = useSchoolAction();
  if (!me.promotions) return null;
  const bn = language === 'bn';
  const current = me.school.planId;
  return (
    <section className="sch-panel-card sch-plans" aria-labelledby="ov-plans">
      <div className="sch-card-head">
        <h2 id="ov-plans">{c('schoolPlan')}</h2>
      </div>
      <p className="sch-muted">{c('schoolPlanLead')}</p>
      <ActionNotice action={action} />
      <div className="sch-plan-cards">
        {planOffers('school').map((plan) => {
          const mine = plan.id === current;
          return (
            <article
              key={plan.id}
              className="sch-plan-card"
              data-current={mine || undefined}
              data-recommended={plan.recommended || undefined}
            >
              <h3>{bn ? plan.name.bn : plan.name.en}</h3>
              <p className="sch-plan-price">
                <s>
                  {plan.price
                    ? bn
                      ? `৳${n(plan.price.bdt)}`
                      : `৳${plan.price.bdt.toLocaleString('en')}`
                    : c('planOnRequest')}
                </s>{' '}
                <span className="sch-plan-promo">{c('planPromo')}</span>
              </p>
              <p>{bn ? plan.summary.bn : plan.summary.en}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature.en}>
                    <UiIcon name="check" />
                    {bn ? feature.bn : feature.en}
                  </li>
                ))}
                {plan.voiceSecondsPerDay !== undefined && (
                  <li>
                    <UiIcon name="check" />
                    {c('planVoice', { hours: n(plan.voiceSecondsPerDay / 3600) })}
                  </li>
                )}
              </ul>
              {mine ? (
                <span className="sch-plan-current">{c('planCurrent')}</span>
              ) : (
                <button
                  type="button"
                  className={plan.recommended ? 'sch-primary' : undefined}
                  disabled={action.busy}
                  onClick={() =>
                    void action
                      .run(() => schoolRequest('school/plan', { planId: plan.id }))
                      .then((ok) => ok && window.location.reload())
                  }
                >
                  {current ? c('planSwitch') : c('planStart')}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
