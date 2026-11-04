import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { createCanvas } from '@napi-rs/canvas';
import { chart } from 'ggaction';
import { chart as basicChart } from 'ggaction/basic';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, createAnimationPlayer } from 'ggaction/animation';
import { renderTransitionScene } from 'ggaction/scene';
import { renderToSVG } from 'ggaction/svg';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';

const options = { durationMs: 100, easing: 'linear', formatVersion: 6 };
function points(factory) {
  return factory().createCanvas({ width: 120, height: 100, margin: 10, plotBorder: false })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 1, x: .3, y: .4 }, { id: '1', x: .35, y: .4 }, { id: 'c', x: .7, y: .6 }] })
    .createPointMark({ id: 'points', fill: '#2184b6', opacity: .4 })
    .encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } }).encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
}
function streams(buffer) {
  return [...buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].flatMap(match => {
    try { return [inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')]; } catch { return []; }
  });
}
async function replay() {
  for (const factory of [chart, basicChart]) {
    const from = points(factory), to = from.encodeX({ field: 'x', scale: { id: 'x', domain: [0, 2], nice: false } });
    const batch = planTransition({ from, to, options }), legacy = planTransition({ from, to, options: { durationMs: 100, easing: 'linear' } });
    assert.equal(batch.version, 6); assert.equal(legacy.version, 3);
    const saved = serializeAnimation(batch), restored = deserializeAnimation(saved).plan;
    assert.equal(serializeAnimation(restored), saved);
    for (const time of [0, 37, 100]) {
      const frame = sampleTransition(batch, time), expected = sampleTransition(legacy, time);
      assert.equal(frame.scene.version, 3); assert.equal(Object.hasOwn(frame, 'decisions'), false);
      assert.deepEqual(sampleTransition(restored, time), frame);
      const run = frame.scene.entries.find(entry => entry.kind === 'circle-run');
      assert.equal(run.keys.length, 3); assert.ok(Object.isFrozen(run.properties.x));
      for (const ratio of [1, 2]) {
        const a = createCanvas(1, 1), b = createCanvas(1, 1);
        renderTransitionScene(frame.scene, a.getContext('2d'), { pixelRatio: ratio }); renderTransitionScene(expected.scene, b.getContext('2d'), { pixelRatio: ratio });
        assert.equal(a.width, 120 * ratio); assert.equal(a.height, 100 * ratio);
        assert.deepEqual(a.getContext('2d').getImageData(0, 0, a.width, a.height).data, b.getContext('2d').getImageData(0, 0, b.width, b.height).data);
      }
      const actualSVG = renderToSVG(frame), expectedSVG = renderToSVG(expected);
      assert.deepEqual(actualSVG.match(/<circle[^>]*\/>/g), expectedSVG.match(/<circle[^>]*\/>/g));
      if (time > 0 && time < 100) assert.equal(actualSVG, expectedSVG);
      assert.deepEqual((await renderToPNGBuffer(frame)).buffer, (await renderToPNGBuffer(expected)).buffer);
      const actualPDF = streams((await renderToPDFBuffer(frame)).buffer), expectedPDF = streams((await renderToPDFBuffer(expected)).buffer);
      assert.ok(actualPDF.length > 0);
      if (time > 0 && time < 100) assert.deepEqual(actualPDF, expectedPDF);
    }
    const frame = sampleTransition(batch, 37), rebase = planTransition({ from: frame, to, options });
    assert.equal(sampleTransition(rebase, 0), frame);
    const rebasedWire = serializeAnimation(rebase), offline = deserializeAnimation(rebasedWire).plan;
    assert.equal(serializeAnimation(offline), rebasedWire); assert.deepEqual(sampleTransition(offline, 50), sampleTransition(rebase, 50));
    const clock = { now: () => 0, requestFrame: () => 1, cancelFrame() {} }, player = createAnimationPlayer({ plan: batch, clock, render() {} });
    player.seek(37); const before = player.getFrame();
    assert.throws(() => player.interrupt({ to, options: { durationMs: 100 } }), /representation/); assert.equal(player.getFrame(), before);
    player.interrupt({ to, options }); assert.equal(player.getFrame(), before); player.dispose();
  }
}
export const cases = [{ id: 'animation-batched/complete-four-renderer-offline-and-rebase', run() { return replay(); } }];
