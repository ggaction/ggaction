import { planTransition, sampleTransition } from '../../src/animation.js';
import { animationAppearanceFrame } from './animation-appearance-frame.js';

export function animationTimelineFrame(mode = 'retimed') {
  const { from, to, plan: ordinary } = animationAppearanceFrame();
  const decision = sampleTransition(ordinary, 50).decisions.find(value => value.itemKey !== undefined);
  const geometry = { target: { ownerKey: decision.ownerKey }, property: 'geometry', kernel: 'native-progress',
    keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value: .25 }, { timeMs: 100, value: 1 }] };
  const paint = { target: { itemKey: decision.itemKey }, property: 'fill', kernel: 'color',
    keyframes: [{ timeMs: 0, value: 'black' }, { timeMs: 50, value: 'red' }, { timeMs: 100, value: 'white' }] };
  let tracks = [geometry, paint], composite;
  if (mode === 'priority') {
    composite = 'priority';
    tracks = [{ ...geometry, priority: 0 }, { ...paint, priority: 0, keyframes: [{ timeMs: 0, value: 'black' }, { timeMs: 100, value: 'white' }] },
      { ...paint, priority: 1, keyframes: [{ timeMs: 25, value: 'red' }, { timeMs: 75, value: 'red' }] }];
  }
  const options = { durationMs: 100, easing: 'linear' };
  let plan = planTransition({ from, to, options: { ...options, tracks, ...(composite === undefined ? {} : { composite }) } });
  if (mode === 'rebased') plan = planTransition({ from: sampleTransition(plan, 50), to, options });
  const frame = sampleTransition(plan, 50);
  return { from, to, plan, frame, point: [mode === 'rebased' ? 115 : 70, 50],
    rgba: mode === 'rebased' ? [255, 188, 188, 255] : [255, 0, 0, 255] };
}
