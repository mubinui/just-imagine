/** Public story/game content. No private challenge answers, scores or reward instructions. */
export type StoryLine = readonly [string, string];
export type StoryItem = { id: string; label: StoryLine; art?: string };
export type StoryGame =
  | { kind: 'classic'; game: 'brush' | 'oxygen' | 'moon' | 'picnic' | 'dance' }
  | {
      kind: 'assemble';
      layout: 'rings' | 'bridge' | 'skeleton' | 'nest' | 'spiral' | 'coat' | 'huddle';
      pieces: number;
    }
  | { kind: 'route'; nodes: StoryItem[]; parcel: 'air' | 'water' | 'food' | 'signal' }
  | {
      kind: 'trail';
      columns: number;
      rows: number;
      start: number;
      exit: number;
      blocked: number[];
      collect: number[];
      theme: 'rover' | 'tracks' | 'current' | 'wind';
    }
  | {
      kind: 'adjust';
      mode: 'beam' | 'orbit' | 'blanket' | 'storm' | 'tilt' | 'distance';
      goals: number[];
    }
  | {
      kind: 'memory';
      mode: 'calls' | 'hooves' | 'song' | 'energy' | 'muscle';
      sequence: number[];
      choices: StoryItem[];
    }
  | { kind: 'hold'; mode: 'wash' | 'breathe' | 'rest'; milliseconds: number }
  | { kind: 'cover'; rounds: number };
