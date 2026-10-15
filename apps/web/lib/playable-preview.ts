import type { SceneDoc, Entity } from '@just-imagine/scene-schema';
import type { PreviewKey } from './preview-worlds';

/** Local presentation/level tuning; never mutates the evaluation fixtures or live worlds. */
export function playablePreview(source: SceneDoc, key: PreviewKey, origin: string): SceneDoc {
  const doc = structuredClone(source);
  const asset = (name: string, width: number, height: number) => ({
    url: new URL(`/worlds/${name}.webp`, origin).href,
    width,
    height,
    status: 'ready' as const,
  });
  const entity = (id: string) => doc.entities.find((e) => e.id === id)!;
  const size = (id: string, width: number, height: number) => {
    entity(id).body.size = { width, height };
  };
  // Sample URLs in source fixtures are not downloadable production assets.
  for (const e of doc.entities) if (e.asset) e.asset.status = 'placeholder';
  const painted = ['jellyDragon', 'moonBounce', 'pondFloat', 'projectileLab'].includes(key);
  if (painted) {
    doc.theme.backdrop =
      key === 'moonBounce'
        ? asset('moon-garden', 1600, 900)
        : key === 'pondFloat'
          ? asset('pond-garden', 1600, 900)
          : asset('meadow', 1280, 720);
    entity('ground').tags.push('painted_ground');
  }
  if (key === 'jellyDragon') {
    size('dragon', 2.3, 2);
    size('cloud1', 4.2, 1.05);
    size('pebble', 0.85, 0.85);
    entity('cloud1').transform.y = 3.55;
    entity('cloud1').asset = asset('cloud', 720, 240);
    entity('dragon').asset = asset('jelly-dragon', 640, 585);
    doc.rules.find((r) => r.id === 'r_tap_dragon')!.then = [
      { action: 'applyImpulse', target: 'hero', impulse: { x: 8, y: -20 } },
      { action: 'sound', cue: 'boing' },
    ];
    doc.narration.intro =
      'Give the dragon a bounce, or drag it off the cloud. How high will it go?';
  }
  if (key === 'moonBounce') {
    size('ball', 1.6, 1.6);
    size('bolt_toy', 1.6, 1.6);
    entity('ball').tags.push('striped_ball');
    entity('bolt_toy').tags.push('toy_bolt');
    doc.narration.intro =
      'Drop them together. Try Moon gravity, then Earth, and watch what changes.';
  }
  if (key === 'pondFloat') {
    size('duck', 2.2, 1.9);
    size('stone', 1.15, 1.15);
    size('pond', 16, 3.3);
    entity('pond').transform.y = 6.35;
    entity('pond').tags.push('painted_water');
    entity('duck').asset = asset('duck-toy', 800, 687);
    // Equal bottom heights make the simultaneous drop a fair comparison.
    entity('stone').transform.y = entity('duck').transform.y + (1.9 - 1.15) / 2;
    doc.narration.intro =
      'Drop the duck and stone into the pond. Drag them out and try another material.';
  }
  if (key === 'projectileLab') {
    doc.variables!.gravity!.step = 0.01;
    size('cannon', 2.4, 1.9);
    entity('cannon').transform = { x: 2, y: 7.05, rotation: 0 };
    entity('cannon').asset = asset('toy-cannon', 800, 627);
    size('ball', 0.72, 0.72);
    entity('ball').transform = { x: 3.3, y: 5.65, rotation: 0 };
    entity('ball').tags.push('striped_ball', 'trail');
    size('cup', 2.4, 1.9);
    entity('cup').transform.y = 7.05;
    entity('cup').body.shape = 'auto';
    entity('cup').asset = {
      ...asset('catching-cup', 800, 633),
      colliderUrl: new URL('/worlds/catching-cup.collider.json', origin).href,
    };
    doc.challenges![0]!.goal = 'Hit the cup with the ball';
    doc.rules.find((r) => r.id === 'r_done')!.then = [
      {
        action: 'say',
        text: 'Nice shot! Try a different angle and see if you can hit the cup again.',
      },
    ];
    doc.narration.intro = 'Choose an angle and speed, then launch. Can you reach the cup?';
  }
  if (key === 'galtonBoard') {
    // Deliberate drops replace an endless autoplay demonstration.
    doc.rules = doc.rules.filter((r) => r.when.event !== 'timer');
    size('ball', 0.48, 0.48);
    entity('ball').tags.push('striped_ball');
    for (const e of doc.entities)
      if (e.tags.includes('peg')) e.body.size = { width: 0.5, height: 0.5 };
    entity('release').tags.push('release_control');
    entity('ground').tags.push('painted_ground');
    doc.narration.intro = 'Drop a ball and follow its path. Which basket will fill first?';
  }
  if (key === 'fractionsLab') {
    // Big tangible fraction blocks are the mathematics, not decoration.
    entity('whole').tags.push('fraction_whole');
    entity('half').tags.push('fraction_half');
    entity('join').tags.push('join_control');
    entity('ground').tags.push('painted_ground');
    const ruler = doc.visuals?.find((v) => v.type === 'ruler');
    if (ruler?.type === 'ruler') {
      ruler.from.x = 5.6;
      ruler.to.x = 10.4;
    }
    size('whole', 4.8, 1.4);
    size('half', 2.4, 1.4);
    const half = entity('half');
    half.transform.x = 3;
    half.transform.y = 6.4;
    doc.narration.intro =
      'Split one whole into two equal halves. Bring the pieces together, then build the whole again.';
  }
  return doc;
}

export function tappableEntities(doc: SceneDoc): Entity[] {
  return doc.entities.filter(
    (entity) =>
      !entity.body.isStatic ||
      doc.rules.some(
        (rule) =>
          rule.when.event === 'tap' &&
          (rule.when.target === entity.id || entity.tags.includes(rule.when.target)),
      ),
  );
}
