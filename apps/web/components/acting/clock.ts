/** One scheduler for every visible actor. No per-portrait RAF or React frame renders. */
type Actor = { visible: boolean; tick: (now: number, reduced: boolean) => void };
const actors = new Map<Element, Actor>();
let timer: ReturnType<typeof setInterval> | undefined;
let observer: IntersectionObserver | undefined;
let query: MediaQueryList | undefined;
let elapsed = 0,
  prior = 0;
function update() {
  const now = performance.now();
  if (document.hidden) {
    prior = 0;
    return;
  }
  if (prior) elapsed += Math.min(150, now - prior);
  prior = now;
  for (const actor of actors.values())
    if (actor.visible) actor.tick(elapsed, query?.matches ?? false);
}
function schedule() {
  const active = !document.hidden && [...actors.values()].some((a) => a.visible);
  if (active && !timer) {
    prior = 0;
    update();
    timer = setInterval(update, 100);
  }
  if (!active && timer) {
    clearInterval(timer);
    timer = undefined;
    prior = 0;
  }
}
export function watchActor(node: Element, tick: Actor['tick']) {
  if (!actors.size) {
    query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', update);
    document.addEventListener('visibilitychange', schedule);
    observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver((entries) => {
            for (const entry of entries) {
              const actor = actors.get(entry.target);
              if (actor) actor.visible = entry.isIntersecting;
            }
            schedule();
          });
  }
  const origin = elapsed;
  actors.set(node, { visible: !observer, tick: (now, reduced) => tick(now - origin, reduced) });
  observer?.observe(node);
  schedule();
  return () => {
    observer?.unobserve(node);
    actors.delete(node);
    schedule();
    if (!actors.size) {
      observer?.disconnect();
      observer = undefined;
      query?.removeEventListener('change', update);
      query = undefined;
      document.removeEventListener('visibilitychange', schedule);
    }
  };
}
