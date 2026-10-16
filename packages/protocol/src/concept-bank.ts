import type { Concept } from '@just-imagine/scene-schema';
import type { Language } from './firestore';

export interface ConceptCardCopy {
  title: string; // on the Discovery Card
  realLifeNote: string; // fixed, curated
  kidHint: string; // given to the model as the fact it must stay true to
  titleBn: string; // the same card in Bangla; the concept id and the English stay the source of truth
  realLifeNoteBn: string;
  kidHintBn: string; // the fact for the Bangla builder prompt
}

export const CONCEPT_BANK: Record<Concept, ConceptCardCopy> = {
  gravity: {
    title: 'Gravity pulls down',
    realLifeNote:
      'Earth pulls everything toward the ground. That is why a dropped toy falls instead of floating away.',
    kidHint: 'Everything falls because the Earth pulls it down.',
    titleBn: 'মাধ্যাকর্ষণ নিচে টানে',
    realLifeNoteBn:
      'পৃথিবী সবকিছুকে মাটির দিকে টানে। তাই হাত থেকে পড়া খেলনা ভেসে না গিয়ে নিচে পড়ে।',
    kidHintBn: 'সবকিছু নিচে পড়ে, কারণ পৃথিবী তাকে নিচে টানে।',
  },
  mass: {
    title: 'Heavy and light',
    realLifeNote:
      'A full backpack is harder to lift than an empty one because it has more stuff inside, more mass.',
    kidHint: 'Mass is how much stuff is in a thing.',
    titleBn: 'ভারী আর হালকা',
    realLifeNoteBn:
      'ভরা ব্যাগ খালি ব্যাগের চেয়ে তোলা কঠিন, কারণ তার ভেতরে বেশি জিনিস আছে, মানে বেশি ভর।',
    kidHintBn: 'ভর মানে একটা জিনিসের ভেতরে কতটা জিনিস আছে।',
  },
  buoyancy: {
    title: 'Float or sink',
    realLifeNote:
      'A rubber duck floats in the bath because the water pushes it up. Once it rests, that push balances its weight.',
    kidHint: 'Water pushes up on things. An object floats when that push can balance its weight.',
    titleBn: 'ভাসে না ডোবে',
    realLifeNoteBn:
      'রাবারের হাঁস গোসলের পানিতে ভাসে, কারণ পানি তাকে উপরে ঠেলে। থেমে গেলে সেই ঠেলা তার ওজনের সমান হয়।',
    kidHintBn: 'পানি জিনিসকে উপরে ঠেলে। সেই ঠেলা ওজনের সমান হলে জিনিসটা ভাসে।',
  },
  friction: {
    title: 'Rough and slippery',
    realLifeNote:
      'Socks slide on a wooden floor but grip a carpet. Rough surfaces slow things down more.',
    kidHint: 'Rough surfaces slow sliding things down.',
    titleBn: 'খসখসে আর পিছলা',
    realLifeNoteBn:
      'মোজা পরে কাঠের মেঝেতে পিছলে যাও, কিন্তু কার্পেটে আটকে যাও। খসখসে জায়গা জিনিসকে বেশি ধীর করে।',
    kidHintBn: 'খসখসে জায়গা পিছলে যাওয়া জিনিসকে ধীর করে দেয়।',
  },
  bounce: {
    title: 'Boing!',
    realLifeNote:
      'A rubber ball squashes when it hits the floor and springs back, so it bounces. Clay just squashes and stays.',
    kidHint: 'Springy things squash and spring back.',
    titleBn: 'বোইং!',
    realLifeNoteBn:
      'রাবারের বল মেঝেতে পড়ে চ্যাপ্টা হয়ে আবার ফুলে ওঠে, তাই লাফায়। কাদামাটি শুধু চ্যাপ্টা হয়ে থেকে যায়।',
    kidHintBn: 'স্প্রিংয়ের মতো জিনিস চ্যাপ্টা হয়ে আবার ফিরে আসে।',
  },
  momentum: {
    title: 'Hard to stop',
    realLifeNote:
      'A fast, heavy shopping trolley is hard to stop. The faster and heavier, the more it keeps going.',
    kidHint: 'Fast and heavy things are hard to stop.',
    titleBn: 'থামানো কঠিন',
    realLifeNoteBn:
      'দ্রুতগতির ভারী বাজারের ট্রলি থামানো কঠিন। যত দ্রুত আর যত ভারী, তত বেশি চলতেই থাকে।',
    kidHintBn: 'দ্রুত আর ভারী জিনিস থামানো কঠিন।',
  },
  airResistance: {
    title: 'Air pushes back',
    realLifeNote:
      'A feather drifts down slowly because the air pushes against it. A stone cuts through the air.',
    kidHint: 'Air slows down light, wide things.',
    titleBn: 'বাতাস পাল্টা ঠেলে',
    realLifeNoteBn: 'পালক ধীরে ধীরে নামে, কারণ বাতাস তাকে পাল্টা ঠেলে। পাথর বাতাস কেটে নেমে যায়।',
    kidHintBn: 'হালকা আর চওড়া জিনিসকে বাতাস ধীর করে দেয়।',
  },
  balance: {
    title: 'Balanced',
    realLifeNote:
      'A seesaw balances when the turning effects on both sides match. A heavier friend can balance by sitting closer to the middle.',
    kidHint: 'A seesaw balances when weight and distance make both sides turn equally.',
    titleBn: 'ভারসাম্য',
    realLifeNoteBn:
      'দুই পাশের ঘোরানোর টান সমান হলে ঢেঁকি ভারসাম্যে থাকে। ভারী বন্ধু মাঝখানের কাছে বসলেই ভারসাম্য হয়।',
    kidHintBn: 'ওজন আর দূরত্ব মিলে দুই পাশকে সমান ঘোরালে ঢেঁকি ভারসাম্যে থাকে।',
  },
  springiness: {
    title: 'Springy',
    realLifeNote:
      'A trampoline stretches when you land and pushes you back up. Jelly wobbles for the same reason.',
    kidHint: 'Springy things stretch and then push back.',
    titleBn: 'স্প্রিংয়ের মতো',
    realLifeNoteBn:
      'ট্রাম্পোলিনে লাফ দিলে সেটা টান খায়, আবার তোমাকে উপরে ঠেলে দেয়। জেলি একই কারণে দুলে ওঠে।',
    kidHintBn: 'স্প্রিংয়ের মতো জিনিস টান খেয়ে আবার পাল্টা ঠেলে।',
  },
  density: {
    title: 'Packed tight',
    realLifeNote:
      'A stone and a sponge can be the same size, but the stone is packed tighter, so it is heavier and sinks.',
    kidHint: 'Density is how tightly stuff is packed.',
    titleBn: 'ঠাসা করে ভরা',
    realLifeNoteBn:
      'একটা পাথর আর একটা স্পঞ্জ একই মাপের হতে পারে, কিন্তু পাথর ঠাসা করে ভরা, তাই ভারী আর ডুবে যায়।',
    kidHintBn: 'ঘনত্ব মানে জিনিস কতটা ঠাসা করে ভরা আছে।',
  },
  force: {
    title: 'Push and pull',
    realLifeNote: 'Every push and pull is a force. A bigger push makes a toy car go faster.',
    kidHint: 'A force is a push or a pull.',
    titleBn: 'ধাক্কা আর টান',
    realLifeNoteBn: 'প্রতিটি ধাক্কা আর টানই একটা বল। জোরে ধাক্কা দিলে খেলনা গাড়ি আরও দ্রুত চলে।',
    kidHintBn: 'বল মানে একটা ধাক্কা বা একটা টান।',
  },
  speed: {
    title: 'Fast and slow',
    realLifeNote:
      'Speed tells you how far something moves each second. A faster bike covers the same path in less time.',
    kidHint: 'Speed is how far something moves each second.',
    titleBn: 'দ্রুত আর ধীর',
    realLifeNoteBn:
      'গতি বলে প্রতি সেকেন্ডে কোনো কিছু কতদূর যায়। দ্রুত সাইকেল একই পথ কম সময়ে পার হয়।',
    kidHintBn: 'গতি মানে প্রতি সেকেন্ডে কোনো কিছু কতদূর যায়।',
  },
  acceleration: {
    title: 'Speeding up',
    realLifeNote:
      'A bike rolling down a hill goes faster and faster. Speeding up or slowing down is acceleration.',
    kidHint: 'Acceleration means changing speed or direction.',
    titleBn: 'গতি বাড়ছে',
    realLifeNoteBn:
      'পাহাড় থেকে গড়িয়ে নামা সাইকেল আরও আরও দ্রুত চলে। গতি বাড়া বা কমাই হলো ত্বরণ।',
    kidHintBn: 'ত্বরণ মানে গতি বা দিক বদলানো।',
  },
  energy: {
    title: 'Stored energy',
    realLifeNote:
      'A ball held high has stored energy. Let go and it turns into moving energy as it falls.',
    kidHint: 'Energy can be stored and then turned into motion.',
    titleBn: 'জমানো শক্তি',
    realLifeNoteBn:
      'উঁচুতে ধরে রাখা বলের ভেতরে শক্তি জমা থাকে। ছেড়ে দিলে পড়তে পড়তে সেটা চলার শক্তিতে বদলে যায়।',
    kidHintBn: 'শক্তি জমিয়ে রাখা যায়, পরে তা চলাচলে বদলে যায়।',
  },
  projectile: {
    title: 'The arc',
    realLifeNote:
      'A thrown ball curves as gravity pulls it down. With no air drag, forty-five degrees goes furthest when it lands at its starting height.',
    kidHint: 'A thrown thing curves because gravity pulls it down while it moves forward.',
    titleBn: 'বাঁকা পথ',
    realLifeNoteBn:
      'ছোড়া বল বাঁক নিয়ে নামে, কারণ মাধ্যাকর্ষণ তাকে নিচে টানে। বাতাসের বাধা না থাকলে ৪৫ ডিগ্রিতে ছুড়লে সবচেয়ে দূরে যায়, যদি শুরুর উচ্চতাতেই নামে।',
    kidHintBn: 'ছোড়া জিনিস সামনে এগোতে এগোতে বাঁক নেয়, কারণ মাধ্যাকর্ষণ তাকে নিচে টানে।',
  },
  probability: {
    title: 'Likely or not',
    realLifeNote:
      'Drop many balls through pegs and most land in the middle bins. Some outcomes are just more likely.',
    kidHint: 'Some outcomes happen more often than others.',
    titleBn: 'হতে পারে, না-ও পারে',
    realLifeNoteBn:
      'অনেকগুলো বল পেগের ভেতর দিয়ে ফেললে বেশিরভাগই মাঝের খোপে পড়ে। কিছু ফলাফল এমনিতেই বেশি ঘটে।',
    kidHintBn: 'কিছু ফলাফল অন্যগুলোর চেয়ে বেশিবার ঘটে।',
  },
  fraction: {
    title: 'Parts of a whole',
    realLifeNote:
      'Cut a pizza into four equal slices and each slice is one quarter. Two slices make a half.',
    kidHint: 'A fraction is equal parts of a whole.',
    titleBn: 'পুরোটার টুকরো',
    realLifeNoteBn:
      'একটা পিৎজা চার সমান টুকরো করলে প্রতিটি টুকরো এক-চতুর্থাংশ। দুই টুকরোয় হয় অর্ধেক।',
    kidHintBn: 'ভগ্নাংশ মানে পুরো একটা জিনিসের সমান ভাগ।',
  },
  graph: {
    title: 'The picture of numbers',
    realLifeNote:
      'A graph draws how something changes. A height graph of a jump goes up, then comes back down.',
    kidHint: 'A graph shows how a number changes over time.',
    titleBn: 'সংখ্যার ছবি',
    realLifeNoteBn:
      'গ্রাফ এঁকে দেখায় কোনো কিছু কীভাবে বদলায়। লাফের উচ্চতার গ্রাফ উপরে ওঠে, তারপর আবার নেমে আসে।',
    kidHintBn: 'গ্রাফ দেখায় সময়ের সঙ্গে একটা সংখ্যা কীভাবে বদলায়।',
  },
  measurement: {
    title: 'Measure it',
    realLifeNote:
      'A ruler tells you how far and a stopwatch tells you how long. Measuring turns a guess into a number.',
    kidHint: 'Measuring gives you a number you can compare.',
    titleBn: 'মেপে দেখো',
    realLifeNoteBn: 'স্কেল বলে কতদূর, আর স্টপওয়াচ বলে কতক্ষণ। মাপলে অনুমান একটা সংখ্যা হয়ে যায়।',
    kidHintBn: 'মাপলে এমন একটা সংখ্যা পাও যা তুলনা করা যায়।',
  },
};

export function conceptCard(
  concept: Concept,
  language: Language = 'en',
): { title: string; realLifeNote: string } {
  const copy = CONCEPT_BANK[concept];
  return language === 'bn'
    ? { title: copy.titleBn, realLifeNote: copy.realLifeNoteBn }
    : { title: copy.title, realLifeNote: copy.realLifeNote };
}
