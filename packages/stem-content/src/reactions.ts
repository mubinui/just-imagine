import { ReactionSchema, type Reaction } from '@just-imagine/stem-sims';

const CLEAR = '#eaf3f5';
const WHITE_PPT = '#f5f5f5';
const PALE_GREEN = '#cfe3c8';
const COPPER = '#b5651d';
const rx = (reaction: Reaction): Reaction => ReactionSchema.parse(reaction);
const n = (en: string, bn: string) => ({ en, bn });

const water = { formula: 'H2O', state: 'l' as const, name: n('Water', 'পানি') };
const hydrogen = {
  formula: 'H2',
  state: 'g' as const,
  name: n('Hydrogen gas', 'হাইড্রোজেন গ্যাস'),
};
const carbonDioxide = {
  formula: 'CO2',
  state: 'g' as const,
  name: n('Carbon dioxide gas', 'কার্বন ডাইঅক্সাইড গ্যাস'),
};
const copper = { formula: 'Cu', state: 's' as const, name: n('Copper', 'কপার (তামা)') };

const NEUTRAL = n(
  'An acid and a base neutralise each other to make a salt and water, and the mixture warms up.',
  'এসিড ও ক্ষারক একে অপরকে প্রশমিত করে লবণ ও পানি তৈরি করে, আর মিশ্রণটি গরম হয়।',
);
const METAL_ACID = n(
  'A reactive metal pushes hydrogen out of the acid, so hydrogen gas bubbles off.',
  'সক্রিয় ধাতু এসিড থেকে হাইড্রোজেনকে প্রতিস্থাপন করে, তাই হাইড্রোজেন গ্যাসের বুদবুদ ওঠে।',
);
const CARBONATE_ACID = n(
  'An acid breaks a carbonate down, releasing carbon dioxide gas that fizzes.',
  'এসিড কার্বনেটকে ভেঙে কার্বন ডাইঅক্সাইড গ্যাস তৈরি করে, যা বুদবুদ করে বের হয়।',
);

