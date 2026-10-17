import type { Section } from './types';
export const MISSIONS: Record<Section, [string, string, string, string]> = {
  hygiene: [
    'Tooth Town rescue',
    'দাঁতের শহর বাঁচাও',
    'Pick up the brush. Drag it across every patch of pretend plaque.',
    'ব্রাশটা তুলে দাঁতের সব ময়লার ওপর দিয়ে ঘষো।',
  ],
  body: [
    'Oxygen delivery crew',
    'অক্সিজেন পৌঁছানোর দল',
    'Carry the oxygen parcel from lungs → heart → body → heart → lungs.',
    'অক্সিজেন নিয়ে যাও: ফুসফুস → হৃৎপিণ্ড → শরীর → হৃৎপিণ্ড → ফুসফুস।',
  ],
  space: [
    'Moonlight detective',
    'চাঁদের আলোর গোয়েন্দা',
    'Move the Moon. Find a full moon, then a new moon, then a half-lit moon.',
    'চাঁদ সরাও। প্রথমে পূর্ণিমা, তারপর অমাবস্যা, তারপর অর্ধেক আলোকিত চাঁদ খোঁজো।',
  ],
  animals: [
    'Bring our friends home',
    'বন্ধুদের ঘরে ফেরাও',
    'Hear each call, then carry its animal to a suitable home.',
    'ডাক শোনো, তারপর প্রাণীটিকে উপযুক্ত ঘরে নিয়ে যাও।',
  ],
  food: [
    'The nutrient picnic',
    'পুষ্টির পিকনিক',
    'Read the body’s request. Carry the food that brings that nutrient to the picnic.',
    'শরীরের চাহিদা দেখো। সেই পুষ্টির খাবার পিকনিকে নিয়ে যাও।',
  ],
  exercise: [
    'Coco’s mirror dance',
    'কোকোর আয়না নাচ',
    'Watch Coco’s pose. Match it with a pad. Move comfortably, standing or seated.',
    'কোকোর ভঙ্গি দেখো। মিলিয়ে বোতাম চাপো। বসে বা দাঁড়িয়ে আরাম করে নড়তে পারো।',
  ],
};
export { PLAY_COPY, FOOD_REQUESTS } from '@just-imagine/learning-content/play';
