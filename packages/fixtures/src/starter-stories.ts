import type { StoryManuscript } from '@just-imagine/protocol';

/**
 * Three hand-written starter stories every new explorer finds in the Story room, in English and
 * Bangla. Each scene is illustrated with the app's own painted scene art (paths under apps/web/public),
 * so a story is ready to read the moment the profile exists, with no generation.
 */
export interface StarterStory {
  key: string;
  topic: { en: string; bn: string };
  /** Scene id to a picture served by the web app, relative to its origin. */
  art: Record<string, string>;
  en: StoryManuscript;
  bn: StoryManuscript;
}

const art = (name: string) => `/learn/cinematic/${name}.webp`;

const hummingShell: StarterStory = {
  key: 'humming-shell',
  topic: {
    en: 'A seashell that hums a song from the sea',
    bn: 'একটা ঝিনুক, যে সমুদ্রের গান গুনগুন করে',
  },
  art: {
    pier: art('animals-world-v1'),
    coral: art('animals-ocean-world-v1'),
    bay: art('animals-world-v1'),
  },
  en: {
    title: 'The Humming Seashell',
    synopsis:
      'Bhombol and Mishti find a seashell that hums on the island pier. They follow its song under the waves, learn how sound travels through water, and help a little lost fish find her way home.',
    castDescription:
      'Bhombol is a chubby golden puppy with floppy ears and a tool belt. Mishti is a tiny cream kitten with huge sparkly eyes and a pink bow. Tuni is a little orange fish with blue fins who lives by the coral lanterns.',
    learningGoals: [
      'Sound travels through air, water and solid things',
      'Sound moves faster in water than in air',
      'Listening carefully and staying calm help when someone is lost',
    ],
    scenes: [
      {
        id: 'pier',
        title: 'A Song on the Pier',
        illustration:
          'A wooden pier over a calm turquoise bay in golden morning light, with green islands, a lantern on a post, and a puppy and a kitten leaning over a glowing pink seashell.',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'One sunny morning, Bhombol and Mishti skipped to the very end of the wooden pier. The bay sparkled like a sheet of blue glass.',
            action: 'travel',
            focus: 'the wooden pier',
          },
          {
            text: 'Something pink was tucked between two planks. Mishti picked it up. It was a seashell, and it was humming a soft, happy tune!',
            action: 'discover',
            focus: 'a humming seashell',
          },
          {
            text: 'Bhombol held the shell to his ear. The tune grew louder when he pointed it at the water. "The song is coming from the sea!" he said.',
            action: 'observe',
            focus: 'the song from the sea',
          },
        ],
        discovery: {
          label: 'Sound needs something to travel through',
          explanation:
            'Sound is made of tiny shakes called vibrations. They can travel through air, through water, and even through wood, like the planks of the pier.',
        },
        question: 'How should Bhombol and Mishti follow the song?',
        choices: [
          {
            id: 'dive',
            label: 'Put on bubble helmets and dive in',
            response:
              'Splash! With their bubble helmets on, they sank gently into the clear water, and the song grew stronger.',
            nextAction: 'travel',
          },
          {
            id: 'planks',
            label: 'Lie down and listen through the planks',
            response:
              'They pressed their ears to the wood. The hum buzzed through the planks and pointed straight down into the sea. Time to dive!',
            nextAction: 'observe',
          },
        ],
        lesson: 'Sound can travel through air, through water and through solid things like wood.',
      },
      {
        id: 'coral',
        title: 'The Coral Lanterns',
        illustration:
          'A sunlit underwater garden with glowing shell lanterns, coral arches, sea grass and smooth stones on white sand, with rays of light shining down from the surface.',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'Under the water, everything was quiet and bright. Sunbeams slid down like golden ribbons onto the sand.',
            action: 'travel',
            focus: 'sunbeams in the water',
          },
          {
            text: 'The humming was clearer here. "Sound travels even faster in water than in air," said Mishti, her whiskers tingling.',
            action: 'observe',
            focus: 'sound in the water',
          },
          {
            text: 'Beside the coral lanterns, a tiny orange fish was crying. "I am Tuni. I swam too far, and now I cannot find my reef!"',
            action: 'help',
            focus: 'Tuni the lost fish',
          },
        ],
        discovery: {
          label: 'Sound is fast in water',
          explanation:
            'Sound travels about four times faster in water than in air. That is why whales and dolphins can call to friends who are far away.',
        },
        question: 'How can they help Tuni find her reef?',
        choices: [
          {
            id: 'call',
            label: 'Use the humming shell to call her family',
            response:
              'Mishti held up the shell. Its song rang through the water, and far away, a chorus of little fish hummed back!',
            nextAction: 'help',
          },
          {
            id: 'lanterns',
            label: 'Follow the lantern trail along the sand',
            response:
              'They swam from lantern to lantern. Each glowing light pointed the way, and soon they heard Tuni’s family singing.',
            nextAction: 'travel',
          },
        ],
        lesson:
          'When someone is lost, staying calm and listening for clues helps everyone find the way.',
      },
      {
        id: 'bay',
        title: 'Back to the Bay',
        illustration:
          'The calm turquoise bay from the pier again, now in bright midday light, with a puppy and a kitten in bubble helmets waving from the water and a pink seashell glowing in a paw.',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'Tuni’s family swirled around her in a happy, wiggly circle. "Thank you!" they bubbled. "That shell was our reef’s song all along."',
            action: 'celebrate',
            focus: 'Tuni’s family',
          },
          {
            text: 'Tuni pushed the shell back to Bhombol. "Keep it," she said. "Whenever you hold it to your ear, you will hear the sea saying hello."',
            action: 'help',
            focus: 'a gift from the sea',
          },
          {
            text: 'Bhombol and Mishti floated up into the warm sunshine, right beside the pier, smiling from ear to ear.',
            action: 'travel',
            focus: 'back to the bay',
          },
        ],
        discovery: {
          label: 'Animals use sound to stay together',
          explanation:
            'Many sea animals, like fish, dolphins and whales, use sounds to find their families and friends in the big blue sea.',
        },
        question: 'What should Bhombol and Mishti do with the shell?',
        choices: [
          {
            id: 'keep',
            label: 'Keep it safe on their windowsill',
            response:
              'Every night, the shell hummed a soft sea song, and they fell asleep dreaming of Tuni’s reef.',
            nextAction: 'celebrate',
          },
          {
            id: 'share',
            label: 'Let their friends listen too',
            response:
              'One by one, their friends held the shell and smiled. "The sea is singing to us!" they whispered.',
            nextAction: 'help',
          },
        ],
        lesson: 'Sharing what we discover makes the wonder bigger.',
      },
    ],
    ending:
      'And whenever the bay is calm and quiet, if you listen very carefully, you might hear a tiny reef humming hello.',
  },
  bn: {
    title: 'গুনগুন ঝিনুক',
    synopsis:
      'দ্বীপের কাঠের ঘাটে ভোম্বল আর মিষ্টি এমন একটা ঝিনুক পায়, যে গুনগুন করে গান গায়। গানের পিছু নিয়ে ওরা ঢেউয়ের নিচে যায়, শেখে পানির ভেতর দিয়ে শব্দ কীভাবে চলে, আর হারিয়ে যাওয়া ছোট্ট এক মাছকে বাড়ি ফিরতে সাহায্য করে।',
    castDescription:
      'ভোম্বল একটা গোলগাল সোনালি কুকুরছানা, কান ঝোলা, কোমরে যন্ত্রপাতির বেল্ট। মিষ্টি একটা ছোট্ট ক্রিম রঙের বিড়ালছানা, চোখ ঝকঝকে বড় বড়, মাথায় গোলাপি ফিতা। টুনি নীল পাখনার ছোট্ট এক কমলা মাছ, প্রবাল-লণ্ঠনের পাশে থাকে।',
    learningGoals: [
      'শব্দ বাতাস, পানি আর শক্ত জিনিসের ভেতর দিয়ে চলতে পারে',
      'বাতাসের চেয়ে পানিতে শব্দ দ্রুত চলে',
      'কেউ হারিয়ে গেলে শান্ত থেকে মন দিয়ে শুনলে পথ খুঁজে পাওয়া যায়',
    ],
    scenes: [
      {
        id: 'pier',
        title: 'ঘাটে একটা গান',
        illustration:
          'সকালের সোনালি আলোয় শান্ত নীলচে-সবুজ উপসাগরের ওপর কাঠের ঘাট, দূরে সবুজ দ্বীপ, খুঁটিতে একটা লণ্ঠন, আর একটা কুকুরছানা ও একটা বিড়ালছানা ঝুঁকে একটা জ্বলজ্বলে গোলাপি ঝিনুক দেখছে।',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'এক রোদেলা সকালে ভোম্বল আর মিষ্টি লাফাতে লাফাতে কাঠের ঘাটের একেবারে শেষ মাথায় গেল। উপসাগরের পানি ঝিকমিক করছিল নীল কাচের মতো।',
            action: 'travel',
            focus: 'কাঠের ঘাট',
          },
          {
            text: 'দুটো তক্তার ফাঁকে গোলাপি কী যেন আটকে ছিল। মিষ্টি সেটা তুলে নিল। একটা ঝিনুক, আর সেটা আস্তে আস্তে খুশির সুরে গুনগুন করছে!',
            action: 'discover',
            focus: 'গুনগুন করা ঝিনুক',
          },
          {
            text: 'ভোম্বল ঝিনুকটা কানে ধরল। পানির দিকে তাক করতেই সুরটা আরও জোরে শোনা গেল। "গানটা আসছে সমুদ্র থেকে!" বলল ভোম্বল।',
            action: 'observe',
            focus: 'সমুদ্রের গান',
          },
        ],
        discovery: {
          label: 'শব্দ চলতে কিছু একটা লাগে',
          explanation:
            'শব্দ আসলে খুব ছোট ছোট কাঁপুনি, যাকে বলে কম্পন। এই কম্পন বাতাসের ভেতর দিয়ে, পানির ভেতর দিয়ে, এমনকি ঘাটের তক্তার মতো কাঠের ভেতর দিয়েও চলতে পারে।',
        },
        question: 'ভোম্বল আর মিষ্টি কীভাবে গানের পিছু নেবে?',
        choices: [
          {
            id: 'dive',
            label: 'বুদবুদ-হেলমেট পরে পানিতে ডুব দেবে',
            response:
              'ঝপাৎ! বুদবুদ-হেলমেট পরে ওরা ধীরে ধীরে স্বচ্ছ পানিতে নেমে গেল, আর গানটা আরও জোরালো হয়ে উঠল।',
            nextAction: 'travel',
          },
          {
            id: 'planks',
            label: 'শুয়ে পড়ে তক্তায় কান পেতে শুনবে',
            response:
              'ওরা কাঠে কান চেপে ধরল। গুনগুন শব্দটা তক্তার ভেতর দিয়ে কাঁপতে কাঁপতে সোজা নিচে সমুদ্রের দিকে দেখাল। এবার ডুব দেওয়ার পালা!',
            nextAction: 'observe',
          },
        ],
        lesson: 'শব্দ বাতাস, পানি আর কাঠের মতো শক্ত জিনিসের ভেতর দিয়েও চলতে পারে।',
      },
      {
        id: 'coral',
        title: 'প্রবাল-লণ্ঠনের বাগান',
        illustration:
          'রোদে ঝলমলে পানির নিচের বাগান, জ্বলজ্বলে ঝিনুক-লণ্ঠন, প্রবালের খিলান, সামুদ্রিক ঘাস আর সাদা বালুর ওপর মসৃণ পাথর, ওপর থেকে আলোর রেখা নেমে আসছে।',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'পানির নিচে সবকিছু চুপচাপ আর ঝলমলে। রোদের আলো সোনালি ফিতার মতো পিছলে নেমে আসছিল বালুর ওপর।',
            action: 'travel',
            focus: 'পানির ভেতর রোদের আলো',
          },
          {
            text: 'এখানে গুনগুনটা আরও পরিষ্কার। "বাতাসের চেয়ে পানিতে শব্দ আরও দ্রুত চলে," বলল মিষ্টি, ওর গোঁফ শিরশির করছিল।',
            action: 'observe',
            focus: 'পানির ভেতর শব্দ',
          },
          {
            text: 'প্রবাল-লণ্ঠনের পাশে ছোট্ট একটা কমলা মাছ কাঁদছিল। "আমি টুনি। অনেক দূরে সাঁতরে চলে এসেছি, এখন আমার প্রবালপ্রাচীর খুঁজে পাচ্ছি না!"',
            action: 'help',
            focus: 'হারিয়ে যাওয়া টুনি',
          },
        ],
        discovery: {
          label: 'পানিতে শব্দ দ্রুত চলে',
          explanation:
            'বাতাসের চেয়ে পানিতে শব্দ প্রায় চার গুণ দ্রুত চলে। তাই তিমি আর ডলফিন অনেক দূরের বন্ধুকেও ডাকতে পারে।',
        },
        question: 'টুনিকে ওর প্রবালপ্রাচীর খুঁজে পেতে ওরা কীভাবে সাহায্য করবে?',
        choices: [
          {
            id: 'call',
            label: 'গুনগুন ঝিনুক দিয়ে ওর পরিবারকে ডাকবে',
            response:
              'মিষ্টি ঝিনুকটা উঁচু করে ধরল। ওর গান পানির ভেতর ছড়িয়ে পড়ল, আর অনেক দূর থেকে ছোট ছোট মাছেরা একসাথে গুনগুন করে সাড়া দিল!',
            nextAction: 'help',
          },
          {
            id: 'lanterns',
            label: 'বালুর ওপর লণ্ঠনের সারি ধরে এগোবে',
            response:
              'ওরা এক লণ্ঠন থেকে আরেক লণ্ঠনে সাঁতরে গেল। প্রতিটা আলো পথ দেখাল, আর একটু পরেই টুনির পরিবারের গান শোনা গেল।',
            nextAction: 'travel',
          },
        ],
        lesson: 'কেউ হারিয়ে গেলে শান্ত থেকে মন দিয়ে চিহ্ন খুঁজলে সবাই পথ খুঁজে পায়।',
      },
      {
        id: 'bay',
        title: 'আবার উপসাগরে',
        illustration:
          'ঘাট থেকে দেখা সেই শান্ত নীলচে-সবুজ উপসাগর, এখন দুপুরের উজ্জ্বল আলোয়; বুদবুদ-হেলমেট পরা কুকুরছানা আর বিড়ালছানা পানি থেকে হাত নাড়ছে, একজনের থাবায় জ্বলজ্বলে গোলাপি ঝিনুক।',
        atmosphere: 'ocean',
        beats: [
          {
            text: 'টুনির পরিবার খুশিতে ওকে ঘিরে ঘুরপাক খেতে লাগল। "ধন্যবাদ!" বুদবুদ ছেড়ে বলল ওরা। "ওই ঝিনুকটা তো আমাদের প্রবালপ্রাচীরেরই গান ছিল!"',
            action: 'celebrate',
            focus: 'টুনির পরিবার',
          },
          {
            text: 'টুনি ঝিনুকটা ভোম্বলের দিকে ঠেলে দিল। "এটা তুমি রেখে দাও," বলল টুনি। "যখনই কানে ধরবে, শুনবে সমুদ্র তোমাকে হ্যালো বলছে।"',
            action: 'help',
            focus: 'সমুদ্রের উপহার',
          },
          {
            text: 'ভোম্বল আর মিষ্টি ভাসতে ভাসতে উঠে এল উষ্ণ রোদে, ঠিক ঘাটের পাশে, দুজনের মুখেই কান পর্যন্ত হাসি।',
            action: 'travel',
            focus: 'আবার উপসাগরে',
          },
        ],
        discovery: {
          label: 'প্রাণীরা শব্দ দিয়ে একসাথে থাকে',
          explanation:
            'মাছ, ডলফিন আর তিমির মতো অনেক সামুদ্রিক প্রাণী বিশাল নীল সমুদ্রে শব্দ দিয়ে নিজের পরিবার আর বন্ধুদের খুঁজে পায়।',
        },
        question: 'ঝিনুকটা নিয়ে ভোম্বল আর মিষ্টি কী করবে?',
        choices: [
          {
            id: 'keep',
            label: 'জানালার ধারে যত্ন করে রেখে দেবে',
            response:
              'প্রতি রাতে ঝিনুকটা আস্তে আস্তে সমুদ্রের গান গাইত, আর ওরা টুনির প্রবালপ্রাচীরের স্বপ্ন দেখতে দেখতে ঘুমিয়ে পড়ত।',
            nextAction: 'celebrate',
          },
          {
            id: 'share',
            label: 'বন্ধুদেরও শুনতে দেবে',
            response:
              'একজন একজন করে বন্ধুরা ঝিনুকটা কানে ধরল আর হাসল। "সমুদ্র আমাদের গান শোনাচ্ছে!" ফিসফিস করে বলল ওরা।',
            nextAction: 'help',
          },
        ],
        lesson: 'যা আবিষ্কার করি তা ভাগ করে নিলে মুগ্ধতা আরও বেড়ে যায়।',
      },
    ],
    ending:
      'আর যখনই উপসাগর শান্ত আর চুপচাপ থাকে, খুব মন দিয়ে শুনলে হয়তো তুমিও শুনতে পাবে, ছোট্ট এক প্রবালপ্রাচীর গুনগুন করে হ্যালো বলছে।',
  },
};