export interface StoryChapter {
  id: string;
  characterId: string;
  title: StoryLine;
  setup: StoryLine;
  goal: StoryLine;
  ending: StoryLine;
  /** Index into this character's already sourced bilingual facts. */
  fact: number;
  game: StoryGame;
}
export interface LearningAdventure {
  packId: string;
  title: StoryLine;
  opening: StoryLine;
  ending: StoryLine;
  chapters: StoryChapter[];
}
const chapter = (
  characterId: string,
  title: StoryLine,
  setup: StoryLine,
  goal: StoryLine,
  ending: StoryLine,
  fact: number,
  game: StoryGame,
): StoryChapter => ({ id: characterId, characterId, title, setup, goal, ending, fact, game });
const item = (id: string, en: string, bn: string, art?: string): StoryItem => ({
  id,
  label: [en, bn],
  ...(art ? { art } : {}),
});
const route = (parcel: 'air' | 'water' | 'food' | 'signal', nodes: StoryItem[]): StoryGame => ({
  kind: 'route',
  parcel,
  nodes,
});
const assemble = (
  layout: 'rings' | 'bridge' | 'skeleton' | 'nest' | 'spiral' | 'coat' | 'huddle',
  pieces: number,
): StoryGame => ({ kind: 'assemble', layout, pieces });
const trail = (
  theme: 'rover' | 'tracks' | 'current' | 'wind',
  collect: number[],
  blocked: number[],
): StoryGame => ({
  kind: 'trail',
  columns: 6,
  rows: 4,
  start: 18,
  exit: 5,
  collect,
  blocked,
  theme,
});
const memory = (
  mode: 'calls' | 'hooves' | 'song' | 'energy' | 'muscle',
  sequence: number[],
  choices: StoryItem[],
): StoryGame => ({ kind: 'memory', mode, sequence, choices });
const moves = [
  item('left', 'Left', 'বাঁ'),
  item('right', 'Right', 'ডান'),
  item('up', 'Reach', 'ওপরে'),
  item('rest', 'Pause', 'বিরতি'),
];
const calls = [
  item('cow', 'Cow', 'গরু', 'cow'),
  item('sheep', 'Sheep', 'ভেড়া', 'sheep'),
  item('chicken', 'Hen', 'মুরগি', 'chicken'),
  item('horse', 'Horse', 'ঘোড়া', 'horse'),
];
export const ADVENTURES: Readonly<Record<string, LearningAdventure>> = {
  hygiene: {
    packId: 'hygiene',
    title: ['Tooth Town’s big picnic', 'দাঁতের শহরের বড় পিকনিক'],
    opening: [
      'Tooth Town is getting ready for a picnic. Twinkle, Suds and Tilly need a small helper before the guests arrive.',
      'দাঁতের শহরে পিকনিক হবে। অতিথিরা আসার আগে ঝিলিক, সাবু আর টিলির একজন ছোট্ট সাহায্যকারী চাই।',
    ],
    ending: [
      'The picnic is ready! Clean teeth, washed hands and covered sneezes helped the whole town.',
      'পিকনিক প্রস্তুত! পরিষ্কার দাঁত, ধোয়া হাত আর ঢাকা হাঁচি—সবার উপকার হলো।',
    ],
    chapters: [
      chapter(
        'tooth',
        ['A smile for the picnic', 'পিকনিকের জন্য হাসি'],
        [
          'Twinkle wants to welcome the guests, but pretend plaque is hiding her sparkle. Will you help her brush?',
          'ঝিলিক অতিথিদের স্বাগত জানাবে, কিন্তু খেলার ময়লায় তার হাসি ঢাকা। ব্রাশ করে সাহায্য করবে?',
        ],
        [
          'Drag the brush across every patch of pretend plaque.',
          'ব্রাশ টেনে দাঁতের সব ময়লা পরিষ্কার করো।',
        ],
        [
          'Twinkle’s smile is ready. Next stop: Suds at the handwashing fountain!',
          'ঝিলিকের হাসি প্রস্তুত। এবার হাত ধোয়ার ফোয়ারায় সাবুর কাছে!',
        ],
        1,
        { kind: 'classic', game: 'brush' },
      ),
      chapter(
        'soap',
        ['The bubble fountain', 'বুদবুদের ফোয়ারা'],
        [
          'Suds has made a fountain beside the picnic gate. The hands need a proper bubbly wash before snack time.',
          'পিকনিকের ফটকে সাবু ফোয়ারা বানিয়েছে। নাশতার আগে হাত দুটো ভালো করে ধুতে হবে।',
        ],
        [
          'Hold on each glowing hand area. Scrub for twenty active seconds in all.',
          'আলোকিত অংশগুলোতে চেপে ধরো। সব মিলিয়ে বিশ সেকেন্ড ঘষো।',
        ],
        [
          'Palms, backs, fingers and nails got their turn. Rinse and dry—Tilly is waiting!',
          'তালু, পিঠ, আঙুল আর নখ সব ঘষা হলো। ধুয়ে শুকিয়ে নাও—টিলি অপেক্ষায়!',
        ],
        2,
        { kind: 'hold', mode: 'wash', milliseconds: 20000 },
      ),
      chapter(
        'tissue',
        ['The surprise sneeze', 'হঠাৎ হাঁচি'],
        [
          'A tickly nose has joined the picnic! Tilly can help keep pretend sneeze drops away from the snacks.',
          'পিকনিকে এক নাকে সুড়সুড়ি! টিলি খেলার হাঁচির ফোঁটা খাবার থেকে দূরে রাখবে।',
        ],
        [
          'Move the tissue over the sneeze, then put it in the bin. Help three times.',
          'হাঁচির সামনে টিস্যু রাখো, তারপর বিনে ফেলো। তিনবার সাহায্য করো।',
        ],
        [
          'Tilly caught the sneezes. Used tissues go in the bin; wash hands afterwards. Picnic time!',
          'টিলি হাঁচি ঢেকেছে। ব্যবহৃত টিস্যু বিনে ফেলি, পরে হাত ধুই। এবার পিকনিক!',
        ],
        0,
        { kind: 'cover', rounds: 3 },
      ),
    ],
  },
  space: {
    packId: 'space',
    title: ['The missing sky parade', 'হারিয়ে যাওয়া আকাশের শোভাযাত্রা'],
    opening: [
      'The planets planned a sky parade, but their invitations scattered. Help each friend prepare a special part of the show.',
      'গ্রহরা আকাশে শোভাযাত্রা করবে, কিন্তু নিমন্ত্রণগুলো ছড়িয়ে গেছে। প্রত্যেক বন্ধুকে তার অংশ প্রস্তুত করতে সাহায্য করো।',
    ],
    ending: [
      'Every planet has a place in the parade. You brought light, movement and a whole solar-system cast together!',
      'প্রত্যেক গ্রহ শোভাযাত্রায় জায়গা পেয়েছে। আলো, ঘোরা আর সৌরজগতের সব বন্ধু একসঙ্গে!',
    ],
    chapters: [
      chapter(
        'sun',
        ['Switch on the welcome lights', 'স্বাগতের আলো জ্বালাও'],
        [
          'Sun has three welcome lanterns to light. Aim the pretend sunbeam so the parade can begin.',
          'সূর্যের তিনটি স্বাগতের বাতি জ্বালাতে হবে। খেলার আলোর রশ্মি ঠিক দিকে ঘোরাও।',
        ],
        [
          'Turn the beam to light each waiting lantern.',
          'রশ্মি ঘুরিয়ে অপেক্ষার বাতিগুলো জ্বালাও।',
        ],
        [
          'The lanterns shine! Sun is our nearest star; Mercury can see the starting line.',
          'বাতি জ্বলেছে! সূর্য আমাদের কাছের তারা; বুধ শুরুর জায়গা দেখতে পাচ্ছে।',
        ],
        0,
        { kind: 'adjust', mode: 'beam', goals: [-0.8, 0, 0.8] },
      ),
      chapter(
        'mercury',
        ['Mercury’s invitation lap', 'বুধের নিমন্ত্রণের চক্কর'],
        [
          'Mercury has racing shoes and invitations to deliver. Guide a whole lap around the Sun without leaving the orbit.',
          'বুধের পায়ে দৌড়ের জুতো, হাতে নিমন্ত্রণ। কক্ষপথ ধরে সূর্যের চারপাশে এক চক্কর দাও।',
        ],
        [
          'Drag Mercury through the four glowing orbit gates in order.',
          'বুধকে টেনে চারটি আলোকিত কক্ষপথের গেট পার করাও।',
        ],
        [
          'One lap delivered! Mercury travels around the Sun fastest of the planets.',
          'এক চক্করের নিমন্ত্রণ পৌঁছেছে! গ্রহদের মধ্যে বুধই দ্রুত সূর্যকে ঘুরে আসে।',
        ],
        1,
        { kind: 'adjust', mode: 'orbit', goals: [-Math.PI / 2, 0, Math.PI / 2, Math.PI] },
      ),
      chapter(
        'venus',
        ['Venus’s cloud curtain', 'শুক্রের মেঘের পর্দা'],
        [
          'Venus is making a cloudy stage curtain. Try the model with and without a thick blanket of air and watch heat escape.',
          'শুক্র মেঘের মঞ্চের পর্দা বানাচ্ছে। বাতাসের মোটা কম্বল ছাড়া আর দিয়ে মডেলটিতে তাপ বেরোনো দেখো।',
        ],
        [
          'Open the model’s air blanket, then close it thickly.',
          'মডেলের বাতাসের কম্বল খোলো, তারপর মোটা করে ঢাকো।',
        ],
        [
          'The thick blanket keeps more model heat inside. Venus’s atmosphere makes it extremely hot.',
          'মোটা কম্বলে মডেলের বেশি তাপ আটকাল। শুক্রের বায়ুমণ্ডল তাকে খুব গরম রাখে।',
        ],
        0,
        { kind: 'adjust', mode: 'blanket', goals: [0.05, 0.9] },
      ),
      chapter(
        'earth',
        ['Earth’s day-and-night post', 'পৃথিবীর দিন-রাতের ডাক'],
        [
          'Earth’s invitations need both a daytime stamp and a nighttime stamp. Carry the light marker around the turning globe.',
          'পৃথিবীর নিমন্ত্রণে দিন আর রাতের ছাপ চাই। ঘুরন্ত গোলকের পাশে আলোর চিহ্ন নিয়ে যাও।',
        ],
        [
          'Visit morning, daytime, evening and night in order.',
          'সকাল, দিন, সন্ধ্যা আর রাত ক্রমে ঘুরে এসো।',
        ],
        [
          'A turning Earth brings day and night. The invitations are stamped!',
          'পৃথিবীর ঘোরায় দিন আর রাত হয়। নিমন্ত্রণে ছাপ পড়েছে!',
        ],
        2,
        route('signal', [
          item('morning', 'Morning', 'সকাল'),
          item('day', 'Day', 'দিন'),
          item('evening', 'Evening', 'সন্ধ্যা'),
          item('night', 'Night', 'রাত'),
        ]),
      ),
      chapter(
        'mars',
        ['The red-dust rover', 'লাল ধুলোর রোভার'],
        [
          'Mars dropped three parade badges among the craters. Drive the little rover around the rocks to bring them back.',
          'মঙ্গলের তিনটি শোভাযাত্রার ব্যাজ গর্তের মাঝে পড়েছে। পাথর এড়িয়ে ছোট রোভার চালিয়ে আনো।',
        ],
        [
          'Collect three rock samples, then reach the flag. Move one neighbouring square at a time.',
          'তিনটি পাথরের নমুনা নিয়ে পতাকায় যাও। পাশের ঘরে এক ধাপ করে চলো।',
        ],
        [
          'Samples collected! Mars’s rusty dust gives the planet its reddish colour.',
          'নমুনা সংগ্রহ হলো! মরচে-রঙা ধুলো মঙ্গলকে লালচে করে।',
        ],
        0,
        trail('rover', [12, 1, 4], [7, 8, 14, 16]),
      ),
      chapter(
        'jupiter',
        ['The swirling storm ribbon', 'ঘূর্ণিঝড়ের ফিতা'],
        [
          'Jupiter wants a swirling ribbon for the parade. Turn the model storm through four directions and watch its curved bands.',
          'বৃহস্পতি শোভাযাত্রার জন্য ঘূর্ণির ফিতা চায়। মডেলের ঝড় চার দিকে ঘুরিয়ে বাঁকা রেখা দেখো।',
        ],
        [
          'Follow the glowing directions around the storm.',
          'ঝড়ের চারপাশের আলোকিত দিকগুলো অনুসরণ করো।',
        ],
        [
          'The ribbon swirls! Jupiter’s Great Red Spot is a giant storm, not solid ground.',
          'ফিতা ঘুরছে! বৃহস্পতির লাল দাগ বড় ঝড়, শক্ত মাটি নয়।',
        ],
        2,
        { kind: 'adjust', mode: 'storm', goals: [0, Math.PI / 2, Math.PI, -Math.PI / 2] },
      ),
      chapter(
        'saturn',
        ['Saturn’s scattered ice rings', 'শনির ছড়ানো বরফের বলয়'],
        [
          'Saturn’s sparkly ring pieces floated out of place. Put the model ice pieces back around their dancing friend.',
          'শনির ঝলমলে বলয়ের টুকরো সরে গেছে। মডেলের বরফের টুকরো বন্ধুর চারপাশে বসাও।',
        ],
        [
          'Drag each numbered ice piece into its matching ring space.',
          'নম্বর মেলিয়ে বরফের টুকরোগুলো বলয়ের জায়গায় টেনে বসাও।',
        ],
        [
          'The ring costume is ready! Saturn’s real rings are mostly ice, with rock and dust too.',
          'বলয় প্রস্তুত! শনির আসল বলয়ে প্রধানত বরফ, সঙ্গে পাথর আর ধুলো।',
        ],
        0,
        assemble('rings', 6),
      ),
      chapter(
        'uranus',
        ['The sideways bow', 'পাশ ফিরে অভিবাদন'],
        [
          'Uranus keeps tipping the parade hat sideways. Turn the model’s axis to match this planet’s unusual lean.',
          'ইউরেনাসের টুপি বারবার পাশে হেলে যায়। মডেলের অক্ষ এই গ্রহের অদ্ভুত হেলের সঙ্গে মেলাও।',
        ],
        [
          'Tilt the axis until it reaches the marked 98-degree bow.',
          'অক্ষ হেলিয়ে চিহ্নিত ৯৮ ডিগ্রির অভিবাদন মেলাও।',
        ],
        [
          'What a sideways bow! Uranus’s axis is tilted by about 98 degrees.',
          'কী মজার পাশ-ফেরা অভিবাদন! ইউরেনাসের অক্ষ প্রায় ৯৮ ডিগ্রি হেলে।',
        ],
        0,
        { kind: 'adjust', mode: 'tilt', goals: [(98 * Math.PI) / 180] },
      ),
      chapter(
        'neptune',
        ['A scarf in the wind', 'হাওয়ায় ওড়া মাফলার'],
        [
          'Neptune’s scarf is caught in a pretend windy maze. Steer through the safe currents and collect its three tassels.',
          'নেপচুনের মাফলার খেলার হাওয়ার গোলকধাঁধায়। নিরাপদ পথ ধরে তিনটি ঝুল সংগ্রহ করো।',
        ],
        [
          'Steer around the storm squares, collect the tassels and reach the flag.',
          'ঝড়ের ঘর এড়িয়ে ঝুলগুলো নিয়ে পতাকায় পৌঁছাও।',
        ],
        [
          'Scarf rescued! Neptune has extremely fast winds. Our maze is a pretend model.',
          'মাফলার উদ্ধার! নেপচুনে খুব জোর হাওয়া চলে। এই গোলকধাঁধা খেলার মডেল।',
        ],
        1,
        trail('wind', [19, 13, 4], [6, 8, 14, 16]),
      ),
    ],
  },
  space_galaxy: {
    packId: 'space_galaxy',
    title: ['The night-light workshop', 'রাতের আলোর কর্মশালা'],
    opening: [
      'The Milky Way is opening a night-light workshop. Three sky friends need your help to build its glowing sign.',
      'আকাশগঙ্গা রাতের আলোর কর্মশালা খুলছে। আলোর নামফলক বানাতে তিন আকাশবন্ধুর সাহায্য চাই।',
    ],
    ending: [
      'Stars, a galaxy and reflected moonlight all have different stories. The workshop is glowing!',
      'তারা, ছায়াপথ আর চাঁদের ধার-করা আলোর গল্প আলাদা। কর্মশালা আলোকিত!',
    ],
    chapters: [
      chapter(
        'galaxy',
        ['A spiral of star lights', 'তারার আলোর সর্পিল'],
        [
          'Galaxy’s sign has scattered into star lights. Rebuild its spiral arms, one light at a time.',
          'ছায়াপথের নামফলকের তারা ছড়িয়েছে। একে একে আলো বসিয়ে সর্পিল বাহু বানাও।',
        ],
        [
          'Fit six numbered lights into the spiral map.',
          'সর্পিল মানচিত্রে ছয়টি আলো নম্বর মিলিয়ে বসাও।',
        ],
        [
          'A galaxy holds many stars. This tiny spiral is only a model of our huge Milky Way.',
          'ছায়াপথে অনেক তারা থাকে। ছোট সর্পিলটি বিশাল আকাশগঙ্গার মডেল।',
        ],
        0,
        assemble('spiral', 6),
      ),
      chapter(
        'moon',
        ['The borrowed-light sign', 'ধার-করা আলোর নামফলক'],
        [
          'Moon’s sign keeps changing shape. Move Moon around Earth to see which sunlit part we can see.',
          'চাঁদের নামফলকের আকার বদলায়। পৃথিবীর চারপাশে চাঁদ সরিয়ে আলোকিত দিক দেখো।',
        ],
        [
          'Find full, new and half-lit Moon in order.',
          'পূর্ণিমা, অমাবস্যা আর অর্ধেক আলোকিত চাঁদ ক্রমে খোঁজো।',
        ],
        [
          'Moon reflects sunlight. Its changing position changes the phase we see.',
          'চাঁদ সূর্যের আলো ফেরায়। অবস্থান বদলালে আমরা আলাদা কলা দেখি।',
        ],
        2,
        { kind: 'classic', game: 'moon' },
      ),
      chapter(
        'star',
        ['The far-away lantern', 'দূরের লণ্ঠন'],
        [
          'Star has a light for the workshop. Move the model nearer and farther from the observer; what happens to its apparent brightness?',
          'তারা কর্মশালার জন্য আলো এনেছে। মডেলটি দর্শকের কাছে আর দূরে সরাও—উজ্জ্বলতা কীভাবে বদলায়?',
        ],
        [
          'Try a near light, a far light, then the marked middle distance.',
          'আলো কাছে, দূরে, তারপর চিহ্নিত মাঝের দূরত্বে নাও।',
        ],
        [
          'The same light looks fainter from farther away. Real stars make their own light.',
          'একই আলো দূর থেকে ম্লান দেখায়। আসল তারা নিজের আলো বানায়।',
        ],
        0,
        { kind: 'adjust', mode: 'distance', goals: [0.15, 0.9, 0.5] },
      ),
    ],
  },
  animals_farm: {
    packId: 'animals_farm',
    title: ['The farm’s welcome morning', 'খামারের স্বাগতের সকাল'],
    opening: [
      'The farm friends are welcoming a new foal. Their cosy places and welcome music need a helping hand.',
      'খামারে নতুন ঘোড়ার বাচ্চাকে স্বাগত জানাবে সবাই। আরামের জায়গা আর বাজনা তৈরি করতে সাহায্য করো।',
    ],
    ending: [
      'The farm is ready: a place for everyone, a cosy coat, a nest and a gentle welcome rhythm.',
      'খামার প্রস্তুত: সবার জায়গা, আরামের কোট, বাসা আর মিষ্টি স্বাগতের তাল।',
    ],
    chapters: [
      chapter(
        'cow',
        ['Follow the breakfast calls', 'সকালের ডাক অনুসরণ'],
        [
          'Cow is calling the neighbours to breakfast. Listen to the real animal calls, then copy the short call order.',
          'গরু প্রতিবেশীদের খেতে ডাকছে। আসল প্রাণীর ডাক শোনো, তারপর ছোট ডাকের ক্রম মেলাও।',
        ],
        [
          'Listen to the call sequence. Tap the animals in the same order.',
          'ডাকের ক্রম শোনো। একই ক্রমে প্রাণীগুলো চাপো।',
        ],
        [
          'Everyone heard the breakfast call! You can recognise farm friends by more than their looks.',
          'সবাই সকালের ডাক শুনেছে! শুধু চেহারা নয়, ডাকেও খামারের বন্ধু চেনা যায়।',
        ],
        1,
        memory('calls', [0, 2, 1, 3], calls),
      ),
      chapter(
        'sheep',
        ['The woolly welcome banner', 'পশমের স্বাগতের পতাকা'],
        [
          'Sheep has loose wool for a pretend welcome banner. Fit the soft tufts together without any scissors.',
          'ভেড়া খেলার স্বাগতের পতাকায় আলগা পশম দেবে। কাঁচি ছাড়াই নরম গোছাগুলো মেলাও।',
        ],
        [
          'Put six wool tufts into their matching spaces.',
          'ছয়টি পশমের গোছা মিলিয়ে জায়গায় বসাও।',
        ],
        [
          'The banner is cosy! Wool is collected when a grown-up farmer shears a sheep.',
          'পতাকা নরম হলো! বড় কৃষক ভেড়ার পশম কাটলে তা সংগ্রহ করা হয়।',
        ],
        0,
        assemble('coat', 6),
      ),
      chapter(
        'chicken',
        ['A nest for the welcome egg', 'স্বাগতের ডিমের বাসা'],
        [
          'Hen wants a snug pretend nest. Bring back the scattered straw pieces and leave room in the middle.',
          'মুরগি খেলার আরামের বাসা চায়। ছড়ানো খড়ের টুকরো বসিয়ে মাঝে জায়গা রাখো।',
        ],
        ['Build the nest by matching five straw pieces.', 'পাঁচটি খড়ের টুকরো মিলিয়ে বাসা বানাও।'],
        [
          'A nest is ready for Hen. A grown-up female chicken is a hen; a male is a rooster.',
          'মুরগির বাসা প্রস্তুত। বড় মেয়ে মুরগি মুরগি-মা, বড় ছেলে মোরগ।',
        ],
        0,
        assemble('nest', 5),
      ),
      chapter(
        'horse',
        ['The welcome hoofbeat', 'স্বাগতের খুরের তাল'],
        [
          'Horse is practising a gentle welcome march. Watch the lit hoof pads, then play back the pattern.',
          'ঘোড়া মিষ্টি স্বাগতের হাঁটার তাল শিখছে। আলোকিত খুরের বোতাম দেখে তাল ফিরিয়ে দাও।',
        ],
        ['Watch, then repeat the four-pad hoofbeat.', 'দেখো, তারপর চার বোতামের খুরের তাল মেলাও।'],
        [
          'The welcome march is ready! A baby horse is called a foal.',
          'স্বাগতের হাঁটার তাল প্রস্তুত! ঘোড়ার বাচ্চাকে ফোল বলে।',
        ],
        2,
        memory('hooves', [0, 1, 2, 3, 0, 2], moves),
      ),
    ],
  },
  animals_jungle: {
    packId: 'animals_jungle',
    title: ['A message across the wild', 'বনের ওপারে বার্তা'],
    opening: [
      'A message needs to cross the wild. Lion knows the tracks, Elephant knows the water, Monkey knows the bridge and Parrot knows the calls.',
      'বনের ওপারে বার্তা পৌঁছাতে হবে। সিংহ পথ, হাতি পানি, বানর সেতু আর তোতা ডাক চেনে।',
    ],
    ending: [
      'The message arrived! Different animal skills helped the team travel together.',
      'বার্তা পৌঁছেছে! আলাদা প্রাণীর দক্ষতায় দল একসঙ্গে এগিয়েছে।',
    ],
    chapters: [
      chapter(
        'lion',
        ['Tracks on the savanna', 'তৃণভূমির পায়ের ছাপ'],
        [
          'Lion’s message trail crosses a grassy plain. Follow the safe tracks and find the three message seals.',
          'তৃণভূমি পেরিয়েছে সিংহের বার্তার পথ। নিরাপদ ছাপ ধরে তিনটি সিল খোঁজো।',
        ],
        [
          'Collect the seals and walk to the flag; avoid the rocky squares.',
          'পাথরের ঘর এড়িয়ে সিলগুলো নিয়ে পতাকায় যাও।',
        ],
        [
          'The tracks lead home. Most lions live on grassy savannas, despite their jungle nickname.',
          'পায়ের ছাপ ঘরে নিল। জঙ্গলের রাজা নাম হলেও বেশির ভাগ সিংহ তৃণভূমিতে থাকে।',
        ],
        0,
        trail('tracks', [12, 2, 10], [7, 8, 14, 16]),
      ),
      chapter(
        'elephant',
        ['A trunkful of water', 'শুঁড়ে করে পানি'],
        [
          'Elephant can help the thirsty message crew. Carry the pretend water through the trunk route to the drinking bowl.',
          'হাতি তৃষ্ণার্ত বার্তাবাহকদের সাহায্য করবে। খেলার পানি শুঁড়ের পথ ধরে পাত্রে নাও।',
        ],
        [
          'Move the water from pool to trunk, then to mouth and bowl.',
          'পুকুর থেকে শুঁড়, তারপর মুখ আর পাত্রে পানি নাও।',
        ],
        [
          'Water delivered! Elephants draw water into their trunks and squirt it into their mouths.',
          'পানি পৌঁছেছে! হাতি শুঁড়ে পানি টেনে মুখে ঢালে।',
        ],
        2,
        route('water', [
          item('pool', 'Pool', 'পুকুর'),
          item('trunk', 'Trunk', 'শুঁড়', 'elephant'),
          item('mouth', 'Mouth', 'মুখ'),
          item('bowl', 'Crew bowl', 'দলের পাত্র'),
        ]),
      ),
      chapter(
        'monkey',
        ['The message bridge', 'বার্তার সেতু'],
        [
          'Monkey found a gap in the pretend trail. Fit the bridge planks so the message bag can cross safely.',
          'খেলার পথে ফাঁক পেয়েছে বানর। সেতুর তক্তা বসিয়ে বার্তার ব্যাগ পার করো।',
        ],
        [
          'Match the six bridge planks to their spaces.',
          'ছয়টি তক্তা মিলিয়ে সেতুর জায়গায় বসাও।',
        ],
        [
          'Bridge complete! Some monkeys can grip with their tails; our bridge is a pretend puzzle.',
          'সেতু তৈরি! কিছু বানর লেজ দিয়ে ধরতে পারে; সেতুটা খেলার ধাঁধা।',
        ],
        2,
        assemble('bridge', 6),
      ),
      chapter(
        'parrot',
        ['Who sent that call?', 'ওই ডাক কে দিল?'],
        [
          'Parrot is checking the last message. Listen to the animal calls and help repeat the message’s sound pattern.',
          'তোতা শেষ বার্তা মিলিয়ে দেখছে। প্রাণীর ডাক শুনে বার্তার শব্দের ক্রম ফিরিয়ে দাও।',
        ],
        [
          'Listen first, then choose the animals in the heard order.',
          'আগে শোনো, তারপর শোনা ক্রমে প্রাণীগুলো বেছে নাও।',
        ],
        [
          'Message received! Parrots can make many sounds; some can copy human words too.',
          'বার্তা পাওয়া গেছে! তোতা অনেক শব্দ করে; কিছু তোতা মানুষের কথাও নকল করে।',
        ],
        2,
        memory(
          'calls',
          [2, 0, 3, 1],
          [
            item('lion', 'Lion', 'সিংহ', 'lion'),
            item('elephant', 'Elephant', 'হাতি', 'elephant'),
            item('parrot', 'Parrot', 'তোতা', 'parrot'),
            item('monkey', 'Monkey', 'বানর', 'monkey'),
          ],
        ),
      ),
    ],
  },
  animals_ocean: {
    packId: 'animals_ocean',
    title: ['The ocean lantern festival', 'সমুদ্রের লণ্ঠন উৎসব'],
    opening: [
      'The ocean friends are preparing a lantern festival. Follow their swimming routes, sounds and cosy gathering places.',
      'সমুদ্রের বন্ধুরা লণ্ঠন উৎসব করবে। সাঁতারের পথ, শব্দ আর আরামের জমায়েতের জায়গায় সাহায্য করো।',
    ],
    ending: [
      'The lantern festival is ready. Air-breathing mammals and a swimming bird all helped!',
      'লণ্ঠন উৎসব প্রস্তুত। বাতাসে শ্বাস নেওয়া স্তন্যপায়ী আর সাঁতারু পাখি সবাই সাহায্য করেছে!',
    ],
    chapters: [
      chapter(
        'dolphin',
        ['A breath before the dive', 'ডুবের আগে শ্বাস'],
        [
          'Dolphin is carrying the first lantern. Visit the surface for air before returning to the underwater meeting place.',
          'ডলফিন প্রথম লণ্ঠন নেবে। পানির নিচে ফেরার আগে ওপরে গিয়ে বাতাস নাও।',
        ],
        [
          'Guide Dolphin through surface air, dive, lantern and surface again.',
          'ডলফিনকে ওপরে বাতাস, ডুব, লণ্ঠন আর আবার ওপরে নাও।',
        ],
        [
          'Dolphin returns for air because it is a mammal, not a fish. No breath-holding needed from you.',
          'ডলফিন মাছ নয়, স্তন্যপায়ী—তাই বাতাস নিতে ফেরে। তোমার শ্বাস আটকে রাখার দরকার নেই।',
        ],
        0,
        route('air', [
          item('surface', 'Surface air', 'ওপরের বাতাস'),
          item('dive', 'Gentle dive', 'ধীরে ডুব'),
          item('lantern', 'Lantern', 'লণ্ঠন'),
          item('air', 'Back for air', 'আবার বাতাস'),
        ]),
      ),
      chapter(
        'whale',
        ['The lantern sound check', 'লণ্ঠনের শব্দ পরীক্ষা'],
        [
          'Whale is testing the festival’s toy sound board. Hear a real whale recording, then copy a short pattern of game tones.',
          'তিমি উৎসবের খেলার শব্দযন্ত্র দেখছে। আসল তিমির শব্দ শুনে খেলার ছোট সুরের ক্রম মেলাও।',
        ],
        [
          'Watch the toy tone pattern and repeat it. These tones are game sounds.',
          'খেলার সুরের ক্রম দেখে মেলাও। এই সুরগুলো খেলার শব্দ।',
        ],
        [
          'Sound check complete! Real humpback whales sing long songs; our little tones are only a memory game.',
          'শব্দ পরীক্ষা শেষ! আসল হাম্পব্যাক তিমি দীর্ঘ গান গায়; ছোট সুরগুলো স্মৃতির খেলা।',
        ],
        1,
        memory(
          'song',
          [0, 2, 1, 3, 2],
          [
            item('low', 'Low', 'নিচু'),
            item('middle', 'Middle', 'মাঝারি'),
            item('high', 'High', 'উঁচু'),
            item('soft', 'Soft', 'নরম'),
          ],
        ),
      ),
      chapter(
        'seal',
        ['Flippers through the current', 'স্রোতে ফ্লিপার'],
        [
          'Seal’s lantern ribbons floated into a current maze. Swim around the rocks, collecting each ribbon before the resting shore.',
          'সিলের লণ্ঠনের ফিতা স্রোতে ভেসেছে। পাথর এড়িয়ে ফিতা নিয়ে বিশ্রামের তীরে সাঁতরাও।',
        ],
        [
          'Collect three ribbons and reach shore at the flag.',
          'তিনটি ফিতা নিয়ে পতাকার তীরে পৌঁছাও।',
        ],
        [
          'Seal reaches shore! Seals swim to hunt but also come onto land or ice to rest.',
          'সিল তীরে পৌঁছেছে! সিল শিকারে সাঁতরে, আবার ডাঙা বা বরফে বিশ্রাম নেয়।',
        ],
        0,
        trail('current', [12, 13, 4], [7, 9, 15, 16]),
      ),
      chapter(
        'penguin',
        ['The feather-light gathering', 'পালকের হালকা জমায়েত'],
        [
          'Penguin’s friends are finding places around the lantern. Arrange the little model birds into a friendly gathering.',
          'পেঙ্গুইনের বন্ধুরা লণ্ঠনের চারপাশে জায়গা খুঁজছে। ছোট মডেল পাখিগুলো সাজাও।',
        ],
        [
          'Match six model birds to the gathering places.',
          'ছয়টি মডেল পাখি জমায়েতের জায়গায় মেলাও।',
        ],
        [
          'Everyone has a place! Penguins are birds with swimming flippers instead of flying wings.',
          'সবার জায়গা হয়েছে! পেঙ্গুইন পাখি, উড়ন্ত ডানার বদলে সাঁতারের ফ্লিপার আছে।',
        ],
        0,
        assemble('huddle', 6),
      ),
    ],
  },
  body: {
    packId: 'body',
    title: ['A delivery inside you', 'শরীরের ভেতরে পৌঁছানো'],
    opening: [
      'A tiny pretend delivery crew has arrived inside a model body. Heart, Lungs, Brain, Stomach and Bone each have a job for you.',
      'মডেল শরীরের ভেতরে ছোট খেলার পৌঁছানোর দল। হৃৎপিণ্ড, ফুসফুস, মগজ, পাকস্থলী আর হাড় সবার তোমার জন্য কাজ আছে।',
    ],
    ending: [
      'The model body works as a team. Air, blood, messages, food and support all have their own journeys.',
      'মডেল শরীর দল হয়ে কাজ করে। বাতাস, রক্ত, বার্তা, খাবার আর কাঠামোর আলাদা যাত্রা আছে।',
    ],
    chapters: [
      chapter(
        'heart',
        ['Captain Heart’s parcel', 'ক্যাপ্টেন ধুকপুকের পার্সেল'],
        [
          'Captain Heart has an oxygen parcel to deliver. It must visit the heart on the outward and return journeys.',
          'ক্যাপ্টেন ধুকপুক অক্সিজেনের পার্সেল পৌঁছাবে। যাওয়া আর ফেরায় হৃৎপিণ্ডে আসতে হবে।',
        ],
        [
          'Carry the parcel: lungs → heart → body → heart → lungs.',
          'পার্সেল নাও: ফুসফুস → হৃৎপিণ্ড → শরীর → হৃৎপিণ্ড → ফুসফুস।',
        ],
        [
          'Delivery complete! The heart pumps blood; the parcel is a simplified model of its work.',
          'পৌঁছানো শেষ! হৃৎপিণ্ড রক্ত চালায়; পার্সেল তার কাজের সহজ মডেল।',
        ],
        1,
        { kind: 'classic', game: 'oxygen' },
      ),
      chapter(
        'lungs',
        ['The air-room doors', 'বাতাসের ঘরের দরজা'],
        [
          'The Lungs twins are opening their model air rooms. Hold to fill the toy balloon, then release to let it empty.',
          'ফুসফুস যমজ মডেলের বাতাসের ঘর খুলছে। চেপে খেলার বেলুন ভরো, ছেড়ে খালি করো।',
        ],
        [
          'Fill and empty the toy twice. Breathe in your own comfortable way.',
          'খেলার বেলুন দুবার ভরো আর খালি করো। নিজের আরাম মতো শ্বাস নাও।',
        ],
        [
          'Air moves in and out. In real lungs, oxygen can move from air into the blood.',
          'বাতাস ঢোকে আর বেরোয়। আসল ফুসফুসে বাতাসের অক্সিজেন রক্তে যেতে পারে।',
        ],
        2,
        { kind: 'hold', mode: 'breathe', milliseconds: 8000 },
      ),
      chapter(
        'brain',
        ['The catch-a-ball message', 'বল ধরার বার্তা'],
        [
          'Brain spotted a rolling ball. Carry a pretend message from the eyes to Brain and on to the hand.',
          'মগজ গড়ানো বল দেখেছে। চোখ থেকে মগজ হয়ে হাতে খেলার বার্তা পৌঁছাও।',
        ],
        [
          'Connect eyes → brain → nerves → hand in order.',
          'চোখ → মগজ → স্নায়ু → হাত ক্রমে যুক্ত করো।',
        ],
        [
          'The hand gets the message! Brain receives information and sends messages that help movement.',
          'হাত বার্তা পেয়েছে! মগজ তথ্য নেয় আর নড়তে সাহায্যের বার্তা পাঠায়।',
        ],
        2,
        route('signal', [
          item('eyes', 'Eyes', 'চোখ'),
          item('brain', 'Brain', 'মগজ', 'brain'),
          item('nerves', 'Nerves', 'স্নায়ু'),
          item('hand', 'Hand', 'হাত'),
        ]),
      ),
      chapter(
        'stomach',
        ['The snack’s winding trip', 'নাশতার আঁকাবাঁকা যাত্রা'],
        [
          'Stomach is waiting for a tiny pretend snack. Move it through the model instead of dropping it straight into the belly.',
          'পাকস্থলী ছোট খেলার নাশতার অপেক্ষায়। সরাসরি পেটে নয়, মডেলের পথ ধরে নাও।',
        ],
        [
          'Carry food through mouth → food pipe → stomach → small intestine.',
          'মুখ → খাদ্যনালি → পাকস্থলী → ক্ষুদ্রান্ত্রে খাবার নাও।',
        ],
        [
          'The snack moved on. Stomach mixes food; most nutrients are absorbed later in the small intestine.',
          'নাশতা এগিয়েছে। পাকস্থলী খাবার মেশায়; পরে ক্ষুদ্রান্ত্রে বেশির ভাগ পুষ্টি শোষিত হয়।',
        ],
        2,
        route('food', [
          item('mouth', 'Mouth', 'মুখ'),
          item('pipe', 'Food pipe', 'খাদ্যনালি'),
          item('stomach', 'Stomach', 'পাকস্থলী', 'stomach'),
          item('intestine', 'Small intestine', 'ক্ষুদ্রান্ত্র'),
        ]),
      ),
      chapter(
        'bone',
        ['Build the support crew', 'কাঠামোর দল বানাও'],
        [
          'Bone’s model support frame is in pieces. Match the bones so the little model can stand tall.',
          'হাড়ের মডেল কাঠামো খুলে গেছে। হাড় মেলাও, ছোট মডেল দাঁড়াবে।',
        ],
        [
          'Fit six marked pieces into the model skeleton.',
          'মডেল কঙ্কালে চিহ্ন মিলিয়ে ছয়টি অংশ বসাও।',
        ],
        [
          'The frame stands! Bones support your body and some help protect important organs.',
          'কাঠামো দাঁড়িয়েছে! হাড় শরীর ধরে আর কিছু গুরুত্বপূর্ণ অঙ্গ রক্ষা করে।',
        ],
        1,
        assemble('skeleton', 6),
      ),
    ],
  },
  food: {
    packId: 'food',
    title: ['The growing garden café', 'বাড়ন্ত বাগানের ক্যাফে'],
    opening: [
      'The garden café is opening for a pretend picnic. The food friends each bring something different to the team.',
      'বাগানের ক্যাফেতে খেলার পিকনিক হবে। খাবার বন্ধুরা দলে আলাদা কিছু নিয়ে আসবে।',
    ],
    ending: [
      'The café is ready. Different foods and water help the body in different ways; this is a learning model, not a portion guide.',
      'ক্যাফে প্রস্তুত। আলাদা খাবার আর পানি শরীরকে আলাদা সাহায্য করে; এটি শেখার মডেল, পরিমাণের নির্দেশ নয়।',
    ],
    chapters: [
      chapter(
        'carrot',
        ['Carrot’s colourful picnic', 'গাজরের রঙিন পিকনিক'],
        [
          'Carrot has a picnic plate and a list from the body crew. Bring each food when its nutrient role is requested.',
          'গাজরের কাছে পিকনিকের থালা আর শরীরের দলের তালিকা। চাওয়া পুষ্টির খাবারটি আনো।',
        ],
        [
          'Follow each nutrient request and drag a matching food onto the plate.',
          'পুষ্টির চাহিদা দেখে খাবার টেনে থালায় রাখো।',
        ],
        [
          'A varied pretend picnic! Carrots provide beta-carotene that the body can use to make vitamin A.',
          'খেলার বৈচিত্র্যময় পিকনিক! গাজরের বিটা-ক্যারোটিন থেকে শরীর ভিটামিন এ বানাতে পারে।',
        ],
        2,
        { kind: 'classic', game: 'picnic' },
      ),
      chapter(
        'milk',
        ['The calcium support bridge', 'ক্যালসিয়ামের কাঠামোর সেতু'],
        [
          'Milk is building a model support bridge beside the café. Fit the pieces while discovering what calcium helps.',
          'দুধ ক্যাফের পাশে মডেলের কাঠামোর সেতু বানাচ্ছে। অংশ বসিয়ে ক্যালসিয়ামের কাজ জানো।',
        ],
        [
          'Fit the six support pieces to finish the pretend bridge.',
          'ছয়টি কাঠামোর অংশ বসিয়ে খেলার সেতু শেষ করো।',
        ],
        [
          'The model bridge is supported! Calcium helps build and maintain bones and teeth; fortified soy can provide it too.',
          'মডেল সেতু মজবুত! ক্যালসিয়াম হাড়-দাঁত গড়ে ও রাখে; পুষ্টিযুক্ত সয়াতেও তা থাকে।',
        ],
        1,
        assemble('bridge', 6),
      ),
      chapter(
        'bean',
        ['Bean’s repair workshop', 'বিনের মেরামতের ঘর'],
        [
          'Bean is helping repair the café’s pretend climbing frame. Put the marked pieces back together.',
          'বিন ক্যাফের খেলার ওঠার কাঠামো মেরামত করছে। চিহ্ন মেলিয়ে অংশ জোড়া লাগাও।',
        ],
        ['Build the model from six matching pieces.', 'ছয়টি অংশ মিলিয়ে মডেল গড়ো।'],
        [
          'Repair complete! Protein helps the body grow and repair tissues; beans are one source.',
          'মেরামত শেষ! প্রোটিন শরীর বাড়ায় আর টিস্যু মেরামতে সাহায্য করে; বিন এক উৎস।',
        ],
        1,
        assemble('skeleton', 6),
      ),
      chapter(
        'rice',
        ['Rice’s energy rhythm', 'ভাতের শক্তির তাল'],
        [
          'Rice is powering the café’s toy dance board. Remember its movement pattern and send the energy round.',
          'ভাত ক্যাফের খেলার নাচের বোর্ডে শক্তি দিচ্ছে। নড়ার তাল মনে রেখে শক্তি চালাও।',
        ],
        [
          'Watch the pattern, then repeat the four movement pads.',
          'তাল দেখে মনে রাখো, তারপর চার বোতামে মেলাও।',
        ],
        [
          'The toy board is moving! Grains provide carbohydrates the body uses for energy.',
          'খেলার বোর্ড চলছে! শস্যের শর্করা শরীর শক্তি হিসেবে ব্যবহার করে।',
        ],
        1,
        memory('energy', [0, 2, 1, 3, 0], moves),
      ),
      chapter(
        'water',
        ['The water delivery line', 'পানির পৌঁছানোর পথ'],
        [
          'Water is the café’s last delivery. Help a drop travel through a simplified body route, then refill the café cup.',
          'পানি ক্যাফের শেষ পৌঁছানো। সহজ শরীরের মডেলে ফোঁটা চালিয়ে ক্যাফের কাপ ভরো।',
        ],
        [
          'Guide the drop through drink, transport, body cells and refill.',
          'পান করা, বহন, শরীরের কোষ আর আবার ভরার পথে ফোঁটা নাও।',
        ],
        [
          'Water delivered! Water helps the body work and helps transport nutrients.',
          'পানি পৌঁছেছে! পানি শরীরের কাজ আর পুষ্টি বহনে সাহায্য করে।',
        ],
        1,
        route('water', [
          item('drink', 'Drink', 'পান করি'),
          item('transport', 'Transport', 'বহন'),
          item('cells', 'Body cells', 'শরীরের কোষ'),
          item('refill', 'Refill', 'আবার ভরি'),
        ]),
      ),
    ],
  },
  exercise: {
    packId: 'exercise',
    title: ['The movement park show', 'নড়াচড়ার পার্কের অনুষ্ঠান'],
    opening: [
      'Coco, Milo and Rumi are preparing a gentle park show. Help with the moves, the teamwork and the quiet ending.',
      'কোকো, মিলো আর রুমি পার্কের মজার অনুষ্ঠান করবে। নড়া, দলের কাজ আর শান্ত শেষে সাহায্য করো।',
    ],
    ending: [
      'The show has movement and recovery. You can enjoy active play in a way that feels comfortable for you.',
      'অনুষ্ঠানে নড়া আর বিশ্রাম দুটোই হলো। নিজের আরাম মতো সক্রিয় খেলা উপভোগ করতে পারো।',
    ],
    chapters: [
      chapter(
        'coach',
        ['Coco’s mirror rehearsal', 'কোকোর আয়না মহড়া'],
        [
          'Coco has a dance to rehearse. Match the shown arm pose with a pad; copy comfortably if you want, seated or standing.',
          'কোকোর নাচের মহড়া। দেখানো হাতের ভঙ্গির বোতাম মেলাও; চাইলে বসে বা দাঁড়িয়ে আরামে করো।',
        ],
        [
          'Match Coco’s eight arm poses. No camera or body tracking is used.',
          'কোকোর আটটি হাতের ভঙ্গি মেলাও। ক্যামেরা বা শরীর মাপা হয় না।',
        ],
        [
          'Rehearsal complete! Active play helps the heart, muscles and bones.',
          'মহড়া শেষ! সক্রিয় খেলা হৃৎপিণ্ড, পেশি আর হাড়কে সাহায্য করে।',
        ],
        0,
        { kind: 'classic', game: 'dance' },
      ),
      chapter(
        'muscle',
        ['Milo’s pull-together pattern', 'মিলোর একসঙ্গে টানার তাল'],
        [
          'Milo is testing the toy movement levers. Copy their pattern and watch different teams take a turn.',
          'মিলো খেলার নড়ার হাতল দেখছে। তাল মেলাও আর আলাদা দলকে কাজ করতে দেখো।',
        ],
        [
          'Watch, then repeat the muscle-team pattern on the four levers.',
          'দেখে চার হাতলে পেশির দলের তাল ফিরিয়ে দাও।',
        ],
        [
          'The teams moved together! Muscles pull to help move the body; many work together.',
          'দলগুলো একসঙ্গে নড়েছে! পেশি টেনে শরীর নড়ায়; অনেক পেশি একসঙ্গে কাজ করে।',
        ],
        0,
        memory('muscle', [0, 1, 0, 1, 2, 3], moves),
      ),
      chapter(
        'rest',
        ['Rumi’s quiet curtain', 'রুমির শান্ত পর্দা'],
        [
          'The pretend show is ending. Help Rumi lower the evening lights by resting the moon in its quiet place.',
          'খেলার অনুষ্ঠান শেষ হচ্ছে। চাঁদকে শান্ত জায়গায় ধরে রুমির সন্ধ্যার আলো কমাও।',
        ],
        [
          'Hold the moon gently while the quiet lights settle. Release to pause.',
          'শান্ত আলোগুলো থামা পর্যন্ত চাঁদ ধরে রাখো। ছেড়ে দিলে বিরতি।',
        ],
        [
          'The park is peaceful. Rest helps recovery after active play, and sleep supports learning and memory.',
          'পার্ক শান্ত। সক্রিয় খেলার পরে বিশ্রাম সেরে উঠতে সাহায্য করে; ঘুম শেখা আর স্মৃতিতে সাহায্য করে।',
        ],
        0,
        { kind: 'hold', mode: 'rest', milliseconds: 8000 },
      ),
    ],
  },
};
export function storyChapter(packId: string, chapterId: string): StoryChapter | undefined {
  return Object.hasOwn(ADVENTURES, packId)
    ? ADVENTURES[packId]?.chapters.find((c) => c.id === chapterId)
    : undefined;
}
