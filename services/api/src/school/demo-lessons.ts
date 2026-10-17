import {
  LessonDocSchema,
  LessonKeysDocSchema,
  type QuizItem,
  type QuizKey,
} from '@just-imagine/protocol';
const t = (en: string, bn: string) => ({ en, bn });
type Question = { item: QuizItem; key: QuizKey };
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
function lesson(
  slug: string,
  subject: 'physics' | 'math' | 'chemistry',
  chapterId: string,
  title: ReturnType<typeof t>,
  body: ReturnType<typeof t>,
  play: Record<string, unknown>,
  questions: Question[],
) {
  const doc = LessonDocSchema.parse({
    scope: 'global',
    schoolId: null,
    classIds: [],
    subject,
    grade: 9,
    chapterId,
    title,
    steps: [
      { kind: 'intro', body },
      play,
      { kind: 'check', item: { ...questions[0]!.item, id: 'check1' } },
      { kind: 'quiz', items: questions.map((q) => q.item) },
    ],
    status: 'published',
    sourceLanguage: 'en',
    approved: { en: true, bn: true },
    authorUid: 'school-demo-seed',
    revision: 1,
    updatedAt: 1,
  });
  const keys = LessonKeysDocSchema.parse({
    revision: 1,
    items: Object.fromEntries(
      [{ item: { ...questions[0]!.item, id: 'check1' }, key: questions[0]!.key }, ...questions].map(
        (q) => [
          q.item.id,
          {
            key: q.key,
            hints: [
              t(
                'Use the model’s readings and compare one change at a time.',
                'মডেলের মান দেখো এবং একবারে একটি পরিবর্তন তুলনা করো।',
              ),
            ],
          },
        ],
      ),
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
        'If u=4m/s and a=2m/s², what is v after4s?',
        'u=4m/s ও a=2m/s² হলে 4s পর v কত?',
        12,
        'm/s',
      ),
      task(
        'q3',
        'Change acceleration to reach12m/s after4s.',
        'ত্বরণ বদলে 4s পর 12m/s বেগ পাও।',
        'motion-graphs',
        motion,
        ['a'],
        'reachesSpeed',
        { v: 12, tol: 0.01 },
      ),
      numeric(
        'q4',
        'What is the displacement for u=4,a=2,t=4?',
        'u=4,a=2,t=4 হলে সরণ কত?',
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
      'A cart starts moving when the push exceeds maximum static friction. While moving, net force equals mass times acceleration. This level-floor model uses g=9.8m/s².',
      'ধাক্কা সর্বোচ্চ স্থিতি ঘর্ষণ ছাড়ালে গাড়ি চলতে শুরু করে। চলার সময় লব্ধি বল ভর ও ত্বরণের গুণফলের সমান। সমতল মেঝের মডেলে g=9.8m/s²।',
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
        'For m=2kg and μs=0.3, what is maximum static friction?',
        'm=2kg ও μs=0.3 হলে সর্বোচ্চ স্থিতি ঘর্ষণ কত?',
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
        'For10N push and3.92N friction on2kg, find acceleration.',
        '2kg বস্তুর ওপর 10N ধাক্কা ও 3.92N ঘর্ষণ হলে ত্বরণ কত?',
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
        'Find the total resistance of10Ω and20Ω in series.',
        'শ্রেণি সংযোগে 10Ω ও 20Ω-এর মোট রোধ কত?',
        30,
        'Ω',
      ),
      task(
        'q3',
        'With30Ω total resistance, set the source for0.2A.',
        'মোট রোধ 30Ω রেখে উৎস বদলে 0.2A প্রবাহ পাও।',
        'ohms-circuit',
        circuit,
        ['emf'],
        'currentEquals',
        { i: 0.2, tol: 0.001 },
      ),
      numeric(
        'q4',
        'A6V source across30Ω gives what current?',
        '30Ω রোধে 6V দিলে প্রবাহ কত?',
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
      numeric('q2', 'For y=2x+1, find y when x=3.', 'y=2x+1 হলে x=3-তে y কত?', 7, ''),
      task(
        'q3',
        'Make the slope equal3.',
        'ঢাল 3 করো।',
        'linear-graph',
        line,
        ['m'],
        'slopeEquals',
        { m: 3, tol: 0.01 },
      ),
      numeric('q4', 'What is the y-intercept of y=2x+1?', 'y=2x+1-এর y-ছেদক কত?', 1, ''),
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
      'A unit circle has radius1. At angleθ, the point has coordinates(cosθ,sinθ). Tangent is sinθ/cosθ when cosθ is nonzero.',
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
        'Set an angle whose sine is1.',
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
        'At90°, tangent is…',
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
      'This virtual bench models ideal dilute strong acids and bases at25°C. Equal acid and base equivalents neutralise. Excess reagent changes pH. Never reproduce virtual reactions outside a supervised laboratory.',
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
          ['Below7', '7-এর নিচে'],
          ['Above7', '7-এর ওপরে'],
          ['Always14', 'সব সময় 14'],
        ],
        0,
      ),
      numeric(
        'q2',
        'At25°C, what is the ideal neutral pH?',
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
            'দেওয়া ভার্চুয়াল বিকারকে নিরপেক্ষ দ্রবণ বানাও।',
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
        'In2H₂+O₂→2H₂O, how many hydrogen atoms are on either side?',
        '2H₂+O₂→2H₂O-তে প্রতিপাশে হাইড্রোজেন পরমাণু কয়টি?',
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
