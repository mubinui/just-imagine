import { expect, it } from 'vitest';
import { PLAN_CATALOGUE, PLAN_LIMITS, planOffers } from '../src/plans';

it('offers parents a free plan and a family plan monthly and yearly', () => {
  const family = planOffers('family');
  expect(family.map((p) => p.id)).toEqual(['free', 'family-month', 'family-year']);
  expect(family.every((p) => p.tier && PLAN_LIMITS[p.tier])).toBe(true);
  const month = family.find((p) => p.id === 'family-month')!;
  const year = family.find((p) => p.id === 'family-year')!;
  expect(year.price!.bdt).toBeLessThan(month.price!.bdt * 12);
  expect(year.price!.usd).toBeLessThan(month.price!.usd * 12);
});

it('offers schools seat-based yearly plans and a custom network plan', () => {
  const schools = planOffers('school');
  expect(schools.map((p) => p.id)).toEqual(['school-classroom', 'school-standard', 'school-network']);
  for (const plan of schools) {
    expect(plan.seats).toBeGreaterThan(0);
    expect(plan.seats).toBeLessThanOrEqual(5000);
  }
  expect(schools.at(-1)!.price).toBeNull();
});

it('gives every offer a unique id and bilingual copy', () => {
  const ids = PLAN_CATALOGUE.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const plan of PLAN_CATALOGUE) {
    expect(plan.name.en && plan.name.bn).toBeTruthy();
    expect(plan.features.length).toBeGreaterThan(1);
    expect(plan.features.every((f) => f.en && f.bn)).toBe(true);
  }
});
