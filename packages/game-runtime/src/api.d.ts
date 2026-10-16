/**
 * Just Imagine Game API, version 1.
 *
 * This file is the contract a generated game script is written against. The
 * script is plain JavaScript (no imports, no exports) that runs in a sandbox
 * with exactly these globals: `game`, `Math`, `Number`, `String`, `Array`,
 * `Object`, `JSON`, `Boolean` and `console.log`. Nothing else exists.
 *
 * The stage is 16 by 9 meters. `x` grows to the right and `y` grows DOWN:
 * the sky is near y = 0 and the ground is near y = 8.5. A negative `y` impulse
 * pushes an entity up. Physics runs outside the script; the script reads
 * positions with `game.find` and changes the world only through `game`.
 *
 * Handlers run synchronously and must return quickly (under 8 ms each, under
 * 50 ms of script time per second). Use `game.every` and `game.after` for
 * timing; there is no setTimeout. Use `game.random()` for randomness; it is
 * seeded so a game replays the same way.
 */

/** A live entity as seen by the script. */
export interface GameEntity {
  /** Entity id, usable with `game.remove`, `game.impulse`, `game.setMaterial`. */
  id: string;
  /** Tags from the scene document or from `game.spawn`. */
  tags: string[];
  /** Position of the body center in meters. */
  x: number;
  y: number;
  /** Rotation in radians. */
  rotation: number;
  /** Velocity in meters per second. */
  vx: number;
  vy: number;
  /** Body size in meters. */
  width: number;
  height: number;
  /** Template entity or library id this entity was spawned from, when it was. */
  templateId?: string;
}

export interface Vector {
  x: number;
  y: number;
}

export interface SpawnOptions {
  x: number;
  y: number;
  /** Extra tags for the new entity; the template's tags are kept. */
  tags?: string[];
  /** A material name from the scene document, for example 'wood'. */
  material?: string;
}

export interface TickEvent {
  type: 'tick';
  /** Game time in seconds since `start`. */
  time: number;
  /** Seconds since the previous tick (about 0.05). */
  dt: number;
}

export interface CollisionEvent {
  type: 'collision';
  a: GameEntity;
  b: GameEntity;
  /** Contact impulse; larger means a harder hit. */
  impulse: number;
}

export interface TapEvent {
  type: 'tap';
  /** The tapped entity, or undefined when the child tapped empty stage. */
  target?: GameEntity;
  x: number;
  y: number;
}

export interface DragEvent {
  type: 'drag';
  target: GameEntity;
  x: number;
  y: number;
}

export interface FlickEvent {
  type: 'flick';
  target: GameEntity;
  /** Flick velocity in meters per second. */
  vx: number;
  vy: number;
}

export interface DialEvent {
  type: 'dial';
  dial: 'gravity' | 'wind' | 'heroMaterial';
  value: string;
}

export interface VariableEvent {
  type: 'variable';
  id: string;
  value: number;
}

export interface TimerEvent {
  type: 'timer';
  /** Timer id returned by `game.every` or `game.after`. */
  id: number;
  seconds: number;
  repeat: boolean;
}

export interface GameEventMap {
  tick: TickEvent;
  collision: CollisionEvent;
  tap: TapEvent;
  drag: DragEvent;
  flick: FlickEvent;
  dial: DialEvent;
  variable: VariableEvent;
  timer: TimerEvent;
}

export type GameEventType = keyof GameEventMap;

export type SoundCue = 'boing' | 'splat' | 'splash' | 'whoosh' | 'ding' | 'pop' | 'tada' | 'buzz';

export type CelebrateStyle = 'confetti' | 'sparkle' | 'splash';

export interface HudState {
  score?: number;
  lives?: number;
  /** Seconds to show on the timer pill. */
  timer?: number;
  /** Short label, for example the level name or the goal. */
  label?: string;
}

export interface GameApi {
  /**
   * Spawns a copy of a template entity (an entity id from the scene) or a
   * library asset (`lib/<theme>/<name>`) at a position. Returns the new id.
   * At most 200 spawned bodies may be alive.
   */
  spawn(templateOrLibraryId: string, options: SpawnOptions): string;
  /** Removes one entity by id, or every entity carrying a tag. */
  remove(idOrTag: string): void;
  /** Entities with the tag (or the id), with positions and velocities. */
  find(tag: string): GameEntity[];
  /** Subscribes to an event. Returns a function that unsubscribes. */
  on<K extends GameEventType>(event: K, handler: (event: GameEventMap[K]) => void): () => void;
  /** Runs the handler every `seconds` of game time. Returns a timer id. At most 50 timers. */
  every(seconds: number, handler: () => void): number;
  /** Runs the handler once after `seconds` of game time. Returns a timer id. */
  after(seconds: number, handler: () => void): number;
  /** Cancels a timer from `every` or `after`. */
  cancel(timerId: number): void;
  /**
   * Gives an entity (or every entity with the tag) an instant push: the vector
   * is added to its velocity in meters per second, whatever its mass. Speeds
   * are capped at 20 m/s. `{ x: 0, y: -5 }` throws it upward.
   */
  impulse(idOrTag: string, vector: Vector): void;
  /** Sets gravity. A number sets the vertical pull (9.81 is Earth, 1.62 the Moon). */
  setGravity(gravity: number | Vector): void;
  /** Sets wind. A number sets a horizontal breeze (positive blows right). */
  setWind(wind: number | Vector): void;
  /** Changes the material of an entity (or every entity with the tag). */
  setMaterial(idOrTag: string, material: string): void;
  /** Adds to the score (negative to subtract). */
  score(delta: number): void;
  /** Adds to the lives (negative to lose one). */
  lives(delta: number): void;
  /** Sets the level number shown on the banner. */
  level(n: number): void;
  /** Ends the game with a win. */
  win(): void;
  /** Ends the game with a loss. */
  lose(): void;
  /** Updates the heads-up display. Only the given fields change. */
  hud(state: HudState): void;
  /** The friend says this aloud and shows it as a caption. Keep it short. */
  say(text: string): void;
  /** Asks the child a question with two or three options; resolves with the chosen index. */
  ask(question: string, options: string[]): Promise<number>;
  /** Plays a sound cue. */
  sound(cue: SoundCue): void;
  /** Shows a celebration effect. */
  celebrate(style: CelebrateStyle): void;
  /** Seeded random number in [0, 1). */
  random(): number;
}

/** The only globals a script sees besides plain JavaScript. */
declare const game: GameApi;
declare const console: { log(...args: unknown[]): void };