/** The curated table (spec §10.3). A chemistry teacher reviews it before the demo. */
export const REACTIONS: readonly Reaction[] = [
  rx({
    id: 'neutral-hcl-naoh',
    reagents: ['hcl', 'naoh'],
    requires: { heat: false },
    equation: 'HCl + NaOH -> NaCl + H2O',
    products: [
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
      water,
    ],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'neutral-h2so4-naoh',
    reagents: ['h2so4', 'naoh'],
    requires: { heat: false },
    equation: 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
    products: [
      { formula: 'Na2SO4', state: 'aq', name: n('Sodium sulfate', 'সোডিয়াম সালফেট') },
      water,
    ],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'neutral-hcl-koh',
    reagents: ['hcl', 'koh'],
    requires: { heat: false },
    equation: 'HCl + KOH -> KCl + H2O',
    products: [
      { formula: 'KCl', state: 'aq', name: n('Potassium chloride', 'পটাশিয়াম ক্লোরাইড') },
      water,
    ],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'zn-hcl',
    reagents: ['zn', 'hcl'],
    requires: { heat: false },
    equation: 'Zn + 2HCl -> ZnCl2 + H2',
    products: [
      { formula: 'ZnCl2', state: 'aq', name: n('Zinc chloride', 'জিংক ক্লোরাইড') },
      hydrogen,
    ],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'mg-hcl',
    reagents: ['mg', 'hcl'],
    requires: { heat: false },
    equation: 'Mg + 2HCl -> MgCl2 + H2',
    products: [
      { formula: 'MgCl2', state: 'aq', name: n('Magnesium chloride', 'ম্যাগনেসিয়াম ক্লোরাইড') },
      hydrogen,
    ],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'fe-h2so4',
    reagents: ['fe', 'h2so4'],
    requires: { heat: false },
    equation: 'Fe + H2SO4 -> FeSO4 + H2',
    products: [
      { formula: 'FeSO4', state: 'aq', name: n('Iron(II) sulfate', 'ফেরাস সালফেট') },
      hydrogen,
    ],
    observations: { colourTo: PALE_GREEN, gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'zn-h2so4',
    reagents: ['zn', 'h2so4'],
    requires: { heat: false },
    equation: 'Zn + H2SO4 -> ZnSO4 + H2',
    products: [{ formula: 'ZnSO4', state: 'aq', name: n('Zinc sulfate', 'জিংক সালফেট') }, hydrogen],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'caco3-hcl',
    reagents: ['caco3', 'hcl'],
    requires: { heat: false },
    equation: 'CaCO3 + 2HCl -> CaCl2 + H2O + CO2',
    products: [
      { formula: 'CaCl2', state: 'aq', name: n('Calcium chloride', 'ক্যালসিয়াম ক্লোরাইড') },
      water,
      carbonDioxide,
    ],
    observations: { gas: 'CO2', tempChange: 'none' },
    explanation: CARBONATE_ACID,
  }),
  rx({
    id: 'na2co3-hcl',
    reagents: ['na2co3', 'hcl'],
    requires: { heat: false },
    equation: 'Na2CO3 + 2HCl -> 2NaCl + H2O + CO2',
    products: [
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
      water,
      carbonDioxide,
    ],
    observations: { gas: 'CO2', tempChange: 'none' },
    explanation: CARBONATE_ACID,
  }),
  rx({
    id: 'nahco3-hcl',
    reagents: ['nahco3', 'hcl'],
    requires: { heat: false },
    equation: 'NaHCO3 + HCl -> NaCl + H2O + CO2',
    products: [
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
      water,
      carbonDioxide,
    ],
    observations: { gas: 'CO2', tempChange: 'down' },
    explanation: n(
      'Baking soda and acid fizz out carbon dioxide, and this reaction takes in heat, so the beaker cools.',
      'খাবার সোডা ও এসিড বিক্রিয়ায় কার্বন ডাইঅক্সাইড বের হয়, আর এই বিক্রিয়া তাপ শোষণ করে, তাই বিকার ঠান্ডা হয়।',
    ),
  }),
  rx({
    id: 'agno3-nacl',
    reagents: ['agno3', 'nacl'],
    requires: { heat: false },
    equation: 'AgNO3 + NaCl -> AgCl + NaNO3',
    products: [
      { formula: 'AgCl', state: 's', name: n('Silver chloride', 'সিলভার ক্লোরাইড') },
      { formula: 'NaNO3', state: 'aq', name: n('Sodium nitrate', 'সোডিয়াম নাইট্রেট') },
    ],
    observations: { precipitate: { formula: 'AgCl', colour: WHITE_PPT }, tempChange: 'none' },
    explanation: n(
      'Silver and chloride ions meet and form solid silver chloride, a white precipitate. This is the test for chloride.',
      'সিলভার ও ক্লোরাইড আয়ন মিলে কঠিন সিলভার ক্লোরাইডের সাদা অধঃক্ষেপ তৈরি করে। এটি ক্লোরাইড শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'bacl2-na2so4',
    reagents: ['bacl2', 'na2so4'],
    requires: { heat: false },
    equation: 'BaCl2 + Na2SO4 -> BaSO4 + 2NaCl',
    products: [
      { formula: 'BaSO4', state: 's', name: n('Barium sulfate', 'বেরিয়াম সালফেট') },
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
    ],
    observations: { precipitate: { formula: 'BaSO4', colour: '#f7f7f7' }, tempChange: 'none' },
    explanation: n(
      'Barium and sulfate ions form insoluble barium sulfate, a white precipitate. This is the test for sulfate.',
      'বেরিয়াম ও সালফেট আয়ন অদ্রবণীয় বেরিয়াম সালফেটের সাদা অধঃক্ষেপ তৈরি করে। এটি সালফেট শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'cuso4-naoh',
    reagents: ['cuso4', 'naoh'],
    requires: { heat: false },
    equation: 'CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4',
    products: [
      { formula: 'Cu(OH)2', state: 's', name: n('Copper(II) hydroxide', 'কপার হাইড্রক্সাইড') },
      { formula: 'Na2SO4', state: 'aq', name: n('Sodium sulfate', 'সোডিয়াম সালফেট') },
    ],
    observations: {
      colourTo: CLEAR,
      precipitate: { formula: 'Cu(OH)2', colour: '#4a90d9' },
      tempChange: 'none',
    },
    explanation: n(
      'Hydroxide ions pull copper out of solution as a pale blue precipitate of copper hydroxide.',
      'হাইড্রক্সাইড আয়ন দ্রবণ থেকে কপারকে হালকা নীল কপার হাইড্রক্সাইডের অধঃক্ষেপ হিসেবে বের করে আনে।',
    ),
  }),
  rx({
    id: 'fecl3-naoh',
    reagents: ['fecl3', 'naoh'],
    requires: { heat: false },
    equation: 'FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl',
    products: [
      { formula: 'Fe(OH)3', state: 's', name: n('Iron(III) hydroxide', 'ফেরিক হাইড্রক্সাইড') },
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
    ],
    observations: {
      colourTo: CLEAR,
      precipitate: { formula: 'Fe(OH)3', colour: '#9b4a22' },
      tempChange: 'none',
    },
    explanation: n(
      'Hydroxide ions pull iron out of solution as a red-brown precipitate of iron(III) hydroxide.',
      'হাইড্রক্সাইড আয়ন দ্রবণ থেকে লোহাকে লালচে-বাদামি ফেরিক হাইড্রক্সাইডের অধঃক্ষেপ হিসেবে বের করে আনে।',
    ),
  }),
  rx({
    id: 'fe-cuso4',
    reagents: ['fe', 'cuso4'],
    requires: { heat: false },
    equation: 'Fe + CuSO4 -> FeSO4 + Cu',
    products: [
      { formula: 'FeSO4', state: 'aq', name: n('Iron(II) sulfate', 'ফেরাস সালফেট') },
      copper,
    ],
    observations: {
      colourTo: PALE_GREEN,
      precipitate: { formula: 'Cu', colour: COPPER },
      tempChange: 'up',
    },
    explanation: n(
      'Iron is more reactive than copper, so it takes copper’s place: the blue solution turns pale green and copper coats the iron.',
      'লোহা কপারের চেয়ে বেশি সক্রিয়, তাই এটি কপারকে প্রতিস্থাপন করে: নীল দ্রবণ হালকা সবুজ হয় আর লোহার গায়ে তামা জমে।',
    ),
  }),
  rx({
    id: 'zn-cuso4',
    reagents: ['zn', 'cuso4'],
    requires: { heat: false },
    equation: 'Zn + CuSO4 -> ZnSO4 + Cu',
    products: [{ formula: 'ZnSO4', state: 'aq', name: n('Zinc sulfate', 'জিংক সালফেট') }, copper],
    observations: {
      colourTo: CLEAR,
      precipitate: { formula: 'Cu', colour: COPPER },
      tempChange: 'up',
    },
    explanation: n(
      'Zinc is more reactive than copper, so it takes copper’s place: the blue fades and red-brown copper appears.',
      'জিংক কপারের চেয়ে বেশি সক্রিয়, তাই এটি কপারকে প্রতিস্থাপন করে: নীল রং মিলিয়ে যায় আর লালচে-বাদামি তামা দেখা দেয়।',
    ),
  }),
  rx({
    id: 'cao-water',
    reagents: ['cao', 'water'],
    requires: { heat: false },
    equation: 'CaO + H2O -> Ca(OH)2',
    products: [
      {
        formula: 'Ca(OH)2',
        state: 'aq',
        name: n('Calcium hydroxide (slaked lime)', 'ক্যালসিয়াম হাইড্রক্সাইড (কলিচুন ভেজানো)'),
      },
    ],
    observations: { tempChange: 'up' },
    phAfter: 12.4,
    explanation: n(
      'Quicklime combines with water to make slaked lime and gives out a lot of heat.',
      'কলিচুন পানির সাথে যুক্ত হয়ে ক্যালসিয়াম হাইড্রক্সাইড তৈরি করে এবং প্রচুর তাপ উৎপন্ন করে।',
    ),
  }),
  rx({
    id: 'co2-limewater',
    reagents: ['co2', 'limewater'],
    requires: { heat: false },
    equation: 'CO2 + Ca(OH)2 -> CaCO3 + H2O',
    products: [
      { formula: 'CaCO3', state: 's', name: n('Calcium carbonate', 'ক্যালসিয়াম কার্বনেট') },
      water,
    ],
    observations: { precipitate: { formula: 'CaCO3', colour: '#f3f3ee' }, tempChange: 'none' },
    explanation: n(
      'Carbon dioxide turns limewater milky as insoluble calcium carbonate forms. This is the test for carbon dioxide.',
      'কার্বন ডাইঅক্সাইড চুনের পানিকে ঘোলা করে, কারণ অদ্রবণীয় ক্যালসিয়াম কার্বনেট তৈরি হয়। এটি কার্বন ডাইঅক্সাইড শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'h2o2-mno2',
    reagents: ['h2o2', 'mno2'],
    requires: { heat: false },
    equation: '2H2O2 -> 2H2O + O2',
    products: [water, { formula: 'O2', state: 'g', name: n('Oxygen gas', 'অক্সিজেন গ্যাস') }],
    observations: { gas: 'O2', tempChange: 'up' },
    explanation: n(
      'Manganese dioxide is a catalyst: it speeds up hydrogen peroxide breaking into water and oxygen without being used up.',
      'ম্যাঙ্গানিজ ডাইঅক্সাইড একটি প্রভাবক: নিজে খরচ না হয়ে এটি হাইড্রোজেন পার-অক্সাইডকে পানি ও অক্সিজেনে ভাঙার গতি বাড়ায়।',
    ),
  }),
  rx({
    id: 'heat-cuco3',
    reagents: ['cuco3'],
    requires: { heat: true },
    equation: 'CuCO3 -> CuO + CO2',
    products: [
      { formula: 'CuO', state: 's', name: n('Copper(II) oxide', 'কপার অক্সাইড') },
      carbonDioxide,
    ],
    observations: { colourTo: '#1f1f1f', gas: 'CO2', tempChange: 'none' },
    explanation: n(
      'Heat breaks green copper carbonate down into black copper oxide and carbon dioxide.',
      'তাপে সবুজ কপার কার্বনেট ভেঙে কালো কপার অক্সাইড ও কার্বন ডাইঅক্সাইড তৈরি হয়।',
    ),
  }),
];