const darkStar: StarterStory = {
  key: 'star-afraid-of-dark',
  topic: {
    en: 'A little star who is afraid of the dark',
    bn: 'অন্ধকারকে ভয় পায় এমন এক ছোট্ট তারা',
  },
  art: {
    observatory: art('space-world-v1'),
    meadow: art('animals-farm-world-v1'),
    clearing: art('exercise-world-v1'),
  },
  en: {
    title: 'The Star Who Was Afraid of the Dark',
    synopsis:
      'A little star named Tara tumbles into the hilltop observatory. Bhombol and Mishti help her find her way back to the sky and discover why stars shine brightest in the dark.',
    castDescription:
      'Bhombol is a chubby golden puppy with floppy ears and a tool belt. Mishti is a tiny cream kitten with huge sparkly eyes and a pink bow. Tara is a little five-pointed star with a soft golden glow and a sleepy smile.',
    learningGoals: [
      'Stars are giant suns that are very far away',
      'Stars are in the sky all day; sunlight hides them',
      'Patterns of stars are called constellations',
    ],
    scenes: [
      {
        id: 'observatory',
        title: 'A Visitor in the Observatory',
        illustration:
          'A grand open-air observatory on a hilltop at twilight, with a brass telescope, glowing lanterns, a starry purple sky full of planets, and a tiny golden star lying on the marble floor.',
        atmosphere: 'cosmos',
        beats: [
          {
            text: 'High on a hill stood an observatory full of telescopes. Bhombol and Mishti were polishing the biggest one when — plink! — something tiny and bright tumbled onto the floor.',
            action: 'discover',
            focus: 'something tiny and bright',
          },
          {
            text: 'It was a little star with a sleepy smile. "I am Tara," she yawned. "I fell out of the sky, and now the day is so bright that I cannot see my home at all!"',
            action: 'observe',
            focus: 'Tara the little star',
          },
        ],
        discovery: {
          label: 'Stars are suns far away',
          explanation:
            'Every star is a giant ball of glowing gas, like our Sun. Stars look tiny only because they are very, very far away from us.',
        },
        question: 'How can they help Tara?',
        choices: [
          {
            id: 'telescope',
            label: 'Look for her home through the telescope',
            response:
              'They peered through the telescope, but the daytime sky looked blue and empty. "The stars are still there," said Mishti. "The Sun is just too bright for us to see them."',
            nextAction: 'observe',
          },
          {
            id: 'wait',
            label: 'Wait together until evening',
            response:
              '"Let us wait for the dark," said Bhombol. "That is when stars shine brightest." Tara shivered. She was a little afraid of the dark.',
            nextAction: 'help',
          },
        ],
        lesson: 'Stars are in the sky all day long; sunlight is so bright that it hides them.',
      },
      {
        id: 'meadow',
        title: 'The Sunset Meadow',
        illustration:
          'A wide green farm meadow at sunset with a red barn, a wooden fence and soft pink and orange clouds over the hills, as a puppy and a kitten carry a tiny glowing star.',
        atmosphere: 'village',
        beats: [
          {
            text: 'They carried Tara down to the farm meadow. The Sun slid behind the hills and painted the clouds pink and orange.',
            action: 'travel',
            focus: 'the setting Sun',
          },
          {
            text: '"I am scared," whispered Tara. "The dark is so big." Mishti held her gently. "The dark is not empty," she said. "It is where your light belongs."',
            action: 'help',
            focus: 'a gentle hug',
          },
          {
            text: 'As the sky turned deep blue, Tara began to glow brighter and brighter, like a lantern waking up.',
            action: 'observe',
            focus: 'Tara glowing brighter',
          },
        ],
        discovery: {
          label: 'Light shows best in the dark',
          explanation:
            'A torch looks dim in sunshine but bright at night. Stars work the same way: the darker the sky, the more stars we can see.',
        },
        question: 'Where can they see the stars best?',
        choices: [
          {
            id: 'clearing',
            label: 'Walk to a clearing away from the farm lights',
            response:
              'They tiptoed past the barn to a quiet clearing in the forest. With no bright lamps nearby, the sky looked even darker.',
            nextAction: 'travel',
          },
          {
            id: 'lamps',
            label: 'Dim the lanterns around them',
            response:
              'One by one, they dimmed the lanterns. The night grew dark and soft, and the first stars blinked awake above them.',
            nextAction: 'observe',
          },
        ],
        lesson: 'Bright lights on the ground make it harder to see the stars above.',
      },
      {
        id: 'clearing',
        title: 'The Night Clearing',
        illustration:
          'A forest clearing ringed by tall trees and treehouses with little lanterns, a wooden stage in the middle, and a puppy and a kitten gently tossing a glowing star up toward the night sky.',
        atmosphere: 'forest',
        beats: [
          {
            text: 'Above the clearing, the sky was full of stars. One empty space sat right in the middle of a star pattern shaped like a kite.',
            action: 'observe',
            focus: 'a star pattern like a kite',
          },
          {
            text: '"That is my place!" cheered Tara. She was not scared anymore. "The dark is not scary," she laughed. "It is what makes me shine!"',
            action: 'celebrate',
            focus: 'Tara’s place in the sky',
          },
          {
            text: 'Bhombol and Mishti counted to three and gave her a gentle toss. Tara soared up, clicked into her place and glowed her brightest glow.',
            action: 'help',
            focus: 'a gentle toss to the sky',
          },
        ],
        discovery: {
          label: 'Star patterns are called constellations',
          explanation:
            'Long ago, people joined stars with pretend lines to make pictures in the sky. These pictures, called constellations, helped travellers find their way at night.',
        },
        question: 'How should they say goodbye to Tara?',
        choices: [
          {
            id: 'wave',
            label: 'Wave and promise to visit every clear night',
            response:
              '"See you tomorrow night!" they called. High above, Tara twinkled twice, which is how stars say yes.',
            nextAction: 'celebrate',
          },
          {
            id: 'name',
            label: 'Give her star pattern a new name',
            response:
              '"Let us call it the Kite of Friends," said Mishti. Tara sparkled so brightly that the whole kite seemed to fly.',
            nextAction: 'celebrate',
          },
        ],
        lesson: 'Feeling afraid is normal; understanding something often makes it less scary.',
      },
    ],
    ending:
      'Now, on clear nights, Bhombol and Mishti look up for the Kite of Friends. Right in the middle, one little star always twinkles back.',
  },
  bn: {
    title: 'অন্ধকারকে ভয় পাওয়া তারা',
    synopsis:
      'তারা নামের এক ছোট্ট তারা গড়িয়ে পড়ে পাহাড়ের চূড়ার মানমন্দিরে। ভোম্বল আর মিষ্টি ওকে আকাশে ফিরে যেতে সাহায্য করে, আর জানতে পারে অন্ধকারে তারারা কেন সবচেয়ে উজ্জ্বল জ্বলে।',
    castDescription:
      'ভোম্বল একটা গোলগাল সোনালি কুকুরছানা, কান ঝোলা, কোমরে যন্ত্রপাতির বেল্ট। মিষ্টি একটা ছোট্ট ক্রিম রঙের বিড়ালছানা, চোখ ঝকঝকে বড় বড়, মাথায় গোলাপি ফিতা। তারা পাঁচ কোনার এক ছোট্ট তারা, নরম সোনালি আলো আর ঘুমঘুম হাসি।',
    learningGoals: [
      'তারারা আসলে অনেক অনেক দূরের বিশাল সূর্য',
      'তারারা সারা দিনই আকাশে থাকে; সূর্যের আলো ওদের ঢেকে রাখে',
      'তারাদের সাজানো নকশাকে বলে তারামণ্ডল',
    ],
    scenes: [
      {
        id: 'observatory',
        title: 'মানমন্দিরে এক অতিথি',
        illustration:
          'গোধূলিতে পাহাড়ের চূড়ায় খোলা আকাশের নিচে বড় এক মানমন্দির, পিতলের দূরবিন, জ্বলজ্বলে লণ্ঠন, গ্রহে ভরা তারাভরা বেগুনি আকাশ, আর মার্বেলের মেঝেতে পড়ে আছে ছোট্ট এক সোনালি তারা।',
        atmosphere: 'cosmos',
        beats: [
          {
            text: 'পাহাড়ের চূড়ায় দাঁড়িয়ে ছিল দূরবিনে ভরা এক মানমন্দির। ভোম্বল আর মিষ্টি সবচেয়ে বড় দূরবিনটা মুছে চকচকে করছিল, এমন সময় — টুং! — ছোট্ট উজ্জ্বল কী যেন গড়িয়ে পড়ল মেঝেতে।',
            action: 'discover',
            focus: 'ছোট্ট উজ্জ্বল কিছু',
          },
          {
            text: 'ঘুমঘুম হাসির এক ছোট্ট তারা। "আমি তারা," হাই তুলে বলল সে। "আমি আকাশ থেকে পড়ে গেছি, আর এখন দিনটা এত উজ্জ্বল যে আমার বাড়িটা একদমই দেখতে পাচ্ছি না!"',
            action: 'observe',
            focus: 'ছোট্ট তারা',
          },
        ],
        discovery: {
          label: 'তারারা অনেক দূরের সূর্য',
          explanation:
            'প্রতিটা তারা আমাদের সূর্যের মতোই জ্বলন্ত গ্যাসের বিশাল এক গোলা। আমাদের থেকে অনেক অনেক দূরে বলেই ওদের এত ছোট দেখায়।',
        },
        question: 'তারাকে ওরা কীভাবে সাহায্য করবে?',
        choices: [
          {
            id: 'telescope',
            label: 'দূরবিন দিয়ে ওর বাড়ি খুঁজবে',
            response:
              'ওরা দূরবিনে চোখ রাখল, কিন্তু দিনের আকাশ নীল আর ফাঁকা। "তারারা কিন্তু এখনো ওখানেই আছে," বলল মিষ্টি। "সূর্যের আলো এত উজ্জ্বল যে আমরা ওদের দেখতে পাই না।"',
            nextAction: 'observe',
          },
          {
            id: 'wait',
            label: 'সন্ধ্যা পর্যন্ত একসাথে অপেক্ষা করবে',
            response:
              '"চলো অন্ধকারের জন্য অপেক্ষা করি," বলল ভোম্বল। "তখনই তারারা সবচেয়ে উজ্জ্বল জ্বলে।" তারা একটু কেঁপে উঠল। অন্ধকারকে ওর একটু ভয় লাগত।',
            nextAction: 'help',
          },
        ],
        lesson: 'তারারা সারা দিনই আকাশে থাকে; সূর্যের আলো এত উজ্জ্বল যে ওদের ঢেকে দেয়।',
      },
      {
        id: 'meadow',
        title: 'সূর্য ডোবার মাঠ',
        illustration:
          'সূর্য ডোবার সময় খামারের বিশাল সবুজ মাঠ, লাল গোলাঘর, কাঠের বেড়া, পাহাড়ের ওপর নরম গোলাপি আর কমলা মেঘ; একটা কুকুরছানা আর একটা বিড়ালছানা জ্বলজ্বলে ছোট্ট এক তারা নিয়ে যাচ্ছে।',
        atmosphere: 'village',
        beats: [
          {
            text: 'ওরা তারাকে নিয়ে খামারের মাঠে নেমে এল। সূর্য পাহাড়ের পেছনে পিছলে গেল, আর মেঘগুলোকে গোলাপি আর কমলা রঙে রাঙিয়ে দিল।',
            action: 'travel',
            focus: 'ডুবন্ত সূর্য',
          },
          {
            text: '"আমার ভয় করছে," ফিসফিস করে বলল তারা। "অন্ধকারটা যে অনেক বড়।" মিষ্টি ওকে আলতো করে জড়িয়ে ধরল। "অন্ধকার ফাঁকা নয়," বলল সে। "ওখানেই তো তোমার আলোর জায়গা।"',
            action: 'help',
            focus: 'আলতো জড়িয়ে ধরা',
          },
          {
            text: 'আকাশ যত গাঢ় নীল হলো, তারা ততই উজ্জ্বল হয়ে জ্বলতে লাগল, যেন ঘুম ভেঙে জেগে ওঠা এক লণ্ঠন।',
            action: 'observe',
            focus: 'আরও উজ্জ্বল তারা',
          },
        ],
        discovery: {
          label: 'অন্ধকারেই আলো সবচেয়ে ভালো দেখা যায়',
          explanation:
            'রোদের মধ্যে টর্চের আলো ম্লান দেখায়, কিন্তু রাতে উজ্জ্বল। তারারাও তেমনই: আকাশ যত অন্ধকার, তত বেশি তারা দেখা যায়।',
        },
        question: 'কোথায় গেলে তারাদের সবচেয়ে ভালো দেখা যাবে?',
        choices: [
          {
            id: 'clearing',
            label: 'খামারের আলো থেকে দূরে বনের ফাঁকা জায়গায় যাবে',
            response:
              'ওরা পা টিপে টিপে গোলাঘর পেরিয়ে বনের মধ্যে এক নিরিবিলি ফাঁকা জায়গায় গেল। কাছে কোনো উজ্জ্বল বাতি নেই, তাই আকাশ আরও অন্ধকার দেখাল।',
            nextAction: 'travel',
          },
          {
            id: 'lamps',
            label: 'চারপাশের লণ্ঠনগুলো কমিয়ে দেবে',
            response:
              'একটা একটা করে ওরা লণ্ঠনগুলো কমিয়ে দিল। রাত হয়ে উঠল অন্ধকার আর কোমল, আর মাথার ওপর প্রথম তারাগুলো চোখ মেলে জেগে উঠল।',
            nextAction: 'observe',
          },
        ],
        lesson: 'মাটির উজ্জ্বল আলো ওপরের তারাদের দেখা কঠিন করে দেয়।',
      },
      {
        id: 'clearing',
        title: 'রাতের বনের ফাঁকা জায়গা',
        illustration:
          'লম্বা গাছ আর ছোট ছোট লণ্ঠন ঝোলানো গাছবাড়িতে ঘেরা বনের এক ফাঁকা জায়গা, মাঝখানে কাঠের মঞ্চ; একটা কুকুরছানা আর একটা বিড়ালছানা জ্বলজ্বলে এক তারাকে আলতো করে রাতের আকাশে ছুড়ে দিচ্ছে।',
        atmosphere: 'forest',
        beats: [
          {
            text: 'ফাঁকা জায়গার ওপরের আকাশ ভরা তারায়। ঘুড়ির মতো দেখতে এক তারার নকশার ঠিক মাঝখানে একটা জায়গা ফাঁকা পড়ে ছিল।',
            action: 'observe',
            focus: 'ঘুড়ির মতো তারার নকশা',
          },
          {
            text: '"ওটাই আমার জায়গা!" খুশিতে চেঁচিয়ে উঠল তারা। ওর আর একটুও ভয় নেই। "অন্ধকার মোটেও ভয়ের না," হেসে বলল সে। "অন্ধকারই তো আমাকে জ্বলতে দেয়!"',
            action: 'celebrate',
            focus: 'আকাশে তারার জায়গা',
          },
          {
            text: 'ভোম্বল আর মিষ্টি এক, দুই, তিন গুনে ওকে আলতো করে ছুড়ে দিল। তারা উড়ে গিয়ে টুক করে নিজের জায়গায় বসে গেল, আর জ্বলে উঠল সবচেয়ে উজ্জ্বল আলোয়।',
            action: 'help',
            focus: 'আকাশে আলতো করে ছুড়ে দেওয়া',
          },
        ],
        discovery: {
          label: 'তারার নকশাকে বলে তারামণ্ডল',
          explanation:
            'অনেক অনেক আগে মানুষ কাল্পনিক রেখা দিয়ে তারাদের জুড়ে আকাশে ছবি বানাত। এই ছবিগুলোকে বলে তারামণ্ডল, রাতে পথিকরা এগুলো দেখে পথ খুঁজে পেত।',
        },
        question: 'তারাকে ওরা কীভাবে বিদায় জানাবে?',
        choices: [
          {
            id: 'wave',
            label: 'হাত নেড়ে কথা দেবে, প্রতি পরিষ্কার রাতে দেখা করবে',
            response:
              '"কাল রাতে আবার দেখা হবে!" ডেকে বলল ওরা। অনেক ওপরে তারা দুবার ঝিকমিক করল, তারারা এভাবেই হ্যাঁ বলে।',
            nextAction: 'celebrate',
          },
          {
            id: 'name',
            label: 'ওর তারার নকশার একটা নতুন নাম দেবে',
            response:
              '"চলো এর নাম দিই বন্ধুদের ঘুড়ি," বলল মিষ্টি। তারা এত উজ্জ্বল ঝিকমিক করল যে পুরো ঘুড়িটাই যেন উড়তে লাগল।',
            nextAction: 'celebrate',
          },
        ],
        lesson: 'ভয় পাওয়া স্বাভাবিক; কোনো কিছু বুঝতে পারলে প্রায়ই ভয় কমে যায়।',
      },
    ],
    ending:
      'এখন পরিষ্কার রাতে ভোম্বল আর মিষ্টি আকাশে বন্ধুদের ঘুড়ি খোঁজে। ঠিক মাঝখানে একটা ছোট্ট তারা সবসময় ঝিকমিক করে সাড়া দেয়।',
  },
};

