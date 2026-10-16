/**
 * The Game API contract and the eight example programmes shipped to the script
 * model. They are copies of `packages/game-runtime/src/api.d.ts` and
 * `packages/game-runtime/test/examples/*.js`, embedded so the bundled builder
 * needs no files at run time; `test/game-examples.test.ts` keeps them in sync.
 */

export const GAME_API_DECLARATIONS =
  "/**\n * Just Imagine Game API, version 1.\n *\n * This file is the contract a generated game script is written against. The\n * script is plain JavaScript (no imports, no exports) that runs in a sandbox\n * with exactly these globals: `game`, `Math`, `Number`, `String`, `Array`,\n * `Object`, `JSON`, `Boolean` and `console.log`. Nothing else exists.\n *\n * The stage is 16 by 9 meters. `x` grows to the right and `y` grows DOWN:\n * the sky is near y = 0 and the ground is near y = 8.5. A negative `y` impulse\n * pushes an entity up. Physics runs outside the script; the script reads\n * positions with `game.find` and changes the world only through `game`.\n *\n * Handlers run synchronously and must return quickly (under 8 ms each, under\n * 50 ms of script time per second). Use `game.every` and `game.after` for\n * timing; there is no setTimeout. Use `game.random()` for randomness; it is\n * seeded so a game replays the same way.\n */\n\n/** A live entity as seen by the script. */\nexport interface GameEntity {\n  /** Entity id, usable with `game.remove`, `game.impulse`, `game.setMaterial`. */\n  id: string;\n  /** Tags from the scene document or from `game.spawn`. */\n  tags: string[];\n  /** Position of the body center in meters. */\n  x: number;\n  y: number;\n  /** Rotation in radians. */\n  rotation: number;\n  /** Velocity in meters per second. */\n  vx: number;\n  vy: number;\n  /** Body size in meters. */\n  width: number;\n  height: number;\n  /** Template entity or library id this entity was spawned from, when it was. */\n  templateId?: string;\n}\n\nexport interface Vector {\n  x: number;\n  y: number;\n}\n\nexport interface SpawnOptions {\n  x: number;\n  y: number;\n  /** Extra tags for the new entity; the template's tags are kept. */\n  tags?: string[];\n  /** A material name from the scene document, for example 'wood'. */\n  material?: string;\n}\n\nexport interface TickEvent {\n  type: 'tick';\n  /** Game time in seconds since `start`. */\n  time: number;\n  /** Seconds since the previous tick (about 0.05). */\n  dt: number;\n}\n\nexport interface CollisionEvent {\n  type: 'collision';\n  a: GameEntity;\n  b: GameEntity;\n  /** Contact impulse; larger means a harder hit. */\n  impulse: number;\n}\n\nexport interface TapEvent {\n  type: 'tap';\n  /** The tapped entity, or undefined when the child tapped empty stage. */\n  target?: GameEntity;\n  x: number;\n  y: number;\n}\n\nexport interface DragEvent {\n  type: 'drag';\n  target: GameEntity;\n  x: number;\n  y: number;\n}\n\nexport interface FlickEvent {\n  type: 'flick';\n  target: GameEntity;\n  /** Flick velocity in meters per second. */\n  vx: number;\n  vy: number;\n}\n\nexport interface DialEvent {\n  type: 'dial';\n  dial: 'gravity' | 'wind' | 'heroMaterial';\n  value: string;\n}\n\nexport interface VariableEvent {\n  type: 'variable';\n  id: string;\n  value: number;\n}\n\nexport interface TimerEvent {\n  type: 'timer';\n  /** Timer id returned by `game.every` or `game.after`. */\n  id: number;\n  seconds: number;\n  repeat: boolean;\n}\n\nexport interface GameEventMap {\n  tick: TickEvent;\n  collision: CollisionEvent;\n  tap: TapEvent;\n  drag: DragEvent;\n  flick: FlickEvent;\n  dial: DialEvent;\n  variable: VariableEvent;\n  timer: TimerEvent;\n}\n\nexport type GameEventType = keyof GameEventMap;\n\nexport type SoundCue = 'boing' | 'splat' | 'splash' | 'whoosh' | 'ding' | 'pop' | 'tada' | 'buzz';\n\nexport type CelebrateStyle = 'confetti' | 'sparkle' | 'splash';\n\nexport interface HudState {\n  score?: number;\n  lives?: number;\n  /** Seconds to show on the timer pill. */\n  timer?: number;\n  /** Short label, for example the level name or the goal. */\n  label?: string;\n}\n\nexport interface GameApi {\n  /**\n   * Spawns a copy of a template entity (an entity id from the scene) or a\n   * library asset (`lib/<theme>/<name>`) at a position. Returns the new id.\n   * At most 200 spawned bodies may be alive.\n   */\n  spawn(templateOrLibraryId: string, options: SpawnOptions): string;\n  /** Removes one entity by id, or every entity carrying a tag. */\n  remove(idOrTag: string): void;\n  /** Entities with the tag (or the id), with positions and velocities. */\n  find(tag: string): GameEntity[];\n  /** Subscribes to an event. Returns a function that unsubscribes. */\n  on<K extends GameEventType>(event: K, handler: (event: GameEventMap[K]) => void): () => void;\n  /** Runs the handler every `seconds` of game time. Returns a timer id. At most 50 timers. */\n  every(seconds: number, handler: () => void): number;\n  /** Runs the handler once after `seconds` of game time. Returns a timer id. */\n  after(seconds: number, handler: () => void): number;\n  /** Cancels a timer from `every` or `after`. */\n  cancel(timerId: number): void;\n  /**\n   * Gives an entity (or every entity with the tag) an instant push: the vector\n   * is added to its velocity in meters per second, whatever its mass. Speeds\n   * are capped at 20 m/s. `{ x: 0, y: -5 }` throws it upward.\n   */\n  impulse(idOrTag: string, vector: Vector): void;\n  /**\n   * Positions an actor or prop at stage coordinates, including static bodies.\n   * Use for scripted paths/orbits; for physical pushes use impulse instead.\n   * Positions stay within the stage. This is illustrated motion, not an orbit simulation.\n   */\n  move(idOrTag: string, position: Vector): void;\n  /** Sets gravity. A number sets the vertical pull (9.81 is Earth, 1.62 the Moon). */\n  setGravity(gravity: number | Vector): void;\n  /** Sets wind. A number sets a horizontal breeze (positive blows right). */\n  setWind(wind: number | Vector): void;\n  /** Changes the material of an entity (or every entity with the tag). */\n  setMaterial(idOrTag: string, material: string): void;\n  /** Adds to the score (negative to subtract). */\n  score(delta: number): void;\n  /** Adds to the lives (negative to lose one). */\n  lives(delta: number): void;\n  /** Sets the level number shown on the banner. */\n  level(n: number): void;\n  /** Ends the game with a win. */\n  win(): void;\n  /** Ends the game with a loss. */\n  lose(): void;\n  /** Updates the heads-up display. Only the given fields change. */\n  hud(state: HudState): void;\n  /** The friend says this aloud and shows it as a caption. Keep it short. */\n  say(text: string): void;\n  /** Asks the child a question with two or three options; resolves with the chosen index. */\n  ask(question: string, options: string[]): Promise<number>;\n  /** Plays a sound cue. */\n  sound(cue: SoundCue): void;\n  /** Shows a celebration effect. */\n  celebrate(style: CelebrateStyle): void;\n  /** Seeded random number in [0, 1). */\n  random(): number;\n}\n\n/** The only globals a script sees besides plain JavaScript. */\ndeclare const game: GameApi;\ndeclare const console: { log(...args: unknown[]): void };\n";

