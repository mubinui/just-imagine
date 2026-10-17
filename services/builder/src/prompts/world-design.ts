// World and game design rules for the builder's prompts. Mirror of docs/art/world-design-principles.md;
// change both together.
export const WORLD_DESIGN_VERSION = 'wd4';

export const WORLD_DESIGN_RULES = [
  'The child is the author. Their requested form, pacing, cast and rules override all optional storytelling suggestions below. Open play, a quiet conversation or a toy need no obstacle, levels, collection, score, mandatory reveal or compulsory extra.',
  'World and game design rules (think like a theme-park and animation studio designing for this child):',
  '1. For a requested story or adventure, decide the hero and their purpose before placing entities. For open play, stage the requested action directly. An obstacle is optional and only belongs when requested; every physical prop must serve an intended interaction.',
  '2. One magnet: give the world one visual magnet (largest or brightest object) on the far third of the stage, then arrange far backdrop, mid play space and near foreground.',
  '3. The child is the hero: their action must visibly change the world within one second, and the requested interactions offer meaningful choices. Different tap destinations already count; do not invent extra targets or challenges.',
  '4. Stage discovery: when the child wants an adventure or challenge, a surprise can follow success and invite a brief explanation. A quiet toy needs no surprise, goal or forced reveal.',
  '5. Motion has a cause: characters move to a chosen destination or in response to input. Use real strides, swim strokes and rolling wheels through locomotion metadata; never use random wandering, whole-image bobbing or arbitrary vertical drift as a substitute. Ambient scenery may move gently only when natural to the setting; resting actors stop.',
  '6. Scale tells the story: stage the main playable or touchable character clearly on phones. Unless the child explicitly requests an exact scale, its longer body dimension should normally be 3-4 meters in the 16-meter-wide world (roughly 70-90 pixels on a 390px phone), not a tiny distant dot. Even a small real-life species needs a readable illustrated presence. Keep its proportions and physics size aligned; never enlarge only the artwork. Multiple actors may use a balanced smaller cast arrangement. Honor explicit child size requests and note when storybook scale differs from real life. If an obstacle was requested, make it readable without blocking an unrelated action.',
  "7. Characters, not objects: give the main touchable object a one-line personality the friend can voice, and use the child's words for names.",
  '8. Play in three beats: a requested story or finite challenge may have setup, development and an earned ending. Open play remains ongoing; do not add levels, an ending or rising difficulty to a toy.',
  "9. Respect the child's idea: keep their words in the title and hero name; keep impossible wishes as make-believe and show the real version beside them; never silently substitute a different idea.",
  '10. Plus it: an optional small extra may strengthen the requested idea, but must not change its rules or exclusions. Never add a physical obstacle, particle template, score, timer or challenge merely for decoration.',
  '11. Comfort: cartoon-scary is fine, cruelty and weapons are not; for ages 6-7 failure retries instantly with encouragement and nothing punishes slowness.',
].join('\n');
