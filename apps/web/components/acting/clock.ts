/** One display-synchronized scheduler, capped at the playback envelope's 30Hz. */
type Actor = { visible: boolean; elapsed: number; tick: (now: number, reduced: boolean) => void };
const actors = new Map<Element, Actor>();
const interval = 1000 / 30;
let request: number | undefined;
let observer: IntersectionObserver | undefined;
let query: MediaQueryList | undefined;
let prior: number | undefined;
let accumulated = 0;
function notify(delta: number) {
  for (const actor of actors.values()) {
    if (!actor.visible) continue;
    actor.elapsed += delta;
    actor.tick(actor.elapsed, query?.matches ?? false);
  }
}
function update(now: number) {
  request = undefined;
  if (document.hidden) {
    prior = undefined;
    accumulated = 0;
    return;
  }
  const delta = prior === undefined ? 0 : now - prior;
  prior = now;
  // Resuming a suspended/busy tab never fast-forwards a character's gesture.
  if (delta >= 0 && delta <= 150) accumulated += delta;
  else accumulated = 0;
  if (accumulated >= interval - 0.1) {
    const elapsed = Math.floor((accumulated + 0.1) / interval) * interval;
    accumulated = Math.max(0, accumulated - elapsed);
    notify(elapsed);
  }
  schedule();
}
function schedule() {
  const active = !document.hidden && [...actors.values()].some((actor) => actor.visible);
  if (active && request === undefined) request = requestAnimationFrame(update);
  if (!active) {
    if (request !== undefined) cancelAnimationFrame(request);
    request = undefined;
    prior = undefined;
    accumulated = 0;
  }
}
function preferenceChanged() {
  notify(0);
}
export function watchActor(node: Element, tick: Actor['tick']) {
  if (!actors.size) {
    query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', schedule);
    observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver((entries) => {
            for (const entry of entries) {
              const actor = actors.get(entry.target);
              if (actor) {
                const entering = !actor.visible && entry.isIntersecting;
                actor.visible = entry.isIntersecting;
                if (entering) actor.tick(actor.elapsed, query?.matches ?? false);
              }
            }
            schedule();
          });
  }
  const actor = { visible: !observer, elapsed: 0, tick };
  actors.set(node, actor);
  observer?.observe(node);
  if (actor.visible) tick(0, query?.matches ?? false);
  schedule();
  return () => {
    observer?.unobserve(node);
    actors.delete(node);
    schedule();
    if (!actors.size) {
      observer?.disconnect();
      observer = undefined;
      query?.removeEventListener('change', preferenceChanged);
      query = undefined;
      document.removeEventListener('visibilitychange', schedule);
    }
  };
}
