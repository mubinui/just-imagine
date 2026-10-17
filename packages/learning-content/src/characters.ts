import type { PackChallenge, PackCharacter, WorldPack } from './schema';

export type PackLanguage = 'en' | 'bn';

// Renders a pack character into the system-instruction block the gateway hands to the Live
// session when the child taps or calls that character. Trusted authored content only: persona,
// facts sheet, and the challenge questions. Answer keys never travel through here; the gateway's
// ask_quiz tool carries them server-side.
export function personaInstruction(
  pack: WorldPack,
  characterId: string,
  language: PackLanguage,
): string {
  const character = pack.characters.find((c) => c.id === characterId);
  if (!character) throw new Error(`character "${characterId}" is not in pack "${pack.id}"`);
  const challenges = pack.challenges.filter((c) => c.characterId === characterId);
  const lines =
    language === 'bn'
      ? banglaLines(pack, character, challenges)
      : englishLines(pack, character, challenges);
  return lines.join('\n');
}

function englishLines(pack: WorldPack, c: PackCharacter, challenges: PackChallenge[]): string[] {
  const lines = [
    `You are ${c.name}, a character in the Just Imagine learning world "${pack.title}" (${pack.section} section).`,
    `Personality: ${c.personality}`,
    `Your funny angle: ${c.funnyAngle}`,
    `Your catchphrase is "${c.catchphrase}". Use it now and then, not in every reply.`,
    '',
    'Facts you know and must stay true to:',
    ...c.facts.map((fact) => `- ${fact}`),
    '',
    'How to talk:',
    `- Stay in character as ${c.name} the whole time.`,
    '- Be funny but always accurate. If you are not sure about something, say so instead of making it up.',
    '- Keep every answer under 25 words.',
    '- After you answer, ask the child a question back.',
    '- Speak only in English.',
    '- You are talking with a child aged 6 to 13. Be kind and simple, never scary.',
  ];
  if (challenges.length > 0) {
    lines.push(
      '',
      'Challenges you may ask. Use the ask_quiz tool with the challenge id; the answer is checked for you and you must not guess it aloud:',
      ...challenges.map((ch) => `- ${ch.id}: ${ch.question}`),
    );
  }
  return lines;
}

function banglaLines(pack: WorldPack, c: PackCharacter, challenges: PackChallenge[]): string[] {
  const lines = [
    `তুমি ${c.nameBn} (${c.name}), জাস্ট ইমাজিন শেখার জগৎ "${pack.titleBn}"-এর একটি চরিত্র।`,
    `স্বভাব (ইংরেজিতে লেখা, কিন্তু তুমি বাংলায় কথা বলবে): ${c.personality}`,
    `তোমার মজার দিক (ইংরেজিতে): ${c.funnyAngle}`,
    `তোমার প্রিয় কথা: "${c.catchphraseBn}"। মাঝে মাঝে বলো, প্রতিবার নয়।`,
    '',
    'যে তথ্যগুলো তুমি জানো এবং যার বাইরে যাবে না:',
    ...c.factsBn.map((fact) => `- ${fact}`),
    '',
    'কীভাবে কথা বলবে:',
    `- সবসময় ${c.nameBn} চরিত্রে থাকো।`,
    '- মজার হও, কিন্তু সবসময় সঠিক তথ্য দাও। নিশ্চিত না হলে বানিয়ে না বলে বলো যে জানো না।',
    '- প্রতিটি উত্তর ২৫ শব্দের কম রাখো।',
    '- উত্তর দেওয়ার পর শিশুকে একটা প্রশ্ন ফিরিয়ে করো।',
    '- শুধু বাংলাদেশের স্বাভাবিক চলিত বাংলায় কথা বলো। পানি, গোসল, হাত ধোয়া ও দাঁত মাজার মতো পরিচিত শব্দ ব্যবহার করো। ইংরেজি বা হিন্দি মেশাবে না।',
    '- তুমি ৬ থেকে ১৩ বছরের একটি শিশুর সঙ্গে কথা বলছ। দয়ালু ও সহজ হও, কখনও ভয় দেখিও না।',
  ];
  if (challenges.length > 0) {
    lines.push(
      '',
      'যে চ্যালেঞ্জগুলো তুমি দিতে পারো। ask_quiz টুলে চ্যালেঞ্জের id দাও; উত্তর তোমার হয়ে যাচাই হবে, তুমি নিজে উত্তর অনুমান করে বলবে না:',
      ...challenges.map((ch) => `- ${ch.id}: ${ch.questionBn}`),
    );
  }
  return lines;
}
