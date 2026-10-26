import { explore, hints, lesson, mcq, numeric, t, task, type Support } from './demo-lesson-kit';

const SUPPORT: Record<string, Support> = {
  functions: {
    objective: t(
      'Evaluate f(x) by substitution, read images and the y-intercept from a graph, find an input whose image is 0, and decide whether a rule is a function.',
      'মান বসিয়ে f(x) নির্ণয় করো, লেখচিত্র থেকে ছবি ও y-অক্ষের ছেদবিন্দু পড়ো, কোন x-এর ছবি 0 তা খুঁজে বের করো এবং কোনো নিয়ম ফাংশন কি না যাচাই করো।',
    ),
    example: t(
      'For f(x) = x² − 2x − 3: f(1) = 1 − 2 − 3 = −4 and f(2) = 4 − 4 − 3 = −3. So the points (1, −4) and (2, −3) lie on the graph of f.',
      'f(x) = x² − 2x − 3 হলে: f(1) = 1 − 2 − 3 = −4 এবং f(2) = 4 − 4 − 3 = −3। তাই (1, −4) ও (2, −3) বিন্দু দুটি f-এর লেখচিত্রের ওপর থাকে।',
    ),
    assumptions: t(
      'The grapher draws the quadratic f(x) = a·x² + b·x + c (d is not used) for x from −10 to 10 and reports f(x) at the chosen point x. The domain you see is that window of real numbers, not the whole real line.',
      'গ্রাফারটি দ্বিঘাত ফাংশন f(x) = a·x² + b·x + c আঁকে (d ব্যবহৃত হয় না), x-এর মান −10 থেকে 10 পর্যন্ত, এবং বেছে নেওয়া বিন্দু x-এ f(x)-এর মান দেখায়। এখানে দেখানো ডোমেন বাস্তব সংখ্যার ওই সীমাটুকু, পুরো বাস্তব সংখ্যারেখা নয়।',
    ),
    misconception: t(
      'Two different inputs may share one image (here f(0) = f(2) = −3), and f is still a function. A rule fails to be a function only when one input has two or more images. The constant term c is the y-intercept f(0), not a root of f.',
      'দুটি ভিন্ন x-এর ছবি একই হতে পারে (এখানে f(0) = f(2) = −3), তবু f একটি ফাংশন। কোনো একটি x-এর দুই বা ততোধিক ছবি থাকলে তবেই নিয়মটি ফাংশন হয় না। ধ্রুব পদ c হলো y-অক্ষের ছেদক f(0), f-এর মূল নয়।',
    ),
    prompts: [
      t(
        'Predict: before moving x, work out f(0), f(2) and f(3) for f(x) = x² − 2x − 3. Which two do you expect to be equal, and which one is zero?',
        'আগে অনুমান: x সরানোর আগে f(x) = x² − 2x − 3-এর জন্য f(0), f(2) ও f(3) হিসাব করো। কোন দুটি সমান হবে আর কোনটি শূন্য হবে বলে মনে করো?',
      ),
      t(
        'Observe: move x to −1, 0, 1, 2, 3 and 4 and record the image f(x) each time. Note where the curve crosses the y-axis and the x-axis.',
        'দেখো: x-কে −1, 0, 1, 2, 3 ও 4-এ নিয়ে প্রতিবার ছবি f(x) লেখো। লেখচিত্র কোথায় y-অক্ষ ও x-অক্ষকে ছেদ করে খেয়াল করো।',
      ),
      t(
        'Explain: some different inputs gave the same image. Use your table to explain why f is still a function, and why every vertical line meets its graph at most once.',
        'ব্যাখ্যা: কিছু ভিন্ন x-এর ছবি একই এসেছে। তোমার সারণি দেখে বোঝাও কেন f তবু ফাংশন, এবং কেন যেকোনো উল্লম্ব রেখা এর লেখচিত্রকে সর্বোচ্চ একবার ছেদ করে।',
      ),
    ],
    practice: mcq(
      'check1',
      'Which statement defines a function f from set A to set B?',
      'সেট A থেকে সেট B-তে ফাংশন f-এর সংজ্ঞা কোন উক্তিটি?',
      [
        [
          'Each element of A has exactly one image in B',
          'A-এর প্রতিটি উপাদানের B-তে ঠিক একটি ছবি থাকে',
        ],
        [
          'Each element of B has exactly one pre-image in A',
          'B-এর প্রতিটি উপাদানের A-তে ঠিক একটি পূর্বছবি থাকে',
        ],
        [
          'An element of A may have two images in B',
          'A-এর কোনো উপাদানের B-তে দুটি ছবিও থাকতে পারে',
        ],
      ],
      0,
    ),
    positions: { check1: 0, q1: 1, q5: 2 },
    exampleAnswer: { x: 3 },
    hints: {
      check1: hints(
        'Think about how many arrows may leave each element of A in an arrow diagram.',
        'তীরচিত্রে A-এর প্রতিটি উপাদান থেকে কয়টি তীর বের হতে পারে ভাবো।',
        'Every element of A must be used, and none may point to two different elements of B.',
        'A-এর প্রতিটি উপাদান ব্যবহার করতে হবে, আর কোনোটি B-এর দুটি ভিন্ন উপাদানে যেতে পারবে না।',
      ),
      q1: hints(
        'Every point on the y-axis has x-coordinate 0.',
        'y-অক্ষের ওপর প্রতিটি বিন্দুর x-স্থানাঙ্ক 0।',
        'Evaluate f(0) and write the point as (0, f(0)), not the other way round.',
        'f(0) হিসাব করে বিন্দুটি (0, f(0)) আকারে লেখো, উল্টো ক্রমে নয়।',
      ),
      q2: hints(
        'Substitute 4 for every x in the rule before simplifying.',
        'সরল করার আগে নিয়মের প্রতিটি x-এর জায়গায় 4 বসাও।',
        'Work out 4² and 2 × 4 first, then combine them with −3 in order.',
        'আগে 4² ও 2 × 4 হিসাব করো, তারপর −3 সহ ক্রমানুসারে মেলাও।',
      ),
      q3: hints(
        'An image of 0 means the point on the curve lies on the x-axis.',
        'ছবি 0 মানে লেখচিত্রের বিন্দুটি x-অক্ষের ওপর।',
        'Factorise x² − 2x − 3 into two brackets, or watch where the curve crosses the x-axis; the constant −3 is not one of those places.',
        'x² − 2x − 3-কে দুটি বন্ধনীর গুণফলে বিশ্লেষণ করো, বা লেখচিত্র x-অক্ষকে কোথায় কাটে দেখো; ধ্রুব পদ −3 সেই বিন্দু নয়।',
      ),
      q4: hints(
        'Substitute carefully; this time the input is negative.',
        'সাবধানে মান বসাও; এবার x ঋণাত্মক।',
        'Write f(−2) = (−2)² − 2(−2) − 3 and watch the signs: a negative number squared is positive, and subtracting a negative adds.',
        'f(−2) = (−2)² − 2(−2) − 3 লেখো এবং চিহ্ন খেয়াল করো: ঋণাত্মক সংখ্যার বর্গ ধনাত্মক, আর ঋণাত্মক সংখ্যা বিয়োগ করা মানে যোগ করা।',
      ),
      q5: hints(
        'Recall which set in the arrow diagram must send exactly one arrow from each element.',
        'তীরচিত্রে কোন সেটের প্রতিটি উপাদান থেকে ঠিক একটি তীর যেতে হয় মনে করো।',
        'Check whether x = 4 or x = −2 is sent to two different images; sharing one image is a separate matter.',
        'দেখো x = 4 বা x = −2 কি দুটি ভিন্ন ছবিতে যায়; একটি ছবি ভাগাভাগি করা আলাদা ব্যাপার।',
      ),
    },
  },
  waves: {
    objective: t(
      'Read amplitude, period and range from y = A sin(bθ) and y = A cos(bθ); calculate the period as 360°/b; evaluate a wave at an angle given in degrees.',
      'y = A sin(bθ) ও y = A cos(bθ) থেকে বিস্তার, পর্যায়কাল ও রেঞ্জ পড়ো; পর্যায়কাল 360°/b হিসেবে নির্ণয় করো; ডিগ্রিতে দেওয়া কোণে তরঙ্গের মান বের করো।',
    ),
    example: t(
      'For y = 3 sin 4θ: the amplitude is 3, so y runs from −3 to 3, and the period is 360°/4 = 90°. At θ = 15°, y = 3 sin 60° = 3 × √3/2 ≈ 2.60.',
      'y = 3 sin 4θ হলে: বিস্তার 3, তাই y-এর মান −3 থেকে 3 পর্যন্ত, আর পর্যায়কাল 360°/4 = 90°। θ = 15°-তে y = 3 sin 60° = 3 × √3/2 ≈ 2.60।',
    ),
    assumptions: t(
      'Angles are in degrees and θ runs from 0° to 720°. The model draws y = A sin(bθ + φ) or y = A cos(bθ + φ) with amplitude A > 0 and no vertical shift. The control b is the number of cycles in every 360°, so the period is 360°/b; the phase φ, in degrees, slides the wave sideways and stays 0° in this lesson.',
      'কোণ ডিগ্রিতে মাপা হয় এবং θ-এর মান 0° থেকে 720°। মডেলটি বিস্তার A > 0 নিয়ে y = A sin(bθ + φ) বা y = A cos(bθ + φ) আঁকে; কোনো উল্লম্ব সরণ নেই। b হলো প্রতি 360°-এ চক্রের সংখ্যা, তাই পর্যায়কাল 360°/b; ডিগ্রিতে মাপা দশা φ তরঙ্গকে পাশে সরায় এবং এই পাঠে φ = 0° থাকে।',
    ),
    misconception: t(
      'A larger b makes the period shorter, not longer: the wave repeats sooner. Amplitude is the distance from the centre line to a peak, not the full height from the lowest point to the highest.',
      'b বড় হলে পর্যায়কাল কমে, বাড়ে না: তরঙ্গ আরও আগে পুনরাবৃত্ত হয়। বিস্তার হলো মধ্যরেখা থেকে শীর্ষবিন্দুর দূরত্ব, সর্বনিম্ন বিন্দু থেকে সর্বোচ্চ বিন্দু পর্যন্ত পুরো উচ্চতা নয়।',
    ),
    prompts: [
      t(
        'Predict: for y = 2 sin θ, what are the largest and smallest values of y, and at which angles between 0° and 360° do they occur?',
        'আগে অনুমান: y = 2 sin θ-এর জন্য y-এর বৃহত্তম ও ক্ষুদ্রতম মান কত, আর 0° থেকে 360°-এর মধ্যে কোন কোণে সেগুলো পাওয়া যায়?',
      ),
      t(
        'Observe: change only the amplitude A from 2 to 4, then put it back and change only b from 1 to 2. Each time record the maximum, the minimum and the period.',
        'দেখো: শুধু বিস্তার A-কে 2 থেকে 4 করো, তারপর আগের মানে ফিরিয়ে শুধু b-কে 1 থেকে 2 করো। প্রতিবার সর্বোচ্চ মান, সর্বনিম্ন মান ও পর্যায়কাল লেখো।',
      ),
      t(
        'Explain: why does changing A stretch the wave vertically while changing b squeezes it horizontally? Use the period formula 360°/b in your answer.',
        'ব্যাখ্যা: A বদলালে তরঙ্গ উল্লম্বভাবে প্রসারিত হয়, কিন্তু b বদলালে অনুভূমিকভাবে সংকুচিত হয় কেন? উত্তরে পর্যায়কালের সূত্র 360°/b ব্যবহার করো।',
      ),
    ],
    practice: mcq(
      'check1',
      'In y = A sin θ, A changes from 2 to 3. What happens to the graph?',
      'y = A sin θ-তে A-এর মান 2 থেকে 3 হলে লেখচিত্রের কী হয়?',
      [
        ['The wave gets taller; its period stays 360°', 'তরঙ্গ উঁচু হয়; পর্যায়কাল 360°-ই থাকে'],
        ['The wave repeats every 120°', 'তরঙ্গ প্রতি 120°-এ পুনরাবৃত্ত হয়'],
        ['The wave moves 3 units up', 'তরঙ্গ 3 একক ওপরে সরে যায়'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 2, q5: 0 },
    exampleAnswer: { frequency: 2 },
    hints: {
      check1: hints(
        'A multiplies every height of the wave by the same factor.',
        'A তরঙ্গের প্রতিটি উচ্চতাকে একই গুণক দিয়ে গুণ করে।',
        'The angle inside sin θ is unchanged, so ask whether the wave could now repeat at a different angle.',
        'sin θ-এর ভেতরের কোণ বদলায়নি, তাই তরঙ্গ এখন ভিন্ন কোণে পুনরাবৃত্ত হতে পারে কি না ভাবো।',
      ),
      q1: hints(
        'One full cycle of sine needs the angle inside it to grow by 360°.',
        'সাইনের এক পূর্ণ চক্রের জন্য ভেতরের কোণকে 360° বাড়তে হয়।',
        'Find the θ that makes 3θ equal to 360°.',
        'কোন θ-এর জন্য 3θ = 360° হয় তা নির্ণয় করো।',
      ),
      q2: hints(
        'Multiply the angle by b before taking the sine.',
        'সাইন নেওয়ার আগে কোণটিকে b দিয়ে গুণ করো।',
        'Here 2θ = 30°; use the standard value of sin 30°, then multiply by the amplitude.',
        'এখানে 2θ = 30°; sin 30°-এর প্রচলিত মান নিয়ে বিস্তার দিয়ে গুণ করো।',
      ),
      q3: hints(
        'Only b is editable, and the amplitude has no effect on the period.',
        'শুধু b বদলানো যাবে, আর বিস্তার পর্যায়কালকে প্রভাবিত করে না।',
        'Set 360°/b equal to 180° and solve for b, then check the period reading after moving the slider.',
        '360°/b-কে 180°-এর সমান ধরে b নির্ণয় করো, তারপর স্লাইডার সরিয়ে পর্যায়কালের মান মিলিয়ে দেখো।',
      ),
      q4: hints(
        'Decide which quadrant 120° lies in and the sign of cosine there.',
        '120° কোন চতুর্ভাগে এবং সেখানে কোসাইনের চিহ্ন কী তা ঠিক করো।',
        'Use cos 120° = −cos 60°, then multiply by the amplitude 3.',
        'cos 120° = −cos 60° ব্যবহার করে বিস্তার 3 দিয়ে গুণ করো।',
      ),
      q5: hints(
        'Start from the range of sin θ on its own.',
        'আগে শুধু sin θ-এর রেঞ্জ ভাবো।',
        'Multiply both ends of −1 ≤ sin θ ≤ 1 by the amplitude.',
        '−1 ≤ sin θ ≤ 1-এর দুই প্রান্তকে বিস্তার দিয়ে গুণ করো।',
      ),
    },
  },
  area: {
    objective: t(
      'Compute left, right and midpoint rectangle sums by hand; explain why a left sum underestimates and a right sum overestimates under a rising curve; choose the rule and n to make the error small.',
      'বাম, ডান ও মধ্যবিন্দু আয়তক্ষেত্র-যোগফল হাতে হিসাব করো; বর্ধমান লেখচিত্রের নিচে বাম যোগফল কেন কম আর ডান যোগফল কেন বেশি হয় বোঝো; ত্রুটি কমাতে নিয়ম ও n বেছে নাও।',
    ),
    example: t(
      'For y = x on [0, 2] with n = 2 and the left rule: the strip width is (2 − 0)/2 = 1, the heights are f(0) = 0 and f(1) = 1, so the sum is 1 × (0 + 1) = 1. The exact area is a triangle, ½ × 2 × 2 = 2, so this left sum is too small.',
      'y = x-এর [0, 2] ব্যবধিতে n = 2 ও বাম নিয়ম নিলে: ফালির প্রস্থ (2 − 0)/2 = 1, উচ্চতা f(0) = 0 ও f(1) = 1, তাই যোগফল 1 × (0 + 1) = 1। প্রকৃত ক্ষেত্রফল একটি ত্রিভুজের, ½ × 2 × 2 = 2, তাই এই বাম যোগফল কম হয়েছে।',
    ),
    assumptions: t(
      'The model splits [from, to] into n equal strips of width (to − from)/n, with n from 1 to 200. A left, right or midpoint sum uses f at that point of each strip as the rectangle height; a trapezoid rule is also offered. Area below the x-axis counts as negative. The exact area is computed numerically, and error = |estimate − exact|.',
      'মডেলটি [from, to] ব্যবধিকে (to − from)/n প্রস্থের n টি সমান ফালিতে ভাগ করে; n-এর মান 1 থেকে 200। বাম, ডান বা মধ্যবিন্দু যোগফলে প্রতিটি ফালির ওই বিন্দুতে f-এর মানকে আয়তক্ষেত্রের উচ্চতা ধরা হয়; ট্রাপিজিয়াম নিয়মও আছে। x-অক্ষের নিচের ক্ষেত্রফল ঋণাত্মক ধরা হয়। প্রকৃত ক্ষেত্রফল সংখ্যাগত পদ্ধতিতে নির্ণয় করা হয়, আর ত্রুটি = |অনুমান − প্রকৃত মান|।',
    ),
    misconception: t(
      'A large n does not make a sum exact: every rectangle sum is an estimate, and its error depends on the rule as well as on n. Under a rising curve the left sum is always too small and the right sum always too large.',
      'n বড় হলেই যোগফল নির্ভুল হয় না: প্রতিটি আয়তক্ষেত্র-যোগফল একটি অনুমান, আর এর ত্রুটি n-এর পাশাপাশি নিয়মের ওপরও নির্ভর করে। বর্ধমান লেখচিত্রের নিচে বাম যোগফল সব সময় কম আর ডান যোগফল সব সময় বেশি হয়।',
    ),
    prompts: [
      t(
        'Predict: with 4 strips on [0, 2], will the left sum be above or below the true area under y = x²? What about the right sum?',
        'আগে অনুমান: [0, 2] ব্যবধিতে 4 টি ফালি নিলে বাম যোগফল y = x²-এর নিচের প্রকৃত ক্ষেত্রফলের চেয়ে বেশি হবে না কম? ডান যোগফল?',
      ),
      t(
        'Observe: with n = 4, switch between the left, right and midpoint rules and record each estimate and its error. Then try n = 8 and n = 16 with the left rule.',
        'দেখো: n = 4 রেখে বাম, ডান ও মধ্যবিন্দু নিয়ম পাল্টে প্রতিটির আনুমানিক ক্ষেত্রফল ও ত্রুটি লেখো। তারপর বাম নিয়মে n = 8 ও n = 16 নিয়ে দেখো।',
      ),
      t(
        'Explain: use the picture of the rectangles to explain why the left sum is too small under this rising curve, and why the midpoint sum is much closer for the same n.',
        'ব্যাখ্যা: আয়তক্ষেত্রগুলোর ছবি দেখে বোঝাও, এই বর্ধমান লেখচিত্রের নিচে বাম যোগফল কেন কম হয়, আর একই n-এ মধ্যবিন্দু যোগফল কেন অনেক কাছাকাছি থাকে।',
      ),
    ],
    practice: mcq(
      'check1',
      'Under the rising curve y = x² on [0, 2], the left-endpoint sum is…',
      'বর্ধমান লেখচিত্র y = x²-এর [0, 2] ব্যবধিতে বাম প্রান্তবিন্দু যোগফল…',
      [
        ['Less than the exact area', 'প্রকৃত ক্ষেত্রফলের চেয়ে কম'],
        ['Greater than the exact area', 'প্রকৃত ক্ষেত্রফলের চেয়ে বেশি'],
        ['Always equal to the exact area', 'সব সময় প্রকৃত ক্ষেত্রফলের সমান'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 0, q5: 1 },
    exampleAnswer: { n: 10, rule: 'midpoint' },
    hints: {
      check1: hints(
        'Compare the top of each rectangle with the curve above the same strip.',
        'প্রতিটি আয়তক্ষেত্রের ওপরের বাহুকে একই ফালির ওপরের লেখচিত্রের সঙ্গে তুলনা করো।',
        'On a rising curve the left end of a strip is its lowest point, so the rectangle leaves a gap under the curve.',
        'বর্ধমান লেখচিত্রে ফালির বাম প্রান্তই সবচেয়ে নিচু, তাই আয়তক্ষেত্র ও লেখচিত্রের মাঝে ফাঁক থেকে যায়।',
      ),
      q1: hints(
        'The name of each rule tells you which x-value of the strip it uses.',
        'প্রতিটি নিয়মের নামই বলে দেয় ফালির কোন x-মান ব্যবহার হয়।',
        'For a strip from x to x + h, the right rule evaluates f at the larger of the two ends.',
        'x থেকে x + h ফালির জন্য ডান নিয়ম দুই প্রান্তের মধ্যে বড় x-এ f-এর মান নেয়।',
      ),
      q2: hints(
        'Find the strip width first: (2 − 0) ÷ 4.',
        'আগে ফালির প্রস্থ বের করো: (2 − 0) ÷ 4।',
        'Add the heights f(0.5), f(1), f(1.5) and f(2), then multiply by the strip width.',
        'f(0.5), f(1), f(1.5) ও f(2) উচ্চতাগুলো যোগ করে ফালির প্রস্থ দিয়ে গুণ করো।',
      ),
      q3: hints(
        'Watch the error reading while you change one control at a time.',
        'একবারে একটি নিয়ন্ত্রণ বদলে ত্রুটির মান লক্ষ করো।',
        'With the left rule even the largest n is not enough here; switch to the midpoint rule and raise n until the error is at most 0.01.',
        'এখানে বাম নিয়মে সর্বোচ্চ n-ও যথেষ্ট নয়; মধ্যবিন্দু নিয়মে গিয়ে ত্রুটি 0.01 বা তার কম না হওয়া পর্যন্ত n বাড়াও।',
      ),
      q4: hints(
        'With 2 strips each strip is 1 unit wide; find the centre of each strip.',
        '2 টি ফালিতে প্রতিটির প্রস্থ 1 একক; প্রতিটি ফালির মধ্যবিন্দু বের করো।',
        'Square the centres 0.5 and 1.5, add the results and multiply by the width 1.',
        'মধ্যবিন্দু 0.5 ও 1.5-এর বর্গ যোগ করে প্রস্থ 1 দিয়ে গুণ করো।',
      ),
      q5: hints(
        'Write 8/3 as a decimal so you can compare it with each n = 4 sum.',
        '8/3-কে দশমিকে লেখো, যাতে n = 4-এর প্রতিটি যোগফলের সঙ্গে তুলনা করা যায়।',
        'Find all three sums for n = 4 and compare their distances from 8/3, not which one is larger.',
        'n = 4-এর তিনটি যোগফল বের করো, তারপর কোনটি বড় নয়, কোনটি 8/3 থেকে সবচেয়ে কম দূরে তা তুলনা করো।',
      ),
    },
  },
  derivative: {
    objective: t(
      'Interpret f′(a) as the slope of the tangent at x = a; use the sign of f′ to tell where a curve rises or falls; locate the turning point where f′ = 0; write the equation of a tangent.',
      'f′(a)-কে x = a বিন্দুতে স্পর্শকের ঢাল হিসেবে বোঝো; f′-এর চিহ্ন দেখে লেখচিত্র কোথায় ওঠে বা নামে বলো; যেখানে f′ = 0 সেই বাঁকবিন্দু খুঁজে বের করো; স্পর্শকের সমীকরণ লেখো।',
    ),
    example: t(
      'For f(x) = x², f′(x) = 2x. At x = 3 the point is (3, 9) and the tangent slope is 6, so the tangent is y − 9 = 6(x − 3), that is y = 6x − 9. A secant from x = 3 to x = 3.1 has slope (9.61 − 9)/0.1 = 6.1, already close to 6.',
      'f(x) = x² হলে f′(x) = 2x। x = 3-এ বিন্দুটি (3, 9) এবং স্পর্শকের ঢাল 6, তাই স্পর্শক y − 9 = 6(x − 3), অর্থাৎ y = 6x − 9। x = 3 থেকে x = 3.1 পর্যন্ত ছেদক রেখার ঢাল (9.61 − 9)/0.1 = 6.1, যা 6-এর খুব কাছে।',
    ),
    assumptions: t(
      'The model uses the quadratic f(x) = a·x² + b·x + c (d is not used) for x from −10 to 10. It computes f′(x) = 2ax + b exactly from the formula rather than from a secant, and draws the tangent y = f′(a)(x − a) + f(a).',
      'মডেলটি দ্বিঘাত ফাংশন f(x) = a·x² + b·x + c ব্যবহার করে (d ব্যবহৃত হয় না), x-এর মান −10 থেকে 10 পর্যন্ত। এটি ছেদক রেখা থেকে নয়, সূত্র থেকে সরাসরি f′(x) = 2ax + b নির্ণয় করে এবং স্পর্শক y = f′(a)(x − a) + f(a) আঁকে।',
    ),
    misconception: t(
      'The derivative at a point is a slope, not the height of the curve: for f(x) = x² − 4x + 1, f(3) = −2 but f′(3) = 2. A zero slope marks a turning point of the curve, not a root of f.',
      'কোনো বিন্দুতে অন্তরজ হলো ঢাল, লেখচিত্রের উচ্চতা নয়: f(x) = x² − 4x + 1 হলে f(3) = −2 কিন্তু f′(3) = 2। ঢাল শূন্য হলে সেটি লেখচিত্রের বাঁকবিন্দু নির্দেশ করে, f-এর মূল নয়।',
    ),
    prompts: [
      t(
        'Predict: for f(x) = x² − 4x + 1, is the tangent rising or falling at x = 3? At x = 0? Where do you think it is flat?',
        'আগে অনুমান: f(x) = x² − 4x + 1-এর জন্য x = 3-এ স্পর্শক ঊর্ধ্বমুখী না নিম্নমুখী? x = 0-তে? কোথায় এটি অনুভূমিক হবে বলে মনে করো?',
      ),
      t(
        'Observe: move x from −2 to 6 in steps of 1 and record the slope reading each time. Note where the slope changes sign.',
        'দেখো: x-কে −2 থেকে 6 পর্যন্ত 1 করে বাড়িয়ে প্রতিবার ঢালের মান লেখো। ঢালের চিহ্ন কোথায় বদলায় খেয়াল করো।',
      ),
      t(
        'Explain: compare your slope readings with 2x − 4. Why is the tangent horizontal exactly at the lowest point of the parabola?',
        'ব্যাখ্যা: তোমার পাওয়া ঢালগুলো 2x − 4-এর সঙ্গে মেলাও। পরাবৃত্তের সর্বনিম্ন বিন্দুতেই স্পর্শক কেন অনুভূমিক হয়?',
      ),
    ],
    practice: mcq(
      'check1',
      'What does f′(a) measure on the graph of y = f(x)?',
      'y = f(x)-এর লেখচিত্রে f′(a) কী নির্দেশ করে?',
      [
        ['The slope of the tangent at x = a', 'x = a বিন্দুতে স্পর্শকের ঢাল'],
        ['The height of the curve at x = a', 'x = a বিন্দুতে লেখচিত্রের উচ্চতা'],
        ['The area under the curve up to x = a', 'x = a পর্যন্ত লেখচিত্রের নিচের ক্ষেত্রফল'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 2, q5: 1 },
    exampleAnswer: { x: 2 },
    hints: {
      check1: hints(
        'Think of the line that just touches the curve at x = a.',
        'x = a বিন্দুতে লেখচিত্রকে কেবল স্পর্শ করা রেখাটির কথা ভাবো।',
        'f(a) gives the height of the point; the derivative describes how steep the curve is there.',
        'f(a) বিন্দুটির উচ্চতা দেয়; অন্তরজ বোঝায় সেখানে লেখচিত্র কতটা খাড়া।',
      ),
      q1: hints(
        'A negative slope means y changes in the opposite direction to x.',
        'ঋণাত্মক ঢাল মানে y, x-এর বিপরীত দিকে বদলায়।',
        'Picture a tangent with negative slope and move right along it. The sign of f′ says nothing about the sign of f itself.',
        'ঋণাত্মক ঢালের একটি স্পর্শক কল্পনা করে এর বরাবর ডানে চলো। f′-এর চিহ্ন f-এর নিজের চিহ্ন সম্পর্কে কিছু বলে না।',
      ),
      q2: hints(
        'Find the formula for f′(x) first, then substitute the value.',
        'আগে f′(x)-এর সূত্র বের করো, তারপর মান বসাও।',
        'Differentiate term by term (x² gives 2x, −4x gives −4, the constant gives 0), then put x = 5.',
        'প্রতিটি পদের আলাদা অন্তরজ নাও (x² থেকে 2x, −4x থেকে −4, ধ্রুবক থেকে 0), তারপর x = 5 বসাও।',
      ),
      q3: hints(
        'A horizontal tangent has slope 0; watch the slope reading as you move x.',
        'অনুভূমিক স্পর্শকের ঢাল 0; x সরানোর সময় ঢালের মান লক্ষ করো।',
        'Solve 2x − 4 = 0, keeping track of the sign when −4 moves to the other side.',
        '2x − 4 = 0 সমাধান করো; −4 পক্ষান্তর করার সময় চিহ্ন খেয়াল রাখো।',
      ),
      q4: hints(
        'The tangent passes through (4, f(4)) and has slope f′(4).',
        'স্পর্শকটি (4, f(4)) বিন্দু দিয়ে যায় এবং এর ঢাল f′(4)।',
        'Find f(4) and m = f′(4), then use k = f(4) − m × 4.',
        'f(4) ও m = f′(4) বের করে k = f(4) − m × 4 ব্যবহার করো।',
      ),
      q5: hints(
        'The coefficient of x² is positive, so the parabola opens upward.',
        'x²-এর সহগ ধনাত্মক, তাই পরাবৃত্তটি ওপরের দিকে খোলা।',
        'Left of that point the slope is negative and right of it positive; decide what kind of point that must be.',
        'ওই বিন্দুর বামে ঢাল ঋণাত্মক ও ডানে ধনাত্মক; এমন বিন্দু কী ধরনের হতে পারে ভাবো।',
      ),
    },
  },
  probability: {
    objective: t(
      'List sample spaces, calculate theoretical probabilities for a fair die and fair coins, and tell them apart from relative frequencies, which settle near the theory only over many trials.',
      'নমুনা ক্ষেত্র লেখো, নিরপেক্ষ ছক্কা ও মুদ্রার তাত্ত্বিক সম্ভাবনা নির্ণয় করো, এবং আপেক্ষিক গণসংখ্যা থেকে তা আলাদা করো; আপেক্ষিক গণসংখ্যা কেবল অনেক বার পরীক্ষার পর তত্ত্বের কাছাকাছি আসে।',
    ),
    example: t(
      'For a fair die, S = {1, 2, 3, 4, 5, 6}. For E = "a number less than 3", E = {1, 2}, so P(E) = 2/6 = 1/3. If 300 rolls show such a number 95 times, the relative frequency is 95/300 ≈ 0.317: close to 1/3, but not equal to it.',
      'নিরপেক্ষ ছক্কার জন্য S = {1, 2, 3, 4, 5, 6}। E = "3-এর চেয়ে ছোট সংখ্যা" হলে E = {1, 2}, তাই P(E) = 2/6 = 1/3। 300 বার নিক্ষেপে এমন সংখ্যা 95 বার এলে আপেক্ষিক গণসংখ্যা 95/300 ≈ 0.317: 1/3-এর কাছাকাছি, কিন্তু সমান নয়।',
    ),
    assumptions: t(
      'The die is fair and its faces are shown as outcomes 1 to 6. Each run comes from a fixed random seed, so the same settings always replay the same rolls; a different seed gives a different but equally random run. The theoretical readings are exact; the relative frequencies are only what this run happened to show.',
      'ছক্কাটি নিরপেক্ষ এবং এর তলগুলো ফল 1 থেকে 6 হিসেবে দেখানো হয়। প্রতিটি রান একটি নির্দিষ্ট দৈব বীজ থেকে তৈরি, তাই একই মান দিলে একই নিক্ষেপগুলো আবার ঘটে; ভিন্ন বীজে ভিন্ন কিন্তু সমান দৈব রান পাওয়া যায়। তাত্ত্বিক মানগুলো নির্ভুল; আপেক্ষিক গণসংখ্যা কেবল এই রানে যা ঘটেছে তা-ই দেখায়।',
    ),
    misconception: t(
      'Probability promises nothing about a short run: a fair die can go six rolls, or many more, without a six. Earlier results do not make a six "due"; only the long-run proportion approaches 1/6.',
      'সম্ভাবনা ছোট পরীক্ষার ফল নিশ্চিত করে না: নিরপেক্ষ ছক্কায় 6 বার বা আরও অনেক বার নিক্ষেপেও একবারও 6 না আসতে পারে। আগের ফলের কারণে 6 আসা "পাওনা" হয় না; শুধু দীর্ঘ পরীক্ষায় অনুপাতটি 1/6-এর দিকে যায়।',
    ),
    prompts: [
      t(
        'Predict: if you roll a fair die 30 times, how many sixes do you expect? Will you get exactly that many?',
        'আগে অনুমান: একটি নিরপেক্ষ ছক্কা 30 বার নিক্ষেপ করলে কতবার 6 আসবে বলে আশা করো? ঠিক ততবারই কি আসবে?',
      ),
      t(
        'Observe: with the same seed, run 30, 300, 3000 and 10000 rolls and record the relative frequency of outcome 6 each time. Then change the seed and run 30 rolls again.',
        'দেখো: একই বীজ রেখে 30, 300, 3000 ও 10000 বার নিক্ষেপ করে প্রতিবার ফল 6-এর আপেক্ষিক গণসংখ্যা লেখো। তারপর বীজ বদলে আবার 30 বার নিক্ষেপ করো।',
      ),
      t(
        'Explain: why do short runs swing widely around 1/6 while long runs stay close to it? Why does the theoretical probability stay 1/6 whatever a run shows?',
        'ব্যাখ্যা: ছোট রানে মান 1/6-এর চারপাশে অনেক ওঠানামা করে, কিন্তু দীর্ঘ রানে কাছাকাছি থাকে কেন? কোনো রানে যা-ই আসুক, তাত্ত্বিক সম্ভাবনা 1/6-ই থাকে কেন?',
      ),
    ],
    practice: mcq(
      'check1',
      'As the number of rolls of a fair die grows, what happens to the relative frequency of a six?',
      'নিরপেক্ষ ছক্কা নিক্ষেপের সংখ্যা বাড়তে থাকলে 6 আসার আপেক্ষিক গণসংখ্যার কী হয়?',
      [
        ['It tends to get closer to 1/6', 'এটি ক্রমে 1/6-এর কাছাকাছি যেতে থাকে'],
        ['It becomes exactly 1/6 after 6 rolls', '6 বার নিক্ষেপের পরই ঠিক 1/6 হয়ে যায়'],
        ['It moves further away from 1/6', 'এটি 1/6 থেকে আরও দূরে সরে যায়'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 0, q5: 2 },
    exampleAnswer: { trials: 10000 },
    hints: {
      check1: hints(
        'Compare what happens to the proportion in a short run and in a long run.',
        'ছোট ও দীর্ঘ পরীক্ষায় অনুপাতটির কী হয় তুলনা করো।',
        'Six rolls can easily show no six at all; think about where the proportion settles after thousands of rolls.',
        '6 বার নিক্ষেপে একবারও 6 না আসা খুবই সম্ভব; হাজার হাজার বার নিক্ষেপের পর অনুপাতটি কোথায় স্থির হয় ভাবো।',
      ),
      q1: hints(
        'List the outcomes as ordered pairs: first coin, then second coin.',
        'ফলাফলগুলো ক্রমজোড় হিসেবে লেখো: আগে প্রথম মুদ্রা, পরে দ্বিতীয় মুদ্রা।',
        'Each coin has 2 outcomes, so there are 2 × 2 outcomes in all; HT and TH are different.',
        'প্রতিটি মুদ্রার 2 টি ফলাফল, তাই মোট 2 × 2 টি; HT ও TH আলাদা।',
      ),
      q2: hints(
        'Write the sample space, then pick out the favourable outcomes.',
        'নমুনা ক্ষেত্র লিখে অনুকূল ফলাফলগুলো বেছে নাও।',
        'The primes on a die are 2, 3 and 5, and 1 is not prime; divide by the 6 equally likely faces.',
        'ছক্কায় মৌলিক সংখ্যা 2, 3 ও 5, আর 1 মৌলিক নয়; সমসম্ভাব্য 6 টি তল দিয়ে ভাগ করো।',
      ),
      q3: hints(
        'Only the number of trials is editable; watch the relative frequency of outcome 6.',
        'শুধু পরীক্ষার সংখ্যা বদলানো যাবে; ফল 6-এর আপেক্ষিক গণসংখ্যা লক্ষ করো।',
        '1/6 ≈ 0.167, so aim for a reading between about 0.157 and 0.177; a few dozen rolls rarely get there, but thousands usually do.',
        '1/6 ≈ 0.167, তাই মানটি প্রায় 0.157 থেকে 0.177-এর মধ্যে আনো; কয়েক ডজন নিক্ষেপে তা কদাচিৎ হয়, কিন্তু হাজার হাজার নিক্ষেপে সাধারণত হয়।',
      ),
      q4: hints(
        'It is easier to find the probability of the opposite event first.',
        'আগে বিপরীত ঘটনার সম্ভাবনা বের করা সহজ।',
        'The only outcome with no head is TT; subtract its probability from 1.',
        'কোনো হেড নেই এমন ফলাফল কেবল TT; 1 থেকে এর সম্ভাবনা বিয়োগ করো।',
      ),
      q5: hints(
        'Decide whether the question asks about this run or about the die itself.',
        'প্রশ্নটি এই পরীক্ষার ফল নিয়ে, না ছক্কাটির নিজস্ব ধর্ম নিয়ে, তা ঠিক করো।',
        '14/60 is a relative frequency; a theoretical probability counts equally likely faces.',
        '14/60 একটি আপেক্ষিক গণসংখ্যা; তাত্ত্বিক সম্ভাবনা সমসম্ভাব্য তলগুলো গুনে পাওয়া যায়।',
      ),
    },
  },
};

const quadratic = { family: 'quadratic', a: 1, b: -2, c: -3, d: 0, x: 1 },
  wave = { wave: 'sine', amplitude: 2, frequency: 1, phaseDeg: 0, angleDeg: 30 },
  strips = {
    family: 'quadratic',
    a: 1,
    b: 0,
    c: 0,
    d: 0,
    from: 0,
    to: 2,
    n: 4,
    rule: 'left',
  },
  tangent = { family: 'quadratic', a: 1, b: -4, c: 1, d: 0, x: 3 },
  die = { experiment: 'die', trials: 30, bias: 0.5, sectors: 4, seed: 17 };

/** Example lessons for the math simulations that the first seven lessons do not use. */
export const MATH_LESSONS = [
  lesson(
    'functions',
    'math',
    'math-gm-2',
    t('Functions: domain, image and graph', 'ফাংশন: ডোমেন, ছবি ও লেখচিত্র'),
    t(
      'A function f from A to B matches every element x of A with exactly one element f(x) of B, called the image of x. Its graph is the set of points (x, f(x)); here f(x) = x² − 2x − 3.',
      'A থেকে B-তে একটি ফাংশন f, A-এর প্রতিটি উপাদান x-কে B-এর ঠিক একটি উপাদান f(x)-এর সঙ্গে সম্পর্কিত করে; f(x)-কে x-এর ছবি বলে। (x, f(x)) বিন্দুগুলোর সেটই এর লেখচিত্র; এখানে f(x) = x² − 2x − 3।',
    ),
    explore(
      'function-grapher',
      quadratic,
      'Move x and read its image f(x) on the graph.',
      'x সরিয়ে লেখচিত্রে এর ছবি f(x) পড়ো।',
    ),
    [
      mcq(
        'q1',
        'Where does the graph of f(x) = x² − 2x − 3 cut the y-axis?',
        'f(x) = x² − 2x − 3-এর লেখচিত্র y-অক্ষকে কোথায় ছেদ করে?',
        [
          ['At (0, −3)', '(0, −3) বিন্দুতে'],
          ['At (−3, 0)', '(−3, 0) বিন্দুতে'],
          ['At (1, −4)', '(1, −4) বিন্দুতে'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For f(x) = x² − 2x − 3, find f(4).',
        'f(x) = x² − 2x − 3 হলে f(4) নির্ণয় করো।',
        5,
        '',
      ),
      task(
        'q3',
        'Move only x until its image f(x) is 0, where the graph meets the x-axis.',
        'শুধু x সরিয়ে এমন মান নাও যাতে এর ছবি f(x) = 0 হয়, অর্থাৎ যেখানে লেখচিত্র x-অক্ষকে ছেদ করে।',
        'function-grapher',
        quadratic,
        ['x'],
        'valueEquals',
        { y: 0, tol: 0.01 },
      ),
      numeric('q4', 'For the same f, find f(−2).', 'একই f-এর জন্য f(−2) নির্ণয় করো।', 5, ''),
      mcq(
        'q5',
        'Under f, the two different inputs x = 4 and x = −2 have the same image. Is f still a function?',
        'f-এর অধীনে দুটি ভিন্ন মান x = 4 ও x = −2-এর ছবি একই। f কি তবু একটি ফাংশন?',
        [
          [
            'Yes: each x still has exactly one image',
            'হ্যাঁ: x-এর প্রতিটি মানের এখনও ঠিক একটি ছবি',
          ],
          ['No: an image may not repeat', 'না: কোনো ছবি একাধিকবার আসতে পারে না'],
          ['Only if x = 4 is removed from the domain', 'শুধু ডোমেন থেকে x = 4 বাদ দিলে'],
        ],
        0,
      ),
    ],
    SUPPORT['functions']!,
    9,
  ),
  lesson(
    'waves',
    'math',
    'math-hm-8',
    t('Trigonometric graphs: amplitude and period', 'ত্রিকোণমিতিক লেখচিত্র: বিস্তার ও পর্যায়কাল'),
    t(
      'As a point turns around a circle, its height traces a sine wave. In y = A sin bθ, the amplitude A sets how tall the wave is and b sets how often it repeats.',
      'বৃত্তের ওপর একটি বিন্দু ঘুরলে তার উচ্চতা একটি সাইন তরঙ্গ আঁকে। y = A sin bθ-তে বিস্তার A ঠিক করে তরঙ্গ কত উঁচু, আর b ঠিক করে তরঙ্গ কত ঘন ঘন পুনরাবৃত্ত হয়।',
    ),
    explore(
      'trig-waves',
      wave,
      'Change the amplitude and b and watch the wave.',
      'বিস্তার ও b বদলে তরঙ্গটি লক্ষ করো।',
    ),
    [
      mcq(
        'q1',
        'What is the period of y = 2 sin 3θ, with θ in degrees?',
        'θ ডিগ্রিতে হলে y = 2 sin 3θ-এর পর্যায়কাল কত?',
        [
          ['120°', '120°'],
          ['1080°', '1080°'],
          ['360°', '360°'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For y = 2 sin 2θ, find y when θ = 15°.',
        'y = 2 sin 2θ হলে θ = 15°-তে y-এর মান কত?',
        1,
        '',
      ),
      task(
        'q3',
        'Change only b so that the sine wave has a period of 180°.',
        'শুধু b বদলে এমন করো যাতে সাইন তরঙ্গের পর্যায়কাল 180° হয়।',
        'trig-waves',
        wave,
        ['frequency'],
        'periodEquals',
        { periodDeg: 180, tol: 0.01 },
      ),
      numeric(
        'q4',
        'For y = 3 cos θ, find y when θ = 120°.',
        'y = 3 cos θ হলে θ = 120°-তে y-এর মান কত?',
        -1.5,
        '',
      ),
      mcq(
        'q5',
        'What is the range of y = 2 sin θ?',
        'y = 2 sin θ-এর রেঞ্জ কী?',
        [
          ['From −2 to 2', '−2 থেকে 2 পর্যন্ত'],
          ['From 0 to 2', '0 থেকে 2 পর্যন্ত'],
          ['From −1 to 1', '−1 থেকে 1 পর্যন্ত'],
        ],
        0,
      ),
    ],
    SUPPORT['waves']!,
    10,
  ),
  lesson(
    'area',
    'math',
    'math-hm-11',
    t('Area under a curve: rectangle sums', 'লেখচিত্রের নিচের ক্ষেত্রফল: আয়তক্ষেত্রের যোগফল'),
    t(
      'To estimate the area between y = x² and the x-axis from x = 0 to x = 2, cut the interval into n equal strips and add the areas of rectangles. Thinner strips usually give a better estimate.',
      'x = 0 থেকে x = 2 পর্যন্ত y = x² ও x-অক্ষের মাঝের ক্ষেত্রফল অনুমান করতে ব্যবধিটিকে n টি সমান ফালিতে ভাগ করে আয়তক্ষেত্রগুলোর ক্ষেত্রফল যোগ করো। ফালি সরু হলে সাধারণত অনুমান ভালো হয়।',
    ),
    explore(
      'riemann-area',
      strips,
      'Change the number of strips and the rule; compare the estimate with the exact area.',
      'ফালির সংখ্যা ও নিয়ম বদলে আনুমানিক ক্ষেত্রফলকে প্রকৃত ক্ষেত্রফলের সঙ্গে তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'In the right-endpoint rule, where is the height of each rectangle taken?',
        'ডান প্রান্তবিন্দু নিয়মে প্রতিটি আয়তক্ষেত্রের উচ্চতা কোথা থেকে নেওয়া হয়?',
        [
          ['The right end of its strip', 'ফালির ডান প্রান্তে'],
          ['The left end of its strip', 'ফালির বাম প্রান্তে'],
          ['The centre of its strip', 'ফালির মাঝখানে'],
        ],
        0,
      ),
      numeric(
        'q2',
        'Find the right-endpoint sum for y = x² on [0, 2] with n = 4 strips.',
        'n = 4 টি ফালি নিয়ে [0, 2] ব্যবধিতে y = x²-এর ডান প্রান্তবিন্দু যোগফল নির্ণয় করো।',
        3.75,
        'sq. units',
      ),
      task(
        'q3',
        'Change the number of strips and the rule until the estimate is within 0.01 of the exact area.',
        'ফালির সংখ্যা ও নিয়ম বদলে এমন করো যাতে আনুমানিক ক্ষেত্রফল প্রকৃত ক্ষেত্রফলের 0.01-এর মধ্যে আসে।',
        'riemann-area',
        strips,
        ['n', 'rule'],
        'errorBelow',
        { tol: 0.01 },
      ),
      numeric(
        'q4',
        'Find the midpoint sum for y = x² on [0, 2] with n = 2 strips.',
        'n = 2 টি ফালি নিয়ে [0, 2] ব্যবধিতে y = x²-এর মধ্যবিন্দু যোগফল নির্ণয় করো।',
        2.5,
        'sq. units',
      ),
      mcq(
        'q5',
        'The exact area under y = x² on [0, 2] is 8/3. With n = 4, which estimate is closest to it?',
        '[0, 2] ব্যবধিতে y = x²-এর নিচের প্রকৃত ক্ষেত্রফল 8/3। n = 4 নিলে কোন অনুমানটি এর সবচেয়ে কাছে?',
        [
          ['The midpoint sum', 'মধ্যবিন্দু যোগফল'],
          ['The left sum', 'বাম যোগফল'],
          ['The right sum', 'ডান যোগফল'],
        ],
        0,
      ),
    ],
    SUPPORT['area']!,
    10,
  ),
  lesson(
    'derivative',
    'math',
    'math-hm-11',
    t('Derivative: the slope of a tangent', 'অন্তরজ: স্পর্শকের ঢাল'),
    t(
      'The tangent to a curve at a point touches the curve there and is exactly as steep as the curve. Its slope is the derivative f′(a); for f(x) = x² − 4x + 1, f′(x) = 2x − 4.',
      'কোনো বিন্দুতে লেখচিত্রের স্পর্শক সেখানে লেখচিত্রকে স্পর্শ করে এবং ঠিক লেখচিত্রের মতোই খাড়া থাকে। এর ঢালই অন্তরজ f′(a); f(x) = x² − 4x + 1 হলে f′(x) = 2x − 4।',
    ),
    explore(
      'derivative',
      tangent,
      'Move the point x and read the slope of the tangent.',
      'বিন্দু x সরিয়ে স্পর্শকের ঢাল পড়ো।',
    ),
    [
      mcq(
        'q1',
        'If f′(x) < 0 on an interval, the graph of f there is…',
        'কোনো ব্যবধিতে f′(x) < 0 হলে সেখানে f-এর লেখচিত্র…',
        [
          ['Decreasing: it falls as x increases', 'হ্রাসমান: x বাড়লে লেখচিত্র নামে'],
          ['Increasing: it rises as x increases', 'বর্ধমান: x বাড়লে লেখচিত্র ওঠে'],
          ['Below the x-axis', 'x-অক্ষের নিচে'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For f(x) = x² − 4x + 1, find f′(5).',
        'f(x) = x² − 4x + 1 হলে f′(5) নির্ণয় করো।',
        6,
        '',
      ),
      task(
        'q3',
        'Move only x to the point where the tangent to f(x) = x² − 4x + 1 is horizontal.',
        'শুধু x সরিয়ে সেই বিন্দুতে যাও যেখানে f(x) = x² − 4x + 1-এর স্পর্শক অনুভূমিক।',
        'derivative',
        tangent,
        ['x'],
        'slopeEquals',
        { slope: 0, tol: 0.01 },
      ),
      numeric(
        'q4',
        'The tangent to f(x) = x² − 4x + 1 at x = 4 is y = mx + k. Find k.',
        'x = 4 বিন্দুতে f(x) = x² − 4x + 1-এর স্পর্শক y = mx + k। k নির্ণয় করো।',
        -15,
        '',
      ),
      mcq(
        'q5',
        'At the point where the tangent to f(x) = x² − 4x + 1 is horizontal, the curve has…',
        'যে বিন্দুতে f(x) = x² − 4x + 1-এর স্পর্শক অনুভূমিক, সেখানে লেখচিত্রের…',
        [
          ['Its lowest point', 'এর সর্বনিম্ন বিন্দু'],
          ['Its y-intercept', 'এর y-অক্ষের ছেদবিন্দু'],
          ['A root of f', 'f-এর একটি মূল'],
        ],
        0,
      ),
    ],
    SUPPORT['derivative']!,
    10,
  ),
  lesson(
    'probability',
    'math',
    'math-hm-14',
    t('Probability: theory and experiment', 'সম্ভাবনা: তত্ত্ব ও পরীক্ষা'),
    t(
      'For equally likely outcomes, P(E) = number of outcomes in E ÷ number of outcomes in the sample space. Repeating an experiment many times gives a relative frequency that tends to settle near P(E).',
      'সমসম্ভাব্য ফলাফলের ক্ষেত্রে P(E) = E-এর অনুকূল ফলাফলের সংখ্যা ÷ নমুনা ক্ষেত্রের মোট ফলাফলের সংখ্যা। একটি পরীক্ষা বহুবার করলে আপেক্ষিক গণসংখ্যা ক্রমে P(E)-এর কাছাকাছি স্থির হতে থাকে।',
    ),
    explore(
      'probability',
      die,
      'Roll the die many times and compare relative frequency with 1/6.',
      'ছক্কাটি বহুবার নিক্ষেপ করে আপেক্ষিক গণসংখ্যাকে 1/6-এর সঙ্গে তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'Two fair coins are tossed together. Which is the sample space? (H = head, T = tail)',
        'দুটি নিরপেক্ষ মুদ্রা একসঙ্গে নিক্ষেপ করা হলো। নমুনা ক্ষেত্র কোনটি? (H = হেড, T = টেল)',
        [
          ['{HH, HT, TH, TT}', '{HH, HT, TH, TT}'],
          ['{HH, HT, TT}', '{HH, HT, TT}'],
          ['{H, T}', '{H, T}'],
        ],
        0,
      ),
      numeric(
        'q2',
        'A fair die is rolled once. What is the probability of a prime number? Give a decimal.',
        'একটি নিরপেক্ষ ছক্কা একবার নিক্ষেপ করা হলো। মৌলিক সংখ্যা আসার সম্ভাবনা কত? দশমিকে লেখো।',
        0.5,
        '',
      ),
      task(
        'q3',
        'Change only the number of trials until the relative frequency of outcome 6 is within 0.01 of 1/6.',
        'শুধু পরীক্ষার সংখ্যা বদলে এমন করো যাতে ফল 6-এর আপেক্ষিক গণসংখ্যা 1/6-এর 0.01-এর মধ্যে আসে।',
        'probability',
        die,
        ['trials'],
        'relativeFrequency',
        { outcome: 5, value: 1 / 6, tol: 0.01 },
      ),
      numeric(
        'q4',
        'A fair coin is tossed twice. What is the probability of at least one head? Give a decimal.',
        'একটি নিরপেক্ষ মুদ্রা দুবার নিক্ষেপ করা হলো। অন্তত একবার হেড আসার সম্ভাবনা কত? দশমিকে লেখো।',
        0.75,
        '',
      ),
      mcq(
        'q5',
        'A fair die is rolled 60 times and shows a six 14 times. What is the theoretical probability of a six?',
        'একটি নিরপেক্ষ ছক্কা 60 বার নিক্ষেপ করে 14 বার 6 পাওয়া গেল। 6 আসার তাত্ত্বিক সম্ভাবনা কত?',
        [
          ['1/6, whatever this run shows', '1/6, এই পরীক্ষায় যা-ই আসুক'],
          ['14/60', '14/60'],
          ['1/14', '1/14'],
        ],
        0,
      ),
    ],
    SUPPORT['probability']!,
    10,
  ),
];
