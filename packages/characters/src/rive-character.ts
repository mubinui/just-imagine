import type { Emotion } from '@just-imagine/protocol';
import { mouthOpen } from './audio';
/** The source .riv files are externally authored assets; pass a real URL when available. */
export async function mountCharacter(canvas: HTMLCanvasElement, url: string, onError?: () => void) {
  const { Rive } = await import('@rive-app/canvas');
  let disposed = false;
  const state = { mouthOpen: 0, emotion: 0, speaking: false, lookX: 0, lookY: 0 };
  const sync = () => {
    for (const input of rive.stateMachineInputs('Character') ?? [])
      if (input.name in state) input.value = state[input.name as keyof typeof state];
  };
  const rive = new Rive({
    src: url,
    canvas,
    autoplay: true,
    stateMachines: 'Character',
    onLoadError: () => {
      if (!disposed) onError?.();
    },
    onLoad: () => {
      if (disposed) return;
      rive.resizeDrawingSurfaceToCanvas();
      sync();
    },
  });
  return {
    setState(emotion: Emotion, speaking: boolean, rms = 0) {
      Object.assign(state, {
        emotion: ['idle', 'happy', 'thinking', 'surprised', 'sleepy'].indexOf(emotion),
        speaking,
        mouthOpen: speaking ? mouthOpen(rms) : 0,
      });
      sync();
    },
    setMouth(value: number) {
      state.mouthOpen = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      sync();
    },
    look(x: number, y: number) {
      state.lookX = Math.max(-1, Math.min(1, x));
      state.lookY = Math.max(-1, Math.min(1, y));
      sync();
    },
    dispose() {
      disposed = true;
      rive.cleanup();
    },
  };
}
