'use client';
import { Actor } from './acting/Actor';
import '../app/auth-companion.css';

const companions = {
  family: {
    id: 'katha',
    en: [
      'Katha',
      'Every great adventure starts with a little imagination.',
      'Your stories, worlds and familiar friends are waiting.',
    ],
    bn: [
      'কথা',
      'একটু কল্পনাতেই শুরু হয় দারুণ অভিযান।',
      'তোমার গল্প, জগৎ আর চেনা বন্ধুরা অপেক্ষায় আছে।',
    ],
  },
  student: {
    id: 'pori',
    en: [
      'Pori',
      'Come curious. Leave with a discovery.',
      'Try an experiment, ask a question, and see what happens.',
    ],
    bn: [
      'পরী',
      'কৌতূহল নিয়ে এসো। নতুন কিছু আবিষ্কার করো।',
      'পরীক্ষা করো, প্রশ্ন করো, আর দেখো কী হয়।',
    ],
  },
  teacher: {
    id: 'onkomama',
    en: [
      'Onko Mama',
      'Bring the lesson to life.',
      'Build a lesson, guide an experiment, and follow your class’s discoveries.',
    ],
    bn: [
      'অঙ্কমামা',
      'পাঠকে করে তোলো প্রাণবন্ত।',
      'পাঠ তৈরি করো, পরীক্ষায় পথ দেখাও, আর শ্রেণির আবিষ্কারের সঙ্গী হও।',
    ],
  },
  operator: {
    id: 'jadukaka',
    en: [
      'Jadu Kaka',
      'Make space for a little wonder.',
      'Look after the schools, stories and worlds that make discovery possible.',
    ],
    bn: [
      'জাদুকাকা',
      'নতুন বিস্ময়ের জন্য জায়গা করে দাও।',
      'বিদ্যালয়, গল্প আর জগতের যত্ন নাও—যেখানে নতুন আবিষ্কার শুরু হয়।',
    ],
  },
} as const;

export function AuthCompanion({
  role,
  language,
}: {
  role: keyof typeof companions;
  language: 'en' | 'bn';
}) {
  const companion = companions[role];
  const [name, heading, description] = companion[language];
  return (
    <aside
      className="auth-companion"
      data-companion={role}
      lang={language === 'bn' ? 'bn-BD' : 'en'}
    >
      <div className="auth-companion-art">
        <svg
          className="char-art"
          viewBox="0 0 100 100"
          role="img"
          aria-label={name}
          focusable="false"
        >
          <Actor id={companion.id} />
        </svg>
      </div>
      <div className="auth-companion-copy">
        <h2>{heading}</h2>
        <p>{description}</p>
      </div>
    </aside>
  );
}
