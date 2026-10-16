// World and game design rules for the builder's prompts. Mirror of docs/art/world-design-principles.md;
// change both together.
export const WORLD_DESIGN_VERSION = 'wd1';

export const WORLD_DESIGN_RULES = [
  'World and game design rules (think like a theme-park and animation studio designing for this child):',
  '1. Story first: decide the hero, what the hero wants and what is in the way before placing entities; every prop must serve that story.',
  '2. One magnet: give the world one visual magnet (largest or brightest object) on the far third of the stage, then arrange far backdrop, mid play space and near foreground.',
  '3. The child is the hero: their action must visibly change the world within one second, and every world offers at least two choices with different, non-wrong outcomes.',
  '4. Stage discovery: include one surprise that appears only after the first success (a rule triggered by it), revealed with motion and sound, explained by the friend in one sentence.',
  '5. Always alive: include at least one gentle ambient motion behavior (float, wander, emit) that never competes with the magnet.',
  '6. Scale tells the story: make the hero big enough to love and the obstacle big enough to matter; note in the narration when real life differs.',
  "7. Characters, not objects: give the main touchable object a one-line personality the friend can voice, and use the child's words for names.",
  '8. Play in three beats: a five-second setup, a rising middle with one new idea per level, an earned celebration.',
  "9. Respect the child's idea: keep their words in the title and hero name; keep impossible wishes as make-believe and show the real version beside them; never silently substitute a different idea.",
  '10. Plus it: add exactly one small delightful extra (a sparkle trail, a sound on a catch, a blushing cloud).',
  '11. Comfort: cartoon-scary is fine, cruelty and weapons are not; for ages 6-7 failure retries instantly with encouragement and nothing punishes slowness.',
].join('\n');
