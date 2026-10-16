/** World units of the engine stage: 16 wide, 9 tall, y down (see packages/engine renderer). */
export const STAGE = { width: 16, height: 9 } as const;

export interface Body {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A physics body as percentages of the stage, optionally grown around its centre. */
export function boxFor(body: Body, scale = 1): Box {
  const width = body.width * scale,
    height = body.height * scale;
  return {
    left: ((body.x - width / 2) / STAGE.width) * 100,
    top: ((body.y - height / 2) / STAGE.height) * 100,
    width: (width / STAGE.width) * 100,
    height: (height / STAGE.height) * 100,
  };
}

/** The inverse transform that puts the portrait back on its hotspot, for a FLIP entrance. */
export function flipFrom(from: Box, to: Box): { x: number; y: number; scale: number } {
  const scale = Math.min(from.width / to.width, from.height / to.height);
  return {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    scale,
  };
}
