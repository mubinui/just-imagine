import { z } from 'zod';

export const PlanTierSchema = z.enum(['free', 'family']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const PlanLimitsSchema = z.object({
  children: z.number().int().nonnegative(),
  voiceSecondsPerDay: z.number().int().nonnegative(),
  worldsPerDay: z.number().int().nonnegative(),
  imagesPerWorld: z.number().int().nonnegative(),
  savedWorlds: z.number().int().nonnegative(),
});
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    children: 1,
    voiceSecondsPerDay: 15 * 60,
    worldsPerDay: 3,
    imagesPerWorld: 8,
    savedWorlds: 10,
  },
  family: {
    children: 4,
    voiceSecondsPerDay: 60 * 60,
    worldsPerDay: 20,
    imagesPerWorld: 16,
    savedWorlds: 200,
  },
};

export const QUOTA_WARNING_SECONDS = 120;

/** Bilingual text for plan cards. */
export interface PlanText {
  en: string;
  bn: string;
}

/** A default subscription offer shown to parents or schools. Prices are display defaults. */
export interface PlanOffer {
  id: string;
  audience: 'family' | 'school';
  /** The family tier this offer grants; schools are seat-based instead. */
  tier?: PlanTier;
  name: PlanText;
  /** Taka and US dollars; null means priced on request. */
  price: { bdt: number; usd: number } | null;
  period: 'month' | 'year' | null;
  /** Student seats for school plans. */
  seats?: number;
  teachers?: number;
  summary: PlanText;
  features: PlanText[];
  recommended?: boolean;
}

const minutes = (seconds: number) => seconds / 60;

export const PLAN_CATALOGUE: readonly PlanOffer[] = [
  {
    id: 'free',
    audience: 'family',
    tier: 'free',
    name: { en: 'Free', bn: 'ফ্রি' },
    price: { bdt: 0, usd: 0 },
    period: null,
    summary: { en: 'Try Just Imagine with one explorer.', bn: 'একজন অভিযাত্রীকে নিয়ে জাস্ট ইমাজিন শুরু করুন।' },
    features: [
      { en: '1 explorer', bn: '১ জন অভিযাত্রী' },
      {
        en: `${minutes(PLAN_LIMITS.free.voiceSecondsPerDay)} voice minutes a day`,
        bn: 'দিনে ১৫ মিনিট কথা',
      },
      { en: `${PLAN_LIMITS.free.worldsPerDay} new worlds a day`, bn: 'দিনে ৩টি নতুন জগৎ' },
      { en: 'Learn worlds and stories', bn: 'শেখার জগৎ আর গল্প' },
      { en: 'Shows clearly labelled sponsor cards', bn: 'স্পষ্ট চিহ্নিত স্পনসর কার্ড দেখায়' },
    ],
  },
  {
    id: 'family-month',
    audience: 'family',
    tier: 'family',
    name: { en: 'Family, monthly', bn: 'ফ্যামিলি, মাসিক' },
    price: { bdt: 499, usd: 4.99 },
    period: 'month',
    summary: { en: 'Everything for up to four explorers.', bn: 'চারজন পর্যন্ত অভিযাত্রীর জন্য সবকিছু।' },
    features: [
      { en: `${PLAN_LIMITS.family.children} explorers`, bn: '৪ জন অভিযাত্রী' },
      {
        en: `${minutes(PLAN_LIMITS.family.voiceSecondsPerDay)} voice minutes a day`,
        bn: 'দিনে ৬০ মিনিট কথা',
      },
      { en: `${PLAN_LIMITS.family.worldsPerDay} new worlds a day`, bn: 'দিনে ২০টি নতুন জগৎ' },
      { en: `Save up to ${PLAN_LIMITS.family.savedWorlds} worlds`, bn: '২০০টি পর্যন্ত জগৎ সংরক্ষণ' },
      { en: 'No sponsor cards', bn: 'কোনো স্পনসর কার্ড নেই' },
    ],
  },
  {
    id: 'family-year',
    audience: 'family',
    tier: 'family',
    name: { en: 'Family, yearly', bn: 'ফ্যামিলি, বার্ষিক' },
    price: { bdt: 4990, usd: 49.9 },
    period: 'year',
    summary: { en: 'The Family plan with two months free.', bn: 'দুই মাস বিনামূল্যে ফ্যামিলি প্ল্যান।' },
    features: [
      { en: 'Everything in Family', bn: 'ফ্যামিলির সবকিছু' },
      { en: 'Two months free each year', bn: 'প্রতি বছর দুই মাস বিনামূল্যে' },
    ],
    recommended: true,
  },
  {
    id: 'school-classroom',
    audience: 'school',
    name: { en: 'Classroom', bn: 'ক্লাসরুম' },
    price: { bdt: 15000, usd: 150 },
    period: 'year',
    seats: 40,
    teachers: 2,
    summary: { en: 'One class, its teachers and every lesson.', bn: 'একটি ক্লাস, শিক্ষক আর সব পাঠ।' },
    features: [
      { en: '40 student seats', bn: '৪০ জন শিক্ষার্থী' },
      { en: '2 teachers', bn: '২ জন শিক্ষক' },
      { en: 'Lessons, simulations and the chemistry bench', bn: 'পাঠ, সিমুলেশন আর রসায়ন ল্যাব' },
      { en: 'Results and leaderboard', bn: 'ফলাফল আর লিডারবোর্ড' },
    ],
  },
  {
    id: 'school-standard',
    audience: 'school',
    name: { en: 'School', bn: 'স্কুল' },
    price: { bdt: 120000, usd: 1200 },
    period: 'year',
    seats: 500,
    teachers: 20,
    summary: { en: 'A whole school, with AI lesson writing.', bn: 'পুরো স্কুল, এআই দিয়ে পাঠ লেখা সহ।' },
    features: [
      { en: '500 student seats', bn: '৫০০ জন শিক্ষার্থী' },
      { en: '20 teachers', bn: '২০ জন শিক্ষক' },
      { en: 'AI lesson writing and simulation generation', bn: 'এআই দিয়ে পাঠ লেখা ও সিমুলেশন তৈরি' },
      { en: 'Voice tutor for students', bn: 'শিক্ষার্থীদের জন্য ভয়েস টিউটর' },
    ],
    recommended: true,
  },
  {
    id: 'school-network',
    audience: 'school',
    name: { en: 'School network', bn: 'স্কুল নেটওয়ার্ক' },
    price: null,
    period: 'year',
    seats: 5000,
    teachers: 200,
    summary: { en: 'Several schools under one agreement.', bn: 'একটি চুক্তিতে কয়েকটি স্কুল।' },
    features: [
      { en: 'Up to 5,000 seats', bn: '৫,০০০ পর্যন্ত আসন' },
      { en: 'Shared lesson library across schools', bn: 'স্কুলগুলোর মধ্যে ভাগ করা পাঠ' },
      { en: 'Onboarding and training', bn: 'শুরু করানো ও প্রশিক্ষণ' },
    ],
  },
];

export function planOffers(audience: PlanOffer['audience']): PlanOffer[] {
  return PLAN_CATALOGUE.filter((plan) => plan.audience === audience);
}
