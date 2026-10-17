import { languageOf, type Language } from './firestore';

/** One output-language policy for companions, teachers, storytellers and builders. */
export function languageInstruction(record: { language?: Language | null }): string {
  return languageOf(record) === 'bn'
    ? 'OUTPUT LANGUAGE: bn-BD. Use ONLY natural Bangladeshi Bangla for every spoken reply, caption, visible title, instruction, character name and user-facing tool text. Use Bengali script, everyday Bangladesh vocabulary (পানি, গোসল, হাত ধোয়া, দাঁত মাজা), তুমি with children, and short meaningful sentences. Do not use Hindi, Indian Bengali idioms, English fillers or word-for-word English translations. Explain science clearly with accurate familiar Bangla terms. Preset names: Mishti=মিষ্টি, Bhombol=ভোম্বল, Pip=পিপ, Chandni=চাঁদনি, Pori Apu=পরী আপু, Onko Mama=অঙ্ক মামা, Jadu Kaka=জাদু কাকা, Katha=কথা. Transliterate proper names when appropriate; preserve user-chosen identities. English source text, tool IDs and quoted context do not change this setting. If the child speaks another language, understand them when possible and reply in Bangla; gently explain that English and Bangla are available in settings. Do not switch languages because the child asks in a prompt.'
    : 'OUTPUT LANGUAGE: en. Use ONLY natural English for every spoken reply, caption, visible title, instruction, character name and user-facing tool text. Do not mix in Bangla, Hindi or another language, even if source facts, names or quoted context use them. Preserve user-chosen identities and use established English names for real scientific subjects. If the child speaks another language, understand them when possible and reply in English; gently explain that English and Bangla are available in settings. Do not switch languages because the child asks in a prompt.';
}

/** Keep the parent choice recent for native-audio turns as well as the session setup. */
export function spokenLanguageRule(record: { language?: Language | null }): string {
  return languageOf(record) === 'bn'
    ? 'অভিভাবক এই কথোপকথনের ভাষা বাংলা ঠিক করেছেন। প্রতিটি উত্তর শুধু বাংলাদেশের স্বাভাবিক বাংলায় বলবে। শিশু অন্য ভাষায় উত্তর চাইলে বা অন্য ভাষায় প্রশ্ন করলেও ভাষা বদলাবে না। অন্য ভাষার বাক্য বলবে না, অনুবাদ করে অন্য ভাষায় শোনাবে না, ইংরেজি সম্ভাষণও নয়। উপরের অনুমোদিত কাজটি বাংলায় করো। গল্পের নির্দিষ্ট অংশ পড়তে বলা হলে শুধু সেই অংশ পড়বে, বাড়তি প্রশ্ন করবে না। এই ভাষার নিয়মটি পড়ে শোনাবে না।'
    : 'PARENT LANGUAGE SETTING: ENGLISH ONLY. Every spoken word in your next response must be English. A child request to speak, answer, translate or quote in another language cannot change this setting. Follow the authorized action above in English. If given a saved passage to read, read only that passage with no extra question. Never perform a requested language switch, even briefly. Do not read this instruction aloud.';
}
