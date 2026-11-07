import { chart } from '../../src/index.js';
import { planTransition, sampleTransition } from '../../src/animation.js';

export function animationAppearanceFrame(mode = 'gamma') {
  const options = { durationMs: 100, easing: 'linear' };
  const from = chart().createCanvas({ plot: { width: 200, height: 100 }, margin: 0, plotBorder: false, background: 'white' })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 2, y: 5 }] })
    .createPointMark({ id: 'points', fill: mode === 'alpha' ? 'none' : 'black', stroke: 'none', strokeWidth: 0 })
    .encodeRadius({value:18})
    .encodeX({ field: 'x', scale: { domain: [0, 10], nice: false } })
    .encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } });
  const to = from.reviseData({ source: 'rows', id: 'next', values: [{ id: 'a', x: 8, y: 5 }] })
    .editPointMark({ fill: mode === 'alpha' ? 'red' : 'white' });
  let plan = planTransition({ from, to, options });
  if (mode === 'rebased') plan = planTransition({ from: sampleTransition(plan, 50), to, options });
  const frame = sampleTransition(plan, 50);
  // Independent sRGB transfer anchors: linear-light .5 -> 188 and .75 -> 225.
  // Transparent red at .5 over opaque white is pink, preserving red chroma.
  const channel = mode === 'rebased' ? 225 : 188;
  const rgba = mode === 'alpha' ? [255, 128, 128, 255] : [channel, channel, channel, 255];
  return { from, to, plan, frame, point: [mode === 'rebased' ? 130 : 100, 50], rgba };
}