export interface GameExample {
  name: string;
  wish: string;
  scene: {
    title: string;
    gravity: number;
    hero: string;
    dials: string[];
    materials: string[];
    entities: string[];
    narration?: string;
  };
  source: string;
}

export const GAME_EXAMPLES: readonly GameExample[] = [
  {
    name: 'catch-the-flies',
    wish: 'Catch the flies: tap the flies to catch them before the owl wakes up.',
    scene: {
      title: 'Catch the Flies',
      gravity: 9.81,
      hero: 'frog',
      dials: ['gravity'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'frog [frog, hero] at 3,7.5 1x1 rubber',
        'fly_1 [fly] at 5,2 0.4x0.4 soap',
        'fly_2 [fly] at 9,3 0.4x0.4 soap',
        'fly_3 [fly] at 12,2 0.4x0.4 soap',
        'owl [owl] static at 14.5,1.5 1.2x1.2 wood',
      ],
    },
    source:
      "// Catch the flies: tap the flies to catch them before the owl wakes up.\nconst GOAL = 10;\nlet caught = 0;\nlet owlAwake = false;\n\ngame.setGravity(0);\ngame.hud({ score: 0, label: 'Catch ' + GOAL + ' flies' });\ngame.say('Tap the flies before the owl wakes up!');\n\nfunction buzz() {\n  for (const fly of game.find('fly')) {\n    game.impulse(fly.id, { x: (game.random() - 0.5) * 4, y: (game.random() - 0.5) * 3 });\n  }\n}\ngame.every(0.5, buzz);\n\ngame.on('tap', (e) => {\n  if (owlAwake || !e.target || !e.target.tags.includes('fly')) return;\n  caught += 1;\n  game.remove(e.target.id);\n  game.sound('pop');\n  game.score(1);\n  game.hud({ score: caught });\n  game.after(1, () => {\n    if (!owlAwake && caught < GOAL) {\n      game.spawn('fly_1', { x: 2 + game.random() * 12, y: 1 + game.random() * 4, tags: ['fly'] });\n    }\n  });\n  if (caught >= GOAL) {\n    owlAwake = true;\n    game.celebrate('confetti');\n    game.say('You caught them all!');\n    game.win();\n  }\n});\n\ngame.after(30, () => {\n  if (caught < GOAL) {\n    owlAwake = true;\n    game.say('Hoot! The owl woke up.');\n    game.lose();\n  }\n});\n",
  },
  {
    name: 'stack-higher-than-the-giraffe',
    wish: 'Stack blocks higher than the giraffe: tap anywhere to drop a block; the wind grows each level.',
    scene: {
      title: 'Stack Higher Than the Giraffe',
      gravity: 9.81,
      hero: 'block',
      dials: ['wind'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'block [block] at 8,7.7 0.8x0.6 wood',
        'giraffe [giraffe] static at 12.5,6.5 1x3 wood',
      ],
    },
    source:
      "// Stack blocks higher than the giraffe: tap anywhere to drop a block; the wind grows each level.\nlet level = 1;\nlet done = false;\nconst resting = [];\n\ngame.level(1);\ngame.hud({ score: 0, label: 'Stack higher than the giraffe' });\ngame.say('Tap to drop a block. Stack them higher than the giraffe!');\n\nfunction giraffeTop() {\n  const giraffes = game.find('giraffe');\n  if (giraffes.length === 0) return 5;\n  return giraffes[0].y - giraffes[0].height / 2;\n}\n\ngame.on('tap', () => {\n  if (done) return;\n  const x = 8 + (game.random() - 0.5) * 0.4;\n  game.spawn('block', { x, y: 0.6, tags: ['block', 'dropped'] });\n  game.sound('whoosh');\n});\n\ngame.every(0.5, () => {\n  if (done) return;\n  let top = 8;\n  for (const b of game.find('block')) {\n    const still = Math.abs(b.vy) < 0.05 && Math.abs(b.vx) < 0.05;\n    const blockTop = b.y - b.height / 2;\n    if (still && blockTop < top) top = blockTop;\n    if (still && b.tags.includes('dropped') && !resting.includes(b.id)) {\n      resting.push(b.id);\n      game.score(1);\n      game.sound('ding');\n    }\n  }\n  const height = 8 - top;\n  game.hud({ score: resting.length, label: 'Height ' + height.toFixed(1) + ' m' });\n  if (top < giraffeTop() - 0.1) {\n    done = true;\n    game.celebrate('confetti');\n    game.say('Taller than the giraffe!');\n    game.win();\n  } else if (resting.length >= level * 4) {\n    level += 1;\n    game.level(level);\n    game.setWind(level - 1);\n    game.say('Level ' + level + '! The wind is picking up.');\n  }\n});\n",
  },
  {
    name: 'snail-race-in-the-rain',
    wish: 'Snail race: push your snail across the pond; rain makes the lily pads slippery.',
    scene: {
      title: 'Snail Race in the Rain',
      gravity: 9.81,
      hero: 'my_snail',
      dials: ['wind'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground, pad] static at 8,8.5 16x1 stone',
        'my_snail [snail, my_snail] at 1,7.7 0.8x0.6 rubber',
        'rival_snail [snail, rival] at 1,6.9 0.8x0.6 rubber',
        'flag [flag] static at 15.2,7.3 0.2x1.4 wood',
      ],
    },
    source:
      "// Snail race: push your snail across the pond; rain makes the lily pads slippery.\nconst FINISH = 14;\nconst checkpoints = [4, 8, 12];\nlet passed = 0;\nlet raining = false;\nlet finished = false;\n\ngame.hud({ score: 0, label: 'Race to the flag!' });\ngame.say('Tap your snail to push it. Watch out for the rain!');\n\ngame.on('tap', (e) => {\n  if (finished || !e.target || !e.target.tags.includes('my_snail')) return;\n  game.impulse(e.target.id, { x: raining ? 1.2 : 2, y: 0 });\n  game.sound('boing');\n});\n\ngame.every(0.5, () => {\n  if (finished) return;\n  for (const rival of game.find('rival')) {\n    game.impulse(rival.id, { x: 0.6 + game.random() * 0.6, y: 0 });\n  }\n});\n\ngame.on('dial', (e) => {\n  if (e.dial !== 'wind') return;\n  raining = e.value !== 'none';\n  game.setMaterial('pad', raining ? 'ice' : 'stone');\n  game.say(raining ? 'Rain! The lily pads are slippery now.' : 'The rain stopped.');\n});\n\ngame.on('tick', () => {\n  if (finished) return;\n  const mine = game.find('my_snail');\n  if (mine.length === 0) return;\n  const snail = mine[0];\n  while (passed < checkpoints.length && snail.x >= checkpoints[passed]) {\n    passed += 1;\n    game.score(1);\n    game.sound('ding');\n    game.hud({ score: passed, label: 'Checkpoint ' + passed });\n  }\n  if (snail.x >= FINISH) {\n    finished = true;\n    game.celebrate('confetti');\n    game.say('Your snail wins the race!');\n    game.win();\n    return;\n  }\n  for (const rival of game.find('rival')) {\n    if (rival.x >= FINISH) {\n      finished = true;\n      game.say('The rival snail got there first. Try again!');\n      game.lose();\n    }\n  }\n});\n",
  },
  {
    name: 'soft-moon-landing',
    wish: 'Soft moon landing: tap the rocket to fire the thruster and touch down gently.',
    scene: {
      title: 'Soft Moon Landing',
      gravity: 1.62,
      hero: 'rocket',
      dials: ['gravity'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground, moon] static at 8,8.5 16x1 stone',
        'rocket [rocket] at 8,1 0.8x1.4 metal',
        'rock_1 [rock] static at 3,7.6 1x0.8 stone',
        'rock_2 [rock] static at 13,7.6 1x0.8 stone',
      ],
    },
    source:
      "// Soft moon landing: tap the rocket to fire the thruster and touch down gently.\nconst SAFE_SPEED = 2.5;\nlet landed = false;\nlet lives = 3;\nlet hover = 0;\nlet lastVy = 0;\n\ngame.hud({ lives, score: 0, label: 'Land softly on the Moon' });\ngame.say('Tap the rocket to fire the thruster. Land slower than ' + SAFE_SPEED + ' m/s!');\n\ngame.on('tap', (e) => {\n  if (landed || !e.target || !e.target.tags.includes('rocket')) return;\n  game.impulse(e.target.id, { x: 0, y: -1.5 });\n  game.sound('whoosh');\n});\n\ngame.on('tick', () => {\n  const rockets = game.find('rocket');\n  if (rockets.length > 0) lastVy = rockets[0].vy;\n});\n\ngame.every(1, () => {\n  if (landed) return;\n  const rockets = game.find('rocket');\n  if (rockets.length > 0 && rockets[0].y < 7) {\n    hover += 1;\n    game.score(1);\n    game.hud({ score: hover, label: 'Hovering ' + hover + ' s' });\n  }\n});\n\ngame.on('collision', (e) => {\n  if (landed) return;\n  const pair = [e.a, e.b];\n  const rocket = pair.find((p) => p.tags.includes('rocket'));\n  const moon = pair.find((p) => p.tags.includes('moon') || p.tags.includes('rock'));\n  if (!rocket || !moon) return;\n  const speed = Math.max(Math.abs(lastVy), Math.abs(rocket.vy));\n  if (speed <= SAFE_SPEED) {\n    landed = true;\n    game.score(5);\n    game.celebrate('sparkle');\n    game.say('A perfect soft landing!');\n    game.win();\n    return;\n  }\n  lives -= 1;\n  game.lives(-1);\n  game.hud({ lives });\n  game.impulse(rocket.id, { x: 0, y: -speed * 0.8 });\n  game.sound('boing');\n  game.say('Too fast! The rocket bounced away.');\n  if (lives <= 0) {\n    landed = true;\n    game.lose();\n  }\n});\n\ngame.on('dial', (e) => {\n  if (e.dial === 'gravity') game.say('Gravity is now ' + e.value + '.');\n});\n",
  },
  {
    name: 'catapult-the-acorns',
    wish: 'Catapult the acorns at the cans: tap an acorn to launch it and knock every can over.',
    scene: {
      title: 'Catapult the Acorns at the Cans',
      gravity: 9.81,
      hero: 'acorn_1',
      dials: ['wind'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'acorn_1 [acorn] at 2,7.6 0.4x0.4 wood',
        'acorn_2 [acorn] at 1.4,7.6 0.4x0.4 wood',
        'acorn_3 [acorn] at 0.8,7.6 0.4x0.4 wood',
        'can_1 [can] at 12,7.5 0.6x1 metal',
        'can_2 [can] at 12.7,7.5 0.6x1 metal',
        'can_3 [can] at 12.35,6.5 0.6x1 metal',
      ],
    },
    source:
      "// Catapult the acorns at the cans: tap an acorn to launch it and knock every can over.\nconst knocked = [];\nlet launched = 0;\nlet done = false;\n\ngame.hud({ score: 0, label: 'Knock over the cans' });\ngame.say('Tap an acorn to launch it at the cans!');\n\ngame.on('tap', (e) => {\n  if (done || !e.target || !e.target.tags.includes('acorn')) return;\n  launched += 1;\n  game.impulse(e.target.id, { x: 8, y: -6 });\n  game.sound('whoosh');\n  game.hud({ label: 'Acorns launched: ' + launched });\n});\n\ngame.on('collision', (e) => {\n  if (done) return;\n  const pair = [e.a, e.b];\n  const acorn = pair.find((p) => p.tags.includes('acorn'));\n  const can = pair.find((p) => p.tags.includes('can'));\n  if (!acorn || !can || knocked.includes(can.id)) return;\n  knocked.push(can.id);\n  game.score(1);\n  game.sound('splat');\n  game.celebrate('sparkle');\n  game.hud({ score: knocked.length });\n  game.after(0.5, () => game.remove(can.id));\n  if (knocked.length >= 3) {\n    done = true;\n    game.say('All the cans are down!');\n    game.win();\n  }\n});\n\ngame.every(3, () => {\n  if (done) return;\n  const acorns = game.find('acorn');\n  const waiting = acorns.filter((a) => a.x < 3 && Math.abs(a.vx) < 0.1);\n  if (waiting.length === 0) {\n    game.spawn('acorn_1', { x: 2, y: 7.6, tags: ['acorn'] });\n    game.say('Here is another acorn.');\n  }\n});\n",
  },
  {
    name: 'keep-the-bubble-alive',
    wish: 'Keep the bubble alive: tap it to puff it upward; every second it floats earns a point.',
    scene: {
      title: 'Keep the Bubble Alive',
      gravity: 9.81,
      hero: 'bubble',
      dials: ['wind'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'bubble [bubble] at 8,4 0.8x0.8 soap',
        'thorn_1 [thorn] static at 4,7.6 0.4x0.8 wood',
        'thorn_2 [thorn] static at 12,7.6 0.4x0.8 wood',
        'cloud [cloud] static at 8,0.5 3x0.6 soap',
      ],
    },
    source:
      "// Keep the bubble alive: tap it to puff it upward; every second it floats earns a point.\nlet alive = true;\nlet seconds = 0;\n\ngame.setGravity(0.6);\ngame.hud({ score: 0, lives: 1, label: 'Keep the bubble floating' });\ngame.say('Tap the bubble to puff it up. Keep it away from the thorns!');\n\ngame.on('tap', (e) => {\n  if (!alive || !e.target || !e.target.tags.includes('bubble')) return;\n  game.impulse(e.target.id, { x: (game.random() - 0.5) * 2, y: -2.5 });\n  game.sound('pop');\n});\n\ngame.on('tick', () => {\n  if (!alive) return;\n  const bubbles = game.find('bubble');\n  if (bubbles.length === 0) return;\n  const b = bubbles[0];\n  if (b.y < 1.5 && b.vy < 0) game.impulse(b.id, { x: 0, y: 0.8 });\n  if (b.y > 6.5 && b.vy > 0.5) game.impulse(b.id, { x: 0, y: -1.2 });\n});\n\ngame.every(1, () => {\n  if (!alive) return;\n  seconds += 1;\n  game.score(1);\n  game.hud({ score: seconds, label: seconds + ' seconds afloat' });\n  if (seconds === 5) game.say('Halfway there!');\n  if (seconds >= 10) {\n    alive = false;\n    game.celebrate('confetti');\n    game.say('The bubble made it!');\n    game.win();\n  }\n});\n\ngame.on('collision', (e) => {\n  if (!alive) return;\n  const pair = [e.a, e.b];\n  const bubble = pair.find((p) => p.tags.includes('bubble'));\n  const danger = pair.find((p) => p.tags.includes('thorn') || p.tags.includes('ground'));\n  if (!bubble || !danger) return;\n  alive = false;\n  game.remove(bubble.id);\n  game.sound('splat');\n  game.lives(-1);\n  game.say('Pop! The bubble burst.');\n  game.lose();\n});\n",
  },
  {
    name: 'marble-run-to-the-cup',
    wish: 'Marble run: the marble rolls down the ramps into the cup. Tap it for a nudge.',
    scene: {
      title: 'Marble Run to the Cup',
      gravity: 9.81,
      hero: 'marble',
      dials: ['gravity'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'marble [marble] at 1.5,0.8 0.5x0.5 stone',
        'ramp_1 [ramp] static at 3,2.5 4x0.3 wood',
        'ramp_2 [ramp] static at 8,4.5 4x0.3 wood',
        'ramp_3 [ramp] static at 12,6.3 4x0.3 wood',
        'cup [cup] static at 14.8,7.6 1x0.8 wood',
      ],
    },
    source:
      "// Marble run: the marble rolls down the ramps into the cup. Tap it for a nudge.\nconst touched = [];\nlet inCup = false;\n\ngame.hud({ score: 0, label: 'Roll the marble into the cup' });\ngame.say('Tap the marble to nudge it along the ramps.');\n\ngame.on('tap', (e) => {\n  if (inCup || !e.target || !e.target.tags.includes('marble')) return;\n  game.impulse(e.target.id, { x: 1.5, y: -0.5 });\n  game.sound('boing');\n});\n\ngame.on('collision', (e) => {\n  if (inCup) return;\n  const pair = [e.a, e.b];\n  const marble = pair.find((p) => p.tags.includes('marble'));\n  const other = pair.find((p) => !p.tags.includes('marble'));\n  if (!marble || !other) return;\n  if (other.tags.includes('ramp') && !touched.includes(other.id)) {\n    touched.push(other.id);\n    game.score(1);\n    game.sound('ding');\n    game.hud({ score: touched.length, label: 'Ramps: ' + touched.length });\n  }\n  if (other.tags.includes('cup')) {\n    inCup = true;\n    game.score(3);\n    game.celebrate('splash');\n    game.say('Plop! The marble landed in the cup!');\n    game.win();\n  }\n});\n\ngame.every(2, () => {\n  if (inCup) return;\n  const marbles = game.find('marble');\n  if (marbles.length === 0) {\n    game.spawn('marble', { x: 1.5, y: 0.8, tags: ['marble'] });\n    game.say('A new marble rolls in.');\n    return;\n  }\n  const m = marbles[0];\n  if (m.y > 7.5 && Math.abs(m.vx) < 0.1) {\n    game.say('The marble is stuck on the ground. Give it a tap!');\n    game.impulse(m.id, { x: 2, y: -3 });\n  }\n});\n\ngame.on('flick', (e) => {\n  if (e.target.tags.includes('marble')) game.say('Whee! What a flick.');\n});\n",
  },
  {
    name: 'frog-and-owl-chase',
    wish: 'Frog and owl chase: hop away from the owl; every second you stay free earns a point.',
    scene: {
      title: 'Frog and Owl Chase',
      gravity: 9.81,
      hero: 'frog',
      dials: ['gravity'],
      materials: ['wood', 'stone', 'rubber', 'ice', 'soap', 'metal'],
      entities: [
        'ground [ground] static at 8,8.5 16x1 stone',
        'frog [frog] at 4,7.5 1x1 rubber',
        'owl [owl] at 13,7.5 1x1 wood',
        'log [log] static at 8,7.6 2x0.8 wood',
      ],
    },
    source:
      "// Frog and owl chase: hop away from the owl; every second you stay free earns a point.\nlet free = 0;\nlet lives = 3;\nlet over = false;\n\ngame.hud({ score: 0, lives: 3, label: 'Hop away from the owl!' });\ngame.say('The owl is chasing you! Tap the frog to hop.');\n\nfunction frog() {\n  const frogs = game.find('frog');\n  return frogs.length > 0 ? frogs[0] : undefined;\n}\n\ngame.on('tap', (e) => {\n  if (over || !e.target || !e.target.tags.includes('frog')) return;\n  const owls = game.find('owl');\n  const away = owls.length > 0 && owls[0].x > e.target.x ? -1 : 1;\n  game.impulse(e.target.id, { x: 2.5 * away, y: -4 });\n  game.sound('boing');\n});\n\ngame.on('tick', () => {\n  if (over) return;\n  const f = frog();\n  if (!f) return;\n  for (const owl of game.find('owl')) {\n    const dir = f.x > owl.x ? 1 : -1;\n    if (Math.abs(owl.vx) < 1.2) game.impulse(owl.id, { x: 0.15 * dir, y: 0 });\n  }\n});\n\ngame.every(1, () => {\n  if (over) return;\n  free += 1;\n  game.score(1);\n  game.hud({ score: free });\n  if (free >= 20) {\n    over = true;\n    game.celebrate('confetti');\n    game.say('The owl gave up. You are free!');\n    game.win();\n  }\n});\n\ngame.on('collision', (e) => {\n  if (over) return;\n  const pair = [e.a, e.b];\n  const f = pair.find((p) => p.tags.includes('frog'));\n  const owl = pair.find((p) => p.tags.includes('owl'));\n  if (!f || !owl) return;\n  lives -= 1;\n  game.lives(-1);\n  game.hud({ lives });\n  game.sound('splat');\n  game.say('Hoot! The owl caught you. Hop faster!');\n  game.impulse(owl.id, { x: owl.x > f.x ? 4 : -4, y: -2 });\n  if (lives <= 0) {\n    over = true;\n    game.lose();\n  }\n});\n",
  },
];
