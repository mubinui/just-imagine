/** Eight consistent acting poses from one generated sheet. Images remain an unmodified atlas. */
export function ToothActor({ pose = 'idle' }: { pose?: 'idle' | 'brush' | 'cheer' | 'wave' }) {
  const frame = (index: number) => (
    <svg x="0" y="0" width="100" height="100" viewBox="0 0 100 100" overflow="hidden">
      <image
        href="/learn/cinematic/twinkle-acting-v1.webp"
        x={-(index % 4) * 100}
        y={-Math.floor(index / 4) * 100}
        width="400"
        height="200"
      />
    </svg>
  );
  return (
    <g className={`tooth-acting is-${pose}`}>
      <g className="tooth-pose is-idle">{frame(0)}</g>
      <g className="tooth-pose is-blink">{frame(1)}</g>
      <g className="tooth-pose is-speaking">{frame(2)}</g>
      <g className="tooth-pose is-surprise">{frame(3)}</g>
      <g className="tooth-pose is-brush-a">{frame(4)}</g>
      <g className="tooth-pose is-brush-b">{frame(5)}</g>
      <g className="tooth-pose is-cheer">{frame(6)}</g>
      <g className="tooth-pose is-wave">{frame(7)}</g>
    </g>
  );
}