const littleSeed: StarterStory = {
  key: 'little-seed',
  topic: {
    en: 'A tiny seed who wants to grow into a big plant',
    bn: 'একটা ছোট্ট বীজ, যে বড় গাছ হতে চায়',
  },
  art: {
    garden: art('food-world-v1'),
    path: art('animals-jungle-world-v1'),
    harvest: art('food-world-v1'),
  },
  en: {
    title: 'The Seed Who Wanted to Grow',
    synopsis:
      'Bhombol and Mishti meet Bini, a tiny bean seed who dreams of becoming a big plant. Together they find out what seeds need, how leaves make food from sunlight, and how one plant makes many new seeds.',
    castDescription:
      'Bhombol is a chubby golden puppy with floppy ears and a tool belt. Mishti is a tiny cream kitten with huge sparkly eyes and a pink bow. Bini is a little brown bean seed with a round face and a curious smile.',
    learningGoals: [
      'Seeds need soil, water and warmth to grow',
      'Leaves use sunlight to make food for the plant',
      'Plants make new seeds, and the life cycle starts again',
    ],
    scenes: [
      {
        id: 'garden',
        title: 'The Garden Table',
        illustration:
          'A sunny vegetable garden with a wooden table in front, a watering can, carrots, flowers and pots, a glasshouse and an apple tree behind, and a tiny brown seed rolling across the table.',
        atmosphere: 'garden',
        beats: [
          {
            text: 'In the sunny garden, Bhombol and Mishti spotted a little brown seed rolling across the wooden table.',
            action: 'discover',
            focus: 'a little brown seed',
          },
          {
            text: '"Hello," squeaked the seed. "I am Bini. I want to grow into a big bean plant, but I do not know how!"',
            action: 'observe',
            focus: 'Bini the seed',
          },
        ],
        discovery: {
          label: 'A seed is a sleeping baby plant',
          explanation:
            'Inside every seed is a tiny baby plant and a packed lunch of food. When the seed gets what it needs, it wakes up and starts to grow.',
        },
        question: 'What does Bini need first?',
        choices: [
          {
            id: 'soil',
            label: 'A cosy bed of soil',
            response:
              'They tucked Bini into a pot of soft, dark soil. "Ahh," sighed Bini. "It is warm and snug in here."',
            nextAction: 'build',
          },
          {
            id: 'water',
            label: 'A cool drink of water',
            response:
              'Mishti tipped the watering can. Drip, drop! Bini soaked up the water and felt a tickle deep inside.',
            nextAction: 'help',
          },
        ],
        lesson: 'Seeds need soil, water and warmth to start growing.',
      },
      {
        id: 'path',
        title: 'The Sunny Path',
        illustration:
          'A bright forest path beside a little stream, with tall green trees, ferns, smooth rocks and warm sunlight, and a puppy carrying a flower pot with a small green sprout.',
        atmosphere: 'forest',
        beats: [
          {
            text: 'Days passed. Bini sent a tiny root down into the soil, like a little anchor holding on tight.',
            action: 'observe',
            focus: 'a tiny root',
          },
          {
            text: 'Then a green shoot poked up and wiggled. "I need sunshine!" called Bini. Bhombol carried the pot along the sunny path by the stream.',
            action: 'travel',
            focus: 'a green shoot',
          },
          {
            text: 'In the warm light, two little leaves opened like hands catching the sunshine.',
            action: 'discover',
            focus: 'two little leaves',
          },
        ],
        discovery: {
          label: 'Leaves make food from sunlight',
          explanation:
            'Leaves use sunlight, air and water to make food for the plant. This is called photosynthesis, a big word for plant cooking!',
        },
        question: 'Bini’s leaves are drooping. What should they do?',
        choices: [
          {
            id: 'stream',
            label: 'Give Bini water from the stream',
            response:
              'Bhombol scooped cool water from the stream. Soon Bini’s leaves stood up straight again, shining green.',
            nextAction: 'help',
          },
          {
            id: 'shade',
            label: 'Find a spot with sun and a little shade',
            response:
              'They found a spot where the sunlight was gentle. Bini stretched happily, not too hot and not too cold.',
            nextAction: 'observe',
          },
        ],
        lesson:
          'Plants need the right amount of sun and water, just like we need the right amount of food and rest.',
      },
      {
        id: 'harvest',
        title: 'The Big Bean Plant',
        illustration:
          'The same sunny garden weeks later, with a tall bean plant climbing a wooden stick beside the table, green pods hanging among the leaves, and a kitten holding an open pod full of shiny seeds.',
        atmosphere: 'garden',
        beats: [
          {
            text: 'Weeks later, Bini had grown into a tall bean plant, climbing up a stick and waving in the breeze.',
            action: 'celebrate',
            focus: 'a tall bean plant',
          },
          {
            text: 'Green pods hung among the leaves. Mishti opened one, and inside were five shiny new seeds!',
            action: 'discover',
            focus: 'new seeds in a pod',
          },
          {
            text: '"Those are my seed babies," said Bini proudly. "Plant them, and they will grow too!"',
            action: 'help',
            focus: 'planting new seeds',
          },
        ],
        discovery: {
          label: 'Plants make new seeds',
          explanation:
            'When a plant grows up, it makes flowers and then fruits or pods with seeds inside. Each new seed can grow into a new plant, and the circle starts again.',
        },
        question: 'What should they do with the new seeds?',
        choices: [
          {
            id: 'row',
            label: 'Plant a whole row in the garden',
            response:
              'They planted a neat row of seeds and watered each one. "Grow, little beans!" they cheered.',
            nextAction: 'build',
          },
          {
            id: 'friends',
            label: 'Give seeds to their friends to plant',
            response:
              'They gave a seed to every friend. Soon gardens all over the village were sprouting little bean plants.',
            nextAction: 'help',
          },
        ],
        lesson: 'Living things grow, change and make new life; that is called the life cycle.',
      },
    ],
    ending:
      'And every spring, when the first green shoots poke up in the garden, Bini’s family waves hello in the breeze.',
  },
  bn: {
    title: 'যে বীজ বড় হতে চাইল',
    synopsis:
      'ভোম্বল আর মিষ্টির সাথে দেখা হয় বিনির, এক ছোট্ট শিমের বীজ, যে বড় গাছ হওয়ার স্বপ্ন দেখে। একসাথে ওরা জানতে পারে বীজের কী কী লাগে, পাতা কীভাবে সূর্যের আলো দিয়ে খাবার বানায়, আর একটা গাছ থেকে কীভাবে অনেক নতুন বীজ হয়।',
    castDescription:
      'ভোম্বল একটা গোলগাল সোনালি কুকুরছানা, কান ঝোলা, কোমরে যন্ত্রপাতির বেল্ট। মিষ্টি একটা ছোট্ট ক্রিম রঙের বিড়ালছানা, চোখ ঝকঝকে বড় বড়, মাথায় গোলাপি ফিতা। বিনি গোল মুখ আর কৌতূহলী হাসির এক ছোট্ট বাদামি শিমের বীজ।',
    learningGoals: [
      'বীজ বড় হতে মাটি, পানি আর উষ্ণতা লাগে',
      'পাতা সূর্যের আলো দিয়ে গাছের খাবার বানায়',
      'গাছ নতুন বীজ তৈরি করে, আর জীবনচক্র আবার শুরু হয়',
    ],
    scenes: [
      {
        id: 'garden',
        title: 'বাগানের টেবিল',
        illustration:
          'রোদেলা সবজির বাগান, সামনে কাঠের টেবিল, পানি দেওয়ার ঝাঁঝরি, গাজর, ফুল আর টব, পেছনে কাচের ঘর আর আপেল গাছ, আর টেবিলের ওপর দিয়ে গড়িয়ে যাচ্ছে ছোট্ট এক বাদামি বীজ।',
        atmosphere: 'garden',
        beats: [
          {
            text: 'রোদেলা বাগানে ভোম্বল আর মিষ্টি দেখল, ছোট্ট এক বাদামি বীজ কাঠের টেবিলের ওপর দিয়ে গড়িয়ে যাচ্ছে।',
            action: 'discover',
            focus: 'ছোট্ট বাদামি বীজ',
          },
          {
            text: '"হ্যালো," চিঁচিঁ করে বলল বীজটা। "আমি বিনি। আমি বড় একটা শিম গাছ হতে চাই, কিন্তু কীভাবে হব জানি না!"',
            action: 'observe',
            focus: 'বীজ বিনি',
          },
        ],
        discovery: {
          label: 'বীজ হলো ঘুমিয়ে থাকা ছোট্ট গাছ',
          explanation:
            'প্রতিটা বীজের ভেতরে থাকে ছোট্ট একটা শিশু-গাছ আর ওর জন্য গুছিয়ে রাখা খাবার। দরকারি জিনিসগুলো পেলে বীজ জেগে উঠে বড় হতে শুরু করে।',
        },
        question: 'বিনির সবার আগে কী দরকার?',
        choices: [
          {
            id: 'soil',
            label: 'নরম মাটির আরামের বিছানা',
            response:
              'ওরা বিনিকে নরম কালো মাটির একটা টবে শুইয়ে দিল। "আহ্‌," বলল বিনি। "এখানে কী উষ্ণ আর আরাম!"',
            nextAction: 'build',
          },
          {
            id: 'water',
            label: 'এক চুমুক ঠান্ডা পানি',
            response:
              'মিষ্টি ঝাঁঝরিটা কাত করল। টুপ, টাপ! বিনি পানি শুষে নিল, আর ভেতরে কেমন যেন সুড়সুড়ি লাগল।',
            nextAction: 'help',
          },
        ],
        lesson: 'বীজ বড় হতে শুরু করতে মাটি, পানি আর উষ্ণতা লাগে।',
      },
      {
        id: 'path',
        title: 'রোদেলা পথ',
        illustration:
          'ছোট্ট এক ঝরনার পাশে উজ্জ্বল বনের পথ, লম্বা সবুজ গাছ, ফার্ন, মসৃণ পাথর আর উষ্ণ রোদ; একটা কুকুরছানা ছোট্ট সবুজ চারাসহ একটা ফুলের টব নিয়ে যাচ্ছে।',
        atmosphere: 'forest',
        beats: [
          {
            text: 'দিন গেল। বিনি মাটির ভেতর ছোট্ট একটা শিকড় নামিয়ে দিল, যেন শক্ত করে ধরে রাখা এক ছোট্ট নোঙর।',
            action: 'observe',
            focus: 'ছোট্ট শিকড়',
          },
          {
            text: 'তারপর একটা সবুজ ডগা উঁকি দিয়ে নড়েচড়ে উঠল। "আমার রোদ চাই!" ডেকে বলল বিনি। ভোম্বল টবটা নিয়ে ঝরনার পাশের রোদেলা পথ ধরে হাঁটল।',
            action: 'travel',
            focus: 'সবুজ ডগা',
          },
          {
            text: 'উষ্ণ আলোয় দুটো ছোট্ট পাতা খুলে গেল, যেন দুটো হাত রোদ ধরছে।',
            action: 'discover',
            focus: 'দুটো ছোট্ট পাতা',
          },
        ],
        discovery: {
          label: 'পাতা সূর্যের আলো দিয়ে খাবার বানায়',
          explanation:
            'পাতা সূর্যের আলো, বাতাস আর পানি দিয়ে গাছের জন্য খাবার বানায়। একে বলে সালোকসংশ্লেষণ, মানে গাছের রান্নাবান্না!',
        },
        question: 'বিনির পাতাগুলো নুয়ে পড়েছে। ওরা কী করবে?',
        choices: [
          {
            id: 'stream',
            label: 'ঝরনা থেকে বিনিকে পানি দেবে',
            response:
              'ভোম্বল ঝরনা থেকে ঠান্ডা পানি তুলে আনল। একটু পরেই বিনির পাতাগুলো আবার সোজা হয়ে দাঁড়াল, ঝকঝকে সবুজ।',
            nextAction: 'help',
          },
          {
            id: 'shade',
            label: 'রোদ আর একটু ছায়া আছে এমন জায়গা খুঁজবে',
            response:
              'ওরা এমন একটা জায়গা খুঁজে পেল যেখানে রোদ নরম। বিনি খুশিতে আড়মোড়া ভাঙল, খুব গরমও না, খুব ঠান্ডাও না।',
            nextAction: 'observe',
          },
        ],
        lesson:
          'গাছের ঠিক পরিমাণ রোদ আর পানি লাগে, ঠিক যেমন আমাদের ঠিক পরিমাণ খাবার আর বিশ্রাম লাগে।',
      },
      {
        id: 'harvest',
        title: 'বড় শিম গাছ',
        illustration:
          'কয়েক সপ্তাহ পরের সেই রোদেলা বাগান, টেবিলের পাশে কাঠের লাঠি বেয়ে উঠেছে লম্বা শিম গাছ, পাতার ফাঁকে ঝুলছে সবুজ শিম, আর একটা বিড়ালছানার হাতে ঝকঝকে বীজভরা খোলা একটা শিম।',
        atmosphere: 'garden',
        beats: [
          {
            text: 'কয়েক সপ্তাহ পর বিনি হয়ে গেল লম্বা এক শিম গাছ, একটা লাঠি বেয়ে উঠে বাতাসে দুলছে।',
            action: 'celebrate',
            focus: 'লম্বা শিম গাছ',
          },
          {
            text: 'পাতার ফাঁকে ঝুলছিল সবুজ শিম। মিষ্টি একটা খুলল, আর ভেতরে পাঁচটা ঝকঝকে নতুন বীজ!',
            action: 'discover',
            focus: 'শিমের ভেতর নতুন বীজ',
          },
          {
            text: '"ওরা আমার ছোট্ট বীজ-বাচ্চারা," গর্ব করে বলল বিনি। "ওদের লাগাও, ওরাও বড় হবে!"',
            action: 'help',
            focus: 'নতুন বীজ লাগানো',
          },
        ],
        discovery: {
          label: 'গাছ নতুন বীজ বানায়',
          explanation:
            'গাছ বড় হলে ফুল ফোটে, তারপর ফল বা শিম হয়, যার ভেতরে থাকে বীজ। প্রতিটা নতুন বীজ থেকে নতুন গাছ হতে পারে, আর চক্রটা আবার শুরু হয়।',
        },
        question: 'নতুন বীজগুলো দিয়ে ওরা কী করবে?',
        choices: [
          {
            id: 'row',
            label: 'বাগানে পুরো এক সারি লাগাবে',
            response:
              'ওরা সুন্দর করে এক সারি বীজ লাগাল আর প্রতিটায় পানি দিল। "বড় হও, ছোট্ট শিমেরা!" খুশিতে বলল ওরা।',
            nextAction: 'build',
          },
          {
            id: 'friends',
            label: 'বন্ধুদের লাগানোর জন্য বীজ দেবে',
            response:
              'ওরা প্রত্যেক বন্ধুকে একটা করে বীজ দিল। কিছুদিন পরেই গ্রামের সব বাগানে ছোট্ট ছোট্ট শিম গাছ গজিয়ে উঠল।',
            nextAction: 'help',
          },
        ],
        lesson: 'জীবন্ত জিনিস বড় হয়, বদলায় আর নতুন জীবন তৈরি করে; একে বলে জীবনচক্র।',
      },
    ],
    ending:
      'আর প্রতি বসন্তে বাগানে যখন প্রথম সবুজ ডগা উঁকি দেয়, বিনির পরিবার বাতাসে দুলে দুলে হ্যালো বলে।',
  },
};

export const STARTER_STORIES: readonly StarterStory[] = [hummingShell, darkStar, littleSeed];
