import { Actor } from '../acting/Actor';
type Sheet = {
  file: string;
  columns: number;
  rows: number;
  idle: number;
  speaking: number;
  cheer: number;
  wave?: number;
  rowBounds?: number[];
  pixelWidth?: number;
  pixelHeight?: number;
};

const CAST: Record<string, Sheet> = {};
function columns(file: string, ids: string[], count = ids.length) {
  ids.forEach((id, column) => {
    CAST[id] = {
      file,
      columns: count,
      rows: 3,
      idle: column,
      speaking: count + column,
      cheer: count * 2 + column,
    };
  });
}
columns('space-inner', ['sun', 'mercury', 'venus', 'earth']);
columns('space-outer', ['mars', 'jupiter', 'saturn', 'uranus']);
columns('space-cosmos', ['neptune', 'galaxy', 'moon', 'star']);
columns('animals-farm', ['cow', 'sheep', 'chicken', 'horse']);
columns('animals-jungle', ['lion', 'elephant', 'monkey', 'parrot']);
columns('animals-ocean', ['dolphin', 'whale', 'seal', 'penguin']);
columns('body', ['heart', 'lungs', 'brain', 'stomach', 'bone']);
columns('food', ['carrot', 'milk', 'bean', 'rice', 'water']);
for (const [row, id] of ['soap', 'tissue'].entries()) {
  CAST[id] = {
    file: 'hygiene-friends',
    columns: 4,
    rows: 2,
    idle: row * 4,
    speaking: row * 4 + 1,
    cheer: row * 4 + 2,
    wave: row * 4 + 3,
  };
}
CAST.coach = { file: 'exercise', columns: 4, rows: 4, idle: 0, speaking: 5, cheer: 7, wave: 6 };
CAST.muscle = { file: 'exercise', columns: 4, rows: 4, idle: 8, speaking: 9, cheer: 11, wave: 10 };
CAST.rest = { file: 'exercise', columns: 4, rows: 4, idle: 12, speaking: 13, cheer: 15, wave: 14 };
// The generated exercise sheet has two taller coach rows. Use measured cells so
// the preceding pose's shoes never enter another character's viewport.
for (const id of ['coach', 'muscle', 'rest']) {
  Object.assign(CAST[id]!, {
    rowBounds: [0, 349, 687, 935, 1247],
    pixelWidth: 1261,
    pixelHeight: 1247,
  });
}

export const hasCinematicArt = (id: string) => Object.hasOwn(CAST, id);

/** Clip the unmodified atlas in an SVG viewport; equal cells preserve pose registration. */
export function ActingFrame({ sheet, index }: { sheet: Sheet; index: number }) {
  if (sheet.rowBounds && sheet.pixelWidth && sheet.pixelHeight) {
    const row = Math.floor(index / sheet.columns);
    const width = sheet.pixelWidth / sheet.columns;
    const top = sheet.rowBounds[row]!;
    const height = sheet.rowBounds[row + 1]! - top;
    return (
      <svg
        width="100"
        height="100"
        viewBox={`${(index % sheet.columns) * width} ${top} ${width} ${height}`}
        preserveAspectRatio="xMidYMax meet"
        overflow="hidden"
      >
        <image
          href={`/learn/cinematic/${sheet.file}-acting-v1.webp`}
          width={sheet.pixelWidth}
          height={sheet.pixelHeight}
        />
      </svg>
    );
  }
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" overflow="hidden">
      <image
        href={`/learn/cinematic/${sheet.file}-acting-v1.webp`}
        x={-(index % sheet.columns) * 100}
        y={-Math.floor(index / sheet.columns) * 100}
        width={sheet.columns * 100}
        height={sheet.rows * 100}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

export function CinematicActor({ id, thumb }: { id: string; thumb?: boolean }) {
  return <Actor id={id} thumb={thumb} />;
}

export function CoachPose({ pose, complete = false }: { pose: number; complete?: boolean }) {
  return <ActingFrame sheet={CAST.coach!} index={complete ? 7 : [1, 2, 3, 4][pose % 4]!} />;
}
