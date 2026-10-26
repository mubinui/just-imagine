import { explore, hints, lesson, mcq, numeric, t, task, type Support } from './demo-lesson-kit';

const SUPPORT: Record<string, Support> = {
  projectile: {
    objective: t(
      'Split a launch velocity into horizontal and vertical parts; calculate time of flight, maximum height and range on level ground; see why 45° gives the longest range.',
      'নিক্ষেপ বেগকে অনুভূমিক ও উল্লম্ব উপাংশে ভাগ করো; সমতল ভূমিতে উড্ডয়নকাল, সর্বাধিক উচ্চতা ও পাল্লা হিসাব করো; 45° কোণে পাল্লা কেন সবচেয়ে বেশি তা বোঝো।',
    ),
    example: t(
      'For u = 10 m/s at 30° from the ground: uy = 10 sin 30° = 5 m/s and ux = 10 cos 30° = 8.66 m/s. Time of flight T = 2uy/g = 10/9.8 = 1.02 s, maximum height H = uy²/2g = 25/19.6 = 1.28 m and range R = ux × T = 8.84 m.',
      'ভূমি থেকে 30° কোণে u = 10 m/s বেগে ছুড়লে: uy = 10 sin 30° = 5 m/s ও ux = 10 cos 30° = 8.66 m/s। উড্ডয়নকাল T = 2uy/g = 10/9.8 = 1.02 s, সর্বাধিক উচ্চতা H = uy²/2g = 25/19.6 = 1.28 m এবং পাল্লা R = ux × T = 8.84 m।',
    ),
    assumptions: t(
      'There is no air resistance, so the horizontal velocity never changes. The ball is a point launched from the chosen height over flat ground, and g = 9.8 m/s² unless you change gravity.',
      'বায়ুর বাধা নেই, তাই অনুভূমিক বেগ কখনো বদলায় না। বলটিকে বিন্দু ধরা হয়েছে, এটি নির্বাচিত উচ্চতা থেকে সমতল ভূমির ওপর ছোড়া হয় এবং অভিকর্ষ না বদলালে g = 9.8 m/s²।',
    ),
    misconception: t(
      'The ball does not stop at the top of its path: only its vertical velocity is zero there, while the horizontal velocity carries on. Also, 45° gives the longest range only when the launch and landing heights are equal.',
      'পথের শীর্ষবিন্দুতে বল থেমে যায় না: সেখানে শুধু উল্লম্ব বেগ শূন্য, অনুভূমিক বেগ আগের মতোই থাকে। আর উৎক্ষেপণ ও পতনের উচ্চতা সমান হলেই কেবল 45° কোণে পাল্লা সবচেয়ে বেশি হয়।',
    ),
    prompts: [
      t(
        'Predict: with u = 19.6 m/s at 30° from the ground, how long will the ball stay in the air? Will a 60° launch land nearer, farther or in the same place?',
        'আগে অনুমান: ভূমি থেকে 30° কোণে u = 19.6 m/s বেগে ছুড়লে বলটি কতক্ষণ বাতাসে থাকবে? 60° কোণে ছুড়লে কাছে, দূরে, না একই জায়গায় পড়বে?',
      ),
      t(
        'Observe: launch at 30°, then at 45° and 60° without changing the speed. Record the time of flight, maximum height and range each time, with units.',
        'দেখো: বেগ না বদলে 30°, তারপর 45° ও 60° কোণে ছোড়ো। প্রতিবার উড্ডয়নকাল, সর্বাধিক উচ্চতা ও পাল্লা এককসহ লেখো।',
      ),
      t(
        'Explain: use the horizontal and vertical parts of the velocity to explain why 30° and 60° share a range but not a height. Then raise the launch height and say whether 45° is still best.',
        'ব্যাখ্যা: বেগের অনুভূমিক ও উল্লম্ব উপাংশ দিয়ে বোঝাও কেন 30° ও 60° কোণে পাল্লা সমান কিন্তু উচ্চতা আলাদা। পরে উৎক্ষেপণের উচ্চতা বাড়িয়ে বলো 45° তখনও সেরা কি না।',
      ),
    ],
    practice: mcq(
      'check1',
      'At the highest point of its path, what is the ball’s vertical velocity?',
      'পথের সর্বোচ্চ বিন্দুতে বলের উল্লম্ব বেগ কত?',
      [
        ['Zero', 'শূন্য'],
        ['Equal to the launch speed', 'নিক্ষেপ বেগের সমান'],
        ['Its largest value', 'সবচেয়ে বেশি'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 1, q5: 2 },
    exampleAnswer: { angle: 45 },
    hints: {
      check1: hints(
        'Think about the moment the ball stops rising and has not yet started to fall.',
        'যে মুহূর্তে বল ওঠা থামিয়েছে কিন্তু এখনো নামতে শুরু করেনি, সেটি ভাবো।',
        'Gravity takes 9.8 m/s off the upward velocity each second; ask what is left at the turning point.',
        'অভিকর্ষ প্রতি সেকেন্ডে ঊর্ধ্বমুখী বেগ 9.8 m/s কমায়; ঘুরে নামার বিন্দুতে কত বাকি থাকে ভাবো।',
      ),
      q1: hints(
        'Ask which forces act horizontally once the ball has left the launcher.',
        'বলটি ছোড়ার পর অনুভূমিক দিকে কোন বল কাজ করে, ভাবো।',
        'Gravity acts straight down; compare that direction with the horizontal one.',
        'অভিকর্ষ খাড়া নিচের দিকে কাজ করে; এই দিকটিকে অনুভূমিক দিকের সঙ্গে তুলনা করো।',
      ),
      q2: hints(
        'Find the vertical part of the launch velocity first; only it decides how long the ball stays up.',
        'আগে নিক্ষেপ বেগের উল্লম্ব উপাংশ বের করো; বল কতক্ষণ ওপরে থাকবে তা শুধু এটিই ঠিক করে।',
        'Use uy = 19.6 × sin 30°, then T = 2uy/g for a launch from the ground.',
        'uy = 19.6 × sin 30° নাও, তারপর ভূমি থেকে ছোড়ার জন্য T = 2uy/g ব্যবহার করো।',
      ),
      q3: hints(
        'On level ground the range is u² sin 2θ / g; find the angle that makes sin 2θ as large as possible.',
        'সমতল ভূমিতে পাল্লা u² sin 2θ / g; কোন কোণে sin 2θ সবচেয়ে বড় হয় খোঁজো।',
        'Check that 19.6²/9.8 equals the target, then try angles between 30° and 60° and watch the range reading.',
        '19.6²/9.8 লক্ষ্যমানের সমান কি না মিলিয়ে নাও, তারপর 30° থেকে 60°-এর মধ্যে কোণ বদলে পাল্লার মান দেখো।',
      ),
      q4: hints(
        'At the maximum height the vertical velocity is zero; use vy² = uy² − 2gH.',
        'সর্বাধিক উচ্চতায় উল্লম্ব বেগ শূন্য; vy² = uy² − 2gH ব্যবহার করো।',
        'With uy = 9.8 m/s, calculate H = 9.8² ÷ (2 × 9.8) and give the answer in metres.',
        'uy = 9.8 m/s নিয়ে H = 9.8² ÷ (2 × 9.8) হিসাব করো; উত্তর মিটারে দাও।',
      ),
      q5: hints(
        'The range depends on sin 2θ, so look for a second angle with the same value of sin 2θ.',
        'পাল্লা sin 2θ-এর ওপর নির্ভর করে; sin 2θ-এর মান একই থাকে এমন আরেকটি কোণ খোঁজো।',
        'sin 60° = sin 120°; halve each of those to get the two launch angles.',
        'sin 60° = sin 120°; প্রতিটিকে অর্ধেক করলে দুটি নিক্ষেপ কোণ পাবে।',
      ),
    },
  },
  vectors: {
    objective: t(
      'Add two forces tip to tail; find the resultant of perpendicular forces with Pythagoras’ theorem; resolve a force into perpendicular components.',
      'দুটি বলকে মাথা-লেজ নিয়মে যোগ করো; পরস্পর লম্ব বলের লব্ধি পিথাগোরাসের উপপাদ্যে বের করো; একটি বলকে লম্ব উপাংশে বিভাজন করো।',
    ),
    example: t(
      '6 N east and 8 N north act on one point. R = √(6² + 8²) = √100 = 10 N, and tan θ = 8/6, so the resultant points 53.13° north of east.',
      'এক বিন্দুতে 6 N পূর্বদিকে ও 8 N উত্তরদিকে ক্রিয়া করে। R = √(6² + 8²) = √100 = 10 N এবং tan θ = 8/6, তাই লব্ধি পূর্ব থেকে 53.13° উত্তরে।',
    ),
    assumptions: t(
      'Both forces act at the same point in one plane. Magnitudes are read in newtons; angles are measured anticlockwise from the east (+x) direction, and the resultant angle is given between −180° and 180°.',
      'দুটি বলই একই সমতলে একই বিন্দুতে ক্রিয়া করে। মানগুলো নিউটনে ধরা হয়; কোণ পূর্ব (+x) দিক থেকে ঘড়ির কাঁটার বিপরীতে মাপা হয়, আর লব্ধির কোণ −180° থেকে 180°-এর মধ্যে দেখানো হয়।',
    ),
    misconception: t(
      '3 N and 4 N do not always make 7 N. Magnitudes add directly only when the forces point the same way; otherwise the resultant is smaller, down to 1 N when they are opposite.',
      '3 N ও 4 N মিলে সব সময় 7 N হয় না। বল দুটি একই দিকে থাকলেই কেবল মান সরাসরি যোগ হয়; নইলে লব্ধি ছোট হয়, বিপরীত দিকে থাকলে মাত্র 1 N।',
    ),
    prompts: [
      t(
        'Predict: force A is 3 N east and force B is 4 N north. Will the resultant be 7 N, 5 N or 1 N?',
        'আগে অনুমান: বল A পূর্বদিকে 3 N, বল B উত্তরদিকে 4 N। লব্ধি 7 N, 5 N, না 1 N হবে?',
      ),
      t(
        'Observe: keep both magnitudes and turn B to 0°, 90° and 180°. Record the resultant magnitude and angle each time.',
        'দেখো: দুটি মান একই রেখে B-কে 0°, 90° ও 180°-এ ঘোরাও। প্রতিবার লব্ধির মান ও কোণ লেখো।',
      ),
      t(
        'Explain: use the x and y components to account for each reading. Why does the resultant shrink as the angle between the forces grows?',
        'ব্যাখ্যা: x ও y উপাংশ দিয়ে প্রতিটি মান বোঝাও। বল দুটির মধ্যবর্তী কোণ বাড়লে লব্ধি ছোট হয় কেন?',
      ),
    ],
    practice: mcq(
      'check1',
      'Forces of 3 N and 4 N act on one point in any directions. Which resultant is impossible?',
      'এক বিন্দুতে যেকোনো দিকে 3 N ও 4 N বল ক্রিয়া করে। কোন লব্ধিটি অসম্ভব?',
      [
        ['8 N', '8 N'],
        ['5 N', '5 N'],
        ['1 N', '1 N'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 0, q5: 1 },
    exampleAnswer: { bAngle: 90 },
    hints: {
      check1: hints(
        'Find the largest and the smallest possible resultants of these two forces.',
        'এই দুটি বলের সম্ভাব্য সবচেয়ে বড় ও সবচেয়ে ছোট লব্ধি বের করো।',
        'Every resultant lies between 4 − 3 and 4 + 3; look for the option outside that range.',
        'প্রতিটি লব্ধি 4 − 3 থেকে 4 + 3-এর মধ্যে থাকে; এই সীমার বাইরের বিকল্পটি খোঁজো।',
      ),
      q1: hints(
        'Picture the forces tip to tail and ask when the second arrow extends the first the most.',
        'বল দুটিকে মাথা-লেজ করে সাজিয়ে ভাবো, কখন দ্বিতীয় তীর প্রথমটিকে সবচেয়ে বেশি লম্বা করে।',
        'Use R² = A² + B² + 2AB cos θ and ask which angle makes cos θ largest.',
        'R² = A² + B² + 2AB cos θ ব্যবহার করো; কোন কোণে cos θ সবচেয়ে বড় হয় ভাবো।',
      ),
      q2: hints(
        'The two forces are perpendicular, so they form the two shorter sides of a right triangle.',
        'বল দুটি পরস্পর লম্ব, তাই এরা একটি সমকোণী ত্রিভুজের ছোট দুই বাহু।',
        'Apply R = √(3² + 4²) and keep the answer in newtons.',
        'R = √(3² + 4²) প্রয়োগ করো; উত্তর নিউটনে রাখো।',
      ),
      q3: hints(
        'Only B can turn; think about which angle between the forces makes the resultant squared equal 3² + 4².',
        'শুধু B ঘোরানো যাবে; বল দুটির মধ্যে কোন কোণে লব্ধির বর্গ 3² + 4²-এর সমান হয় ভাবো।',
        'Turn B in steps and watch the resultant fall from 7 N; stop when the reading shows 5.',
        'B-কে ধাপে ধাপে ঘোরাও আর লব্ধি 7 N থেকে কমতে দেখো; মান 5 দেখালে থামো।',
      ),
      q4: hints(
        'Resolve the force: the component opposite the 30° angle uses sine.',
        'বলটিকে বিভাজন করো: 30° কোণের বিপরীত উপাংশে sine লাগে।',
        'Calculate 10 × sin 30°; the component has the same unit as the force.',
        '10 × sin 30° হিসাব করো; উপাংশের একক বলের এককের মতোই।',
      ),
      q5: hints(
        'Try the two extreme cases first: the forces together, then the forces pulling against each other.',
        'আগে দুই চরম অবস্থা ভাবো: বল দুটি একসঙ্গে, তারপর পরস্পরের বিপরীতে টানছে।',
        'For equal forces F, R = 2F cos(θ/2); see how cos(θ/2) changes as θ approaches 180°.',
        'সমান বল F হলে R = 2F cos(θ/2); θ বেড়ে 180°-এর দিকে গেলে cos(θ/2) কেমন বদলায় দেখো।',
      ),
    },
  },
  incline: {
    objective: t(
      'Resolve weight along and perpendicular to a slope; compare the pull down the slope with maximum static friction; calculate the sliding acceleration.',
      'আনত তলে ওজনকে তল বরাবর ও তলের লম্ব বরাবর বিভাজন করো; ঢাল বরাবর টানকে সর্বোচ্চ স্থিতি ঘর্ষণের সঙ্গে তুলনা করো; পিছলে নামার ত্বরণ হিসাব করো।',
    ),
    example: t(
      'A 1 kg block on a 30° slope with μs = 0.3 and μk = 0.2: along the slope mg sin 30° = 4.9 N, the normal force N = mg cos 30° = 8.49 N, and maximum static friction is 0.3 × 8.49 = 2.55 N. Since 4.9 N > 2.55 N it slides; kinetic friction is 0.2 × 8.49 = 1.70 N, so a = (4.9 − 1.70)/1 = 3.20 m/s².',
      '30° আনত তলে 1 kg ব্লক, μs = 0.3 ও μk = 0.2: তল বরাবর mg sin 30° = 4.9 N, অভিলম্ব বল N = mg cos 30° = 8.49 N এবং সর্বোচ্চ স্থিতি ঘর্ষণ 0.3 × 8.49 = 2.55 N। 4.9 N > 2.55 N, তাই ব্লক পিছলে নামে; গতীয় ঘর্ষণ 0.2 × 8.49 = 1.70 N, ফলে a = (4.9 − 1.70)/1 = 3.20 m/s²।',
    ),
    assumptions: t(
      'The block starts at rest and slides straight down without tipping or air resistance. g = 9.8 m/s² unless you change it; μs and μk stay constant and μk is never larger than μs. The run lasts 4 s on a slope long enough for it.',
      'ব্লক স্থির অবস্থা থেকে শুরু করে, না উল্টে এবং বায়ুর বাধা ছাড়া সোজা নিচে নামে। না বদলালে g = 9.8 m/s²; μs ও μk ধ্রুব এবং μk কখনো μs-এর চেয়ে বড় নয়। চলাটি 4 s স্থায়ী, আর তলটি সে জন্য যথেষ্ট লম্বা ধরা হয়েছে।',
    ),
    misconception: t(
      'The normal force on a slope is mg cos θ, not mg. Friction on a resting block equals the pull along the slope, which may be less than μsN; μsN is only its limit.',
      'আনত তলে অভিলম্ব বল mg cos θ, mg নয়। স্থির ব্লকে ঘর্ষণ ঢাল বরাবর টানের সমান, যা μsN-এর চেয়ে কম হতে পারে; μsN শুধু এর সর্বোচ্চ সীমা।',
    ),
    prompts: [
      t(
        'Predict: a 2 kg block sits on a 30° slope with μs = 0.4. Will it stay at rest or slide? Name the two forces along the slope that you compare.',
        'আগে অনুমান: 30° আনত তলে 2 kg ব্লক, μs = 0.4। এটি স্থির থাকবে না পিছলে নামবে? ঢাল বরাবর কোন দুটি বল তুলনা করছ বলো।',
      ),
      t(
        'Observe: run it, then lower the angle in 2° steps. Record the weight component along the slope, the friction and whether the block slides each time.',
        'দেখো: চালাও, তারপর কোণ 2° করে কমাও। প্রতিবার ঢাল বরাবর ওজনের উপাংশ, ঘর্ষণ এবং ব্লক পিছলায় কি না লেখো।',
      ),
      t(
        'Explain: show why the block starts to hold once tan θ falls to μs. Then change only the mass and explain why that answer does not change.',
        'ব্যাখ্যা: tan θ কমে μs-এর সমান হলে ব্লক কেন আটকে থাকে দেখাও। পরে শুধু ভর বদলাও এবং ব্যাখ্যা করো কেন ফল বদলায় না।',
      ),
    ],
    practice: mcq(
      'check1',
      'For a block of mass m on a slope at angle θ, what is the normal force?',
      'θ কোণের আনত তলে m ভরের ব্লকের ওপর অভিলম্ব বল কত?',
      [
        ['mg cos θ', 'ওজন × cos θ'],
        ['mg sin θ', 'ওজন × sin θ'],
        ['mg', 'পূর্ণ ওজন mg'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 2, q5: 0 },
    exampleAnswer: { angle: 20 },
    hints: {
      check1: hints(
        'The normal force balances the part of the weight that presses into the surface.',
        'অভিলম্ব বল ওজনের সেই অংশকে সাম্যাবস্থায় রাখে যা তলের ওপর চাপ দেয়।',
        'Draw the right angle between the slope and the weight’s perpendicular part; the slope angle sits next to that part.',
        'ঢাল ও ওজনের লম্ব অংশের মধ্যে সমকোণ আঁকো; ঢালের কোণটি ওই অংশের সংলগ্ন।',
      ),
      q1: hints(
        'The block has no acceleration, so the forces along the slope must cancel.',
        'ব্লকের ত্বরণ নেই, তাই ঢাল বরাবর বলগুলো পরস্পরকে বাতিল করে।',
        'The normal force is perpendicular to the slope and the block is not sliding; pick the force that acts up the slope on a resting block.',
        'অভিলম্ব বল ঢালের লম্ব, আর ব্লক পিছলাচ্ছে না; স্থির ব্লকে ঢাল বেয়ে ওপরের দিকে কোন বল কাজ করে বেছে নাও।',
      ),
      q2: hints(
        'Resolve the weight mg; the part along the slope uses the sine of the slope angle.',
        'ওজন mg-কে বিভাজন করো; ঢাল বরাবর অংশে আনত কোণের sine লাগে।',
        'Work out 2 × 9.8 × sin 30° and give the answer in newtons.',
        '2 × 9.8 × sin 30° হিসাব করো; উত্তর নিউটনে দাও।',
      ),
      q3: hints(
        'The block holds when mg sin θ is no more than μs mg cos θ, which simplifies to tan θ ≤ μs.',
        'mg sin θ যদি μs mg cos θ-এর বেশি না হয় তবে ব্লক আটকে থাকে; সরল করলে tan θ ≤ μs।',
        'Find the angle whose tangent is 0.4, choose an angle a little below it, then check the slides reading.',
        'যে কোণের tangent 0.4, তা বের করো; তার চেয়ে একটু ছোট কোণ নিয়ে পিছলানোর মান মিলিয়ে দেখো।',
      ),
      q4: hints(
        'Net force along the slope is mg sin θ minus kinetic friction μk mg cos θ; then divide by the mass.',
        'ঢাল বরাবর লব্ধি বল = mg sin θ − গতীয় ঘর্ষণ μk mg cos θ; তারপর ভর দিয়ে ভাগ করো।',
        'The mass cancels: a = 9.8 × (sin 30° − 0.3 × cos 30°); round only at the end.',
        'ভর কেটে যায়: a = 9.8 × (sin 30° − 0.3 × cos 30°); শুধু শেষ ধাপে আসন্ন মান নাও।',
      ),
      q5: hints(
        'Write the normal force as a formula in θ and think about how that trigonometric ratio behaves.',
        'অভিলম্ব বলকে θ-এর সূত্র হিসেবে লেখো এবং ওই ত্রিকোণমিতিক অনুপাত কেমন আচরণ করে ভাবো।',
        'Compare cos 10°, cos 30° and cos 60° to see the trend as the slope steepens.',
        'cos 10°, cos 30° ও cos 60° তুলনা করে ঢাল খাড়া হলে প্রবণতা দেখো।',
      ),
    },
  },
  collision: {
    objective: t(
      'Apply conservation of momentum to find velocities after a collision; compare kinetic energy before and after for carts that stick and carts that bounce.',
      'ভরবেগের সংরক্ষণ সূত্র প্রয়োগ করে সংঘর্ষের পরের বেগ নির্ণয় করো; জোড়া লেগে যাওয়া ও ছিটকে যাওয়া গাড়ির ক্ষেত্রে সংঘর্ষের আগে ও পরের গতিশক্তি তুলনা করো।',
    ),
    example: t(
      'A 1 kg cart at 4 m/s hits a resting 3 kg cart and they stick. Momentum before = 1 × 4 = 4 kg m/s, so v = 4/(1 + 3) = 1 m/s. Kinetic energy falls from ½ × 1 × 4² = 8 J to ½ × 4 × 1² = 2 J; 6 J becomes heat, sound and bending.',
      '4 m/s বেগের 1 kg গাড়ি একটি স্থির 3 kg গাড়িকে ধাক্কা দিয়ে জোড়া লেগে যায়। আগের ভরবেগ = 1 × 4 = 4 kg m/s, তাই v = 4/(1 + 3) = 1 m/s। গতিশক্তি ½ × 1 × 4² = 8 J থেকে কমে ½ × 4 × 1² = 2 J হয়; 6 J তাপ, শব্দ ও আকার বিকৃতিতে রূপান্তরিত হয়।',
    ),
    assumptions: t(
      'The track is straight and frictionless, and no outside horizontal force acts. Velocities to the right are positive. Restitution 0 means the carts stick together; 1 means a perfectly elastic bounce with no kinetic energy lost.',
      'পথটি সোজা ও ঘর্ষণহীন, বাইরের কোনো অনুভূমিক বল কাজ করে না। ডানদিকের বেগ ধনাত্মক। প্রত্যাবর্তন গুণাঙ্ক (restitution) 0 মানে গাড়ি দুটি জোড়া লেগে যায়; 1 মানে পূর্ণ স্থিতিস্থাপক সংঘর্ষ, গতিশক্তি একটুও কমে না।',
    ),
    misconception: t(
      'Momentum is a vector, so a cart moving left has negative momentum. Kinetic energy lost in a sticking collision is not destroyed; it changes into other forms while the total momentum stays the same.',
      'ভরবেগ ভেক্টর রাশি, তাই বামদিকে চলা গাড়ির ভরবেগ ঋণাত্মক। জোড়া লাগা সংঘর্ষে হারানো গতিশক্তি ধ্বংস হয় না; মোট ভরবেগ একই রেখে তা অন্য রূপে বদলে যায়।',
    ),
    prompts: [
      t(
        'Predict: a 2 kg cart at 3 m/s hits a resting 1 kg cart and they stick. How fast will they move together?',
        'আগে অনুমান: 3 m/s বেগের 2 kg গাড়ি একটি স্থির 1 kg গাড়িকে ধাক্কা দিয়ে জোড়া লেগে যায়। একসঙ্গে এরা কত বেগে চলবে?',
      ),
      t(
        'Observe: run it, then set restitution to 1 and run again. Record both final velocities, the total momentum and the kinetic energy lost each time.',
        'দেখো: চালাও, তারপর প্রত্যাবর্তন গুণাঙ্ক 1 করে আবার চালাও। প্রতিবার দুই গাড়ির শেষ বেগ, মোট ভরবেগ ও হারানো গতিশক্তি লেখো।',
      ),
      t(
        'Explain: why is the total momentum the same in both runs while the kinetic energy lost is not? Use m1u1 + m2u2 = m1v1 + m2v2 in your answer.',
        'ব্যাখ্যা: দুইবারই মোট ভরবেগ একই কেন, অথচ হারানো গতিশক্তি আলাদা? উত্তরে m1u1 + m2u2 = m1v1 + m2v2 ব্যবহার করো।',
      ),
    ],
    practice: mcq(
      'check1',
      'Two carts collide on a frictionless track. Which quantity is always the same before and after?',
      'ঘর্ষণহীন পথে দুটি গাড়ির সংঘর্ষ হলো। আগে ও পরে কোন রাশিটি সব সময় একই থাকে?',
      [
        ['Total momentum', 'মোট ভরবেগ'],
        ['Total kinetic energy', 'মোট গতিশক্তি'],
        ['Each cart’s velocity', 'প্রতিটি গাড়ির বেগ'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 2, q5: 1 },
    exampleAnswer: { m2: 4 },
    hints: {
      check1: hints(
        'Ask which quantity the equal and opposite collision forces cannot change for the pair of carts.',
        'সংঘর্ষের সমান ও বিপরীত বল গাড়ি-জোড়ার কোন রাশি বদলাতে পারে না, ভাবো।',
        'Kinetic energy can turn into heat and sound, so look for the vector quantity that has no such escape.',
        'গতিশক্তি তাপ ও শব্দে বদলে যেতে পারে; যে ভেক্টর রাশির এমন বেরিয়ে যাওয়ার পথ নেই, সেটি খোঁজো।',
      ),
      q1: hints(
        'Look at the unit kg m/s and match each part to a quantity.',
        'kg m/s এককটি দেখো এবং প্রতিটি অংশকে একটি রাশির সঙ্গে মেলাও।',
        'kg measures one quantity, and m/s measures how fast and in which direction.',
        'kg একটি রাশি মাপে, আর m/s মাপে কত দ্রুত ও কোন দিকে।',
      ),
      q2: hints(
        'Total momentum before equals total momentum after, and the stuck carts share one velocity.',
        'আগের মোট ভরবেগ = পরের মোট ভরবেগ, আর জোড়া লাগা গাড়ি দুটির বেগ একটাই।',
        'Divide 2 × 3 + 1 × 0 by the combined mass 2 + 1.',
        '2 × 3 + 1 × 0-কে মোট ভর 2 + 1 দিয়ে ভাগ করো।',
      ),
      q3: hints(
        'The momentum before stays 2 × 3 = 6 kg m/s whatever cart 2 weighs.',
        'দ্বিতীয় গাড়ির ভর যা-ই হোক, আগের ভরবেগ 2 × 3 = 6 kg m/s থাকে।',
        'Solve 6 = (2 + m2) × 1 for m2, then check the cart 2 velocity reading.',
        '6 = (2 + m2) × 1 থেকে m2 বের করো, তারপর দ্বিতীয় গাড়ির বেগ মিলিয়ে দেখো।',
      ),
      q4: hints(
        'Find the total kinetic energy before and after the collision, then subtract.',
        'সংঘর্ষের আগে ও পরের মোট গতিশক্তি বের করে বিয়োগ করো।',
        'Before: ½ × 2 × 3²; after: ½ × 3 × 2². Keep the answer in joules.',
        'আগে: ½ × 2 × 3²; পরে: ½ × 3 × 2²। উত্তর জুলে রাখো।',
      ),
      q5: hints(
        'Compare the kinetic energy readings before and after when restitution is 0.',
        'প্রত্যাবর্তন গুণাঙ্ক 0 হলে আগে ও পরের গতিশক্তির মান তুলনা করো।',
        'Sticking carts squash and warm up; ask where that energy came from.',
        'জোড়া লাগা গাড়ি চেপে যায় ও গরম হয়; সেই শক্তি কোথা থেকে এল ভাবো।',
      ),
    },
  },
  orbit: {
    objective: t(
      'Explain an orbit as motion under the planet’s gravity; calculate the circular speed v = √(GM/r) and the period of a circular orbit; compare circular, elliptical and escape paths.',
      'কক্ষপথকে গ্রহের মহাকর্ষের অধীনে গতি হিসেবে ব্যাখ্যা করো; বৃত্তাকার বেগ v = √(GM/r) ও বৃত্তাকার কক্ষপথের পর্যায়কাল হিসাব করো; বৃত্তাকার, উপবৃত্তাকার ও মুক্তিবেগে ছুটে যাওয়া পথ তুলনা করো।',
    ),
    example: t(
      'For M = 6 × 10²⁴ kg and r = 2.0 × 10⁷ m: GM = 6.674 × 10⁻¹¹ × 6 × 10²⁴ = 4.00 × 10¹⁴ m³/s², so v = √(4.00 × 10¹⁴ / (2.0 × 10⁷)) = 4.47 km/s. Escape speed is √2 × 4.47 = 6.33 km/s.',
      'M = 6 × 10²⁴ kg ও r = 2.0 × 10⁷ m হলে: GM = 6.674 × 10⁻¹¹ × 6 × 10²⁴ = 4.00 × 10¹⁴ m³/s², তাই v = √(4.00 × 10¹⁴ / (2.0 × 10⁷)) = 4.47 km/s। মুক্তিবেগ √2 × 4.47 = 6.33 km/s।',
    ),
    assumptions: t(
      'Only the planet’s gravity acts: no air drag and no other bodies. The planet is a point mass with G = 6.674 × 10⁻¹¹ N m²/kg², and the satellite is launched at right angles to the radius. The model does not check whether an ellipse dips into the planet’s surface, and a speed within 2% of the circular speed counts as circular.',
      'শুধু গ্রহের মহাকর্ষ বল কাজ করে: বায়ুর বাধা বা অন্য কোনো বস্তু নেই। গ্রহকে বিন্দু ভর ধরা হয়েছে, G = 6.674 × 10⁻¹¹ N m²/kg², আর উপগ্রহকে ব্যাসার্ধের সঙ্গে লম্বভাবে ছোড়া হয়। উপবৃত্তাকার পথ গ্রহের পৃষ্ঠের ভেতরে ঢুকে যায় কি না মডেল তা যাচাই করে না, আর বৃত্তাকার বেগের 2%-এর মধ্যে থাকলে কক্ষপথকে বৃত্তাকার ধরা হয়।',
    ),
    misconception: t(
      'Gravity has not vanished for an orbiting satellite; gravity is what bends its path. Moving at constant speed in a circle is still accelerated motion, because the direction keeps changing.',
      'কক্ষপথের উপগ্রহের জন্য মহাকর্ষ উধাও হয়ে যায় না; মহাকর্ষই এর পথ বাঁকায়। বৃত্তপথে সমদ্রুতিতে চলাও ত্বরিত গতি, কারণ দিক প্রতিনিয়ত বদলায়।',
    ),
    prompts: [
      t(
        'Predict: a satellite starts 1.0 × 10⁷ m from the centre of a 6 × 10²⁴ kg planet at 6 km/s. Will its path be a circle, an ellipse, or will it escape?',
        'আগে অনুমান: 6 × 10²⁴ kg ভরের গ্রহের কেন্দ্র থেকে 1.0 × 10⁷ m দূরে 6 km/s বেগে একটি উপগ্রহ ছোড়া হলো। এর পথ বৃত্ত, উপবৃত্ত, না এটি গ্রহের টান ছাড়িয়ে চলে যাবে?',
      ),
      t(
        'Observe: raise the speed in steps of 1 km/s up to 10 km/s. Record the orbit type, circular speed, escape speed and period each time.',
        'দেখো: বেগ 1 km/s করে বাড়িয়ে 10 km/s পর্যন্ত নাও। প্রতিবার কক্ষপথের ধরন, বৃত্তাকার বেগ, মুক্তিবেগ ও পর্যায়কাল লেখো।',
      ),
      t(
        'Explain: use v = √(GM/r) to explain why only one speed gives a circle at this distance. Then double the planet’s mass and explain how the circular speed changes.',
        'ব্যাখ্যা: v = √(GM/r) দিয়ে বোঝাও কেন এই দূরত্বে শুধু একটি বেগেই বৃত্তাকার পথ হয়। পরে গ্রহের ভর দ্বিগুণ করে বৃত্তাকার বেগ কীভাবে বদলায় ব্যাখ্যা করো।',
      ),
    ],
    practice: mcq(
      'check1',
      'What provides the force that keeps a satellite moving around a planet?',
      'কোন বল উপগ্রহকে গ্রহের চারদিকে ঘুরিয়ে রাখে?',
      [
        ['The planet’s gravitational pull', 'গ্রহের মহাকর্ষ বল'],
        ['The satellite’s engine', 'উপগ্রহের ইঞ্জিন'],
        ['Air pushing on the satellite', 'উপগ্রহের ওপর বাতাসের ধাক্কা'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 1, q5: 0 },
    exampleAnswer: { speed: 6.33 },
    hints: {
      check1: hints(
        'Remove the planet in your mind and ask what path the satellite would follow then.',
        'মনে মনে গ্রহটিকে সরিয়ে ফেলো; তখন উপগ্রহ কোন পথে চলত ভাবো।',
        'There is no air in space and the engine is off after launch; only one force reaches across the gap.',
        'মহাশূন্যে বাতাস নেই এবং উৎক্ষেপণের পর ইঞ্জিন বন্ধ; শুধু একটি বলই দূর থেকে কাজ করে।',
      ),
      q1: hints(
        'Acceleration means a change in velocity, and velocity includes direction.',
        'ত্বরণ মানে বেগের পরিবর্তন, আর বেগের মধ্যে দিকও থাকে।',
        'Ask which way the net force on the satellite points; the acceleration points the same way.',
        'উপগ্রহের ওপর লব্ধি বল কোন দিকে, ভাবো; ত্বরণও সেই দিকেই।',
      ),
      q2: hints(
        'Gravity supplies the centripetal force: GMm/r² = mv²/r, so v = √(GM/r).',
        'মহাকর্ষ বলই কেন্দ্রমুখী বল জোগায়: GMm/r² = mv²/r, তাই v = √(GM/r)।',
        'Compute GM = 6.674 × 10⁻¹¹ × 6 × 10²⁴, divide by 10⁷, take the square root and convert m/s to km/s.',
        'GM = 6.674 × 10⁻¹¹ × 6 × 10²⁴ বের করে 10⁷ দিয়ে ভাগ করো, বর্গমূল নাও, তারপর m/s-কে km/s-এ রূপান্তর করো।',
      ),
      q3: hints(
        'Too slow and the path is an ellipse that falls inward; too fast and it swings outward.',
        'বেগ কম হলে পথ ভেতরের দিকে নেমে যাওয়া উপবৃত্ত; বেশি হলে বাইরের দিকে ছড়িয়ে যায়।',
        'Read the circular speed the model reports for this distance and set the launch speed close to it.',
        'এই দূরত্বের জন্য মডেল যে বৃত্তাকার বেগ দেখায়, তা পড়ে উৎক্ষেপণ বেগ তার কাছাকাছি নাও।',
      ),
      q4: hints(
        'One orbit is one circumference, 2πr, travelled at the circular speed.',
        'একবার ঘোরা মানে বৃত্তাকার বেগে একটি পরিধি, 2πr, অতিক্রম করা।',
        'Use r = 1.0 × 10⁷ m and v in m/s to get seconds, then divide by 3600.',
        'r = 1.0 × 10⁷ m ও v-কে m/s এককে নিয়ে সেকেন্ড বের করো, তারপর 3600 দিয়ে ভাগ করো।',
      ),
      q5: hints(
        'Compare the circular speed and escape speed readings at any one distance.',
        'যেকোনো একটি দূরত্বে বৃত্তাকার বেগ ও মুক্তিবেগের মান তুলনা করো।',
        'Divide the escape speed reading by the circular speed reading and recognise the number.',
        'মুক্তিবেগের মানকে বৃত্তাকার বেগের মান দিয়ে ভাগ করো এবং সংখ্যাটি চিনে নাও।',
      ),
    },
  },
  pendulum: {
    objective: t(
      'Find the drop height h = L(1 − cos θ); calculate the potential energy mgh at release and the speed √(2gh) at the lowest point; show that this speed does not depend on mass.',
      'পতনের উচ্চতা h = L(1 − cos θ) নির্ণয় করো; ছাড়ার মুহূর্তের স্থিতিশক্তি mgh এবং সর্বনিম্ন বিন্দুতে দ্রুতি √(2gh) হিসাব করো; দেখাও যে এই দ্রুতি ভরের ওপর নির্ভর করে না।',
    ),
    example: t(
      'A 0.2 kg bob on a 0.8 m string is released at 60°. h = 0.8 × (1 − cos 60°) = 0.4 m, so Ep = 0.2 × 9.8 × 0.4 = 0.784 J. At the lowest point all of it is kinetic: v = √(2 × 9.8 × 0.4) = √7.84 = 2.8 m/s.',
      '0.8 m সুতায় ঝোলানো 0.2 kg দোলকপিণ্ডকে 60° কোণে ছেড়ে দেওয়া হলো। h = 0.8 × (1 − cos 60°) = 0.4 m, তাই Ep = 0.2 × 9.8 × 0.4 = 0.784 J। সর্বনিম্ন বিন্দুতে এর পুরোটাই গতিশক্তি: v = √(2 × 9.8 × 0.4) = √7.84 = 2.8 m/s।',
    ),
    assumptions: t(
      'The string is light and does not stretch, and the bob is a point mass released from rest. g = 9.8 m/s² unless you change it. With damping 0 no mechanical energy is lost; damping above 0 gradually turns it into heat. The period shown includes a large-angle correction, so at 60° it is a little longer than 2π√(L/g).',
      'সুতাটি হালকা ও অপ্রসারণশীল, দোলকপিণ্ডটি বিন্দু ভর এবং স্থির অবস্থা থেকে ছাড়া হয়। না বদলালে g = 9.8 m/s²। অবমন্দন 0 হলে কোনো যান্ত্রিক শক্তি হারায় না; 0-এর বেশি হলে তা ধীরে ধীরে তাপে পরিণত হয়। দেখানো পর্যায়কালে বড় কোণের সংশোধন আছে, তাই 60°-এ তা 2π√(L/g)-এর চেয়ে একটু বেশি।',
    ),
    misconception: t(
      'A heavier bob does not reach the bottom faster: both mgh and ½mv² scale with mass, so mass cancels. At the ends of the swing the bob is momentarily at rest, but its energy has not gone; it is all potential energy.',
      'ভারী দোলকপিণ্ড নিচে বেশি দ্রুত পৌঁছায় না: mgh ও ½mv² দুটোই ভরের সমানুপাতিক, তাই ভর কেটে যায়। দোলনের দুই প্রান্তে পিণ্ড ক্ষণিকের জন্য থামে, কিন্তু শক্তি হারায় না; তখন পুরোটাই স্থিতিশক্তি।',
    ),
    prompts: [
      t(
        'Predict: a 0.5 kg bob on a 1 m string is released at 60°. How much potential energy does it have, and how fast will it pass the lowest point?',
        'আগে অনুমান: 1 m সুতায় 0.5 kg দোলকপিণ্ড 60° কোণে ছেড়ে দেওয়া হলো। এর স্থিতিশক্তি কত, আর সর্বনিম্ন বিন্দু দিয়ে কত দ্রুত যাবে?',
      ),
      t(
        'Observe: run it and watch the potential and kinetic energy readings. Then change only the mass, and next only the length, recording the energy and the maximum speed each time.',
        'দেখো: চালিয়ে স্থিতিশক্তি ও গতিশক্তির মান লক্ষ করো। পরে শুধু ভর, তারপর শুধু দৈর্ঘ্য বদলাও; প্রতিবার শক্তি ও সর্বোচ্চ দ্রুতি লেখো।',
      ),
      t(
        'Explain: use mgh = ½mv² to explain why mass changed the energy but not the speed. Then add damping and say where the lost mechanical energy goes.',
        'ব্যাখ্যা: mgh = ½mv² দিয়ে বোঝাও কেন ভর বদলালে শক্তি বদলায় কিন্তু দ্রুতি বদলায় না। পরে অবমন্দন যোগ করে বলো হারানো যান্ত্রিক শক্তি কোথায় যায়।',
      ),
    ],
    practice: mcq(
      'check1',
      'As the bob swings down from its release point, which energy change takes place?',
      'ছাড়ার বিন্দু থেকে দোলকপিণ্ড নিচে নামার সময় কোন শক্তির রূপান্তর ঘটে?',
      [
        ['Potential energy to kinetic energy', 'স্থিতিশক্তি থেকে গতিশক্তি'],
        ['Kinetic energy to potential energy', 'গতিশক্তি থেকে স্থিতিশক্তি'],
        ['Kinetic energy to heat only', 'শুধু গতিশক্তি থেকে তাপ'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 0, q5: 2 },
    exampleAnswer: { mass: 0.5, length: 2.45 },
    hints: {
      check1: hints(
        'Compare the bob’s height and speed at the release point with those a moment later.',
        'ছাড়ার বিন্দুতে পিণ্ডের উচ্চতা ও দ্রুতিকে এক মুহূর্ত পরের উচ্চতা ও দ্রুতির সঙ্গে তুলনা করো।',
        'Height is falling and speed is rising; name the energy linked to each.',
        'উচ্চতা কমছে আর দ্রুতি বাড়ছে; প্রতিটির সঙ্গে যুক্ত শক্তির নাম বলো।',
      ),
      q1: hints(
        'Kinetic energy grows when potential energy shrinks, because their total is fixed.',
        'মোট শক্তি স্থির, তাই স্থিতিশক্তি কমলে গতিশক্তি বাড়ে।',
        'Find where in the swing the potential energy reading is smallest.',
        'দোলনের কোথায় স্থিতিশক্তির মান সবচেয়ে কম, খুঁজে দেখো।',
      ),
      q2: hints(
        'First find how far the bob is above the lowest point: h = L(1 − cos θ).',
        'আগে বের করো পিণ্ডটি সর্বনিম্ন বিন্দু থেকে কত ওপরে: h = L(1 − cos θ)।',
        'With cos 60° = 0.5, h = 0.5 m; now multiply m × g × h.',
        'cos 60° = 0.5 হলে h = 0.5 m; এখন m × g × h গুণ করো।',
      ),
      q3: hints(
        'Mass cancels in mgh = ½mv², so think about which setting really changes the drop height.',
        'mgh = ½mv²-এ ভর কেটে যায়; তাই কোন মান বদলালে আসলে পতনের উচ্চতা বদলায় ভাবো।',
        'At 60°, v² = 2g × L × 0.5 = 9.8L; solve for the length that gives v = 4.9 m/s.',
        '60°-এ v² = 2g × L × 0.5 = 9.8L; v = 4.9 m/s পেতে দৈর্ঘ্য কত হবে সমাধান করো।',
      ),
      q4: hints(
        'Set the potential energy lost equal to the kinetic energy gained, so v = √(2gh).',
        'হারানো স্থিতিশক্তি = অর্জিত গতিশক্তি ধরো, তাহলে v = √(2gh)।',
        'Use h = 0.5 m: v = √(2 × 9.8 × 0.5) = √9.8; round to two decimal places at the very end.',
        'h = 0.5 m নাও: v = √(2 × 9.8 × 0.5) = √9.8; একেবারে শেষে দুই দশমিক স্থান পর্যন্ত আসন্ন করো।',
      ),
      q5: hints(
        'Total energy is always conserved; ask which form the swing’s energy can leak into.',
        'মোট শক্তি সব সময় সংরক্ষিত; দোলনের শক্তি কোন রূপে বেরিয়ে যেতে পারে ভাবো।',
        'Watch how the thermal energy reading grows while damping is on.',
        'অবমন্দন চালু থাকলে তাপশক্তির মান কীভাবে বাড়ে দেখো।',
      ),
    },
  },
  spring: {
    objective: t(
      'Calculate stored elastic potential energy ½kx²; use energy conservation to find the maximum speed; relate the period 2π√(m/k) to mass and spring constant.',
      'জমা স্থিতিস্থাপক স্থিতিশক্তি ½kx² হিসাব করো; শক্তির সংরক্ষণ দিয়ে সর্বোচ্চ দ্রুতি বের করো; পর্যায়কাল 2π√(m/k)-কে ভর ও স্প্রিং ধ্রুবকের সঙ্গে সম্পর্কিত করো।',
    ),
    example: t(
      'A spring with k = 80 N/m holds a 0.2 kg block pulled 0.1 m from its rest position. Stored energy = ½ × 80 × 0.1² = 0.4 J. At the centre it is all kinetic: ½ × 0.2 × v² = 0.4, so v = 2 m/s. The period is 2π√(0.2/80) = 0.31 s.',
      'k = 80 N/m স্প্রিংয়ে বাঁধা 0.2 kg ব্লককে সাম্যাবস্থান থেকে 0.1 m টেনে আনা হলো। জমা শক্তি = ½ × 80 × 0.1² = 0.4 J। মাঝখানে পুরোটাই গতিশক্তি: ½ × 0.2 × v² = 0.4, তাই v = 2 m/s। পর্যায়কাল 2π√(0.2/80) = 0.31 s।',
    ),
    assumptions: t(
      'The spring is light and obeys Hooke’s law, F = −kx. The block is released from rest at the chosen displacement and moves along one line. With damping 0 no mechanical energy is lost; damping above 0 gradually turns it into heat.',
      'স্প্রিংটি হালকা এবং হুকের সূত্র F = −kx মেনে চলে। ব্লকটিকে নির্বাচিত সরণ থেকে স্থির অবস্থায় ছেড়ে দেওয়া হয় এবং এটি একই সরলরেখায় চলে। অবমন্দন 0 হলে কোনো যান্ত্রিক শক্তি হারায় না; 0-এর বেশি হলে তা ধীরে ধীরে তাপে পরিণত হয়।',
    ),
    misconception: t(
      'Stored energy grows with the square of the stretch: pulling twice as far stores four times the energy. The period does not depend on how far you pull; only the mass and the spring constant set it.',
      'জমা শক্তি টানের বর্গের সমানুপাতিক: দ্বিগুণ টানলে শক্তি চার গুণ হয়। কতদূর টানা হলো তার ওপর পর্যায়কাল নির্ভর করে না; শুধু ভর ও স্প্রিং ধ্রুবক এটি ঠিক করে।',
    ),
    prompts: [
      t(
        'Predict: a 0.5 kg block on a spring with k = 50 N/m is pulled 0.2 m and released. How much energy is stored, and how fast will it pass the centre?',
        'আগে অনুমান: k = 50 N/m স্প্রিংয়ে বাঁধা 0.5 kg ব্লককে 0.2 m টেনে ছেড়ে দেওয়া হলো। কত শক্তি জমা আছে, আর মাঝখান দিয়ে এটি কত দ্রুত যাবে?',
      ),
      t(
        'Observe: run it and record the energy, maximum speed and period. Then double only the amplitude, and next double only the mass, recording all three each time.',
        'দেখো: চালিয়ে শক্তি, সর্বোচ্চ দ্রুতি ও পর্যায়কাল লেখো। পরে শুধু বিস্তার দ্বিগুণ করো, তারপর শুধু ভর দ্বিগুণ করো; প্রতিবার তিনটি মানই লেখো।',
      ),
      t(
        'Explain: use ½kA² = ½mv² and T = 2π√(m/k) to explain which readings changed and which did not. Then add damping and describe where the energy goes.',
        'ব্যাখ্যা: ½kA² = ½mv² ও T = 2π√(m/k) দিয়ে বোঝাও কোন মান বদলাল আর কোনটি বদলাল না। পরে অবমন্দন যোগ করে শক্তি কোথায় যায় বর্ণনা করো।',
      ),
    ],
    practice: mcq(
      'check1',
      'At the furthest point of its oscillation, what is the block’s kinetic energy?',
      'স্পন্দনের সবচেয়ে দূরের বিন্দুতে ব্লকের গতিশক্তি কত?',
      [
        ['Zero', 'শূন্য'],
        ['Its maximum value', 'সর্বোচ্চ মান'],
        ['Half the stored energy', 'জমা শক্তির অর্ধেক'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 0, q5: 1 },
    exampleAnswer: { mass: 2 },
    hints: {
      check1: hints(
        'At the turning point the block changes direction; think about its speed at that instant.',
        'ঘোরার বিন্দুতে ব্লক দিক বদলায়; ঠিক সেই মুহূর্তে এর দ্রুতি কত ভাবো।',
        'Kinetic energy is ½mv²; put in the speed at the moment of turning.',
        'গতিশক্তি ½mv²; দিক বদলানোর মুহূর্তের দ্রুতি বসাও।',
      ),
      q1: hints(
        'Write the stored energy as a formula in the stretch x.',
        'জমা শক্তিকে প্রসারণ x-এর সূত্র হিসেবে লেখো।',
        'Replace x by 2x in ½kx² and compare with the original.',
        '½kx²-এ x-এর জায়গায় 2x বসিয়ে আগের মানের সঙ্গে তুলনা করো।',
      ),
      q2: hints(
        'Elastic potential energy depends on the spring constant and the square of the stretch.',
        'স্থিতিস্থাপক স্থিতিশক্তি স্প্রিং ধ্রুবক ও প্রসারণের বর্গের ওপর নির্ভর করে।',
        'Calculate ½ × 50 × 0.2² and give the answer in joules.',
        '½ × 50 × 0.2² হিসাব করো; উত্তর জুলে দাও।',
      ),
      q3: hints(
        'The period is proportional to √m, so ask what factor on m doubles √m.',
        'পর্যায়কাল √m-এর সমানুপাতিক; m-কে কত গুণ করলে √m দ্বিগুণ হয় ভাবো।',
        'Doubling the mass is not enough; find the mass that makes √(m/50) equal 0.2, then read the period.',
        'ভর দ্বিগুণ করলে যথেষ্ট নয়; এমন ভর নাও যাতে √(m/50) = 0.2 হয়, তারপর পর্যায়কাল দেখো।',
      ),
      q4: hints(
        'All the stored energy becomes kinetic energy at the centre.',
        'মাঝখানে জমা সব শক্তিই গতিশক্তি হয়ে যায়।',
        'Set ½ × 0.5 × v² equal to the stored energy, or use v = A√(k/m) with √(50/0.5).',
        '½ × 0.5 × v²-কে জমা শক্তির সমান ধরো, অথবা √(50/0.5) নিয়ে v = A√(k/m) ব্যবহার করো।',
      ),
      q5: hints(
        'Look at which quantities appear in T = 2π√(m/k), and on which side of the fraction.',
        'T = 2π√(m/k)-এ কোন কোন রাশি আছে এবং ভগ্নাংশের কোন দিকে আছে দেখো।',
        'Amplitude is missing from the formula; a quantity in the denominator shortens the period as it grows.',
        'সূত্রে বিস্তার নেই; হরের রাশি বাড়লে পর্যায়কাল কমে।',
      ),
    },
  },
};

const launch = { speed: 19.6, angle: 30, height: 0, gravity: 9.8 },
  forces = { aMagnitude: 3, aAngle: 0, bMagnitude: 4, bAngle: 90 },
  slope = { mass: 2, angle: 30, muS: 0.4, muK: 0.3, gravity: 9.8 },
  carts = { m1: 2, m2: 1, u1: 3, u2: 0, restitution: 0 },
  satellite = { planetMass: 6, radius: 10, speed: 6 },
  bob = { length: 1, mass: 0.5, angle: 60, gravity: 9.8, damping: 0 },
  block = { mass: 0.5, k: 50, amplitude: 0.2, damping: 0 };

/** Example lessons for the physics simulations that the first seven lessons do not use. */
export const PHYSICS_LESSONS: ReturnType<typeof lesson>[] = [
  lesson(
    'projectile',
    'physics',
    'physics-2',
    t('Motion: the path of a projectile', 'গতি: প্রক্ষেপকের পথ'),
    t(
      'A ball launched at an angle moves sideways at a steady speed while gravity changes only its vertical velocity. Together these make a curved path.',
      'কোণে ছোড়া বল অনুভূমিক দিকে সমবেগে চলে, আর অভিকর্ষ শুধু এর উল্লম্ব বেগ বদলায়। এই দুই গতি মিলে বাঁকা পথ তৈরি হয়।',
    ),
    explore(
      'projectile',
      launch,
      'Change the launch angle. Compare the range and height.',
      'নিক্ষেপ কোণ বদলাও। পাল্লা ও উচ্চতা তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'With no air resistance, what happens to the ball’s horizontal velocity during flight?',
        'বায়ুর বাধা না থাকলে উড্ডয়নের সময় বলের অনুভূমিক বেগের কী হয়?',
        [
          ['It stays constant', 'ধ্রুব থাকে'],
          ['It increases steadily', 'ক্রমশ বাড়ে'],
          ['It falls to zero at the top', 'শীর্ষবিন্দুতে শূন্য হয়'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A ball is launched from the ground at 19.6 m/s, 30° above the horizontal. What is its time of flight?',
        'ভূমি থেকে অনুভূমিকের সঙ্গে 30° কোণে 19.6 m/s বেগে একটি বল ছোড়া হলো। এর উড্ডয়নকাল কত?',
        2,
        's',
      ),
      task(
        'q3',
        'Change only the launch angle so the ball lands 39.2 m away.',
        'শুধু নিক্ষেপ কোণ বদলে বলটিকে 39.2 m দূরে ফেলো।',
        'projectile',
        launch,
        ['angle'],
        'hitsTarget',
        { x: 39.2, tol: 0.1 },
      ),
      numeric(
        'q4',
        'For the same launch (19.6 m/s at 30°), what maximum height does the ball reach?',
        'একই নিক্ষেপে (30° কোণে 19.6 m/s) বলটি সর্বাধিক কত উচ্চতায় ওঠে?',
        4.9,
        'm',
      ),
      mcq(
        'q5',
        'On level ground at the same speed, which other angle gives the same range as 30°?',
        'সমতল ভূমিতে একই বেগে আর কোন কোণে ছুড়লে 30°-এর সমান পাল্লা পাওয়া যায়?',
        [
          ['60°', '60°'],
          ['45°', '45°'],
          ['15°', '15°'],
        ],
        0,
      ),
    ],
    SUPPORT['projectile']!,
  ),
  lesson(
    'vectors',
    'physics',
    'physics-3',
    t('Force: add two forces', 'বল: দুটি বলের লব্ধি'),
    t(
      'Forces are vectors: they have both size and direction. Two forces acting at one point can be replaced by a single resultant force.',
      'বল ভেক্টর রাশি: এর মান ও দিক দুটোই আছে। এক বিন্দুতে ক্রিয়াশীল দুটি বলের বদলে একটি লব্ধি বল বসানো যায়।',
    ),
    explore(
      'vector-addition',
      forces,
      'Turn force B. Watch how the resultant changes.',
      'বল B ঘোরাও। লব্ধি কীভাবে বদলায় দেখো।',
    ),
    [
      mcq(
        'q1',
        'When is the resultant of two forces largest?',
        'দুটি বলের লব্ধি কখন সবচেয়ে বড় হয়?',
        [
          ['When they act in the same direction', 'যখন বল দুটি একই দিকে ক্রিয়া করে'],
          ['When they are perpendicular', 'যখন বল দুটি পরস্পর লম্ব'],
          ['When they act in opposite directions', 'যখন বল দুটি বিপরীত দিকে ক্রিয়া করে'],
        ],
        0,
      ),
      numeric(
        'q2',
        'What is the resultant of 3 N east and 4 N north?',
        'পূর্বদিকে 3 N ও উত্তরদিকে 4 N বলের লব্ধি কত?',
        5,
        'N',
      ),
      task(
        'q3',
        'Keep both magnitudes and turn only force B so that 3 N and 4 N give a 5 N resultant.',
        'দুটি মান একই রেখে শুধু বল B ঘুরিয়ে 3 N ও 4 N থেকে 5 N লব্ধি পাও।',
        'vector-addition',
        { ...forces, bAngle: 0 },
        ['bAngle'],
        'resultantEquals',
        { magnitude: 5, tol: 0.05 },
      ),
      numeric(
        'q4',
        'A 10 N force acts at 30° above the east direction. What is its northward (y) component?',
        'পূর্বদিক থেকে 30° ওপরে (উত্তরের দিকে) 10 N বল ক্রিয়া করে। এর উত্তরমুখী (y) উপাংশ কত?',
        5,
        'N',
      ),
      mcq(
        'q5',
        'Two equal forces act at one point. As the angle between them grows from 0° to 180°, what happens to the resultant?',
        'এক বিন্দুতে সমান মানের দুটি বল ক্রিয়া করে। এদের মধ্যবর্তী কোণ 0° থেকে 180° পর্যন্ত বাড়লে লব্ধির কী হয়?',
        [
          ['It decreases to zero', 'কমতে কমতে শূন্য হয়'],
          ['It increases steadily', 'ক্রমশ বাড়তে থাকে'],
          ['It stays the same', 'একই থাকে'],
        ],
        0,
      ),
    ],
    SUPPORT['vectors']!,
  ),
  lesson(
    'incline',
    'physics',
    'physics-3',
    t('Force: a block on a slope', 'বল: আনত তলে ব্লক'),
    t(
      'On a slope, weight splits into a part along the surface and a part pressing into it. Friction decides whether the block stays put or slides.',
      'আনত তলে ওজন দুই ভাগ হয়: একটি তল বরাবর, অন্যটি তলের ওপর লম্বভাবে চাপ দেয়। ব্লকটি স্থির থাকবে না পিছলে নামবে, তা ঘর্ষণ ঠিক করে।',
    ),
    explore(
      'incline',
      slope,
      'Change the slope angle. Find when the block starts to slide.',
      'আনত তলের কোণ বদলাও। ব্লক কখন পিছলাতে শুরু করে খুঁজে বের করো।',
    ),
    [
      mcq(
        'q1',
        'A block rests on a rough slope without moving. Which force balances the weight component along the slope?',
        'একটি ব্লক রুক্ষ আনত তলে নড়াচড়া ছাড়া স্থির আছে। ঢাল বরাবর ওজনের উপাংশকে কোন বল সাম্যাবস্থায় রাখে?',
        [
          ['Static friction', 'স্থিতি ঘর্ষণ'],
          ['The normal force', 'অভিলম্ব বল'],
          ['Kinetic friction', 'গতীয় ঘর্ষণ'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A 2 kg block sits on a 30° slope. What is the component of its weight along the slope?',
        '30° আনত তলে একটি 2 kg ব্লক আছে। ঢাল বরাবর এর ওজনের উপাংশ কত?',
        9.8,
        'N',
      ),
      task(
        'q3',
        'Change only the slope angle so the 2 kg block (μs = 0.4) stays at rest.',
        'শুধু আনত তলের কোণ বদলে 2 kg ব্লকটিকে (μs = 0.4) স্থির রাখো।',
        'incline',
        slope,
        ['angle'],
        'slides',
        { slides: false },
      ),
      numeric(
        'q4',
        'The 2 kg block slides down the 30° slope with μk = 0.3. What is its acceleration, to two decimal places?',
        '30° আনত তলে μk = 0.3 নিয়ে 2 kg ব্লকটি পিছলে নামছে। দুই দশমিক স্থান পর্যন্ত এর ত্বরণ কত?',
        2.35,
        'm/s²',
      ),
      mcq(
        'q5',
        'As the slope gets steeper, what happens to the normal force on the block?',
        'আনত তল আরও খাড়া হলে ব্লকের ওপর অভিলম্ব বলের কী হয়?',
        [
          ['It decreases', 'কমে যায়'],
          ['It increases', 'বেড়ে যায়'],
          ['It stays equal to mg', 'mg-এর সমান থাকে'],
        ],
        0,
      ),
    ],
    SUPPORT['incline']!,
  ),
  lesson(
    'collision',
    'physics',
    'physics-3',
    t('Force: carts that collide', 'বল: গাড়ির সংঘর্ষ'),
    t(
      'When two carts collide, the forces between them are equal and opposite, so the total momentum is the same before and after. Kinetic energy may not be.',
      'দুটি গাড়ির সংঘর্ষে এদের মধ্যকার বল সমান ও বিপরীত, তাই সংঘর্ষের আগে ও পরে মোট ভরবেগ একই থাকে। গতিশক্তি একই নাও থাকতে পারে।',
    ),
    explore(
      'collision',
      carts,
      'Change the masses and restitution. Compare momentum and kinetic energy.',
      'ভর ও প্রত্যাবর্তন গুণাঙ্ক বদলাও। ভরবেগ ও গতিশক্তি তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'Momentum is the product of which two quantities?',
        'ভরবেগ কোন দুটি রাশির গুণফল?',
        [
          ['Mass and velocity', 'ভর ও বেগ'],
          ['Mass and acceleration', 'ভর ও ত্বরণ'],
          ['Weight and distance', 'ওজন ও দূরত্ব'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A 2 kg cart at 3 m/s hits a resting 1 kg cart and they stick together. What is their common velocity?',
        '3 m/s বেগের 2 kg গাড়ি একটি স্থির 1 kg গাড়িকে ধাক্কা দিয়ে জোড়া লেগে যায়। এদের সাধারণ বেগ কত?',
        2,
        'm/s',
      ),
      task(
        'q3',
        'The carts stick together. Change only the mass of cart 2 so they move off together at 1 m/s.',
        'গাড়ি দুটি জোড়া লেগে যায়। শুধু দ্বিতীয় গাড়ির ভর বদলে এদের একসঙ্গে 1 m/s বেগে চালাও।',
        'collision',
        carts,
        ['m2'],
        'finalVelocityEquals',
        { cart: '2', v: 1, tol: 0.01 },
      ),
      numeric(
        'q4',
        'In that sticking collision (2 kg at 3 m/s onto 1 kg at rest), how much kinetic energy is lost?',
        'ওই জোড়া লাগা সংঘর্ষে (3 m/s বেগের 2 kg গাড়ি স্থির 1 kg গাড়িতে) কতটুকু গতিশক্তি হারায়?',
        3,
        'J',
      ),
      mcq(
        'q5',
        'When two carts stick together after colliding, what happens to their total kinetic energy?',
        'সংঘর্ষের পর দুটি গাড়ি জোড়া লেগে গেলে এদের মোট গতিশক্তির কী হয়?',
        [
          ['It decreases', 'কমে যায়'],
          ['It increases', 'বেড়ে যায়'],
          ['It stays the same', 'একই থাকে'],
        ],
        0,
      ),
    ],
    SUPPORT['collision']!,
  ),
  lesson(
    'orbit',
    'physics',
    'physics-3',
    t('Force: keep a satellite in orbit', 'বল: উপগ্রহকে কক্ষপথে রাখো'),
    t(
      'Gravity pulls a satellite towards the planet’s centre. If it moves sideways fast enough, it keeps falling around the planet instead of into it.',
      'মহাকর্ষ বল উপগ্রহকে গ্রহের কেন্দ্রের দিকে টানে। পাশের দিকে যথেষ্ট দ্রুত চললে এটি গ্রহে না পড়ে গ্রহের চারদিকে ঘুরতে থাকে।',
    ),
    explore(
      'orbit',
      satellite,
      'Change the launch speed. Compare circle, ellipse and escape.',
      'উৎক্ষেপণ বেগ বদলাও। বৃত্ত, উপবৃত্ত ও মুক্তি তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'A satellite moves in a circular orbit at constant speed. Is it accelerating?',
        'একটি উপগ্রহ বৃত্তাকার কক্ষপথে সমদ্রুতিতে ঘুরছে। এর কি ত্বরণ আছে?',
        [
          ['Yes, towards the planet’s centre', 'হ্যাঁ, গ্রহের কেন্দ্রের দিকে'],
          ['No, because its speed is constant', 'না, কারণ এর দ্রুতি ধ্রুব'],
          ['Yes, away from the planet', 'হ্যাঁ, গ্রহ থেকে দূরের দিকে'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For a 6 × 10²⁴ kg planet and r = 1.0 × 10⁷ m, what is the circular orbit speed in km/s, to two decimal places? Use G = 6.674 × 10⁻¹¹ N m²/kg².',
        '6 × 10²⁴ kg ভরের গ্রহ ও r = 1.0 × 10⁷ m হলে বৃত্তাকার কক্ষপথের বেগ km/s এককে দুই দশমিক স্থান পর্যন্ত কত? G = 6.674 × 10⁻¹¹ N m²/kg² নাও।',
        6.33,
        'km/s',
      ),
      task(
        'q3',
        'Change only the launch speed so the satellite moves in a circular orbit.',
        'শুধু উৎক্ষেপণ বেগ বদলে উপগ্রহটিকে বৃত্তাকার কক্ষপথে ঘোরাও।',
        'orbit',
        satellite,
        ['speed'],
        'orbitIs',
        { kind: 'circular' },
      ),
      numeric(
        'q4',
        'How long does one circular orbit at that distance take, in hours to two decimal places? Use T = 2πr/v.',
        'ওই দূরত্বে একবার বৃত্তাকার কক্ষপথ ঘুরতে কত ঘণ্টা লাগে, দুই দশমিক স্থান পর্যন্ত? T = 2πr/v ব্যবহার করো।',
        2.76,
        'h',
      ),
      mcq(
        'q5',
        'At the same distance, how does escape speed compare with circular speed?',
        'একই দূরত্বে মুক্তিবেগ বৃত্তাকার বেগের তুলনায় কত?',
        [
          ['√2 times the circular speed', 'বৃত্তাকার বেগের √2 গুণ'],
          ['Twice the circular speed', 'বৃত্তাকার বেগের দ্বিগুণ'],
          ['Half the circular speed', 'বৃত্তাকার বেগের অর্ধেক'],
        ],
        0,
      ),
    ],
    SUPPORT['orbit']!,
  ),
  lesson(
    'pendulum',
    'physics',
    'physics-4',
    t('Energy: the swinging pendulum', 'শক্তি: দোলকের দোলন'),
    t(
      'A pendulum released from rest trades gravitational potential energy for kinetic energy and back again. Without damping, their total stays the same.',
      'স্থির অবস্থা থেকে ছেড়ে দেওয়া দোলক বারবার অভিকর্ষজ স্থিতিশক্তিকে গতিশক্তিতে এবং গতিশক্তিকে আবার স্থিতিশক্তিতে রূপান্তর করে। অবমন্দন না থাকলে এদের মোট পরিমাণ একই থাকে।',
    ),
    explore(
      'pendulum',
      bob,
      'Change the mass and length. Compare energy and speed.',
      'ভর ও দৈর্ঘ্য বদলাও। শক্তি ও দ্রুতি তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'Where in the swing is the bob’s kinetic energy greatest?',
        'দোলনের কোথায় দোলকপিণ্ডের গতিশক্তি সবচেয়ে বেশি?',
        [
          ['At the lowest point', 'সর্বনিম্ন বিন্দুতে'],
          ['At either end of the swing', 'দোলনের যেকোনো প্রান্তে'],
          ['Halfway up the swing', 'দোলনের মাঝ-উচ্চতায়'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A 0.5 kg bob on a 1 m string is pulled to 60° and held. What is its potential energy relative to the lowest point?',
        '1 m সুতায় 0.5 kg দোলকপিণ্ডকে 60° কোণে টেনে ধরে রাখা হলো। সর্বনিম্ন বিন্দুর সাপেক্ষে এর স্থিতিশক্তি কত?',
        2.45,
        'J',
      ),
      task(
        'q3',
        'Change the mass, the length or both so the bob passes the lowest point at 4.9 m/s.',
        'ভর, দৈর্ঘ্য বা দুটোই বদলে দোলকপিণ্ডকে সর্বনিম্ন বিন্দু দিয়ে 4.9 m/s দ্রুতিতে পার করাও।',
        'pendulum',
        bob,
        ['mass', 'length'],
        'maxSpeedEquals',
        { speed: 4.9, tol: 0.05 },
      ),
      numeric(
        'q4',
        'Released from rest at 60° on a 1 m string, how fast does the bob pass the lowest point, to two decimal places?',
        '1 m সুতায় 60° কোণে স্থির অবস্থা থেকে ছাড়লে দোলকপিণ্ড দুই দশমিক স্থান পর্যন্ত কত দ্রুতিতে সর্বনিম্ন বিন্দু পার হয়?',
        3.13,
        'm/s',
      ),
      mcq(
        'q5',
        'With damping switched on, why do the swings get smaller?',
        'অবমন্দন চালু করলে দোলন ছোট হয়ে আসে কেন?',
        [
          ['Mechanical energy turns into heat', 'যান্ত্রিক শক্তি তাপে রূপান্তরিত হয়'],
          ['Energy is destroyed', 'শক্তি ধ্বংস হয়ে যায়'],
          ['Gravity becomes weaker', 'অভিকর্ষ দুর্বল হয়ে যায়'],
        ],
        0,
      ),
    ],
    SUPPORT['pendulum']!,
  ),
  lesson(
    'spring',
    'physics',
    'physics-4',
    t('Energy: a mass on a spring', 'শক্তি: স্প্রিংয়ে বাঁধা ভর'),
    t(
      'A stretched spring stores elastic potential energy. Released, the block turns that energy into kinetic energy and back, oscillating about its rest position.',
      'টানা স্প্রিংয়ে স্থিতিস্থাপক স্থিতিশক্তি জমা থাকে। ছেড়ে দিলে ব্লকটি সেই শক্তিকে গতিশক্তিতে এবং আবার স্থিতিশক্তিতে রূপান্তর করে সাম্যাবস্থানের দুই পাশে স্পন্দিত হয়।',
    ),
    explore(
      'spring',
      block,
      'Change the amplitude and mass. Compare energy and period.',
      'বিস্তার ও ভর বদলাও। শক্তি ও পর্যায়কাল তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'If the same spring is pulled twice as far, the stored elastic potential energy becomes…',
        'একই স্প্রিংকে দ্বিগুণ দূরে টানলে জমা স্থিতিস্থাপক স্থিতিশক্তি হয়…',
        [
          ['Four times as large', 'চার গুণ'],
          ['Twice as large', 'দ্বিগুণ'],
          ['Unchanged', 'অপরিবর্তিত'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A spring with k = 50 N/m is stretched 0.2 m. How much elastic potential energy does it store?',
        'k = 50 N/m স্প্রিংকে 0.2 m প্রসারিত করা হলো। এতে কত স্থিতিস্থাপক স্থিতিশক্তি জমা থাকে?',
        1,
        'J',
      ),
      task(
        'q3',
        'Change only the mass so one full oscillation takes twice as long: 0.4π s, about 1.26 s.',
        'শুধু ভর বদলে একটি পূর্ণ স্পন্দনের সময় দ্বিগুণ করো: 0.4π s, প্রায় 1.26 s।',
        'spring',
        block,
        ['mass'],
        'periodEquals',
        { period: 0.4 * Math.PI, tol: 0.01 },
      ),
      numeric(
        'q4',
        'Released from 0.2 m, how fast does the 0.5 kg block pass the centre (k = 50 N/m)?',
        '0.2 m থেকে ছেড়ে দিলে 0.5 kg ব্লকটি (k = 50 N/m) কত দ্রুতিতে মাঝখান পার হয়?',
        2,
        'm/s',
      ),
      mcq(
        'q5',
        'Which change makes a mass–spring oscillator’s period longer?',
        'কোন পরিবর্তনে ভর–স্প্রিং স্পন্দকের পর্যায়কাল বাড়ে?',
        [
          ['A larger mass', 'বেশি ভর'],
          ['A stiffer spring with larger k', 'বড় k-এর আরও শক্ত স্প্রিং'],
          ['A larger amplitude', 'বেশি বিস্তার'],
        ],
        0,
      ),
    ],
    SUPPORT['spring']!,
  ),
];
