import { explore, hints, lesson, mcq, numeric, t, task, type Support } from './demo-lesson-kit';

const SUPPORT: Record<string, Support> = {
  'gas-law': {
    objective: t(
      'Use PV = nRT to predict the pressure of a trapped gas; explain with particle collisions why pressure rises when the volume shrinks or the kelvin temperature rises.',
      'PV = nRT ব্যবহার করে আবদ্ধ গ্যাসের চাপ অনুমান করো; আয়তন কমলে বা কেলভিন তাপমাত্রা বাড়লে চাপ কেন বাড়ে, কণার সংঘর্ষ দিয়ে ব্যাখ্যা করো।',
    ),
    example: t(
      'For n = 0.5 mol, T = 400 K and V = 4 dm³: P = nRT/V = 0.5 × 8.314 × 400 / 4 = 415.7 kPa. Halving the volume to 2 dm³ at the same n and T doubles the pressure to 831.4 kPa (Boyle’s law).',
      'n = 0.5 mol, T = 400 K ও V = 4 dm³ হলে: P = nRT/V = 0.5 × 8.314 × 400 / 4 = 415.7 kPa। n ও T একই রেখে আয়তন অর্ধেক করে 2 dm³ করলে চাপ দ্বিগুণ হয়ে 831.4 kPa হয় (বয়েলের সূত্র)।',
    ),
    assumptions: t(
      'The gas is ideal: its particles have no volume of their own and do not attract each other. The piston is sealed, so n changes only when you change it. R = 8.314 J mol⁻¹ K⁻¹; with V in dm³ the pressure comes out in kPa. Ranges: n 0.1–5 mol, T 100–800 K, V 1–50 dm³.',
      'গ্যাসটি আদর্শ: এর কণার নিজস্ব আয়তন নেই এবং কণাগুলো পরস্পরকে আকর্ষণ করে না। পিস্টন বন্ধ, তাই তুমি না বদলালে n বদলায় না। R = 8.314 J mol⁻¹ K⁻¹; V dm³-এ নিলে চাপ kPa-তে আসে। পরিসর: n 0.1–5 mol, T 100–800 K, V 1–50 dm³।',
    ),
    misconception: t(
      'Pressure is proportional to kelvin temperature, not Celsius temperature. Warming from 27 °C to 54 °C raises T only from 300 K to 327 K, so the pressure rises by about 9 %, not 100 %.',
      'চাপ কেলভিন তাপমাত্রার সমানুপাতিক, সেলসিয়াস তাপমাত্রার নয়। 27°C থেকে 54°C-এ গরম করলে T শুধু 300 K থেকে 327 K হয়, তাই চাপ প্রায় 9 % বাড়ে, 100 % নয়।',
    ),
    prompts: [
      t(
        'Predict: with n = 1 mol, T = 300 K and V = 10 dm³, estimate the pressure. What will happen to it if you halve the volume?',
        'আগে অনুমান: n = 1 mol, T = 300 K ও V = 10 dm³ হলে চাপ কত হবে আন্দাজ করো। আয়তন অর্ধেক করলে চাপের কী হবে?',
      ),
      t(
        'Observe: change one variable at a time — volume, then temperature, then amount. Record the pressure each time and watch how fast the particles move.',
        'দেখো: একবারে একটি রাশি বদলাও — প্রথমে আয়তন, পরে তাপমাত্রা, তারপর মোল সংখ্যা। প্রতিবার চাপ লেখো এবং কণাগুলো কত দ্রুত চলে লক্ষ করো।',
      ),
      t(
        'Explain: use particle collisions with the walls to explain why a smaller volume or a higher kelvin temperature raises the pressure, and check each reading with P = nRT/V.',
        'ব্যাখ্যা: দেয়ালে কণার সংঘর্ষ দিয়ে বোঝাও, কম আয়তন বা বেশি কেলভিন তাপমাত্রায় চাপ কেন বাড়ে; প্রতিটি পাঠ P = nRT/V দিয়ে মিলিয়ে দেখো।',
      ),
    ],
    practice: mcq(
      'check1',
      'The amount of gas and its temperature stay fixed while the volume is halved. What happens to the pressure?',
      'গ্যাসের মোল সংখ্যা ও তাপমাত্রা স্থির রেখে আয়তন অর্ধেক করা হলো। চাপের কী হয়?',
      [
        ['It doubles', 'দ্বিগুণ হয়'],
        ['It halves', 'অর্ধেক হয়'],
        ['It stays the same', 'একই থাকে'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 1, q5: 2 },
    exampleAnswer: { temperature: 600 },
    hints: {
      check1: hints(
        'Hold n and T fixed in PV = nRT and see which product must then stay constant.',
        'PV = nRT-এ n ও T স্থির ধরলে কোন গুণফল ধ্রুব থাকতে হয় দেখো।',
        'In half the space the particles strike each part of the wall more often; compare P × V before and after.',
        'অর্ধেক জায়গায় কণাগুলো দেয়ালের প্রতিটি অংশে আরও ঘন ঘন ধাক্কা দেয়; আগে ও পরে P × V তুলনা করো।',
      ),
      q1: hints(
        'Choose the scale that starts at absolute zero, where particle motion is least.',
        'যে স্কেল পরম শূন্য থেকে শুরু হয়, যেখানে কণার গতি সবচেয়ে কম, সেটি বেছে নাও।',
        'Celsius puts zero at the freezing point of water, so doubling a Celsius number does not double the particles’ energy.',
        'সেলসিয়াস স্কেলে শূন্য হলো পানির হিমাঙ্ক, তাই সেলসিয়াস মান দ্বিগুণ করলে কণার শক্তি দ্বিগুণ হয় না।',
      ),
      q2: hints(
        'Rearrange PV = nRT for P and keep V in dm³ so that the answer is in kPa.',
        'PV = nRT থেকে P বের করো এবং V dm³-এ রাখো, তাহলে উত্তর kPa-তে আসবে।',
        'Multiply 1 × 8.314 × 300, then divide by the 10 dm³ volume.',
        '1 × 8.314 × 300 গুণ করে 10 dm³ আয়তন দিয়ে ভাগ করো।',
      ),
      q3: hints(
        'At fixed n and V, the pressure is proportional to the kelvin temperature.',
        'n ও V স্থির থাকলে চাপ কেলভিন তাপমাত্রার সমানুপাতিক।',
        'Compare the target with the starting 249.42 kPa and scale 300 K by the same factor.',
        'লক্ষ্য চাপকে শুরুর 249.42 kPa-এর সঙ্গে তুলনা করো এবং 300 K-কে একই গুণক দিয়ে বদলাও।',
      ),
      q4: hints(
        'Rearrange PV = nRT to make V the subject.',
        'PV = nRT থেকে V-কে বিষয় করো।',
        'Calculate 1 × 8.314 × 300 and divide by 100 kPa; the result is in dm³.',
        '1 × 8.314 × 300 হিসাব করে 100 kPa দিয়ে ভাগ করো; ফলের একক dm³।',
      ),
      q5: hints(
        'Watch the particle animation while you raise the temperature slider.',
        'তাপমাত্রার স্লাইডার বাড়ানোর সময় কণার অ্যানিমেশন লক্ষ করো।',
        'Kelvin temperature measures the average kinetic energy of the particles, and their mass does not change.',
        'কেলভিন তাপমাত্রা কণার গড় গতিশক্তির মাপ, আর কণার ভর বদলায় না।',
      ),
    },
  },
  'flame-test': {
    objective: t(
      'Link flame colours to electrons moving between energy levels; identify Li⁺, Na⁺, K⁺, Ca²⁺, Cu²⁺, Sr²⁺ and Ba²⁺ from colour and emission lines; compare wavelengths in nm.',
      'শিখার রঙের সঙ্গে শক্তিস্তরের মধ্যে ইলেকট্রনের স্থানান্তরের সম্পর্ক বোঝো; রং ও নিঃসরণ রেখা দেখে Li⁺, Na⁺, K⁺, Ca²⁺, Cu²⁺, Sr²⁺ ও Ba²⁺ শনাক্ত করো; ন্যানোমিটারে তরঙ্গদৈর্ঘ্য তুলনা করো।',
    ),
    example: t(
      'A sodium salt gives a yellow-orange flame. The model lists its two strongest lines at 589.0 nm and 589.6 nm; they sit so close together in the yellow part of the spectrum that the eye sees a single colour.',
      'সোডিয়াম লবণ হলুদ-কমলা শিখা দেয়। মডেলে এর দুটি প্রধান রেখা 589.0 nm ও 589.6 nm; বর্ণালির হলুদ অংশে এরা এত কাছাকাছি যে চোখে একটিই রং দেখা যায়।',
    ),
    assumptions: t(
      'Each sample contains one pure metal ion; in real samples a trace of sodium can hide other colours. Only the strongest visible or near-visible lines are listed, in nanometres. The colour depends on the metal ion, not on the anion such as chloride.',
      'প্রতিটি নমুনায় একটিই বিশুদ্ধ ধাতব আয়ন আছে; বাস্তব নমুনায় সামান্য সোডিয়াম অন্য রং ঢেকে দিতে পারে। শুধু সবচেয়ে উজ্জ্বল দৃশ্যমান বা প্রায়-দৃশ্যমান রেখাগুলো ন্যানোমিটারে দেওয়া আছে। রং নির্ভর করে ধাতব আয়নের ওপর, ক্লোরাইডের মতো ঋণাত্মক আয়নের ওপর নয়।',
    ),
    misconception: t(
      'Similar colours are easy to confuse: barium is apple green but copper is blue-green; strontium is red but lithium is crimson. Compare the emission lines, not only the colour name. Potassium’s lilac comes from mixing deep red lines with a violet one.',
      'কাছাকাছি রং সহজেই গুলিয়ে যায়: বেরিয়াম আপেল সবুজ কিন্তু কপার নীলচে সবুজ; স্ট্রনশিয়াম লাল কিন্তু লিথিয়াম গাঢ় লাল। শুধু রঙের নাম নয়, নিঃসরণ রেখাও তুলনা করো। পটাশিয়ামের হালকা বেগুনি রং আসে গাঢ় লাল রেখা ও একটি বেগুনি রেখা মিশে।',
    ),
    prompts: [
      t(
        'Predict: the sample starts as a sodium salt. Which flame colour do you expect, and roughly where in the spectrum will its lines sit?',
        'আগে অনুমান: শুরুতে নমুনাটি সোডিয়াম লবণ। শিখার রং কী হবে এবং এর রেখাগুলো বর্ণালির মোটামুটি কোথায় থাকবে?',
      ),
      t(
        'Observe: switch through all seven ions. For each, record the flame colour and the first emission line in nm.',
        'দেখো: সাতটি আয়ন একে একে বেছে নাও। প্রতিটির জন্য শিখার রং ও প্রথম নিঃসরণ রেখা nm-এ লেখো।',
      ),
      t(
        'Explain: why do different metals give different colours? Use energy levels, and name the two pairs of ions that are hardest to tell apart by colour alone.',
        'ব্যাখ্যা: ভিন্ন ধাতু ভিন্ন রং দেয় কেন? শক্তিস্তর দিয়ে বোঝাও এবং শুধু রং দেখে কোন দুই জোড়া আয়ন আলাদা করা সবচেয়ে কঠিন, বলো।',
      ),
    ],
    practice: mcq(
      'check1',
      'Why does a metal ion give a coloured flame?',
      'ধাতব আয়ন শিখাকে রঙিন করে কেন?',
      [
        [
          'Excited electrons fall back to lower energy levels and give out light',
          'উত্তেজিত ইলেকট্রন নিচের শক্তিস্তরে ফেরার সময় আলো বিকিরণ করে',
        ],
        ['The metal burns like a fuel', 'ধাতুটি জ্বালানির মতো পুড়ে যায়'],
        ['The anion reflects the flame’s light', 'ঋণাত্মক আয়ন শিখার আলো প্রতিফলিত করে'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 2, q5: 0 },
    exampleAnswer: { ion: 'cu' },
    hints: {
      check1: hints(
        'Think about what happens to the ion’s electrons when the flame gives them energy.',
        'শিখা শক্তি দিলে আয়নের ইলেকট্রনের কী হয় ভাবো।',
        'Electrons lifted to a higher level do not stay there; the energy they release has a definite wavelength.',
        'উঁচু শক্তিস্তরে ওঠা ইলেকট্রন সেখানে থাকে না; ফেরার সময় ছাড়া শক্তির নির্দিষ্ট তরঙ্গদৈর্ঘ্য থাকে।',
      ),
      q1: hints(
        'Select Na⁺ in the simulation and look at the flame.',
        'সিমুলেশনে Na⁺ বেছে নিয়ে শিখাটি দেখো।',
        'Sodium’s lines lie near 589 nm, in the yellow part of the visible spectrum.',
        'সোডিয়ামের রেখা 589 nm-এর কাছে, দৃশ্যমান বর্ণালির হলুদ অংশে।',
      ),
      q2: hints(
        'Subtract the shorter wavelength from the longer one.',
        'বড় তরঙ্গদৈর্ঘ্য থেকে ছোটটি বিয়োগ করো।',
        'Work out 670.8 − 589.0 and keep the answer in nanometres.',
        '670.8 − 589.0 হিসাব করো এবং উত্তর ন্যানোমিটারে রাখো।',
      ),
      q3: hints(
        'Step through the ions and compare each flame with blue-green.',
        'আয়নগুলো একে একে বদলে প্রতিটি শিখাকে নীলচে সবুজের সঙ্গে মেলাও।',
        'Barium looks green too; check which ion’s lines sit between 510 nm and 522 nm.',
        'বেরিয়ামও সবুজ দেখায়; কোন আয়নের রেখাগুলো 510 nm থেকে 522 nm-এর মধ্যে, তা দেখো।',
      ),
      q4: hints(
        'First pick out the largest and the smallest of the three listed values.',
        'প্রথমে দেওয়া তিনটি মানের মধ্যে সবচেয়ে বড় ও সবচেয়ে ছোটটি বেছে নাও।',
        'The longest line is above 769 nm and the shortest is near 404 nm; subtract them.',
        'দীর্ঘতম রেখাটি 769 nm-এর বেশি আর ক্ষুদ্রতমটি 404 nm-এর কাছে; এ দুটি বিয়োগ করো।',
      ),
      q5: hints(
        'Crimson is a deep red, and two ions in the model give reddish flames.',
        'মডেলে দুটি আয়ন লালচে শিখা দেয়; গাঢ় লাল তাদের একটি।',
        'Compare the first lines of the two reddish ions; the crimson one has the longer wavelength.',
        'লালচে দুই আয়নের প্রথম রেখা তুলনা করো; গাঢ় লালটির তরঙ্গদৈর্ঘ্য বেশি।',
      ),
    },
  },
  titration: {
    objective: t(
      'Use n = CV with volumes in dm³ (cm³ ÷ 1000); find the equivalence volume from C(acid)V(acid) = C(base)V(base) for a 1:1 reaction; read indicator colour changes near the end point.',
      'আয়তনকে dm³-এ (cm³ ÷ 1000) নিয়ে n = CV ব্যবহার করো; 1:1 বিক্রিয়ায় C(এসিড)V(এসিড) = C(ক্ষারক)V(ক্ষারক) থেকে সমতুল্য আয়তন বের করো; সমাপ্তি বিন্দুর কাছে নির্দেশকের রং বদল পড়ো।',
    ),
    example: t(
      '10 cm³ of 0.2 mol/dm³ HCl contains n = 0.2 × 10/1000 = 0.002 mol. NaOH reacts 1:1, so 0.05 mol/dm³ NaOH must supply 0.002 mol: V = 0.002/0.05 = 0.04 dm³ = 40 cm³.',
      '10 cm³, 0.2 mol/dm³ HCl-এ n = 0.2 × 10/1000 = 0.002 mol। NaOH 1:1 অনুপাতে বিক্রিয়া করে, তাই 0.05 mol/dm³ NaOH-কে 0.002 mol দিতে হবে: V = 0.002/0.05 = 0.04 dm³ = 40 cm³।',
    ),
    assumptions: t(
      'NaOH + HCl → NaCl + H₂O and NaOH + CH₃COOH → CH₃COONa + H₂O both react 1:1. Solutions are ideal and dilute at 25 °C, volumes simply add, HCl is fully ionised and ethanoic acid ionises partly (Ka = 1.8 × 10⁻⁵). The indicator only shows a colour; it uses up no acid or base.',
      'NaOH + HCl → NaCl + H₂O এবং NaOH + CH₃COOH → CH₃COONa + H₂O — দুটিই 1:1 অনুপাতে বিক্রিয়া করে। দ্রবণগুলো 25°C-তে আদর্শ ও লঘু, আয়তন সরাসরি যোগ হয়, HCl সম্পূর্ণ আয়নিত আর ইথানয়িক এসিড আংশিক আয়নিত (Ka = 1.8 × 10⁻⁵)। নির্দেশক শুধু রং দেখায়; কোনো এসিড বা ক্ষারক খরচ করে না।',
    ),
    misconception: t(
      'Equal volumes are not equal moles unless the concentrations are equal. The equivalence point is not always pH 7: with ethanoic acid the model gives about pH 8.7, where phenolphthalein turns pink but methyl orange is already yellow.',
      'ঘনমাত্রা সমান না হলে সমান আয়তনে সমান মোল থাকে না। সমতুল্য বিন্দু সব সময় pH 7 নয়: ইথানয়িক এসিডে মডেলটি প্রায় pH 8.7 দেখায়, যেখানে ফেনলফথ্যালিন গোলাপি হয় কিন্তু মিথাইল অরেঞ্জ আগেই হলুদ হয়ে যায়।',
    ),
    prompts: [
      t(
        'Predict: the flask holds 25 cm³ of 0.1 mol/dm³ HCl and the burette holds 0.1 mol/dm³ NaOH. What volume of NaOH will reach the equivalence point?',
        'আগে অনুমান: ফ্লাস্কে 25 cm³, 0.1 mol/dm³ HCl এবং ব্যুরেটে 0.1 mol/dm³ NaOH আছে। কত আয়তন NaOH যোগ করলে সমতুল্য বিন্দুতে পৌঁছাবে?',
      ),
      t(
        'Observe: add NaOH in steps — 10, 20, 24, 25, 26 and 30 cm³. Record the pH and the indicator colour each time, then repeat with ethanoic acid.',
        'দেখো: ধাপে ধাপে NaOH যোগ করো — 10, 20, 24, 25, 26 ও 30 cm³। প্রতিবার pH ও নির্দেশকের রং লেখো, তারপর ইথানয়িক এসিড নিয়ে আবার করো।',
      ),
      t(
        'Explain: why does the pH jump so sharply near 25 cm³? Use the moles of acid left over or of base in excess, and say which indicator suits each acid.',
        'ব্যাখ্যা: 25 cm³-এর কাছে pH এত হঠাৎ লাফ দেয় কেন? অবশিষ্ট এসিড বা অতিরিক্ত ক্ষারকের মোল দিয়ে বোঝাও এবং কোন এসিডের জন্য কোন নির্দেশক উপযুক্ত, বলো।',
      ),
    ],
    practice: mcq(
      'check1',
      'At the equivalence point of HCl titrated with NaOH, which statement is true?',
      'NaOH দিয়ে HCl-এর টাইট্রেশনে সমতুল্য বিন্দুতে কোন উক্তিটি সত্য?',
      [
        [
          'Moles of NaOH added equal moles of HCl in the flask',
          'যোগ করা NaOH-এর মোল ফ্লাস্কের HCl-এর মোলের সমান',
        ],
        [
          'The volume of NaOH added equals the volume of acid',
          'যোগ করা NaOH-এর আয়তন এসিডের আয়তনের সমান',
        ],
        ['All the water in the flask has reacted', 'ফ্লাস্কের সব পানি বিক্রিয়া করে ফেলেছে'],
      ],
      0,
    ),
    positions: { check1: 2, q1: 0, q5: 1 },
    exampleAnswer: { baseAdded: 25 },
    hints: {
      check1: hints(
        'Equivalence is about counting the particles that react, not measuring how much liquid is poured.',
        'সমতুল্যতা মানে বিক্রিয়া করা কণা গোনা, কতটা তরল ঢালা হলো তা মাপা নয়।',
        'In NaOH + HCl → NaCl + H₂O, one mole of base reacts with one mole of acid.',
        'NaOH + HCl → NaCl + H₂O বিক্রিয়ায় এক মোল ক্ষারক এক মোল এসিডের সঙ্গে বিক্রিয়া করে।',
      ),
      q1: hints(
        'Work out the pH of 0.1 mol/dm³ HCl first.',
        'আগে 0.1 mol/dm³ HCl-এর pH বের করো।',
        'Methyl orange changes between pH 3.1 and 4.4; compare the flask’s pH with that range.',
        'মিথাইল অরেঞ্জ pH 3.1 থেকে 4.4-এর মধ্যে রং বদলায়; ফ্লাস্কের pH-কে এই পরিসরের সঙ্গে তুলনা করো।',
      ),
      q2: hints(
        'Use n = CV; millimoles come straight from mol/dm³ multiplied by cm³.',
        'n = CV ব্যবহার করো; mol/dm³-কে cm³ দিয়ে গুণ করলে সরাসরি মিলিমোল পাওয়া যায়।',
        'Multiply 0.1 by 20; there is no need to divide by 1000 when the answer is in mmol.',
        '0.1-কে 20 দিয়ে গুণ করো; উত্তর mmol-এ চাইলে 1000 দিয়ে ভাগ করতে হয় না।',
      ),
      q3: hints(
        'Find the moles of HCl in the flask, then the volume of 0.08 mol/dm³ NaOH that holds the same number of moles.',
        'ফ্লাস্কে HCl-এর মোল বের করো, তারপর 0.08 mol/dm³ NaOH-এর কত আয়তনে সমান মোল থাকে তা বের করো।',
        'The NaOH is more dilute than the acid, so you need more than 20 cm³; watch methyl orange change near the end.',
        'NaOH এসিডের চেয়ে লঘু, তাই 20 cm³-এর বেশি লাগবে; শেষের দিকে মিথাইল অরেঞ্জের রং বদল লক্ষ করো।',
      ),
      q4: hints(
        'At equivalence, the moles of NaOH equal the moles of HCl.',
        'সমতুল্য বিন্দুতে NaOH-এর মোল HCl-এর মোলের সমান।',
        'Find 0.5 × 18 in mmol, then divide by the 25 cm³ of acid.',
        '0.5 × 18 হিসাব করে mmol পাও, তারপর এসিডের 25 cm³ দিয়ে ভাগ করো।',
      ),
      q5: hints(
        'Compare the moles of acid in the two flasks, not how strongly each acid ionises.',
        'দুই ফ্লাস্কে এসিডের মোল তুলনা করো, কোন এসিড কতটা আয়নিত হয় তা নয়।',
        'As NaOH removes H⁺, more ethanoic acid molecules ionise, so every acid molecule is eventually neutralised.',
        'NaOH যত H⁺ সরায়, তত বেশি ইথানয়িক এসিড অণু আয়নিত হয়, তাই শেষ পর্যন্ত প্রতিটি এসিড অণুই প্রশমিত হয়।',
      ),
    },
  },
  'reaction-rate': {
    objective: t(
      'Explain with collision theory how concentration, surface area, temperature and a catalyst change the rate of reaction; use half-life, the time for half the reactant to react, to compare rates.',
      'সংঘর্ষ তত্ত্ব দিয়ে ঘনমাত্রা, পৃষ্ঠতলের ক্ষেত্রফল, তাপমাত্রা ও প্রভাবক কীভাবে বিক্রিয়ার হার বদলায় ব্যাখ্যা করো; হার তুলনা করতে অর্ধায়ু, অর্থাৎ অর্ধেক বিক্রিয়ক বিক্রিয়া করতে লাগা সময়, ব্যবহার করো।',
    ),
    example: t(
      'At 25 °C, 1 mol/dm³ and lumps, the half-life is 20 s. Chips react 2 times as fast as lumps, so their half-life is 20/2 = 10 s. At 0.5 mol/dm³ with chips the two effects cancel: 20/(0.5 × 2) = 20 s. After 3 half-lives, 1/8 of the reactant remains.',
      '25°C, 1 mol/dm³ ও বড় টুকরায় অর্ধায়ু 20 s। ছোট টুকরা বড় টুকরার 2 গুণ দ্রুত বিক্রিয়া করে, তাই অর্ধায়ু 20/2 = 10 s। ছোট টুকরা নিয়ে 0.5 mol/dm³-এ দুই প্রভাব কাটাকাটি হয়: 20/(0.5 × 2) = 20 s। 3টি অর্ধায়ু পরে বিক্রিয়কের 1/8 অংশ অবশিষ্ট থাকে।',
    ),
    assumptions: t(
      'The rate is proportional to concentration (0.1–2 mol/dm³). Chips react 2 times and powder 4 times as fast as lumps. Temperature (5–80 °C) acts through the Arrhenius factor with an activation energy of 50 kJ/mol, lowered to 35 kJ/mol by the catalyst. The reference is 25 °C, 1 mol/dm³, lumps and no catalyst, with a 20 s half-life; the fraction reacted after t seconds is 1 − 0.5^(t/half-life).',
      'হার ঘনমাত্রার সমানুপাতিক (0.1–2 mol/dm³)। ছোট টুকরা বড় টুকরার 2 গুণ এবং গুঁড়া 4 গুণ দ্রুত বিক্রিয়া করে। তাপমাত্রা (5–80°C) আরহেনিয়াস গুণকের মাধ্যমে কাজ করে; সক্রিয়ণ শক্তি 50 kJ/mol, প্রভাবক থাকলে তা কমে 35 kJ/mol। তুলনার অবস্থা 25°C, 1 mol/dm³, বড় টুকরা ও প্রভাবকহীন, অর্ধায়ু 20 s; t সেকেন্ড পরে বিক্রিয়া করা অংশ 1 − 0.5^(t/অর্ধায়ু)।',
    ),
    misconception: t(
      'A catalyst does not give particles more energy and is not used up; it lowers the activation energy. Powder does not raise the acid’s concentration either; it exposes more surface. In this model the catalyst effect is very large: hundreds of times faster.',
      'প্রভাবক কণাকে বাড়তি শক্তি দেয় না এবং নিজে খরচ হয় না; এটি সক্রিয়ণ শক্তি কমায়। গুঁড়াও এসিডের ঘনমাত্রা বাড়ায় না; এতে শুধু বেশি পৃষ্ঠতল উন্মুক্ত হয়। এই মডেলে প্রভাবকের প্রভাব খুব বড়: কয়েকশ গুণ দ্রুত।',
    ),
    prompts: [
      t(
        'Predict: starting from 25 °C, 1 mol/dm³ and lumps, what will happen to the 20 s half-life if you double the concentration?',
        'আগে অনুমান: 25°C, 1 mol/dm³ ও বড় টুকরা থেকে শুরু করে ঘনমাত্রা দ্বিগুণ করলে 20 s অর্ধায়ুর কী হবে?',
      ),
      t(
        'Observe: change one factor at a time — concentration, surface, temperature, catalyst — and record the relative rate and the half-life for each.',
        'দেখো: একবারে একটি নিয়ামক বদলাও — ঘনমাত্রা, পৃষ্ঠতল, তাপমাত্রা, প্রভাবক — এবং প্রতিবার আপেক্ষিক হার ও অর্ধায়ু লেখো।',
      ),
      t(
        'Explain: use collision theory to say why each change speeds up the reaction, and why the catalyst changes it far more than a 10 °C rise.',
        'ব্যাখ্যা: সংঘর্ষ তত্ত্ব দিয়ে বলো প্রতিটি পরিবর্তন কেন বিক্রিয়া দ্রুত করে, আর 10°C তাপমাত্রা বাড়ানোর চেয়ে প্রভাবক কেন অনেক বেশি পরিবর্তন আনে।',
      ),
    ],
    practice: mcq(
      'check1',
      'Why does powdered marble react faster than lumps of the same mass in the same acid?',
      'একই এসিডে সমান ভরের মার্বেলের গুঁড়া বড় টুকরার চেয়ে দ্রুত বিক্রিয়া করে কেন?',
      [
        [
          'More exposed surface gives more collisions each second',
          'বেশি উন্মুক্ত পৃষ্ঠতলে প্রতি সেকেন্ডে বেশি সংঘর্ষ হয়',
        ],
        ['Powder raises the concentration of the acid', 'গুঁড়া এসিডের ঘনমাত্রা বাড়িয়ে দেয়'],
        ['Powder lowers the activation energy', 'গুঁড়া সক্রিয়ণ শক্তি কমিয়ে দেয়'],
      ],
      0,
    ),
    positions: { check1: 0, q1: 2, q5: 1 },
    exampleAnswer: { concentration: 2, surface: 'chips' },
    hints: {
      check1: hints(
        'Think about where the acid particles can actually reach the solid.',
        'এসিডের কণা কঠিন পদার্থের কোন অংশে পৌঁছাতে পারে, তা ভাবো।',
        'Grinding leaves the acid unchanged but lets many more of the solid’s particles meet it at once.',
        'গুঁড়া করলে এসিড একই থাকে, কিন্তু কঠিনের অনেক বেশি কণা একসঙ্গে এসিডের সংস্পর্শে আসে।',
      ),
      q1: hints(
        'Compare the energy a collision needs to succeed with and without the catalyst.',
        'প্রভাবক থাকা ও না থাকা অবস্থায় সফল সংঘর্ষের জন্য কত শক্তি লাগে তুলনা করো।',
        'A catalyst is recovered unchanged at the end; it opens a different route from reactants to products.',
        'বিক্রিয়ার শেষে প্রভাবক অপরিবর্তিত অবস্থায় ফিরে পাওয়া যায়; এটি বিক্রিয়ক থেকে উৎপাদে যাওয়ার ভিন্ন পথ খুলে দেয়।',
      ),
      q2: hints(
        'The rate is proportional to concentration, and the half-life is inversely proportional to the rate.',
        'হার ঘনমাত্রার সমানুপাতিক, আর অর্ধায়ু হারের ব্যস্তানুপাতিক।',
        'Doubling the concentration doubles the rate; divide the 20 s half-life by that factor.',
        'ঘনমাত্রা দ্বিগুণ করলে হার দ্বিগুণ হয়; 20 s অর্ধায়ুকে সেই গুণক দিয়ে ভাগ করো।',
      ),
      q3: hints(
        'A 5 s half-life needs a rate 4 times the reference rate, because 20 s ÷ 4 = 5 s.',
        '5 s অর্ধায়ুর জন্য তুলনার অবস্থার 4 গুণ হার দরকার, কারণ 20 s ÷ 4 = 5 s।',
        'Chips give a factor of 2 and powder a factor of 4; pair a surface with a concentration so the factors multiply to 4.',
        'ছোট টুকরা 2 গুণ আর গুঁড়া 4 গুণ দেয়; এমন পৃষ্ঠতল ও ঘনমাত্রা বেছে নাও যাদের গুণফল 4 হয়।',
      ),
      q4: hints(
        'Count how many half-lives fit into 40 s.',
        '40 s-এ কয়টি অর্ধায়ু আঁটে, গোনো।',
        'The reactant left halves after each half-life; subtract the fraction left from 1.',
        'প্রতিটি অর্ধায়ু পরে অবশিষ্ট বিক্রিয়ক অর্ধেক হয়; অবশিষ্ট অংশকে 1 থেকে বিয়োগ করো।',
      ),
      q5: hints(
        'Run the model at 25 °C and at 35 °C and compare the relative rate readings.',
        'মডেলটি 25°C ও 35°C-এ চালিয়ে আপেক্ষিক হারের পাঠ তুলনা করো।',
        'A 10 °C rise lets many more particles pass the 50 kJ/mol barrier, but not ten times as many.',
        '10°C বাড়ালে অনেক বেশি কণা 50 kJ/mol বাধা পার হতে পারে, তবে দশ গুণ নয়।',
      ),
    },
  },
  'ph-indicator': {
    objective: t(
      'Calculate pH with pH = −log[H⁺] for strong acids and pH = 14 + log[OH⁻] for strong bases; compare strong and weak acids; predict the colours of litmus, phenolphthalein, methyl orange, bromothymol blue and universal indicator.',
      'তীব্র এসিডের (অম্লের) জন্য pH = −log[H⁺] এবং তীব্র ক্ষারকের জন্য pH = 14 + log[OH⁻] দিয়ে pH হিসাব করো; তীব্র ও মৃদু এসিড তুলনা করো; লিটমাস, ফেনলফথ্যালিন, মিথাইল অরেঞ্জ, ব্রোমোথাইমল ব্লু ও সার্বজনীন নির্দেশকের রং অনুমান করো।',
    ),
    example: t(
      '0.1 mol/dm³ HCl is fully ionised, so [H⁺] = 0.1 = 10⁻¹ mol/dm³ and pH = 1. For 0.0001 mol/dm³ NaOH, [OH⁻] = 10⁻⁴ mol/dm³, so pH = 14 − 4 = 10.',
      '0.1 mol/dm³ HCl সম্পূর্ণ আয়নিত, তাই [H⁺] = 0.1 = 10⁻¹ mol/dm³ এবং pH = 1। 0.0001 mol/dm³ NaOH-এ [OH⁻] = 10⁻⁴ mol/dm³, তাই pH = 14 − 4 = 10।',
    ),
    assumptions: t(
      'All solutions are at 25 °C. HCl and NaOH ionise completely; ethanoic acid and ammonia ionise partly (K = 1.8 × 10⁻⁵ for each). Concentrations run from 0.0001 to 1 mol/dm³, and pure water is taken as exactly pH 7. Indicator colours follow fixed ranges: litmus, for example, is red below pH 4.5, blue above 8.3 and purple in between.',
      'সব দ্রবণ 25°C-তে। HCl ও NaOH সম্পূর্ণ আয়নিত হয়; ইথানয়িক এসিড ও অ্যামোনিয়া আংশিক আয়নিত হয় (প্রতিটির K = 1.8 × 10⁻⁵)। ঘনমাত্রা 0.0001 থেকে 1 mol/dm³, আর বিশুদ্ধ পানির pH ঠিক 7 ধরা হয়। নির্দেশকের রং নির্দিষ্ট পরিসর মেনে চলে: যেমন লিটমাস pH 4.5-এর নিচে লাল, 8.3-এর ওপরে নীল এবং মাঝে বেগুনি।',
    ),
    misconception: t(
      'A change of 1 in pH means a tenfold change in [H⁺], not a doubling. Phenolphthalein is colourless in both acid and neutral water, so colourless does not prove a solution is acidic; in this model it also fades again in very strong alkali above pH 12.5.',
      'pH 1 বদলানো মানে [H⁺] দশ গুণ বদলানো, দ্বিগুণ নয়। ফেনলফথ্যালিন এসিড ও নিরপেক্ষ পানি — দুটিতেই বর্ণহীন, তাই বর্ণহীন হলেই দ্রবণ এসিডীয় প্রমাণ হয় না; এই মডেলে pH 12.5-এর বেশি তীব্র ক্ষারেও এটি আবার বর্ণহীন হয়ে যায়।',
    ),
    prompts: [
      t(
        'Predict: the beaker holds 0.01 mol/dm³ HCl with litmus. What pH and colour do you expect? What changes if you switch to pure water?',
        'আগে অনুমান: বিকারে লিটমাসসহ 0.01 mol/dm³ HCl আছে। pH ও রং কী হবে? বিশুদ্ধ পানি নিলে কী বদলাবে?',
      ),
      t(
        'Observe: try each substance with each indicator. Record the pH and colour, then change the HCl and NaOH concentrations by factors of 10.',
        'দেখো: প্রতিটি পদার্থের সঙ্গে প্রতিটি নির্দেশক পরীক্ষা করো। pH ও রং লেখো, তারপর HCl ও NaOH-এর ঘনমাত্রা 10 গুণ করে বদলাও।',
      ),
      t(
        'Explain: why does a tenfold change in concentration shift the pH by one unit, and why does ethanoic acid have a higher pH than HCl at the same concentration?',
        'ব্যাখ্যা: ঘনমাত্রা 10 গুণ বদলালে pH এক একক সরে কেন, আর একই ঘনমাত্রায় ইথানয়িক এসিডের pH HCl-এর চেয়ে বেশি কেন?',
      ),
    ],
    practice: mcq(
      'check1',
      'Which indicator in the model is red in 0.01 mol/dm³ HCl but purple in pure water?',
      'মডেলে কোন নির্দেশক 0.01 mol/dm³ HCl-এ লাল কিন্তু বিশুদ্ধ পানিতে বেগুনি?',
      [
        ['Litmus', 'লিটমাস'],
        ['Phenolphthalein', 'ফেনলফথ্যালিন'],
        ['Bromothymol blue', 'ব্রোমোথাইমল ব্লু'],
      ],
      0,
    ),
    positions: { check1: 1, q1: 0, q5: 2 },
    exampleAnswer: { concentration: 0.01 },
    hints: {
      check1: hints(
        'Find the pH of each liquid first, then compare it with each indicator’s colour range.',
        'আগে প্রতিটি তরলের pH বের করো, তারপর প্রতিটি নির্দেশকের রঙের পরিসরের সঙ্গে মেলাও।',
        'One choice stays colourless in both liquids and another turns yellow in acid; look for the one that is red below pH 4.5.',
        'একটি বিকল্প দুই তরলেই বর্ণহীন থাকে, আরেকটি এসিডে হলুদ হয়; যেটি pH 4.5-এর নিচে লাল, সেটি খোঁজো।',
      ),
      q1: hints(
        'Think about how much of each acid splits into H⁺ ions in water.',
        'পানিতে কোন এসিডের কতটা অংশ H⁺ আয়নে ভাঙে, ভাবো।',
        'Fewer H⁺ ions means a smaller [H⁺] and therefore a larger −log[H⁺].',
        'কম H⁺ আয়ন মানে [H⁺] কম, তাই −log[H⁺] বেশি।',
      ),
      q2: hints(
        'HCl is fully ionised, so [H⁺] equals the acid concentration.',
        'HCl সম্পূর্ণ আয়নিত, তাই [H⁺] এসিডের ঘনমাত্রার সমান।',
        'Write 0.001 as a power of ten and take the negative of the exponent.',
        '0.001-কে দশের ঘাত হিসেবে লেখো এবং ঘাতের ঋণাত্মক মান নাও।',
      ),
      q3: hints(
        'For a strong base, pH = 14 + log[OH⁻]; raising the pH by 1 needs a tenfold change in [OH⁻].',
        'তীব্র ক্ষারকের জন্য pH = 14 + log[OH⁻]; pH 1 বাড়াতে [OH⁻] দশ গুণ বদলাতে হয়।',
        'Doubling 0.001 mol/dm³ adds only about 0.3 to the pH; find the factor that adds exactly one to its logarithm.',
        '0.001 mol/dm³ দ্বিগুণ করলে pH মাত্র প্রায় 0.3 বাড়ে; কোন গুণক এর লগারিদমে ঠিক 1 যোগ করে, তা খোঁজো।',
      ),
      q4: hints(
        'Each pH unit stands for a factor of 10 in [H⁺].',
        'pH-এর প্রতিটি একক [H⁺]-এর 10 গুণ পার্থক্য বোঝায়।',
        'Divide 0.01 by 0.0001, or raise 10 to the power of the pH difference.',
        '0.01-কে 0.0001 দিয়ে ভাগ করো, অথবা pH-এর পার্থক্যকে 10-এর ঘাত হিসেবে নাও।',
      ),
      q5: hints(
        'Universal indicator runs through red, orange, yellow, green, blue, purple and violet as the pH rises.',
        'pH বাড়ার সঙ্গে সার্বজনীন নির্দেশক লাল, কমলা, হলুদ, সবুজ, নীল, বেগুনি ও গাঢ় বেগুনি হয়।',
        'In the model it is blue from 7.5 up to 10 and turns violet only at 12; place pH 11 between those limits.',
        'মডেলে এটি 7.5 থেকে 10 পর্যন্ত নীল এবং 12-তে গিয়ে গাঢ় বেগুনি হয়; pH 11 এই সীমার কোথায় পড়ে দেখো।',
      ),
    },
  },
};

const gas = { amount: 1, temperature: 300, volume: 10 },
  flame = { ion: 'na' },
  titrationFlask = {
    acid: 'hcl',
    acidConcentration: 0.1,
    acidVolume: 25,
    baseConcentration: 0.1,
    baseAdded: 0,
    indicator: 'phenolphthalein',
  },
  rate = { temperature: 25, concentration: 1, catalyst: false, surface: 'lumps' },
  ph = { substance: 'hcl', concentration: 0.01, indicator: 'litmus' };

/** Example lessons for the chemistry simulations that the first seven lessons do not use. */
export const CHEMISTRY_LESSONS: ReturnType<typeof lesson>[] = [
  lesson(
    'gas-law',
    'chemistry',
    'chemistry-2',
    t('Gas laws: pressure in a piston', 'গ্যাসের সূত্র: পিস্টনে আবদ্ধ গ্যাসের চাপ'),
    t(
      'A gas presses on its container because its particles keep hitting the walls. In this ideal-gas model, pressure, volume, temperature and amount are linked by PV = nRT.',
      'গ্যাসের কণাগুলো অনবরত পাত্রের দেয়ালে ধাক্কা দেয় বলে গ্যাস চাপ সৃষ্টি করে। এই আদর্শ গ্যাস মডেলে চাপ, আয়তন, তাপমাত্রা ও মোল সংখ্যা PV = nRT সম্পর্কে যুক্ত।',
    ),
    explore(
      'gas-law',
      gas,
      'Change one variable at a time and watch the pressure.',
      'একবারে একটি রাশি বদলে চাপ লক্ষ করো।',
    ),
    [
      mcq(
        'q1',
        'Which temperature unit must you use in PV = nRT?',
        'PV = nRT-এ তাপমাত্রার কোন একক ব্যবহার করতে হয়?',
        [
          ['Kelvin', 'কেলভিন'],
          ['Degree Celsius', 'ডিগ্রি সেলসিয়াস'],
          ['Degree Fahrenheit', 'ডিগ্রি ফারেনহাইট'],
        ],
        0,
      ),
      numeric(
        'q2',
        'For n = 1 mol, T = 300 K and V = 10 dm³, what pressure does the model show? Use R = 8.314 J mol⁻¹ K⁻¹.',
        'n = 1 mol, T = 300 K ও V = 10 dm³ হলে মডেলে চাপ কত দেখাবে? R = 8.314 J mol⁻¹ K⁻¹ নাও।',
        249.42,
        'kPa',
      ),
      task(
        'q3',
        'Keep n = 1 mol and V = 10 dm³. Change only the temperature so that the pressure reads 498.84 kPa.',
        'n = 1 mol ও V = 10 dm³ রাখো। শুধু তাপমাত্রা বদলে চাপ 498.84 kPa করো।',
        'gas-law',
        gas,
        ['temperature'],
        'pressureEquals',
        { kPa: 498.84, tol: 0.5 },
      ),
      numeric(
        'q4',
        'What volume does 1 mol of gas occupy at 300 K and 100 kPa in this model?',
        'এই মডেলে 300 K ও 100 kPa চাপে 1 mol গ্যাস কত আয়তন দখল করে?',
        24.942,
        'dm³',
      ),
      mcq(
        'q5',
        'When the gas is heated at fixed volume, what happens to the average speed of its particles?',
        'স্থির আয়তনে গ্যাসকে গরম করলে এর কণাগুলোর গড় বেগের কী হয়?',
        [
          ['It increases', 'বাড়ে'],
          ['It decreases', 'কমে'],
          ['It stays the same', 'অপরিবর্তিত থাকে'],
        ],
        0,
      ),
    ],
    SUPPORT['gas-law']!,
  ),
  lesson(
    'flame-test',
    'chemistry',
    'chemistry-3',
    t('Flame tests: colours from electrons', 'শিখা পরীক্ষা: ইলেকট্রনের রঙিন আলো'),
    t(
      'Some metal ions colour a flame. The colour comes from light given out by their electrons, so it can help identify the metal in a salt.',
      'কিছু ধাতব আয়ন শিখাকে রঙিন করে। এই রং আসে আয়নের ইলেকট্রন থেকে বিকিরিত আলো থেকে, তাই এটি দিয়ে লবণে কোন ধাতু আছে তা শনাক্ত করা যায়।',
    ),
    explore(
      'flame-test',
      flame,
      'Switch the metal ion and compare the flame colours.',
      'ধাতব আয়ন বদলে শিখার রং তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'What flame colour does the model show for a sodium salt?',
        'মডেলে সোডিয়াম লবণের শিখার রং কী দেখায়?',
        [
          ['Yellow-orange', 'হলুদ-কমলা'],
          ['Lilac', 'হালকা বেগুনি'],
          ['Apple green', 'আপেল সবুজ'],
        ],
        0,
      ),
      numeric(
        'q2',
        'The model lists lithium’s first line at 670.8 nm and sodium’s at 589.0 nm. How many nanometres longer is lithium’s line?',
        'মডেলে লিথিয়ামের প্রথম রেখা 670.8 nm এবং সোডিয়ামের 589.0 nm। লিথিয়ামের রেখাটি কত ন্যানোমিটার বেশি দীর্ঘ?',
        81.8,
        'nm',
      ),
      task(
        'q3',
        'An unknown salt gives a blue-green flame. Choose the metal ion that matches it.',
        'একটি অজানা লবণ নীলচে সবুজ শিখা দেয়। এর সঙ্গে মেলে এমন ধাতব আয়ন বেছে নাও।',
        'flame-test',
        flame,
        ['ion'],
        'ionIs',
        { ion: 'cu' },
      ),
      numeric(
        'q4',
        'The model lists potassium lines at 766.5, 769.9 and 404.4 nm. What is the difference between the longest and the shortest of these wavelengths?',
        'মডেলে পটাশিয়ামের রেখা 766.5, 769.9 ও 404.4 nm। এদের মধ্যে দীর্ঘতম ও ক্ষুদ্রতম তরঙ্গদৈর্ঘ্যের পার্থক্য কত?',
        365.5,
        'nm',
      ),
      mcq(
        'q5',
        'A salt gives a crimson flame in the model. Which ion does it contain?',
        'মডেলে একটি লবণ গাঢ় লাল শিখা দেয়। এতে কোন আয়ন আছে?',
        [
          ['Lithium (Li⁺)', 'লিথিয়াম (Li⁺)'],
          ['Strontium (Sr²⁺)', 'স্ট্রনশিয়াম (Sr²⁺)'],
          ['Barium (Ba²⁺)', 'বেরিয়াম (Ba²⁺)'],
        ],
        0,
      ),
    ],
    SUPPORT['flame-test']!,
  ),
  lesson(
    'titration',
    'chemistry',
    'chemistry-6',
    t('Titration: counting moles with a burette', 'টাইট্রেশন: ব্যুরেট দিয়ে মোল গণনা'),
    t(
      'In a titration, a base of known concentration is added from a burette until it has exactly neutralised the acid in the flask. Counting moles with n = CV then gives the unknown amount.',
      'টাইট্রেশনে জানা ঘনমাত্রার ক্ষারক ব্যুরেট থেকে যোগ করা হয়, যতক্ষণ না ফ্লাস্কের এসিড ঠিকঠাক প্রশমিত হয়। তারপর n = CV দিয়ে মোল গুনে অজানা পরিমাণ পাওয়া যায়।',
    ),
    explore(
      'titration',
      titrationFlask,
      'Add NaOH step by step and watch the pH and the indicator.',
      'ধাপে ধাপে NaOH যোগ করে pH ও নির্দেশক লক্ষ করো।',
    ),
    [
      mcq(
        'q1',
        'Methyl orange is added to a flask of 0.1 mol/dm³ HCl before any NaOH. What colour does it show?',
        'NaOH যোগের আগে 0.1 mol/dm³ HCl-এর ফ্লাস্কে মিথাইল অরেঞ্জ দেওয়া হলো। এটি কোন রং দেখায়?',
        [
          ['Red', 'লাল'],
          ['Yellow', 'হলুদ'],
          ['Blue', 'নীল'],
        ],
        0,
      ),
      numeric(
        'q2',
        'How many millimoles of HCl are in 20 cm³ of 0.1 mol/dm³ acid? (1 mol = 1000 mmol)',
        '20 cm³, 0.1 mol/dm³ এসিডে কত মিলিমোল HCl আছে? (1 mol = 1000 mmol)',
        2,
        'mmol',
      ),
      task(
        'q3',
        'The flask holds 20 cm³ of 0.1 mol/dm³ HCl and the burette holds 0.08 mol/dm³ NaOH. Add exactly enough NaOH to reach the equivalence point.',
        'ফ্লাস্কে 20 cm³, 0.1 mol/dm³ HCl এবং ব্যুরেটে 0.08 mol/dm³ NaOH আছে। ঠিক যতটুকু NaOH দিলে সমতুল্য বিন্দুতে পৌঁছায়, ততটুকু যোগ করো।',
        'titration',
        {
          acid: 'hcl',
          acidConcentration: 0.1,
          acidVolume: 20,
          baseConcentration: 0.08,
          baseAdded: 0,
          indicator: 'methylOrange',
        },
        ['baseAdded'],
        'endPointReached',
        { tol: 0.1 },
      ),
      numeric(
        'q4',
        '18 cm³ of 0.5 mol/dm³ NaOH exactly neutralises 25 cm³ of HCl. What is the concentration of the HCl?',
        '18 cm³, 0.5 mol/dm³ NaOH ঠিক 25 cm³ HCl-কে প্রশমিত করে। HCl-এর ঘনমাত্রা কত?',
        0.36,
        'mol/dm³',
      ),
      mcq(
        'q5',
        'Ethanoic acid is a weak acid. Compared with HCl of the same volume and concentration, what volume of the same NaOH reaches equivalence?',
        'ইথানয়িক এসিড মৃদু এসিড। একই আয়তন ও ঘনমাত্রার HCl-এর তুলনায় একই NaOH-এর কত আয়তনে সমতুল্য বিন্দু আসে?',
        [
          ['The same volume', 'একই আয়তন'],
          ['A larger volume', 'বেশি আয়তন'],
          ['A smaller volume', 'কম আয়তন'],
        ],
        0,
      ),
    ],
    SUPPORT['titration']!,
  ),
  lesson(
    'reaction-rate',
    'chemistry',
    'chemistry-7',
    t('Rate of reaction: what speeds it up?', 'বিক্রিয়ার হার: কী বিক্রিয়াকে দ্রুত করে?'),
    t(
      'Particles react only when they collide with enough energy. Concentration, surface area, temperature and a catalyst each change how often that happens, and the model shows the effect as a half-life.',
      'কণাগুলো যথেষ্ট শক্তি নিয়ে সংঘর্ষ করলেই কেবল বিক্রিয়া হয়। ঘনমাত্রা, পৃষ্ঠতলের ক্ষেত্রফল, তাপমাত্রা ও প্রভাবক — প্রত্যেকটি এমন সংঘর্ষ কত ঘন ঘন হয় তা বদলায়; মডেলটি এর প্রভাব অর্ধায়ু দিয়ে দেখায়।',
    ),
    explore(
      'reaction-rate',
      rate,
      'Change one factor at a time and compare the half-life.',
      'একবারে একটি নিয়ামক বদলে অর্ধায়ু তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'How does a catalyst speed up the reaction in this model?',
        'এই মডেলে প্রভাবক কীভাবে বিক্রিয়াকে দ্রুত করে?',
        [
          [
            'It offers a pathway with lower activation energy',
            'এটি কম সক্রিয়ণ শক্তির বিকল্প পথ দেয়',
          ],
          ['It raises the temperature of the mixture', 'এটি মিশ্রণের তাপমাত্রা বাড়ায়'],
          ['It is used up as an extra reactant', 'এটি বাড়তি বিক্রিয়ক হিসেবে খরচ হয়'],
        ],
        0,
      ),
      numeric(
        'q2',
        'At 25 °C with lumps and no catalyst, the half-life is 20 s at 1 mol/dm³. What is it at 2 mol/dm³ if nothing else changes?',
        '25°C-তে বড় টুকরা ও প্রভাবক ছাড়া 1 mol/dm³-এ অর্ধায়ু 20 s। অন্য কিছু না বদলে 2 mol/dm³ করলে অর্ধায়ু কত?',
        10,
        's',
      ),
      task(
        'q3',
        'Keep 25 °C and no catalyst. Change the concentration and the surface so that the half-life becomes 5 s.',
        '25°C ও প্রভাবকহীন অবস্থা রাখো। ঘনমাত্রা ও পৃষ্ঠতল বদলে অর্ধায়ু 5 s করো।',
        'reaction-rate',
        rate,
        ['concentration', 'surface'],
        'halfLifeEquals',
        { seconds: 5, tol: 0.1 },
      ),
      numeric(
        'q4',
        'Under the reference conditions the half-life is 20 s. What fraction of the reactant has reacted after 40 s? Give a decimal.',
        'তুলনার অবস্থায় অর্ধায়ু 20 s। 40 s পরে বিক্রিয়কের কত ভগ্নাংশ বিক্রিয়া করেছে? দশমিকে লেখো।',
        0.75,
        '',
      ),
      mcq(
        'q5',
        'In the model, raising the temperature from 25 °C to 35 °C makes the reaction…',
        'মডেলে তাপমাত্রা 25°C থেকে 35°C করলে বিক্রিয়া হয়…',
        [
          ['About twice as fast', 'প্রায় দ্বিগুণ দ্রুত'],
          ['About ten times as fast', 'প্রায় দশ গুণ দ্রুত'],
          ['Slower than before', 'আগের চেয়ে ধীর'],
        ],
        0,
      ),
    ],
    SUPPORT['reaction-rate']!,
  ),
  lesson(
    'ph-indicator',
    'chemistry',
    'chemistry-9',
    t('pH and indicators', 'pH ও নির্দেশক'),
    t(
      'pH tells us how acidic or basic a solution is: at 25 °C, below 7 is acidic, 7 is neutral and above 7 is basic. Each indicator changes colour over its own pH range.',
      'pH দিয়ে বোঝা যায় দ্রবণ কতটা এসিডীয় বা ক্ষারীয়: 25°C-তে 7-এর কম হলে এসিডীয়, 7 হলে নিরপেক্ষ এবং 7-এর বেশি হলে ক্ষারীয়। প্রতিটি নির্দেশক নিজস্ব pH পরিসরে রং বদলায়।',
    ),
    explore(
      'ph-indicator',
      ph,
      'Try each substance with each indicator and compare pH and colour.',
      'প্রতিটি পদার্থে প্রতিটি নির্দেশক দিয়ে pH ও রং তুলনা করো।',
    ),
    [
      mcq(
        'q1',
        'Which solution has the higher pH: 0.1 mol/dm³ HCl or 0.1 mol/dm³ ethanoic acid?',
        'কোন দ্রবণের pH বেশি: 0.1 mol/dm³ HCl, না 0.1 mol/dm³ ইথানয়িক এসিড?',
        [
          [
            'Ethanoic acid, because it ionises only partly',
            'ইথানয়িক এসিড, কারণ এটি আংশিক আয়নিত হয়',
          ],
          ['HCl, because it is the stronger acid', 'HCl, কারণ এটি তীব্রতর এসিড'],
          ['Neither; both have pH 1', 'কোনোটিই নয়; দুটির pH-ই 1'],
        ],
        0,
      ),
      numeric('q2', 'What is the pH of 0.001 mol/dm³ HCl?', '0.001 mol/dm³ HCl-এর pH কত?', 3, ''),
      task(
        'q3',
        'The beaker holds 0.001 mol/dm³ NaOH (pH 11). Change only its concentration so that the pH becomes 12.',
        'বিকারে 0.001 mol/dm³ NaOH আছে (pH 11)। শুধু এর ঘনমাত্রা বদলে pH 12 করো।',
        'ph-indicator',
        { substance: 'naoh', concentration: 0.001, indicator: 'bromothymol' },
        ['concentration'],
        'phEquals',
        { ph: 12, tol: 0.05 },
      ),
      numeric(
        'q4',
        '0.01 mol/dm³ HCl has pH 2 and 0.0001 mol/dm³ HCl has pH 4. How many times greater is [H⁺] in the first solution?',
        '0.01 mol/dm³ HCl-এর pH 2 এবং 0.0001 mol/dm³ HCl-এর pH 4। প্রথম দ্রবণে [H⁺] কত গুণ বেশি?',
        100,
        '',
      ),
      mcq(
        'q5',
        '0.001 mol/dm³ NaOH has pH 11. What colour does universal indicator show in it in the model?',
        '0.001 mol/dm³ NaOH-এর pH 11। মডেলে এতে সার্বজনীন নির্দেশক কোন রং দেখায়?',
        [
          ['Purple', 'বেগুনি'],
          ['Green', 'সবুজ'],
          ['Red', 'লাল'],
        ],
        0,
      ),
    ],
    SUPPORT['ph-indicator']!,
  ),
];
