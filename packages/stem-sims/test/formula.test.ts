import { describe, it, expect } from 'vitest';
import {
  atomBalance,
  FormulaError,
  isBalanced,
  parseEquation,
  parseFormula,
} from '../src/chem/formula';

const counts = (formula: string) => Object.fromEntries(parseFormula(formula));

describe('parseFormula', () => {
  it('counts simple, bracketed and hydrated formulas', () => {
    expect(counts('H2O')).toEqual({ H: 2, O: 1 });
    expect(counts('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(counts('Fe2(SO4)3')).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(counts('CuSO4·5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(counts('Cu(OH)2(s)')).toEqual({ Cu: 1, O: 2, H: 2 });
    expect(counts('NaHCO3(aq)')).toEqual({ Na: 1, H: 1, C: 1, O: 3 });
  });

  it('rejects unknown elements and broken brackets', () => {
    expect(() => parseFormula('Xy2')).toThrow(FormulaError);
    expect(() => parseFormula('Ca(OH')).toThrow(FormulaError);
    expect(() => parseFormula('CaOH)2')).toThrow(FormulaError);
    expect(() => parseFormula('')).toThrow(FormulaError);
    expect(() => parseFormula('h2o')).toThrow(FormulaError);
  });
});

describe('parseEquation and atomBalance', () => {
  it('reads coefficients on both sides of either arrow', () => {
    expect(parseEquation('2H2O2 → 2H2O + O2')).toEqual({
      reactants: [{ coefficient: 2, formula: 'H2O2' }],
      products: [
        { coefficient: 2, formula: 'H2O' },
        { coefficient: 1, formula: 'O2' },
      ],
    });
  });

  it('finds balanced and unbalanced equations', () => {
    expect(atomBalance('2H2 + O2 -> 2H2O').balanced).toBe(true);
    expect(atomBalance('H2 + O2 -> H2O').balanced).toBe(false);
    expect(atomBalance('Ca(OH)2 + CO2 → CaCO3 + H2O').balanced).toBe(true);
    expect(atomBalance('CuSO4·5H2O -> CuSO4 + 5H2O').balanced).toBe(true);
    expect(atomBalance('FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl').balanced).toBe(true);
  });

  it('treats an element missing from one side as unbalanced', () => {
    expect(atomBalance('Na + H2O -> H2').balanced).toBe(false);
  });

  it('never throws from isBalanced', () => {
    expect(isBalanced('not an equation')).toBe(false);
    expect(isBalanced('A -> B -> C')).toBe(false);
    expect(isBalanced('HCl + NaOH -> NaCl + H2O')).toBe(true);
  });
});

describe('malformed input is rejected', () => {
  it('rejects zero counts and coefficients', () => {
    expect(() => parseFormula('H0')).toThrow(FormulaError);
    expect(() => parseFormula('Ca(OH)0')).toThrow(FormulaError);
    expect(() => parseFormula('CuSO4·0H2O')).toThrow(FormulaError);
    expect(() => parseEquation('0H2 + O2 -> O2')).toThrow(FormulaError);
    expect(isBalanced('0H2 + O2 -> O2')).toBe(false);
    expect(isBalanced('0O2 -> 0N2')).toBe(false);
  });

  it('rejects mismatched brackets and empty groups', () => {
    expect(() => parseFormula('Ca(OH]2')).toThrow(FormulaError);
    expect(() => parseFormula('Ca[OH)2')).toThrow(FormulaError);
    expect(() => parseFormula('H()')).toThrow(FormulaError);
    expect(counts('Ca[OH]2')).toEqual({ Ca: 1, O: 2, H: 2 });
  });

  it('rejects empty equation terms', () => {
    expect(() => parseEquation('H2 + + O2 -> H2O')).toThrow(FormulaError);
    expect(isBalanced('H2 +  -> H2')).toBe(false);
  });

  it('rejects counts beyond the safe integer range', () => {
    expect(() => parseFormula('H9007199254740993')).toThrow(FormulaError);
    expect(isBalanced('H9007199254740993 -> H9007199254740992')).toBe(false);
    expect(isBalanced('9007199254740993H2 -> 9007199254740992H2')).toBe(false);
  });
});
