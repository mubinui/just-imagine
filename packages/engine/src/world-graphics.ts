import { Graphics, type StrokeStyle } from 'pixi.js';

const PIXELS_PER_UNIT = 100;
/** Tessellate in pixels, then place in metres. Tiny world-unit radii otherwise become octagons. */
export class WorldGraphics extends Graphics {
  constructor() {
    super();
    this.scale.set(1 / PIXELS_PER_UNIT);
  }
  override circle(x: number, y: number, radius: number): this {
    return super.circle(x * PIXELS_PER_UNIT, y * PIXELS_PER_UNIT, radius * PIXELS_PER_UNIT);
  }
  override rect(x: number, y: number, width: number, height: number): this {
    return super.rect(
      x * PIXELS_PER_UNIT,
      y * PIXELS_PER_UNIT,
      width * PIXELS_PER_UNIT,
      height * PIXELS_PER_UNIT,
    );
  }
  override roundRect(x: number, y: number, width: number, height: number, radius = 0): this {
    return super.roundRect(
      x * PIXELS_PER_UNIT,
      y * PIXELS_PER_UNIT,
      width * PIXELS_PER_UNIT,
      height * PIXELS_PER_UNIT,
      radius * PIXELS_PER_UNIT,
    );
  }
  override moveTo(x: number, y: number): this {
    return super.moveTo(x * PIXELS_PER_UNIT, y * PIXELS_PER_UNIT);
  }
  override lineTo(x: number, y: number): this {
    return super.lineTo(x * PIXELS_PER_UNIT, y * PIXELS_PER_UNIT);
  }
  override arc(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    counterclockwise?: boolean,
  ): this {
    return super.arc(
      x * PIXELS_PER_UNIT,
      y * PIXELS_PER_UNIT,
      radius * PIXELS_PER_UNIT,
      start,
      end,
      counterclockwise,
    );
  }
  override stroke(style?: Parameters<Graphics['stroke']>[0]): this {
    if (style && typeof style === 'object' && 'width' in style && typeof style.width === 'number') {
      return super.stroke({ ...style, width: style.width * PIXELS_PER_UNIT } as StrokeStyle);
    }
    return super.stroke(style);
  }
}
