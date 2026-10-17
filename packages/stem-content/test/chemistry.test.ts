import { describe, it, expect } from 'vitest';
import {
  atomBalance,
  mix,
  mixKey,
  parseEquation,
  parseFormula,
  ReactionSchema,
  ReagentSchema,
} from '@just-imagine/stem-sims';
import { REACTIONS, REAGENTS, reagentById } from '../src';

const BENGALI = /[ঀ-৿]/;

describe('reagent bench', () => {
  it('has 26 valid reagents with unique ids and readable formulas', () => {
    expect(REAGENTS).toHaveLength(26);
    expect(new Set(REAGENTS.map((r) => r.id)).size).toBe(REAGENTS.length);
    for (const reagent of REAGENTS) {
      expect(ReagentSchema.parse(reagent)).toEqual(reagent);
      expect(reagent.name.bn).toMatch(BENGALI);
      if (reagent.formula !== null) expect(() => parseFormula(reagent.formula!)).not.toThrow();
    }
    expect(reagentById('limewater')?.formula).toBe('Ca(OH)2');
  });
});

describe('reaction table', () => {
  it('has 20 valid reactions with unique ids and unique reagent keys', () => {
    expect(REACTIONS).toHaveLength(20);
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(20);
    expect(new Set(REACTIONS.map((r) => mixKey(r.reagents, r.requires.heat))).size).toBe(20);
  });

  for (const reaction of REACTIONS) {
    describe(reaction.id, () => {
      it('is valid, bilingual and balanced', () => {
        expect(ReactionSchema.parse(reaction)).toEqual(reaction);
        expect(reaction.explanation.bn).toMatch(BENGALI);
        for (const p of reaction.products) expect(p.name.bn).toMatch(BENGALI);
        expect(atomBalance(reaction.equation).balanced).toBe(true);
      });

      it('uses exactly its bench reagents (catalysts aside) and lists exactly its products', () => {
        const { reactants, products } = parseEquation(reaction.equation);
        const benchFormulas = reaction.reagents
          .map((id) => reagentById(id))
          .filter((r) => r !== undefined && r.kind !== 'catalyst')
          .map((r) => r!.formula);
        expect(reaction.reagents.every((id) => reagentById(id) !== undefined)).toBe(true);
        expect(reactants.map((t) => t.formula).sort()).toEqual([...benchFormulas].sort());
        expect(products.map((t) => t.formula).sort()).toEqual(
          reaction.products.map((p) => p.formula).sort(),
        );
      });

      it('reports gases and precipitates that match its products', () => {
        const gases = reaction.products.filter((p) => p.state === 'g').map((p) => p.formula);
        expect(reaction.observations.gas ? [reaction.observations.gas] : []).toEqual(gases);
        const precipitate = reaction.observations.precipitate;
        if (precipitate)
          expect(
            reaction.products.some((p) => p.formula === precipitate.formula && p.state === 's'),
          ).toBe(true);
      });

      it('is what the mixer finds for its own reagents', () => {
        const result = mix(
          { reagentIds: reaction.reagents, heat: reaction.requires.heat },
          REAGENTS,
          REACTIONS,
        );
        expect(result.reaction?.id).toBe(reaction.id);
      });
    });
  }
});
