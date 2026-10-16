import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameHud, formatTimer } from '../components/studio/GameHud';

const noop = () => {};
const render = (props: Partial<Parameters<typeof GameHud>[0]>) =>
  renderToStaticMarkup(
    <GameHud tangled={false} onAnswer={noop} onReplay={noop} onRetry={noop} {...props} />,
  );

describe('formatTimer', () => {
  it('shows minutes and padded seconds, never negative', () => {
    expect(formatTimer(45)).toBe('0:45');
    expect(formatTimer(61.4)).toBe('1:02');
    expect(formatTimer(5)).toBe('0:05');
    expect(formatTimer(-3)).toBe('0:00');
  });
});

describe('GameHud', () => {
  it('shows no default score for open play and supports a label without points', () => {
    expect(render({ hud: {} })).not.toContain('game-score');
    const html = render({ hud: { label: 'Our story continues' } });
    expect(html).toContain('Our story continues');
    expect(html).not.toContain('game-score');
  });
  it('shows the score with its goal label, lives and the timer', () => {
    const html = render({ hud: { score: 3, lives: 2, timer: 9, label: 'Catch 8 flies' } });
    expect(html).toContain('game-score');
    expect(html).toContain('>3<');
    expect(html).toContain('Catch 8 flies');
    expect(html).toContain('2 lives left');
    expect(html).toContain('0:09');
    expect(html).toContain('is-urgent');
  });

  it('asks a question with one button per option', () => {
    const html = render({
      hud: { score: 0 },
      ask: { id: 1, question: 'How many flies?', options: ['Five', 'Eight'] },
    });
    expect(html).toContain('How many flies?');
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it('offers a replay on a win or a loss', () => {
    expect(render({ hud: { score: 8, outcome: 'won' } })).toContain('Play again');
    expect(render({ hud: { score: 2, outcome: 'lost' } })).toContain('Try again');
  });

  it('shows the tangled recovery state with a retry instead of the HUD', () => {
    const html = render({ hud: { score: 1 }, tangled: true });
    expect(html).toContain('The game got tangled');
    expect(html).toContain('Untangle and play');
    expect(html).not.toContain('game-score');
  });

  it('renders nothing before the game reports a HUD', () => {
    expect(render({})).toBe('');
  });
});
