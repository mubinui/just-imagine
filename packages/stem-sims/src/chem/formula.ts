import { ELEMENT_SYMBOLS } from './elements';

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

export type AtomCounts = Map<string, number>;
export interface EquationTerm {
  coefficient: number;
  formula: string;
}

function addInto(target: AtomCounts, source: AtomCounts, times: number): void {
  for (const [element, n] of source) target.set(element, (target.get(element) ?? 0) + n * times);
}

function parseGroup(text: string): AtomCounts {
  let pos = 0;
  const readNumber = (): number => {
    const match = /^\d+/.exec(text.slice(pos));
    if (!match) return 1;
    pos += match[0].length;
    return Number(match[0]);
  };
  const sequence = (closing: boolean): AtomCounts => {
    const counts: AtomCounts = new Map();
    while (pos < text.length) {
      const ch = text[pos]!;
      if (ch === '(' || ch === '[') {
        pos++;
        const inner = sequence(true);
        addInto(counts, inner, readNumber());
        continue;
      }
      if (ch === ')' || ch === ']') {
        if (!closing) throw new FormulaError(`Unexpected "${ch}" in ${text}.`);
        pos++;
        return counts;
      }
      const match = /^[A-Z][a-z]?/.exec(text.slice(pos));
      if (!match || !ELEMENT_SYMBOLS.has(match[0]))
        throw new FormulaError(`Unknown element at "${text.slice(pos)}" in ${text}.`);
      pos += match[0].length;
      addInto(counts, new Map([[match[0], 1]]), readNumber());
    }
    if (closing) throw new FormulaError(`Unclosed bracket in ${text}.`);
    return counts;
  };
  const counts = sequence(false);
  if (counts.size === 0) throw new FormulaError('Empty formula.');
  return counts;
}

/** Counts atoms in a formula such as Fe2(SO4)3, CuSO4·5H2O or Cu(OH)2(s). */
export function parseFormula(formula: string): AtomCounts {
  const text = formula.replace(/\s+/g, '').replace(/\((?:s|l|g|aq)\)$/, '');
  if (text === '') throw new FormulaError('Empty formula.');
  const total: AtomCounts = new Map();
  for (const [index, part] of text.split(/[·.*]/).entries()) {
    const hydrate = index > 0 ? /^(\d+)(.+)$/.exec(part) : null;
    addInto(total, parseGroup(hydrate ? hydrate[2]! : part), hydrate ? Number(hydrate[1]) : 1);
  }
  return total;
}

function parseSide(side: string): EquationTerm[] {
  const terms = side
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) throw new FormulaError('An equation side is empty.');
  return terms.map((term) => {
    const match = /^(\d*)\s*(.+)$/.exec(term)!;
    return { coefficient: match[1] ? Number(match[1]) : 1, formula: match[2]! };
  });
}

export function parseEquation(equation: string): {
  reactants: EquationTerm[];
  products: EquationTerm[];
} {
  const sides = equation.split(/->|→|=/);
  if (sides.length !== 2) throw new FormulaError('An equation needs exactly one arrow.');
  return { reactants: parseSide(sides[0]!), products: parseSide(sides[1]!) };
}

function total(terms: EquationTerm[]): Record<string, number> {
  const counts: AtomCounts = new Map();
  for (const term of terms) addInto(counts, parseFormula(term.formula), term.coefficient);
  return Object.fromEntries(counts);
}

/** Atom counts on each side; throws FormulaError for anything it cannot read. */
export function atomBalance(equation: string): {
  balanced: boolean;
  reactants: Record<string, number>;
  products: Record<string, number>;
} {
  const { reactants, products } = parseEquation(equation);
  const left = total(reactants);
  const right = total(products);
  const elements = new Set([...Object.keys(left), ...Object.keys(right)]);
  const balanced = [...elements].every((e) => (left[e] ?? 0) === (right[e] ?? 0));
  return { balanced, reactants: left, products: right };
}

export function isBalanced(equation: string): boolean {
  try {
    return atomBalance(equation).balanced;
  } catch {
    return false;
  }
}
