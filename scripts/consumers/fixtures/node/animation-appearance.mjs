import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chart, render } from 'ggaction';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, createAnimationPlayer } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';
import { createCanvas } from '@napi-rs/canvas';
import { createInteractionSession } from 'ggaction/interaction';
import { getMarkItems } from 'ggaction/inspection';

const options = { durationMs: 100, easing: 'linear' };
const hash = value => createHash('sha256').update(value).digest('hex');
function endpoints() {
  const from = chart().createCanvas({ plot: { width: 200, height: 100 }, margin: 0, plotBorder: false, background: 'white' })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 2, y: 5 }] })
    .createPointMark({ id: 'points', fill: 'black', stroke: 'none', strokeWidth: 0 }).encodeRadius({ value: 18 })
    .encodeX({ field: 'x', scale: { domain: [0, 10], nice: false } })
    .encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } });
  const to = from.reviseData({ source: 'rows', id: 'next', values: [{ id: 'a', x: 8, y: 5 }] }).editPointMark({ fill: 'white' });
  return { from, to, plan: planTransition({ from, to, options }) };
}
export const cases = [
  { id: 'animation-appearance/offline-four-renderers', async run() {
    const { plan } = endpoints(), frame = sampleTransition(plan, 50), canvas = createCanvas(1, 1);
    assert.equal(plan.version, 3); render(frame, canvas.getContext('2d'));
    assert.deepEqual([...canvas.getContext('2d').getImageData(100, 50, 1, 1).data], [188, 188, 188, 255]);
    const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
    assert.deepEqual(png.buffer, await canvas.encode('png'));
    assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image\b/);
    const expected = { scene: hash(JSON.stringify(frame.scene)), svg: hash(renderToSVG(frame)), png: hash(png.buffer), pdf: pdf.buffer.subarray(0, 4).toString(), network: 0 };
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls'; import {syncBuiltinESMExports} from 'node:module';
      let network=0; const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;
      for(const value of [http,https]){value.get=deny;value.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const {createHash}=await import('node:crypto'),{deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png'),{renderToPDFBuffer}=await import('ggaction/pdf');
      let saved='';for await(const chunk of process.stdin)saved+=chunk;
      const frame=sampleTransition(deserializeAnimation(saved).plan,50),hash=value=>createHash('sha256').update(value).digest('hex'),png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
      console.log(JSON.stringify({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash(png.buffer),pdf:pdf.buffer.subarray(0,4).toString(),network}));
    `], { input: serializeAnimation(plan), encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, child.stderr); assert.deepEqual(JSON.parse(child.stdout), expected);
  } },
  { id: 'animation-appearance/current-frame-interruption', async run() {
    const { from, to, plan } = endpoints(), player = createAnimationPlayer({ plan, clock: { now: () => 0, requestFrame() { throw Error('Paused'); }, cancelFrame() {} }, render() {} });
    try {
      player.seek(50);
      for (let i = 0; i < 32; i++) {
        const current = player.getFrame(); player.interrupt({ to: i % 2 ? from : to, options });
        assert.equal(player.getFrame(), current); player.seek(30);
        assert.equal(player.getFrame().scene.nodes.filter(n => n.type === 'circle').length, 1);
      }
      const prepared = planTransition({ from: player.getFrame(), to, options });
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), sampleTransition(prepared, 50));
    } finally { player.dispose(); }
  } },
  { id: 'animation-appearance/current-ink-selection', run() {
    const { from: base } = endpoints(), from = base.editPointMark({ fill: 'none', opacity: 0 }).selectMarks({ id: 'picked', target: 'points', items: [], empty: 'none' });
    const to = from.editPointMark({ fill: 'red', opacity: 1 }), frame = sampleTransition(planTransition({ from, to, options }), 50);
    const key = getMarkItems(to, { target: 'points' })[0].key;
    const session = createInteractionSession({ program: from, bindings: [{ type: 'keyboard', targets: [{ target: 'points', activation: { type: 'select', selection: 'picked' } }] }] });
    try {
      session.dispatch({ type: 'frame', frame, version: 1, generation: session.getState().generation });
      session.dispatch({ type: 'focus', target: 'points', itemKey: key }); assert.equal(session.getState().focus.itemKey, key);
      session.dispatch({ type: 'activate' }); assert.equal(session.getState().history.undoCount, 1);
      session.dispatch({ type: 'undo' }); assert.deepEqual(session.getState().program.graphicSpec, from.graphicSpec);
    } finally { session.destroy(); }
  } }
];
