import {
  LessonDocSchema,
  LessonKeysDocSchema,
  type QuizItem,
  type QuizKey,
} from '@just-imagine/protocol';
const t = (en: string, bn: string) => ({ en, bn });
type Question = { item: QuizItem; key: QuizKey };
type Text = ReturnType<typeof t>;
const hints = (en1: string, bn1: string, en2: string, bn2: string): [Text, Text] => [
  t(en1, bn1),
  t(en2, bn2),
];
type Support = {
  objective: Text;
  example: Text;
  assumptions: Text;
  misconception: Text;
  prompts: [Text, Text, Text];
  practice: Question;
  positions: Record<string, number>;
  hints: Record<string, [Text, Text]>;
  exampleAnswer: unknown;
};
function mcq(
  id: string,
  en: string,
  bn: string,
  options: [string, string][],
  answer: number,
): Question {
  return {
    item: {
      id,
      kind: 'mcq',
      prompt: t(en, bn),
      options: options.map(([e, b]) => t(e, b)),
      points: 2,
    },
    key: { kind: 'mcq', answer },
  };
}
function numeric(id: string, en: string, bn: string, value: number, unit: string): Question {
  return {
    item: { id, kind: 'numeric', prompt: t(en, bn), unit, points: 2 },
    key: { kind: 'numeric', value, tolerance: { mode: 'abs', amount: 0.01 } },
  };
}
function task(
  id: string,
  en: string,
  bn: string,
  simId: string,
  params: Record<string, unknown>,
  editable: string[],
  predicate: string,
  args: unknown,
): Question {
  return {
    item: {
      id,
      kind: 'simTask',
      prompt: t(en, bn),
      simId,
      startParams: params,
      editableParams: editable,
      points: 3,
    },
    key: { kind: 'simTask', predicate, args },
  };
}
const SUPPORT: Record<string, Support> = {
  motion: {
    objective: t(
      'Find velocity and displacement for constant acceleration; connect graph slope with acceleration and graph area with displacement.',
      'সমত্বরণে বেগ ও সরণ নির্ণয় করো; লেখচিত্রের ঢালের সঙ্গে ত্বরণ এবং ক্ষেত্রফলের সঙ্গে সরণের সম্পর্ক বোঝো।',
    ),
    example: t(
      'For u = 2 m/s, a = 1 m/s² and t = 3 s: v = u + at = 2 + 1 × 3 = 5 m/s. Displacement x = ut + ½at² = 2 × 3 + ½ × 1 × 9 = 10.5 m.',
      'u = 2 m/s, a = 1 m/s² ও t = 3 s হলে: v = u + at = 2 + 1 × 3 = 5 m/s। সরণ x = ut + ½at² = 2 × 3 + ½ × 1 × 9 = 10.5 m।',
    ),
    assumptions: t(
      'Straight-line motion starts at x = 0. Acceleration is constant until braking brings the object to rest; this model then holds it at rest and does not reverse it.',
      'সরলরেখায় চলা x = 0 থেকে শুরু হয়। ব্রেক করে থামা পর্যন্ত ত্বরণ ধ্রুব; থামার পরে এই মডেল বস্তুটিকে স্থির রাখে, উল্টো দিকে চালায় না।',
    ),
    misconception: t(
      'A rising position–time curve does not by itself mean constant velocity. Use the velocity readings and graph scale; a horizontal velocity–time line can represent steady motion.',
      'অবস্থান–সময় রেখা ওপরে উঠলেই বেগ ধ্রুব হয় না। বেগের মান ও লেখচিত্রের স্কেল দেখো; অনুভূমিক বেগ–সময় রেখাও সমবেগে চলা বোঝাতে পারে।',
    ),
    prompts: [
      t(
        'Predict: at the starting settings, u = 4 m/s and a = 2 m/s², what velocity and displacement will you expect after 4 s?',
        'আগে অনুমান: শুরুর মান u = 4 m/s ও a = 2 m/s² হলে 4 s পরে বেগ ও সরণ কত হতে পারে?',
      ),
      t(
        'Observe: run that case, then change only a to 0 and run again. Record both final velocities and displacements, including units.',
        'দেখো: ওই অবস্থায় চালাও, পরে শুধু a = 0 করে আবার চালাও। দুইবারের শেষ বেগ ও সরণ এককসহ লেখো।',
      ),
      t(
        'Explain: use Δv/Δt and the area under the velocity–time graph to account for the differences. Then test braking and describe what happens after rest.',
        'ব্যাখ্যা: Δv/Δt এবং বেগ–সময় লেখচিত্রের ক্ষেত্রফল দিয়ে পার্থক্যের কারণ বোঝাও। পরে ব্রেক করে দেখো; থামার পর কী হয় বলো।',
      ),
    ],
    practice: mcq(
      'check1',
      'A cart moves at a steady nonzero velocity. Which velocity–time graph fits?',
      'একটি গাড়ি শূন্য নয় এমন ধ্রুব বেগে চলে। কোন বেগ–সময় রেখাটি মেলে?',
      [
        ['A horizontal line above zero', 'শূন্যের ওপরে অনুভূমিক রেখা'],
        ['A line rising from zero', 'শূন্য থেকে ঊর্ধ্বমুখী রেখা'],
        ['A vertical line', 'উল্লম্ব রেখা'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 1, q5: 2 },
    exampleAnswer: { a: 2 },
    hints: {
      check1: hints(
        'Compare the velocity at two different times.',
        'ভিন্ন দুটি সময়ে বেগের মান তুলনা করো।',
        'A steady velocity has no change in vertical value as time increases.',
        'সময় বাড়লেও ধ্রুব বেগের উল্লম্ব মান বদলায় না।',
      ),
      q1: hints(
        'Slope is the change in the vertical quantity divided by the change in time.',
        'ঢাল হলো উল্লম্ব রাশির পরিবর্তনকে সময়ের পরিবর্তন দিয়ে ভাগ করলে যা হয়।',
        'Here the vertical quantity is velocity; consider the units (m/s)/s.',
        'এখানে উল্লম্ব রাশি বেগ; (m/s)/s এককটি ভেবে দেখো।',
      ),
      q2: hints(
        'Use v = u + at because acceleration is constant throughout these 4 s.',
        'এই 4 s-এ ত্বরণ ধ্রুব, তাই v = u + at ব্যবহার করো।',
        'Multiply 2 m/s² by 4 s before adding the initial 4 m/s.',
        'আদি বেগ 4 m/s যোগ করার আগে 2 m/s²-কে 4 s দিয়ে গুণ করো।',
      ),
      q3: hints(
        'Keep u and duration fixed; the task lets you change acceleration only.',
        'u ও সময়কাল অপরিবর্তিত রাখো; এই কাজে শুধু ত্বরণ বদলানো যাবে।',
        'Rearrange a = (target velocity − initial velocity)/duration, then check the final reading.',
        'a = (লক্ষ্য বেগ − আদি বেগ)/সময়কাল থেকে মান বের করে শেষ বেগ মিলিয়ে দেখো।',
      ),
      q4: hints(
        'Displacement includes both the initial-velocity contribution and the acceleration contribution.',
        'সরণে আদি বেগ ও ত্বরণ—দুইটির অবদানই থাকে।',
        'Substitute into x = 4 × 4 + ½ × 2 × 4²; keep the answer in metres.',
        'x = 4 × 4 + ½ × 2 × 4²-এ বসাও; উত্তরের একক মিটার রাখো।',
      ),
      q5: hints(
        'Use v = u + at and consider what happens to the at term.',
        'v = u + at-এ at পদের কী হয় ভাবো।',
        'Zero acceleration means no change in velocity, even if the position continues to change.',
        'ত্বরণ শূন্য মানে বেগের পরিবর্তন নেই, যদিও অবস্থান বদলাতে পারে।',
      ),
    },
  },
  cart: {
    objective: t(
      'Distinguish actual static friction from its maximum; find the starting threshold and calculate acceleration from net force.',
      'প্রকৃত স্থিতি ঘর্ষণ ও তার সর্বোচ্চ মান আলাদা করো; চলা শুরুর সীমা খুঁজে লব্ধি বল থেকে ত্বরণ হিসাব করো।',
    ),
    example: t(
      'For m = 1 kg and μs = 0.2, N = mg = 9.8 N and maximum static friction is 1.96 N. A 1 N push is balanced by 1 N of static friction, so the cart stays at rest. If it slides under a 3 N push with μk = 0.1, friction is 0.98 N and a = (3 − 0.98)/1 = 2.02 m/s².',
      'm = 1 kg ও μs = 0.2 হলে N = mg = 9.8 N এবং সর্বোচ্চ স্থিতি ঘর্ষণ 1.96 N। 1 N ধাক্কাকে 1 N স্থিতি ঘর্ষণ সাম্যাবস্থায় রাখে, তাই গাড়ি স্থির থাকে। μk = 0.1 নিয়ে 3 N ধাক্কায় পিছলে চললে ঘর্ষণ 0.98 N ও a = (3 − 0.98)/1 = 2.02 m/s²।',
    ),
    assumptions: t(
      'The cart starts from rest on a horizontal floor. The push is horizontal, g = 9.8 m/s², and the friction coefficients are constant. Weight and normal force balance vertically.',
      'গাড়ি অনুভূমিক মেঝেতে স্থির অবস্থা থেকে শুরু করে। ধাক্কা অনুভূমিক, g = 9.8 m/s² এবং ঘর্ষণ গুণাঙ্ক ধ্রুব। উল্লম্ব দিকে ওজন ও অভিলম্ব বল সাম্যাবস্থায় থাকে।',
    ),
    misconception: t(
      'Static friction is not always μsN: it matches a smaller push up to that limit. At a fixed applied push, changing mass also changes friction, so the net force need not stay fixed.',
      'স্থিতি ঘর্ষণ সব সময় μsN নয়: সীমা পর্যন্ত এটি ছোট ধাক্কার সমান হয়। প্রযুক্ত ধাক্কা একই রেখে ভর বদলালে ঘর্ষণও বদলায়, তাই লব্ধি বল একই নাও থাকতে পারে।',
    ),
    prompts: [
      t(
        'Predict: for m = 2 kg and μs = 0.3, will a 5 N push start the cart? State which two horizontal forces you compare.',
        'আগে অনুমান: m = 2 kg ও μs = 0.3 হলে 5 N ধাক্কায় গাড়ি চলবে কি? কোন দুই অনুভূমিক বল তুলনা করছ বলো।',
      ),
      t(
        'Observe: keep the coefficients fixed. Test 5 N, then increase force in 0.1 N steps near the calculated limit. Record the first available setting that moves the cart.',
        'দেখো: গুণাঙ্ক একই রাখো। 5 N পরীক্ষা করে হিসাব করা সীমার কাছে 0.1 N করে বাড়াও। যে প্রথম উপলব্ধ মানে গাড়ি চলে, তা লেখো।',
      ),
      t(
        'Explain: compare static and sliding friction. Then keep the push at 10 N and increase mass; explain the new acceleration using both friction and Fnet = ma.',
        'ব্যাখ্যা: স্থিতি ও গতীয় ঘর্ষণ তুলনা করো। পরে ধাক্কা 10 N রেখে ভর বাড়াও; ঘর্ষণ ও Fলব্ধি = ma দিয়ে নতুন ত্বরণ বোঝাও।',
      ),
    ],
    practice: numeric(
      'check1',
      'A 4 N push acts on the resting 2 kg cart; maximum static friction is 5.88 N. What is the actual friction force?',
      'স্থির 2 kg গাড়িতে 4 N ধাক্কা দেওয়া হলো; সর্বোচ্চ স্থিতি ঘর্ষণ 5.88 N। প্রকৃত ঘর্ষণ বল কত?',
      4,
      'N',
    ),
    positions: { q1: 0, q5: 0 },
    exampleAnswer: { force: 5.9 },
    hints: {
      check1: hints(
        'First decide whether the push exceeds the maximum static friction.',
        'প্রথমে দেখো ধাক্কা সর্বোচ্চ স্থিতি ঘর্ষণকে ছাড়িয়েছে কি না।',
        'While the cart remains at rest, its horizontal net force is zero, so friction balances the push.',
        'গাড়ি স্থির থাকলে অনুভূমিক লব্ধি বল শূন্য, তাই ঘর্ষণ ধাক্কাকে সাম্যাবস্থায় রাখে।',
      ),
      q1: hints(
        'Look for a contact force acting along the rough floor.',
        'রুক্ষ মেঝে বরাবর কাজ করা স্পর্শ বলটির কথা ভাবো।',
        'Weight acts vertically; the relevant horizontal contact force opposes relative sliding.',
        'ওজন উল্লম্বভাবে কাজ করে; প্রাসঙ্গিক অনুভূমিক স্পর্শ বলটি আপেক্ষিক পিছলে চলার বিরোধিতা করে।',
      ),
      q2: hints(
        'Maximum static friction is μsN; find the normal force for a horizontal floor.',
        'সর্বোচ্চ স্থিতি ঘর্ষণ μsN; অনুভূমিক মেঝেতে অভিলম্ব বল নির্ণয় করো।',
        'Use N = mg and multiply 0.3 × 2 × 9.8. The result has units of newtons.',
        'N = mg নিয়ে 0.3 × 2 × 9.8 গুণ করো। ফলের একক নিউটন।',
      ),
      q3: hints(
        'Find μs × m × g, then choose a push slightly greater than that threshold.',
        'μs × m × g নির্ণয় করে তার সামান্য বেশি ধাক্কা বেছে নাও।',
        'Use the first 0.1 N setting above the limit; a much larger push does not meet “just starts”.',
        'সীমার ওপরের প্রথম 0.1 N ধাপটি নাও; অনেক বড় ধাক্কা “সবে চলা শুরু” শর্ত পূরণ করে না।',
      ),
      q4: hints(
        'Subtract the opposing friction from the applied force before using Newton’s second law.',
        'নিউটনের দ্বিতীয় সূত্র ব্যবহারের আগে প্রযুক্ত বল থেকে বিপরীত ঘর্ষণ বিয়োগ করো।',
        'Calculate a = (10 − 3.92)/2 and retain the acceleration unit.',
        'a = (10 − 3.92)/2 হিসাব করো এবং ত্বরণের একক রাখো।',
      ),
      q5: hints(
        'The question fixes net force, not merely the applied push.',
        'প্রশ্নে লব্ধি বল ধ্রুব বলা হয়েছে, শুধু প্রযুক্ত ধাক্কা নয়।',
        'In a = Fnet/m, compare the denominator before and after the mass is doubled.',
        'a = Fলব্ধি/m-এ ভর দ্বিগুণের আগে ও পরে হর তুলনা করো।',
      ),
    },
  },
  circuit: {
    objective: t(
      'Calculate current with Ohm’s law; compare equivalent resistance, branch voltage and current in series and parallel circuits.',
      'ওহমের সূত্রে প্রবাহ হিসাব করো; শ্রেণি ও সমান্তরাল বর্তনীতে তুল্য রোধ, শাখার বিভব পার্থক্য ও প্রবাহ তুলনা করো।',
    ),
    example: t(
      'Two 6 Ω resistors in series give Req = 6 + 6 = 12 Ω; a 6 V source gives I = 6/12 = 0.5 A. In parallel, 1/Req = 1/6 + 1/6, so Req = 3 Ω and total current is 2 A. Each parallel branch carries 1 A.',
      'দুটি 6 Ω রোধ শ্রেণিতে দিলে Req = 6 + 6 = 12 Ω; 6 V উৎসে I = 6/12 = 0.5 A। সমান্তরালে 1/Req = 1/6 + 1/6, তাই Req = 3 Ω ও মোট প্রবাহ 2 A। প্রতিটি সমান্তরাল শাখায় 1 A চলে।',
    ),
    assumptions: t(
      'The source has no internal resistance; wires have negligible resistance and the resistors remain at fixed temperature. This is a virtual circuit, not wiring instructions.',
      'উৎসের অভ্যন্তরীণ রোধ নেই; তারের রোধ উপেক্ষণীয় এবং রোধকের তাপমাত্রা স্থির। এটি ভার্চুয়াল বর্তনী, বাস্তবে সংযোগ দেওয়ার নির্দেশনা নয়।',
    ),
    misconception: t(
      'Current is not used up as it passes through a series resistor. Equal parallel voltage does not imply equal branch currents when resistances differ.',
      'শ্রেণি রোধকের মধ্য দিয়ে যেতে প্রবাহ ফুরিয়ে যায় না। সমান্তরালে বিভব পার্থক্য সমান হলেও রোধ আলাদা হলে শাখার প্রবাহ সমান হয় না।',
    ),
    prompts: [
      t(
        'Predict: with a 6 V source and 10 Ω and 20 Ω resistors, which arrangement should draw more total current: series or parallel?',
        'আগে অনুমান: 6 V উৎস ও 10 Ω, 20 Ω রোধে কোন সংযোগে মোট প্রবাহ বেশি হবে—শ্রেণি না সমান্তরাল?',
      ),
      t(
        'Observe: keep the source and resistors fixed, switch topology and record total resistance, total current and each branch voltage/current.',
        'দেখো: উৎস ও রোধ একই রেখে সংযোগ বদলাও; মোট রোধ, মোট প্রবাহ এবং প্রতিটি শাখার বিভব পার্থক্য ও প্রবাহ লেখো।',
      ),
      t(
        'Explain: use the resistance rules and V = IR to explain your readings. Return to series before comparing how a source-voltage change affects current.',
        'ব্যাখ্যা: রোধের নিয়ম ও V = IR দিয়ে মানগুলো বোঝাও। উৎসের বিভব পার্থক্য বদলে প্রবাহ তুলনা করার আগে শ্রেণি সংযোগে ফেরো।',
      ),
    ],
    practice: mcq(
      'check1',
      'With resistance fixed, which source change doubles the current from its value at 6 V?',
      'রোধ একই রেখে 6 V-এ পাওয়া প্রবাহ দ্বিগুণ করতে উৎসে কী পরিবর্তন দরকার?',
      [
        ['Set the source to 12 V', 'উৎস 12 V করো'],
        ['Set the source to 3 V', 'উৎস 3 V করো'],
        ['Keep the source at 6 V', 'উৎস 6 V রাখো'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 2, q5: 1 },
    exampleAnswer: { emf: 6 },
    hints: {
      check1: hints(
        'At fixed resistance, current is proportional to source voltage.',
        'রোধ ধ্রুব হলে প্রবাহ উৎসের বিভব পার্থক্যের সমানুপাতিক।',
        'Compare Inew/Iold = Vnew/6; look for a voltage ratio of two.',
        'Iনতুন/Iআগের = Vনতুন/6 তুলনা করো; বিভব পার্থক্যের অনুপাত দুই হতে হবে।',
      ),
      q1: hints(
        'Use the relationship between potential difference, current and resistance.',
        'বিভব পার্থক্য, প্রবাহ ও রোধের সম্পর্কটি ব্যবহার করো।',
        'A current I through resistance R needs a potential difference equal to their product.',
        'R রোধে I প্রবাহের জন্য এদের গুণফলের সমান বিভব পার্থক্য দরকার।',
      ),
      q2: hints(
        'The two resistors are in one series path, not separate branches.',
        'দুটি রোধ একই শ্রেণি পথে আছে, আলাদা শাখায় নয়।',
        'For series resistors, add their resistance values without taking reciprocals.',
        'শ্রেণি রোধে বিপরীত মান না নিয়ে রোধের মানগুলো যোগ করো।',
      ),
      q3: hints(
        'Keep both resistors and the series connection locked; only the source voltage can change.',
        'দুটি রোধ ও শ্রেণি সংযোগ একই রাখো; শুধু উৎসের বিভব পার্থক্য বদলানো যাবে।',
        'Use V = target current × total resistance, then check the total-current reading.',
        'V = লক্ষ্য প্রবাহ × মোট রোধ ব্যবহার করে মোট প্রবাহের মান মিলিয়ে দেখো।',
      ),
      q4: hints(
        'Ohm’s law can be rearranged to I = V/R.',
        'ওহমের সূত্র সাজালে I = V/R হয়।',
        'Divide the source voltage by the total 30 Ω resistance; the unit is amperes.',
        'উৎসের বিভব পার্থক্যকে মোট 30 Ω রোধ দিয়ে ভাগ করো; একক অ্যাম্পিয়ার।',
      ),
      q5: hints(
        'Parallel branches connect across the same pair of source terminals.',
        'সমান্তরাল শাখাগুলো উৎসের একই দুই প্রান্তে যুক্ত থাকে।',
        'Compare the potential difference across each branch; unequal resistance can still give unequal current.',
        'প্রতিটি শাখার বিভব পার্থক্য তুলনা করো; রোধ অসমান হলে প্রবাহও অসমান হতে পারে।',
      ),
    },
  },
  linear: {
    objective: t(
      'Read slope and y-intercept in y = mx + c; predict a point and distinguish tilting from vertical translation.',
      'y = mx + c-এ ঢাল ও y-অক্ষছেদ পড়ো; একটি বিন্দুর মান অনুমান করে হেলে যাওয়া ও উল্লম্ব সরণ আলাদা করো।',
    ),
    example: t(
      'For y = −x + 4, the y-intercept is 4. When x increases from 1 to 3, y changes from 3 to 1: slope = (1 − 3)/(3 − 1) = −1. Changing c to 2 moves the line down by 2 without changing that slope.',
      'y = −x + 4-এর y-অক্ষছেদ 4। x-এর মান 1 থেকে 3 হলে y-এর মান 3 থেকে 1: ঢাল = (1 − 3)/(3 − 1) = −1। c = 2 করলে ঢাল না বদলে রেখা 2 একক নিচে সরে।',
    ),
    assumptions: t(
      'This model uses y = mx + c with finite m, so it cannot represent a vertical line. Read the numbered axes; a screen angle alone is not a slope measurement.',
      'এই মডেলে সসীম m নিয়ে y = mx + c ব্যবহার হয়, তাই উল্লম্ব রেখা দেখানো যায় না। অক্ষের সংখ্যাগুলো পড়ো; শুধু পর্দায় দেখা কোণ দিয়ে ঢাল মাপা যায় না।',
    ),
    misconception: t(
      'The intercept c is the value of y at x = 0, not always where the line crosses the x-axis. A horizontal line has slope zero, not an undefined slope.',
      'c হলো x = 0-তে y-এর মান, রেখার x-অক্ষছেদ নয়। অনুভূমিক রেখার ঢাল শূন্য; অসংজ্ঞায়িত নয়।',
    ),
    prompts: [
      t(
        'Predict: for m = 2 and c = 1, what happens to y when x increases by 1? What changes if c alone becomes 3?',
        'আগে অনুমান: m = 2 ও c = 1 হলে x এক বাড়লে y কত বদলাবে? শুধু c = 3 করলে কী বদলাবে?',
      ),
      t(
        'Observe: keep m fixed and compare c = 1 with c = 3. Then restore c = 1 and compare positive, zero and negative slopes.',
        'দেখো: m একই রেখে c = 1 ও c = 3 তুলনা করো। পরে c = 1-এ ফিরে ধনাত্মক, শূন্য ও ঋণাত্মক ঢাল তুলনা করো।',
      ),
      t(
        'Explain: use two numbered points to calculate Δy/Δx and identify the y-intercept. Explain why changing c does not change that ratio.',
        'ব্যাখ্যা: অক্ষের সংখ্যা দেখে দুটি বিন্দু নিয়ে Δy/Δx হিসাব করো এবং y-অক্ষছেদ চেনো। c বদলালে কেন অনুপাতটি বদলায় না বোঝাও।',
      ),
    ],
    practice: mcq(
      'check1',
      'In y = 2x + c, changing c from 1 to 3 while m stays 2 does what?',
      'y = 2x + c-এ m = 2 রেখে c-এর মান 1 থেকে 3 করলে কী হয়?',
      [
        ['The line moves up by 2 units', 'রেখা 2 একক ওপরে সরে'],
        ['The slope becomes 3', 'ঢাল 3 হয়'],
        ['The line becomes vertical', 'রেখা উল্লম্ব হয়'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 1, q5: 2 },
    exampleAnswer: { m: 3 },
    hints: {
      check1: hints(
        'Compare the old and new y-values at the same x.',
        'একই x-এ আগের ও নতুন y-এর মান তুলনা করো।',
        'The coefficient of x stays fixed while the constant term increases by 2.',
        'x-এর সহগ একই থাকে, শুধু ধ্রুব পদ 2 বাড়ে।',
      ),
      q1: hints(
        'Slope tells how much y changes for a unit increase in x.',
        'x এক বাড়লে y কত বদলায়, ঢাল তা বোঝায়।',
        'Identify the coefficient multiplying x rather than the constant term.',
        'ধ্রুব পদ নয়, x-কে গুণ করা সহগটি চেনো।',
      ),
      q2: hints(
        'Replace x with the given value before simplifying.',
        'সরল করার আগে x-এর জায়গায় দেওয়া মান বসাও।',
        'Multiply 2 by 3 first, then add the constant 1.',
        'আগে 2-কে 3 দিয়ে গুণ করে পরে ধ্রুব পদ 1 যোগ করো।',
      ),
      q3: hints(
        'Only the slope parameter is editable in this task.',
        'এই কাজে শুধু ঢালের পরামিতি বদলানো যাবে।',
        'Match the coefficient of x to the target slope while retaining the original intercept.',
        'আগের অক্ষছেদ রেখে x-এর সহগকে লক্ষ্য ঢালের সঙ্গে মেলাও।',
      ),
      q4: hints(
        'The y-axis is where x = 0.',
        'y-অক্ষে x = 0 হয়।',
        'Put x = 0 into y = 2x + 1 and identify the remaining term.',
        'y = 2x + 1-এ x = 0 বসিয়ে অবশিষ্ট পদটি চেনো।',
      ),
      q5: hints(
        'On a horizontal line, two points can have different x but the same y.',
        'অনুভূমিক রেখার দুটি বিন্দুতে x আলাদা হলেও y একই।',
        'Calculate Δy/Δx with Δy = 0 and a nonzero horizontal change.',
        'Δy = 0 এবং শূন্য নয় এমন অনুভূমিক পরিবর্তন নিয়ে Δy/Δx হিসাব করো।',
      ),
    },
  },
  circle: {
    objective: t(
      'Connect unit-circle coordinates with sine and cosine; identify when tangent is undefined.',
      'একক বৃত্তের স্থানাঙ্কের সঙ্গে sine ও cosine-এর সম্পর্ক বোঝো; tangent কখন অসংজ্ঞায়িত চেনো।',
    ),
    example: t(
      'At 60°, a unit-circle point is (½, √3/2), so cos 60° = ½ and sin 60° = √3/2. At 180° the point is (−1, 0): cosine is negative but sine is zero.',
      '60°-তে একক বৃত্তের বিন্দু (½, √3/2), তাই cos 60° = ½ ও sin 60° = √3/2। 180°-তে বিন্দু (−1, 0): cosine ঋণাত্মক, কিন্তু sine শূন্য।',
    ),
    assumptions: t(
      'Radius is 1, angles are in degrees measured anticlockwise from positive x, and the model extends through a full turn. This is a coordinate extension of right-triangle ratios.',
      'ব্যাসার্ধ 1; ধনাত্মক x-দিক থেকে ঘড়ির কাঁটার বিপরীতে ডিগ্রিতে কোণ মাপা হয় এবং মডেলে পুরো এক পাক দেখা যায়। এটি সমকোণী ত্রিভুজের অনুপাতের স্থানাঙ্কভিত্তিক সম্প্রসারণ।',
    ),
    misconception: t(
      'Sine is the vertical coordinate, not the angle or radius. Tangent at 90° is undefined because its denominator is zero; it is not zero.',
      'sine হলো উল্লম্ব স্থানাঙ্ক, কোণ বা ব্যাসার্ধ নয়। 90°-তে হর শূন্য বলে tangent অসংজ্ঞায়িত; শূন্য নয়।',
    ),
    prompts: [
      t(
        'Predict: compare the horizontal and vertical coordinates at 0°, 90° and 180° before moving the angle.',
        'আগে অনুমান: কোণ সরানোর আগে 0°, 90° ও 180°-তে অনুভূমিক ও উল্লম্ব স্থানাঙ্ক তুলনা করো।',
      ),
      t(
        'Observe: set those angles, then compare 30° with 150°. Record the signs of sine and cosine and check the projections.',
        'দেখো: ওই কোণগুলো নিয়ে পরে 30° ও 150° তুলনা করো। sine ও cosine-এর চিহ্ন লেখো এবং অভিক্ষেপ মিলিয়ে দেখো।',
      ),
      t(
        'Explain: why do 30° and 150° have equal sine but opposite cosine? Use coordinates to explain why tangent cannot be calculated at 90°.',
        'ব্যাখ্যা: 30° ও 150°-তে sine সমান কিন্তু cosine-এর চিহ্ন বিপরীত কেন? স্থানাঙ্ক দিয়ে বোঝাও, 90°-তে tangent হিসাব করা যায় না কেন।',
      ),
    ],
    practice: mcq(
      'check1',
      'At 0° on the unit circle, which coordinate is zero?',
      'একক বৃত্তে 0° কোণে কোন স্থানাঙ্ক শূন্য?',
      [
        ['The vertical y-coordinate', 'উল্লম্ব y-স্থানাঙ্ক'],
        ['The horizontal x-coordinate', 'অনুভূমিক x-স্থানাঙ্ক'],
        ['Both coordinates', 'দুই স্থানাঙ্কই'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 2, q5: 0 },
    exampleAnswer: { angleDeg: 90 },
    hints: {
      check1: hints(
        'Locate the rightmost point of the circle on the positive x-axis.',
        'বৃত্তের ডান প্রান্তে ধনাত্মক x-অক্ষের বিন্দুটি চেনো।',
        'That point is level with the origin; consider its vertical distance from the x-axis.',
        'বিন্দুটি মূলবিন্দুর সমান উচ্চতায়; x-অক্ষ থেকে উল্লম্ব দূরত্ব ভাবো।',
      ),
      q1: hints(
        'The point is written (cos θ, sin θ) in horizontal–vertical order.',
        'বিন্দুটি অনুভূমিক–উল্লম্ব ক্রমে (cos θ, sin θ) লেখা হয়।',
        'Match the second coordinate with the vertical projection.',
        'দ্বিতীয় স্থানাঙ্ককে উল্লম্ব অভিক্ষেপের সঙ্গে মেলাও।',
      ),
      q2: hints(
        'Use the standard 30° right triangle or the circle’s vertical projection.',
        'প্রচলিত 30° সমকোণী ত্রিভুজ বা বৃত্তের উল্লম্ব অভিক্ষেপ ব্যবহার করো।',
        'For the 30° triangle, opposite side : hypotenuse = 1 : 2; convert the ratio to a decimal.',
        '30° ত্রিভুজে বিপরীত বাহু : অতিভুজ = 1 : 2; অনুপাতটি দশমিকে লেখো।',
      ),
      q3: hints(
        'Sine is greatest at the top of a unit circle.',
        'একক বৃত্তের সর্বোচ্চ বিন্দুতে sine সর্বোচ্চ হয়।',
        'Move to the positive y-axis, then check that the vertical reading equals the radius.',
        'ধনাত্মক y-অক্ষে গিয়ে দেখো উল্লম্ব মান ব্যাসার্ধের সমান হয়েছে কি না।',
      ),
      q4: hints(
        'At 0°, the radius points along the positive x-axis.',
        '0°-তে ব্যাসার্ধ ধনাত্মক x-অক্ষ বরাবর থাকে।',
        'Cosine is the horizontal coordinate; compare that coordinate with the unit radius.',
        'cosine অনুভূমিক স্থানাঙ্ক; সেটিকে একক ব্যাসার্ধের সঙ্গে তুলনা করো।',
      ),
      q5: hints(
        'Write tangent as sin θ divided by cos θ.',
        'tangent-কে sin θ ভাগ cos θ হিসেবে লেখো।',
        'At the top of the circle the horizontal coordinate is zero; division by zero has no defined value.',
        'বৃত্তের সর্বোচ্চ বিন্দুতে অনুভূমিক স্থানাঙ্ক শূন্য; শূন্য দিয়ে ভাগের সংজ্ঞায়িত মান নেই।',
      ),
    },
  },
  'acid-base': {
    objective: t(
      'Relate pH and indicator color; use concentration and volume to compare acid/base equivalents and predict excess reagent.',
      'pH ও নির্দেশকের রঙের সম্পর্ক বোঝো; ঘনমাত্রা ও আয়তন থেকে এসিড–ক্ষারক সমতুল্য তুলনা করে অতিরিক্ত বিকারক অনুমান করো।',
    ),
    example: t(
      'For 20 mL of 0.1 M HCl, n = CV = 0.1 × 0.020 = 0.002 mol. The same amount of 0.1 M NaOH supplies 0.002 mol OH⁻, so this 1:1 strong-acid/base pair reaches ideal neutrality. Equal volume alone is insufficient if concentrations differ.',
      '20 mL, 0.1 M HCl-এ n = CV = 0.1 × 0.020 = 0.002 mol। একই পরিমাণ 0.1 M NaOH থেকে 0.002 mol OH⁻ মেলে, তাই 1:1 অনুপাতে এই শক্তিশালী এসিড–ক্ষারক আদর্শ নিরপেক্ষতায় পৌঁছায়। ঘনমাত্রা আলাদা হলে শুধু সমান আয়তন যথেষ্ট নয়।',
    ),
    assumptions: t(
      'The quantity calculation represents ideal dilute strong acids/bases at 25°C, not every acid or real solution. Indicators are treated as a small qualitative addition, not as a measured reactant.',
      'পরিমাণের হিসাবটি 25°C-তে আদর্শ লঘু শক্তিশালী এসিড–ক্ষারকের জন্য; সব এসিড বা বাস্তব দ্রবণের জন্য নয়। নির্দেশককে অল্প গুণগত সংযোজন ধরা হয়, মাপা বিক্রিয়ক নয়।',
    ),
    misconception: t(
      'A colorless phenolphthalein sample is not proof of neutrality: acids are colorless with it too. In this model a neutral solution has pH 7 at 25°C.',
      'ফেনলফথ্যালিনে বর্ণহীন হওয়া নিরপেক্ষতার প্রমাণ নয়: এসিডেও এটি বর্ণহীন। এই মডেলে 25°C-তে নিরপেক্ষ দ্রবণের pH 7।',
    ),
    prompts: [
      t(
        'Predict: compare equal 50 mL portions of 0.1 M HCl and NaOH with 50 mL acid plus 100 mL base. Which mixture has excess base?',
        'আগে অনুমান: 0.1 M HCl ও NaOH-এর সমান 50 mL মিশ্রণ এবং 50 mL এসিডের সঙ্গে 100 mL ক্ষারক তুলনা করো। কোনটিতে ক্ষারক অতিরিক্ত?',
      ),
      t(
        'Observe: mix each case on the virtual bench with one indicator at a time. Record pH, indicator color and remaining moles; keep concentration at 0.1 M.',
        'দেখো: একবারে একটি নির্দেশক নিয়ে ভার্চুয়াল বেঞ্চে দুই অবস্থাই মেশাও। pH, নির্দেশকের রং ও অবশিষ্ট মোল লেখো; ঘনমাত্রা 0.1 M রাখো।',
      ),
      t(
        'Explain: compare CV for acid and base. Explain why equal volume is not enough at unequal concentration, and why color alone may not identify neutral pH.',
        'ব্যাখ্যা: এসিড ও ক্ষারকের CV তুলনা করো। ঘনমাত্রা অসমান হলে সমান আয়তন কেন যথেষ্ট নয় এবং শুধু রং দেখে কেন নিরপেক্ষ pH জানা যায় না বোঝাও।',
      ),
    ],
    practice: mcq(
      'check1',
      'Equal volumes of 0.05 M HCl and 0.1 M NaOH are mixed. Which reagent is in excess?',
      '0.05 M HCl ও 0.1 M NaOH-এর সমান আয়তন মেশানো হলো। কোন বিকারক অতিরিক্ত?',
      [
        ['NaOH', 'NaOH'],
        ['HCl', 'HCl'],
        [
          'Neither; equal volumes always neutralise',
          'কোনোটিই নয়; সমান আয়তন সব সময় নিরপেক্ষ হয়',
        ],
      ],
      0,
    ),
    positions: { check1: 0, q1: 0, q4: 1, q5: 2 },
    exampleAnswer: {
      reagentIds: ['hcl', 'naoh', 'litmus'],
      heat: false,
      amounts: {
        hcl: { volumeMl: 50, concentrationM: 0.1 },
        naoh: { volumeMl: 50, concentrationM: 0.1 },
      },
    },
    hints: {
      check1: hints(
        'Use n = CV rather than comparing volumes alone.',
        'শুধু আয়তন তুলনা না করে n = CV ব্যবহার করো।',
        'The volumes match, but the NaOH concentration is twice the HCl concentration; both react in a 1:1 ratio.',
        'আয়তন সমান, কিন্তু NaOH-এর ঘনমাত্রা HCl-এর দ্বিগুণ; এরা 1:1 অনুপাতে বিক্রিয়া করে।',
      ),
      q1: hints(
        'Use the neutral reference pH at the stated room temperature.',
        'বলা ঘরের তাপমাত্রায় নিরপেক্ষ pH-কে তুলনার মান ধরো।',
        'Acidic solutions have a greater hydrogen-ion concentration than the neutral reference.',
        'এসিডীয় দ্রবণে নিরপেক্ষ অবস্থার তুলনায় হাইড্রোজেন আয়নের ঘনমাত্রা বেশি।',
      ),
      q2: hints(
        'At 25°C, neutrality means equal hydrogen-ion and hydroxide-ion concentrations.',
        '25°C-তে নিরপেক্ষতা মানে হাইড্রোজেন ও হাইড্রক্সাইড আয়নের ঘনমাত্রা সমান।',
        'Use the usual 25°C neutral point on the pH scale, halfway between 0 and 14.',
        'pH স্কেলের 0 ও 14-এর মাঝের প্রচলিত 25°C নিরপেক্ষ মানটি ভাবো।',
      ),
      q3: hints(
        'Use the offered strong acid and strong base and compare their moles, not just their names.',
        'দেওয়া শক্তিশালী এসিড ও ক্ষারক নিয়ে নাম নয়, মোল তুলনা করো।',
        'For the 1:1 HCl/NaOH pair, choose equal CV values at 0.1 M and check pH; the indicator is optional evidence.',
        '1:1 HCl/NaOH জুটিতে 0.1 M-এ CV সমান রেখে pH দেখো; নির্দেশক অতিরিক্ত পর্যবেক্ষণ দেয়।',
      ),
      q4: hints(
        'Phenolphthalein has different behavior from litmus.',
        'ফেনলফথ্যালিনের আচরণ লিটমাসের মতো নয়।',
        'Its pink transition occurs above about pH 8.2; compare this with the acidic and neutral ranges.',
        'প্রায় pH 8.2-এর ওপরে এটি গোলাপি হয়; এসিডীয় ও নিরপেক্ষ অঞ্চলের সঙ্গে তুলনা করো।',
      ),
      q5: hints(
        'This is an acid–base neutralisation, not a metal–acid reaction.',
        'এটি এসিড–ক্ষারক প্রশমন, ধাতু–এসিড বিক্রিয়া নয়।',
        'Combine the sodium and chloride ions into a salt and the hydrogen and hydroxide ions into water.',
        'সোডিয়াম ও ক্লোরাইড আয়ন দিয়ে লবণ এবং হাইড্রোজেন ও হাইড্রক্সাইড আয়ন দিয়ে পানি গঠনের কথা ভাবো।',
      ),
    },
  },
  reactions: {
    objective: t(
      'Use atom conservation to interpret a balanced equation; distinguish gas formation from precipitation without identifying substances by appearance alone.',
      'পরমাণু সংরক্ষণ দিয়ে সমতাযুক্ত সমীকরণ বোঝো; শুধু চেহারা দেখে পদার্থের পরিচয় না দিয়ে গ্যাস উৎপাদন ও অধঃক্ষেপণ আলাদা করো।',
    ),
    example: t(
      'In Mg + 2HCl → MgCl₂ + H₂, each side contains 1 Mg, 2 H and 2 Cl atoms. Change coefficients to balance an equation, never the subscripts inside a chemical formula.',
      'Mg + 2HCl → MgCl₂ + H₂-এ প্রতিপাশে 1 Mg, 2 H ও 2 Cl পরমাণু আছে। সমীকরণ সমতা করতে সহগ বদলাও, রাসায়নিক সংকেতের ভেতরের সূচক নয়।',
    ),
    assumptions: t(
      'The closed virtual bench shows a curated set of ideal qualitative outcomes. Solid amounts and reaction rates are not modeled. This is not a guide to carrying out chemical procedures.',
      'সীমিত ভার্চুয়াল বেঞ্চে নির্বাচিত কিছু আদর্শ গুণগত ফল দেখা যায়। কঠিন পদার্থের পরিমাণ ও বিক্রিয়ার হার মডেল করা হয় না। এটি বাস্তবে রাসায়নিক পরীক্ষা করার নির্দেশনা নয়।',
    ),
    misconception: t(
      'Bubbles do not identify a gas by themselves, and a color change alone does not prove a particular product. Use the reactants and balanced equation together with observations.',
      'শুধু বুদবুদ দেখে গ্যাস চেনা যায় না, আর শুধু রং বদলানো নির্দিষ্ট উৎপাদের প্রমাণ নয়। পর্যবেক্ষণের সঙ্গে বিক্রিয়ক ও সমতাযুক্ত সমীকরণ মিলিয়ে দেখো।',
    ),
    prompts: [
      t(
        'Predict: compare HCl with calcium carbonate and silver nitrate with sodium chloride. Which curated pair should show gas and which a solid precipitate?',
        'আগে অনুমান: HCl–ক্যালসিয়াম কার্বনেট এবং সিলভার নাইট্রেট–সোডিয়াম ক্লোরাইড তুলনা করো। কোন নির্বাচিত জুটিতে গ্যাস, কোনটিতে কঠিন অধঃক্ষেপ হবে?',
      ),
      t(
        'Observe: reset the virtual beaker between pairs and record the equation, gas/solid flag and visible change. Do not add every offered reagent at once.',
        'দেখো: এক জুটি থেকে অন্য জুটিতে যাওয়ার আগে ভার্চুয়াল পাত্র খালি করো; সমীকরণ, গ্যাস/কঠিন নির্দেশ ও দৃশ্যমান পরিবর্তন লেখো। সব বিকারক একসঙ্গে দিও না।',
      ),
      t(
        'Explain: count each element on both sides. Compare HCl + zinc with HCl + carbonate and explain why their bubbles represent different gases.',
        'ব্যাখ্যা: দুই পাশে প্রতিটি মৌলের পরমাণু গুনো। HCl–জিংক ও HCl–কার্বনেট তুলনা করে বোঝাও, দুইটির বুদবুদ কেন আলাদা গ্যাসের।',
      ),
    ],
    practice: mcq(
      'check1',
      'Bubbles appear in two different virtual reactions. What else is needed to identify each gas?',
      'দুটি আলাদা ভার্চুয়াল বিক্রিয়ায় বুদবুদ দেখা গেল। প্রতিটি গ্যাস চিনতে আর কী দরকার?',
      [
        ['Reactants and the supported balanced equation', 'বিক্রিয়ক ও সমর্থিত সমতাযুক্ত সমীকরণ'],
        ['Assume all bubbles are carbon dioxide', 'সব বুদবুদকে কার্বন ডাইঅক্সাইড ধরা'],
        ['Assume all bubbles are hydrogen', 'সব বুদবুদকে হাইড্রোজেন ধরা'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 0, q4: 1, q5: 2 },
    exampleAnswer: {
      reagentIds: ['hcl', 'caco3'],
      heat: false,
      amounts: { hcl: { volumeMl: 50, concentrationM: 0.1 } },
    },
    hints: {
      check1: hints(
        'A shared visual observation can occur in different chemical reactions.',
        'একই দৃশ্যমান পর্যবেক্ষণ ভিন্ন রাসায়নিক বিক্রিয়ায় হতে পারে।',
        'Compare which atoms enter and which gaseous product the supported equation contains.',
        'কোন পরমাণু বিক্রিয়ায় ঢুকছে এবং সমর্থিত সমীকরণে কোন গ্যাসীয় উৎপাদ আছে, তা তুলনা করো।',
      ),
      q1: hints(
        'Count each type of atom before and after a reaction.',
        'বিক্রিয়ার আগে ও পরে প্রতিটি ধরনের পরমাণু গুনো।',
        'A chemical reaction rearranges atoms; it does not create or remove an element’s atoms.',
        'রাসায়নিক বিক্রিয়ায় পরমাণু পুনর্বিন্যস্ত হয়; কোনো মৌলের পরমাণু নতুন তৈরি বা বিলুপ্ত হয় না।',
      ),
      q2: hints(
        'The coefficient 2 multiplies every atom in one H₂ molecule.',
        'সহগ 2 একটি H₂ অণুর প্রতিটি পরমাণুকে গুণ করে।',
        'Multiply the number of H₂ molecules by the hydrogen atoms in each molecule, then check the product side.',
        'H₂ অণুর সংখ্যা ও প্রতি অণুর হাইড্রোজেন পরমাণু গুণ করে উৎপাদের পাশ মিলিয়ে দেখো।',
      ),
      q3: hints(
        'Compare the acid–carbonate pair with the acid–metal pair.',
        'এসিড–কার্বনেট ও এসিড–ধাতু জুটি তুলনা করো।',
        'To obtain a carbon-containing gas, select the offered reagent containing carbon along with the acid.',
        'কার্বনযুক্ত গ্যাস পেতে এসিডের সঙ্গে দেওয়া কার্বনযুক্ত বিকারকটি বেছে নাও।',
      ),
      q4: hints(
        'Look at which positive and negative ions can combine into the insoluble product.',
        'কোন ধনাত্মক ও ঋণাত্মক আয়ন মিলে অদ্রবণীয় উৎপাদ হতে পারে দেখো।',
        'Use AgNO₃ + NaCl → AgCl + NaNO₃ and identify the solid product, not the dissolved salt.',
        'AgNO₃ + NaCl → AgCl + NaNO₃-এ দ্রবীভূত লবণ নয়, কঠিন উৎপাদটি চেনো।',
      ),
      q5: hints(
        'Zinc is a reactive metal; distinguish this from an acid–carbonate reaction.',
        'জিংক একটি সক্রিয় ধাতু; এসিড–কার্বনেট বিক্রিয়া থেকে এটি আলাদা করো।',
        'In Zn + 2HCl → ZnCl₂ + H₂, identify the product shown in the gaseous state.',
        'Zn + 2HCl → ZnCl₂ + H₂-এ গ্যাসীয় অবস্থার উৎপাদটি চেনো।',
      ),
    },
  },
};
function positionAnswer(question: Question, position: number | undefined): Question {
  if (question.item.kind !== 'mcq' || question.key.kind !== 'mcq' || position === undefined)
    return question;
  const answer = question.key.answer;
  const correct = question.item.options[answer]!;
  const options = question.item.options.filter((_, index) => index !== answer);
  options.splice(position, 0, correct);
  return { item: { ...question.item, options }, key: { ...question.key, answer: position } };
}
function lesson(
  slug: string,
  subject: 'physics' | 'math' | 'chemistry',
  chapterId: string,
  title: ReturnType<typeof t>,
  body: ReturnType<typeof t>,
  play: Record<string, unknown>,
  questions: Question[],
) {
  const support = SUPPORT[slug]!;
  const allQuestions = questions.map((question) => {
    const positioned = positionAnswer(question, support.positions[question.item.id]);
    return positioned.key.kind === 'simTask' || positioned.key.kind === 'labTask'
      ? { ...positioned, key: { ...positioned.key, exampleAnswer: support.exampleAnswer } }
      : positioned;
  });
  const practice = positionAnswer(support.practice, support.positions.check1);
  const intro = t(
    [
      body.en,
      'Learning goals: ' + support.objective.en,
      'Worked example: ' + support.example.en,
      'Model assumptions: ' + support.assumptions.en,
      'Watch out: ' + support.misconception.en,
    ].join('\n\n'),
    [
      body.bn,
      'শিখন লক্ষ্য: ' + support.objective.bn,
      'উদাহরণ: ' + support.example.bn,
      'মডেলের অনুমান: ' + support.assumptions.bn,
      'খেয়াল করো: ' + support.misconception.bn,
    ].join('\n\n'),
  );
  const guidedPlay =
    play.kind === 'explore'
      ? { ...play, prompts: support.prompts }
      : {
          ...play,
          goal: t(
            support.prompts.map((prompt) => prompt.en).join('\n\n'),
            support.prompts.map((prompt) => prompt.bn).join('\n\n'),
          ),
        };
  const doc = LessonDocSchema.parse({
    scope: 'global',
    schoolId: null,
    classIds: [],
    subject,
    grade: 9,
    chapterId,
    title,
    steps: [
      { kind: 'intro', body: intro },
      guidedPlay,
      { kind: 'check', item: practice.item },
      { kind: 'quiz', items: allQuestions.map((q) => q.item) },
    ],
    status: 'published',
    sourceLanguage: 'en',
    approved: { en: true, bn: true },
    authorUid: 'school-demo-seed',
    revision: 2,
    updatedAt: 1,
  });
  const keys = LessonKeysDocSchema.parse({
    revision: 2,
    items: Object.fromEntries(
      [practice, ...allQuestions].map((q) => [
        q.item.id,
        {
          key: q.key,
          hints: support.hints[q.item.id]!,
        },
      ]),
    ),
  });
  return { slug, lesson: doc, keys };
}
const motion = { u: 4, a: 2, duration: 4 },
  cart = { mass: 2, force: 10, muS: 0.3, muK: 0.2 },
  circuit = { emf: 6, topology: 'series', resistors: [10, 20] },
  line = { m: 2, c: 1 },
  circle = { angleDeg: 30 };
const explore = (simId: string, params: Record<string, unknown>, en: string, bn: string) => ({
  kind: 'explore',
  simId,
  params,
  lockedParams: [],
  prompts: [t(en, bn)],
});
export const DEMO_LESSONS = [
  lesson(
    'motion',
    'physics',
    'physics-2',
    t('Motion: graphs tell a story', 'গতি: লেখচিত্রে চলার গল্প'),
    t(
      'For uniform acceleration, velocity changes by equal amounts in equal times. The area under a velocity–time graph gives displacement. Our braking model stops at rest.',
      'সমত্বরণে সমান সময়ে বেগের পরিবর্তন সমান হয়। বেগ–সময় লেখচিত্রের নিচের ক্ষেত্রফল সরণ দেয়। এই মডেলে ব্রেক করলে বস্তু স্থির হয়ে থামে।',
    ),
    explore(
      'motion-graphs',
      motion,
      'Change acceleration. Compare velocity and distance after four seconds.',
      'ত্বরণ বদলাও। চার সেকেন্ড পর বেগ ও দূরত্ব তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'What does the slope of a velocity–time graph represent?',
        'বেগ–সময় লেখচিত্রের ঢাল কী প্রকাশ করে?',
        [
          ['Acceleration', 'ত্বরণ'],
          ['Mass', 'ভর'],
          ['Force alone', 'শুধু বল'],
        ],
        0,
      ),
      numeric(
        'q2',
        'If u = 4 m/s and a = 2 m/s², what is v after 4 s?',
        'u = 4 m/s ও a = 2 m/s² হলে 4 s পর v কত?',
        12,
        'm/s',
      ),
      task(
        'q3',
        'Change the acceleration so the velocity reaches 12 m/s after 4 s.',
        'ত্বরণ বদলে 4 s পর 12 m/s বেগ পাও।',
        'motion-graphs',
        { ...motion, a: 0 },
        ['a'],
        'reachesSpeed',
        { v: 12, tol: 0.01 },
      ),
      numeric(
        'q4',
        'What is the displacement for u = 4 m/s, a = 2 m/s² and t = 4 s?',
        'u = 4 m/s, a = 2 m/s² ও t = 4 s হলে সরণ কত?',
        32,
        'm',
      ),
      mcq(
        'q5',
        'With zero acceleration, what stays constant?',
        'ত্বরণ শূন্য হলে কী অপরিবর্তিত থাকে?',
        [
          ['Velocity', 'বেগ'],
          ['Position', 'অবস্থান'],
          ['Time', 'সময়'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'cart',
    'physics',
    'physics-3',
    t('Force: start the cart', 'বল: গাড়িটি চালাও'),
    t(
      'A cart starts moving when the push exceeds maximum static friction. While moving, net force equals mass times acceleration. This level-floor model uses g = 9.8 m/s².',
      'ধাক্কা সর্বোচ্চ স্থিতি ঘর্ষণ ছাড়ালে গাড়ি চলতে শুরু করে। চলার সময় লব্ধি বল ভর ও ত্বরণের গুণফলের সমান। সমতল মেঝের মডেলে g = 9.8 m/s²।',
    ),
    explore(
      'newton-cart',
      cart,
      'Find the smallest push that starts motion. Then increase mass.',
      'চলা শুরু করার সবচেয়ে ছোট ধাক্কা খুঁজে বের করো। তারপর ভর বাড়াও।',
    ),
    [
      mcq(
        'q1',
        'Which force opposes sliding?',
        'কোন বল পিছলে চলার বিরোধিতা করে?',
        [
          ['Friction', 'ঘর্ষণ'],
          ['Weight always', 'সব সময় ওজন'],
          ['Time', 'সময়'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For m = 2 kg and μs = 0.3, what is the maximum static friction?',
        'm = 2 kg ও μs = 0.3 হলে সর্বোচ্চ স্থিতি ঘর্ষণ কত?',
        5.88,
        'N',
      ),
      task(
        'q3',
        'Adjust the push to just above the static-friction limit.',
        'ধাক্কা স্থিতি ঘর্ষণের সীমার একটু ওপরে নাও।',
        'newton-cart',
        cart,
        ['force'],
        'justMoves',
        {},
      ),
      numeric(
        'q4',
        'For a 10 N push and 3.92 N friction on 2 kg, find the acceleration.',
        '2 kg বস্তুর ওপর 10 N ধাক্কা ও 3.92 N ঘর্ষণ হলে ত্বরণ কত?',
        3.04,
        'm/s²',
      ),
      mcq(
        'q5',
        'At the same net force, doubling mass makes acceleration…',
        'একই লব্ধি বলে ভর দ্বিগুণ করলে ত্বরণ…',
        [
          ['Half', 'অর্ধেক'],
          ['Double', 'দ্বিগুণ'],
          ['Unchanged', 'অপরিবর্তিত'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'circuit',
    'physics',
    'physics-11',
    t('Current: a simple circuit', 'চল বিদ্যুৎ: সরল বর্তনী'),
    t(
      'For an ideal source and fixed-temperature resistors, V=IR. Series resistances add. Parallel branches share the source voltage.',
      'আদর্শ উৎস ও স্থির তাপমাত্রার রোধে V=IR। শ্রেণি সংযোগে রোধ যোগ হয়। সমান্তরাল শাখায় উৎসের বিভব পার্থক্য সমান থাকে।',
    ),
    explore(
      'ohms-circuit',
      circuit,
      'Compare series and parallel. Keep the same source and resistors.',
      'একই উৎস ও রোধ রেখে শ্রেণি ও সমান্তরাল সংযোগ তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'Which equation is Ohm’s law?',
        'কোনটি ওহমের সূত্র?',
        [
          ['V=IR', 'V=IR'],
          ['V=I/R', 'V=I/R'],
          ['V=R/I', 'V=R/I'],
        ],
        0,
      ),
      numeric(
        'q2',
        'Find the total resistance of 10 Ω and 20 Ω in series.',
        'শ্রেণি সংযোগে 10 Ω ও 20 Ω-এর মোট রোধ কত?',
        30,
        'Ω',
      ),
      task(
        'q3',
        'With 30 Ω total resistance, set the source for 0.2 A.',
        'মোট রোধ 30 Ω রেখে উৎস বদলে 0.2 A প্রবাহ পাও।',
        'ohms-circuit',
        { ...circuit, emf: 3 },
        ['emf'],
        'currentEquals',
        { i: 0.2, tol: 0.001 },
      ),
      numeric(
        'q4',
        'A 6 V source across 30 Ω gives what current?',
        '30 Ω রোধে 6 V দিলে প্রবাহ কত?',
        0.2,
        'A',
      ),
      mcq(
        'q5',
        'In parallel, every branch has the same…',
        'সমান্তরালে প্রত্যেক শাখায় একই থাকে…',
        [
          ['Voltage', 'বিভব পার্থক্য'],
          ['Resistance always', 'সব সময় রোধ'],
          ['Current always', 'সব সময় প্রবাহ'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'linear',
    'math',
    'math-gm-12',
    t('Lines: slope and intercept', 'সরলরেখা: ঢাল ও ছেদক'),
    t(
      'In y=mx+c, m is the slope and c is the y-intercept. A change in m tilts the line; a change in c translates it vertically.',
      'y=mx+c সমীকরণে m ঢাল এবং c হলো y-অক্ষের ছেদক। m বদলালে রেখা হেলে যায়; c বদলালে ওপর-নিচে সরে।',
    ),
    explore(
      'linear-graph',
      line,
      'Change slope without changing the intercept.',
      'ছেদক না বদলে ঢাল বদলাও।',
    ),
    [
      mcq(
        'q1',
        'In y=mx+c, which quantity is slope?',
        'y=mx+c-তে কোনটি ঢাল?',
        [
          ['m', 'm'],
          ['c', 'c'],
          ['y only', 'শুধু y'],
        ],
        0,
      ),
      numeric('q2', 'For y = 2x + 1, find y when x = 3.', 'y = 2x + 1 হলে x = 3-তে y কত?', 7, ''),
      task(
        'q3',
        'Make the slope equal to 3.',
        'ঢাল 3 করো।',
        'linear-graph',
        line,
        ['m'],
        'slopeEquals',
        { m: 3, tol: 0.01 },
      ),
      numeric('q4', 'What is the y-intercept of y = 2x + 1?', 'y = 2x + 1-এর y-ছেদক কত?', 1, ''),
      mcq(
        'q5',
        'A horizontal line has slope…',
        'অনুভূমিক রেখার ঢাল…',
        [
          ['Zero', 'শূন্য'],
          ['One', 'এক'],
          ['Always negative', 'সব সময় ঋণাত্মক'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'circle',
    'math',
    'math-gm-9',
    t('Trigonometry: the unit circle', 'ত্রিকোণমিতি: একক বৃত্ত'),
    t(
      'A unit circle has radius 1. At angle θ, the point has coordinates (cos θ, sin θ). Tangent is sin θ / cos θ when cos θ is nonzero.',
      'একক বৃত্তের ব্যাসার্ধ 1। θ কোণে বিন্দুর স্থানাঙ্ক (cosθ,sinθ)। cosθ শূন্য না হলে tanθ=sinθ/cosθ।',
    ),
    explore(
      'unit-circle',
      circle,
      'Drag the angle and follow horizontal and vertical projections.',
      'কোণ টেনে অনুভূমিক ও উল্লম্ব অভিক্ষেপ দেখো।',
    ),
    [
      mcq(
        'q1',
        'Which coordinate equals sinθ?',
        'কোন স্থানাঙ্ক sinθ-এর সমান?',
        [
          ['Vertical y', 'উল্লম্ব y'],
          ['Horizontal x', 'অনুভূমিক x'],
          ['Radius only', 'শুধু ব্যাসার্ধ'],
        ],
        0,
      ),
      numeric('q2', 'What is sin30°?', 'sin30° কত?', 0.5, ''),
      task(
        'q3',
        'Set an angle whose sine is 1.',
        'যে কোণের sine 1 সেই কোণ নাও।',
        'unit-circle',
        circle,
        ['angleDeg'],
        'sinEquals',
        { v: 1, tol: 0.001 },
      ),
      numeric('q4', 'What is cos0°?', 'cos0° কত?', 1, ''),
      mcq(
        'q5',
        'At 90°, tangent is…',
        '90°-তে tangent…',
        [
          ['Undefined', 'অসংজ্ঞায়িত'],
          ['Zero', 'শূন্য'],
          ['One', 'এক'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'acid-base',
    'chemistry',
    'chemistry-9',
    t('Acids, bases and indicators', 'এসিড, ক্ষারক ও নির্দেশক'),
    t(
      'This virtual bench models ideal dilute strong acids and bases at 25 °C. Equal acid and base equivalents neutralise. Excess reagent changes pH. Never reproduce virtual reactions outside a supervised laboratory.',
      'এই ভার্চুয়াল বেঞ্চে 25°C তাপমাত্রায় আদর্শ লঘু শক্তিশালী এসিড ও ক্ষারক দেখানো হয়। সমান এসিড ও ক্ষারক সমতুল্য প্রশমিত হয়। অতিরিক্ত বিকারক pH বদলায়। তত্ত্বাবধানহীন বাস্তব পরীক্ষায় এসব অনুকরণ কোরো না।',
    ),
    {
      kind: 'lab',
      reagentIds: ['hcl', 'naoh', 'phenolphthalein', 'litmus'],
      goal: t(
        'Compare equal amounts with excess base using the virtual controls.',
        'ভার্চুয়াল নিয়ন্ত্রণে সমান পরিমাণ ও অতিরিক্ত ক্ষারক তুলনা করো।',
      ),
    },
    [
      mcq(
        'q1',
        'An acidic solution usually has pH…',
        'এসিডীয় দ্রবণের pH সাধারণত…',
        [
          ['Below 7', '7-এর নিচে'],
          ['Above 7', '7-এর ওপরে'],
          ['Always 14', 'সব সময় 14'],
        ],
        0,
      ),
      numeric(
        'q2',
        'At 25 °C, what is the ideal neutral pH?',
        '25°C-তে আদর্শ নিরপেক্ষ pH কত?',
        7,
        '',
      ),
      {
        item: {
          id: 'q3',
          kind: 'labTask',
          prompt: t(
            'Create a neutral solution using the offered virtual reagents.',
            'দেওয়া ভার্চুয়াল বিকারক দিয়ে নিরপেক্ষ দ্রবণ বানাও।',
          ),
          reagentIds: ['hcl', 'naoh', 'litmus'],
          points: 3,
        },
        key: { kind: 'labTask', task: { predicate: 'pHBetween', min: 6.9, max: 7.1 } },
      },
      mcq(
        'q4',
        'Phenolphthalein is pink in a sufficiently…',
        'ফেনলফথ্যালিন যথেষ্ট … দ্রবণে গোলাপি।',
        [
          ['Basic', 'ক্ষারীয়'],
          ['Acidic', 'এসিডীয়'],
          ['Neutral', 'নিরপেক্ষ'],
        ],
        0,
      ),
      mcq(
        'q5',
        'HCl+NaOH produces…',
        'HCl+NaOH থেকে হয়…',
        [
          ['Salt and water', 'লবণ ও পানি'],
          ['Only hydrogen', 'শুধু হাইড্রোজেন'],
          ['Only oxygen', 'শুধু অক্সিজেন'],
        ],
        0,
      ),
    ],
  ),
  lesson(
    'reactions',
    'chemistry',
    'chemistry-7',
    t('Observe a chemical change', 'রাসায়নিক পরিবর্তন দেখো'),
    t(
      'A balanced equation preserves every element’s atom count. A gas, a precipitate or a colour change can be evidence of a reaction. This is a closed virtual bench, not a real procedure guide.',
      'সমতাযুক্ত সমীকরণে প্রতিটি মৌলের পরমাণু সংখ্যা সংরক্ষিত থাকে। গ্যাস, অধঃক্ষেপ বা রঙের পরিবর্তন বিক্রিয়ার প্রমাণ হতে পারে। এটি সীমিত ভার্চুয়াল বেঞ্চ, বাস্তব পরীক্ষা করার নির্দেশনা নয়।',
    ),
    {
      kind: 'lab',
      reagentIds: ['hcl', 'caco3', 'agno3', 'nacl', 'zn'],
      goal: t(
        'Compare a gas-forming reaction with a precipitation reaction.',
        'গ্যাস উৎপাদনকারী বিক্রিয়া ও অধঃক্ষেপণ বিক্রিয়া তুলনা করো।',
      ),
    },
    [
      mcq(
        'q1',
        'Why must an equation be balanced?',
        'সমীকরণ সমতাযুক্ত করতে হয় কেন?',
        [
          ['Atoms are conserved', 'পরমাণু সংরক্ষিত থাকে'],
          ['Colours must match', 'রঙ মিলতেই হবে'],
          ['Mass disappears', 'ভর অদৃশ্য হয়'],
        ],
        0,
      ),
      numeric(
        'q2',
        'In 2H₂ + O₂ → 2H₂O, how many hydrogen atoms are on either side?',
        '2H₂ + O₂ → 2H₂O-তে প্রতিপাশে হাইড্রোজেন পরমাণু কয়টি?',
        4,
        '',
      ),
      {
        item: {
          id: 'q3',
          kind: 'labTask',
          prompt: t(
            'Make carbon dioxide on this virtual bench.',
            'ভার্চুয়াল বেঞ্চে কার্বন ডাইঅক্সাইড তৈরি করো।',
          ),
          reagentIds: ['hcl', 'caco3', 'zn'],
          points: 3,
        },
        key: { kind: 'labTask', task: { predicate: 'producedGas', gas: 'CO2' } },
      },
      mcq(
        'q4',
        'Silver nitrate and sodium chloride form a precipitate of…',
        'সিলভার নাইট্রেট ও সোডিয়াম ক্লোরাইড থেকে কোন অধঃক্ষেপ হয়?',
        [
          ['Silver chloride', 'সিলভার ক্লোরাইড'],
          ['Hydrogen', 'হাইড্রোজেন'],
          ['Water', 'পানি'],
        ],
        0,
      ),
      mcq(
        'q5',
        'Zinc and dilute hydrochloric acid release…',
        'জিংক ও লঘু হাইড্রোক্লোরিক এসিড থেকে বের হয়…',
        [
          ['Hydrogen', 'হাইড্রোজেন'],
          ['Oxygen', 'অক্সিজেন'],
          ['Nitrogen', 'নাইট্রোজেন'],
        ],
        0,
      ),
    ],
  ),
];
