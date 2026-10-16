import type { CharacterId } from './characters';
export const SPECIALISTS: Record<
  CharacterId,
  {
    role: [string, string];
    ability: [string, string];
    making: [string, string];
    file: string;
    row: number;
  }
> = {
  mishti: {
    role: ['World artist', 'জগতের শিল্পী'],
    ability: [
      'I sketch your characters, colours and places. You choose what belongs in your world.',
      'তোমার চরিত্র, রং আর জায়গা আঁকি। তোমার জগতে কী থাকবে, তুমি ঠিক করো।',
    ],
    making: ['Sketching your world', 'তোমার জগত আঁকছি'],
    file: 'specialist-pets',
    row: 0,
  },
  bhombol: {
    role: ['Inventor & builder', 'উদ্ভাবক ও নির্মাতা'],
    ability: [
      'I put your ideas together: moving machines, game rules and things you can play with.',
      'তোমার ভাবনা দিয়ে চলন্ত যন্ত্র, খেলার নিয়ম আর খেলার জিনিস বানাই।',
    ],
    making: ['Putting the pieces together', 'টুকরোগুলো জুড়ছি'],
    file: 'specialist-pets',
    row: 1,
  },
  chandni: {
    role: ['Space explorer', 'মহাকাশ অভিযাত্রী'],
    ability: [
      'I investigate planets, patterns and curious questions. Let’s find out together.',
      'গ্রহ, নকশা আর কৌতূহলী প্রশ্ন খুঁজি। চলো একসঙ্গে জানি।',
    ],
    making: ['Checking the discoveries', 'আবিষ্কারগুলো দেখছি'],
    file: 'specialist-pets',
    row: 2,
  },
  pori: {
    role: ['Physics explorer', 'পদার্থের অভিযাত্রী'],
    ability: [
      'I try ramps, forces and floating. We can test what happens, then change it.',
      'ঢাল, বল আর ভেসে থাকা নিয়ে পরীক্ষা করি। কী হয় দেখে আবার বদলাতে পারি।',
    ],
    making: ['Testing how things move', 'কীভাবে চলে, দেখছি'],
    file: 'specialist-guides',
    row: 0,
  },
  onkomama: {
    role: ['Pattern & maths maker', 'অঙ্ক ও নকশার কারিগর'],
    ability: [
      'I build with shapes, numbers and patterns. We can count, compare and invent.',
      'আকার, সংখ্যা আর নকশা দিয়ে বানাই। গুনি, তুলনা করি, নতুন কিছু ভাবি।',
    ],
    making: ['Fitting shapes and patterns', 'আকার আর নকশা মেলাচ্ছি'],
    file: 'specialist-guides',
    row: 1,
  },
  jadukaka: {
    role: ['Wonder & experiment guide', 'বিস্ময় ও পরীক্ষার বন্ধু'],
    ability: [
      'I turn surprises into safe experiments. My magic is pretend; our discoveries are real.',
      'চমক থেকে নিরাপদ পরীক্ষা করি। জাদুটা কল্পনা, আবিষ্কারটা সত্যি।',
    ],
    making: ['Trying a little experiment', 'ছোট্ট পরীক্ষা করছি'],
    file: 'specialist-guides',
    row: 2,
  },
};
